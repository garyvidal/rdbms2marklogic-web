import { ReactFlow, MiniMap, Background, Controls, useNodesState, useEdgesState, NodeTypes, useReactFlow, ConnectionLineType } from "@xyflow/react";
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import * as ReactDOM from "react-dom";
import * as dagreNS from "@dagrejs/dagre";
import Splitter from "../splitter";
import { useResizable } from "react-resizable-layout";
import { cn } from "@/lib/utils";
import CollapsiblePanel from "../CollapsiblePanel";
import SchemaToolbar from "./SchemaToolbar";
import DiagramTabs from "./DiagramTabs";
import SchemasPanel from "../SchemasPanel";
import ProjectPanel from "../ProjectPanel";
import AddTablesModal from "../AddTablesModal";
import DatabaseConnectionForm from "../DatabaseConnectionForm";
import { DbTable, DbSchema, DbDatabase, DbConnection, SchemaAnalysisRequest, analyzeSchema, getConnection } from "@/services/schemaService";
import { ProjectData, saveProject } from "@/services/projectService";
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import { DatabaseSchemaNode } from "../DatabaseSchemaNode";
import { LayoutAlgorithm } from "./LayoutControls";

// Vite pre-bundles @dagrejs/dagre as a default-only export; unwrap if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dagre = ((dagreNS as any).default ?? dagreNS) as typeof dagreNS;

const nodeTypes: NodeTypes = { databaseSchema: DatabaseSchemaNode };

// Estimates node dimensions for layout when measured sizes are not yet available
function estimateNodeSize(node: ReactFlowNode): { width: number; height: number } {
    if (node.measured?.width && node.measured?.height) {
        return { width: node.measured.width, height: node.measured.height };
    }
    const collapsed = (node.data as { collapsed?: boolean })?.collapsed ?? false;
    const cols = ((node.data as { schema?: unknown[] })?.schema ?? []).length;
    return { width: 220, height: collapsed ? 50 : 44 + cols * 28 };
}

function applyDagreLayout(
    nodes: ReactFlowNode[],
    edges: ReactFlowEdge[],
    rankdir: "TB" | "LR" | "BT",
): ReactFlowNode[] {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir, nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach(node => {
        const { width, height } = estimateNodeSize(node);
        g.setNode(node.id, { width, height });
    });
    edges.forEach(edge => {
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(g);

    return nodes.map(node => {
        const pos = g.node(node.id);
        const { width, height } = estimateNodeSize(node);
        return { ...node, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
    });
}

function applyGridLayout(nodes: ReactFlowNode[]): ReactFlowNode[] {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const colWidth = 280;
    const rowHeight = 320;
    return nodes.map((node, i) => ({
        ...node,
        position: { x: 40 + (i % cols) * colWidth, y: 40 + Math.floor(i / cols) * rowHeight },
    }));
}

// Re-anchors edges so they connect from whichever side of the source faces the target.
function reanchorEdges(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): ReactFlowEdge[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return edges.map(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return edge;
        const srcW = src.measured?.width ?? estimateNodeSize(src).width;
        const tgtW = tgt.measured?.width ?? estimateNodeSize(tgt).width;
        const srcCx = src.position.x + srcW / 2;
        const tgtCx = tgt.position.x + tgtW / 2;
        if (srcCx <= tgtCx) {
            return { ...edge, sourceHandle: "right-source", targetHandle: "left-target" };
        } else {
            return { ...edge, sourceHandle: "left-source", targetHandle: "right-target" };
        }
    });
}

// Inner component so we can use useReactFlow() inside the ReactFlow context
interface LayoutApplierProps {
    pendingLayout: LayoutAlgorithm | null;
    edges: ReactFlowEdge[];
    setNodes: (updater: (prev: ReactFlowNode[]) => ReactFlowNode[]) => void;
    setEdges: (updater: (prev: ReactFlowEdge[]) => ReactFlowEdge[]) => void;
    onDone: () => void;
}

function LayoutApplier({ pendingLayout, edges, setNodes, setEdges, onDone }: LayoutApplierProps) {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (!pendingLayout) return;
        setNodes(prev => {
            if (prev.length === 0) return prev;
            let laid: ReactFlowNode[];
            switch (pendingLayout) {
                case "dagre-tb": laid = applyDagreLayout(prev, edges, "TB"); break;
                case "dagre-lr": laid = applyDagreLayout(prev, edges, "LR"); break;
                case "dagre-bt": laid = applyDagreLayout(prev, edges, "BT"); break;
                case "grid":     laid = applyGridLayout(prev); break;
                default:         return prev;
            }
            setEdges(prevEdges => reanchorEdges(laid, prevEdges));
            return laid;
        });
        onDone();
        // Fit view after layout positions settle
        setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50);
    }, [pendingLayout]);

    return null;
}

interface SchemaViewProps {
    openProjects: ProjectData[];
    activeProjectName: string | null;
    onProjectSelect: (name: string) => void;
    onProjectClose: (name: string) => void;
    onDiagramChange?: (projectName: string, nodes: ReactFlowNode[], edges: ReactFlowEdge[]) => void;
    onProjectSchemasUpdated?: (project: ProjectData) => void;
}

const SchemaView = ({ openProjects, activeProjectName, onProjectSelect, onProjectClose, onDiagramChange, onProjectSchemasUpdated }: SchemaViewProps): JSX.Element => {
    const [selectedTable, setSelectedTable] = useState<DbTable | null>(null);
    const [selectedSchema, setSelectedSchema] = useState<DbSchema | null>(null);
    const [database, setDatabase] = useState<DbDatabase | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [showEdges, setShowEdges] = useState(true);
    const [connectionLineType, setConnectionLineType] = useState<ConnectionLineType>(ConnectionLineType.SmoothStep);
    const [pendingLayout, setPendingLayout] = useState<LayoutAlgorithm | null>(null);
    const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
    const [showAddTablesModal, setShowAddTablesModal] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const visibleNodeIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);
    const projectDbCache = useRef<Map<string, DbDatabase>>(new Map());
    const diagramSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRestoringRef = useRef(false);

    const activeProject = openProjects.find((p) => p.name === activeProjectName) ?? null;

    // Restore saved diagram nodes when switching projects
    useEffect(() => {
        isRestoringRef.current = true;
        const savedNodes = activeProject?.diagrams?.[0]?.tabs?.[0]?.relational?.nodes ?? [];
        const savedEdges = activeProject?.diagrams?.[0]?.tabs?.[0]?.relational?.edges ?? [];

        if (savedNodes.length > 0) {
            const restored = savedNodes.map((sn) => {
                const dotIdx = sn.id.indexOf(".");
                const schemaName = sn.id.substring(0, dotIdx);
                const tableName = sn.id.substring(dotIdx + 1);
                const table = activeProject?.schemas[schemaName]?.tables?.[tableName];
                return {
                    id: sn.id,
                    type: "databaseSchema",
                    position: { x: sn.x, y: sn.y },
                    data: {
                        label: tableName,
                        schema: Object.values(table?.columns ?? {}).map((col) => ({
                            title: col.name,
                            type: col.type ?? "",
                        })),
                        collapsed: sn.collapsed ?? false,
                    },
                };
            });
            const initialEdges = savedEdges.map((se) => ({ id: se.id, source: se.source, target: se.target }));
            setNodes(restored);
            setEdges(reanchorEdges(restored, initialEdges));
        } else {
            setNodes([]);
            setEdges([]);
        }
        setTimeout(() => { isRestoringRef.current = false; }, 100);
    }, [activeProjectName]);

    // Debounced diagram save on node/edge changes
    useEffect(() => {
        if (!activeProject || isRestoringRef.current) return;
        if (diagramSaveTimer.current) clearTimeout(diagramSaveTimer.current);
        diagramSaveTimer.current = setTimeout(async () => {
            onDiagramChange?.(activeProject.name, nodes, edges);
            const updatedProject = {
                ...activeProject,
                diagrams: [
                    {
                        name: activeProject.diagrams?.[0]?.name || "Main",
                        tabs: [
                            {
                                id: activeProject.diagrams?.[0]?.tabs?.[0]?.id || "tab-1",
                                name: activeProject.diagrams?.[0]?.tabs?.[0]?.name || "Relational",
                                relational: {
                                    nodes: nodes.map(n => ({
                                        id: n.id,
                                        type: n.type,
                                        x: n.position.x,
                                        y: n.position.y,
                                        collapsed: n.data?.collapsed ?? false,
                                    })),
                                    edges: edges.map(e => ({
                                        id: e.id,
                                        source: e.source,
                                        target: e.target,
                                    })),
                                },
                            },
                        ],
                    },
                ],
            };
            try {
                await saveProject(updatedProject);
            } catch (err) {
                console.error("Failed to save diagram to ProjectRepository", err);
            }
        }, 1500);
        return () => {
            if (diagramSaveTimer.current) clearTimeout(diagramSaveTimer.current);
        };
    }, [nodes, edges]);

    const handleProjectTableSelect = useCallback(async (tableName: string, schemaName: string) => {
        if (!activeProject) return;
        const nodeId = `${schemaName}.${tableName}`;
        if (nodes.some(n => n.id === nodeId)) return;

        let db = projectDbCache.current.get(activeProject.connectionName);
        if (!db) {
            try {
                const savedConn = await getConnection(activeProject.connectionName);
                db = await analyzeSchema({
                    connection: savedConn.connection,
                    includeTables: true,
                    includeColumns: true,
                    includeRelationships: false,
                });
                projectDbCache.current.set(activeProject.connectionName, db);
            } catch (e) {
                console.error("Failed to fetch schema for project:", e);
                return;
            }
        }
        const table = db.schemas[schemaName]?.tables?.[tableName];
        if (!table) return;

        const idx = nodes.length;
        const newNode: ReactFlowNode = {
            id: nodeId,
            type: "databaseSchema",
            position: { x: 50 + (idx % 4) * 380, y: 50 + Math.floor(idx / 4) * 280 },
            data: {
                label: tableName,
                schema: Object.values(table.columns ?? {}).map(col => ({ title: col.name, type: col.type ?? "", primaryKey: col.primaryKey })),
            },
        };
        const updatedNodes = [...nodes, newNode];

        // Build edges for relationships
        const projectTable = activeProject.schemas[schemaName]?.tables?.[tableName];
        const outgoingRels = projectTable?.relationships ?? [];
        const newEdges: ReactFlowEdge[] = [...edges];
        const existingEdgeIds = new Set(edges.map(e => e.id));

        for (const rel of outgoingRels) {
            const targetNode = nodes.find(n => n.id.substring(n.id.indexOf(".") + 1) === rel.toTable);
            if (targetNode) {
                const edgeId = `${nodeId}->${targetNode.id}`;
                if (!existingEdgeIds.has(edgeId)) {
                    newEdges.push({ id: edgeId, source: nodeId, target: targetNode.id });
                    existingEdgeIds.add(edgeId);
                }
            }
        }

        for (const existingNode of nodes) {
            const dotIdx = existingNode.id.indexOf(".");
            const existingSchemaName = existingNode.id.substring(0, dotIdx);
            const existingTableName = existingNode.id.substring(dotIdx + 1);
            const existingRels = activeProject.schemas[existingSchemaName]?.tables?.[existingTableName]?.relationships ?? [];
            for (const rel of existingRels) {
                if (rel.toTable === tableName) {
                    const edgeId = `${existingNode.id}->${nodeId}`;
                    if (!existingEdgeIds.has(edgeId)) {
                        newEdges.push({ id: edgeId, source: existingNode.id, target: nodeId });
                        existingEdgeIds.add(edgeId);
                    }
                }
            }
        }

        setNodes(updatedNodes);
        setEdges(reanchorEdges(updatedNodes, newEdges));
    }, [activeProject, nodes, edges]);

    const handleNodeDragStop = useCallback((_event: React.MouseEvent, _node: ReactFlowNode) => {
        setNodes(currentNodes => {
            setEdges(currentEdges => reanchorEdges(currentNodes, currentEdges));
            return currentNodes;
        });
    }, []);

    const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
        event.preventDefault();
        setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
    }, []);

    const handleRemoveNode = useCallback((nodeId: string) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
        setContextMenu(null);
    }, []);

    const handleTableSelect = (table: DbTable, schema: DbSchema) => {
        setSelectedTable(table);
        setSelectedSchema(schema);
    };

    const handleConnect = async (connection: DbConnection) => {
        try {
            setLoading(true);
            setError(null);
            const request: SchemaAnalysisRequest = {
                connection,
                includeTables: true,
                includeColumns: true,
                includeRelationships: true,
            };
            const result = await analyzeSchema(request);
            setDatabase(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to analyze schema";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        setDatabase(null);
        setSelectedTable(null);
        setSelectedSchema(null);
        setError(null);
    };

    const handleSwitchConnection = async (connection: DbConnection) => {
        try {
            setLoading(true);
            setError(null);
            const request: SchemaAnalysisRequest = {
                connection,
                includeTables: true,
                includeColumns: true,
                includeRelationships: true,
            };
            const result = await analyzeSchema(request);
            setDatabase(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to analyze schema";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const { isDragging: isFileDragging, position: fileW, splitterProps: fileDragBarProps } = useResizable({
        axis: "x", initial: 250, min: 50,
    });
    const { isDragging: isPluginDragging, position: pluginW, splitterProps: pluginDragBarProps } = useResizable({
        axis: "x", initial: 200, min: 50, reverse: true,
    });

    const leftPanelTitle = activeProject ? activeProject.name : "Database Schemas";
    const leftPanelBody = activeProject
        ? <ProjectPanel project={activeProject} onTableSelect={handleProjectTableSelect} visibleNodeIds={visibleNodeIds} onAddTables={() => setShowAddTablesModal(true)} />
        : <SchemasPanel
            onTableSelect={handleTableSelect}
            isConnected={!!database}
            database={database}
            onDisconnect={handleDisconnect}
            onSwitchConnection={handleSwitchConnection}
          />;

    const showModal = !database && !activeProject && showConnectionModal;

    return (
        <>
        <div className="relative h-full w-full flex">
            {showModal && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 rounded">
                    <div className="bg-slate-700 rounded-lg shadow-2xl p-8 relative max-w-2xl w-full mx-4">
                        <button
                            onClick={() => setShowConnectionModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center"
                        >
                            &#x2715;
                        </button>
                        <DatabaseConnectionForm onConnect={handleConnect} isLoading={loading} />
                        {error && (
                            <div className="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                                <p className="text-sm font-semibold mb-2 text-white">Connection Error</p>
                                <p className="text-sm text-red-100">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex grow" style={{ opacity: showModal ? 0.3 : 1 }}>
                <div
                    className={cn("shrink-0 contents-top max-w-md", isFileDragging && "dragging")}
                    style={{ width: fileW }}
                >
                    <CollapsiblePanel title={leftPanelTitle} direction={"left"} body={leftPanelBody} />
                </div>
                <Splitter isDragging={isFileDragging} {...fileDragBarProps} />

                <div className="flex grow">
                    <div className="grow flex flex-col">
                        <DiagramTabs
                            projects={openProjects}
                            activeProjectName={activeProjectName}
                            onProjectSelect={onProjectSelect}
                            onProjectClose={onProjectClose}
                        />
                        <SchemaToolbar
                            hasNodes={nodes.length > 0}
                            showEdges={showEdges}
                            onToggleEdges={() => setShowEdges(v => !v)}
                            onLayout={setPendingLayout}
                            connectionLineType={connectionLineType}
                            onConnectionLineTypeChange={setConnectionLineType}
                        />
                        <div className="flex-1 relative">
                            <div className="absolute inset-0">
                                <ReactFlow
                                    nodes={nodes}
                                    edges={showEdges ? edges.map(e => ({ ...e, type: connectionLineType })) : []}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    nodeTypes={nodeTypes}
                                    colorMode="dark"
                                    fitView
                                    onNodeContextMenu={handleNodeContextMenu}
                                    onNodeDragStop={handleNodeDragStop}
                                    onPaneClick={() => setContextMenu(null)}
                                    connectionLineType={connectionLineType}
                                >
                                    <Controls />
                                    <MiniMap />
                                    <Background />
                                    <LayoutApplier
                                        pendingLayout={pendingLayout}
                                        edges={edges}
                                        setNodes={setNodes}
                                        setEdges={setEdges}
                                        onDone={() => setPendingLayout(null)}
                                    />
                                </ReactFlow>
                            </div>
                        </div>
                    </div>
                    <Splitter isDragging={isPluginDragging} {...pluginDragBarProps} />
                    <div
                        className={cn("shrink-0 contents-top max-w-md", isPluginDragging && "dragging")}
                        style={{ width: pluginW }}
                    >
                        {selectedTable ? (
                            <div className="h-full w-full bg-slate-700 text-white overflow-auto">
                                <div className="p-4 border-b border-slate-600">
                                    <h3 className="font-semibold text-lg">{selectedTable.tableName}</h3>
                                    <p className="text-sm text-gray-400">{selectedSchema?.name}</p>
                                </div>
                                {selectedTable.columns && Object.keys(selectedTable.columns).length > 0 && (
                                    <div className="p-4">
                                        <h4 className="font-semibold text-sm mb-3">
                                            Columns ({Object.keys(selectedTable.columns).length})
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.values(selectedTable.columns).map((col) => (
                                                <div key={col.name} className="text-xs bg-slate-600 p-2 rounded">
                                                    <div className="font-mono font-semibold text-blue-300">{col.name}</div>
                                                    <div className="text-gray-300">{col.type}</div>
                                                    {col.columnType?.columnType && (
                                                        <div className="text-gray-400">{col.columnType.columnType}</div>
                                                    )}
                                                    <div className="text-gray-500 text-xs mt-1">
                                                        {col.primaryKey && <span className="bg-green-900 px-2 py-0.5 rounded mr-1">PK</span>}
                                                        {col.foreignKey && <span className="bg-yellow-900 px-2 py-0.5 rounded mr-1">FK</span>}
                                                        {col.sequence && <span className="bg-purple-900 px-2 py-0.5 rounded">AUTO</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full w-full bg-slate-700 text-gray-400 flex items-center justify-center flex-col gap-3">
                                <p className="text-sm">Select a table to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {showAddTablesModal && activeProject && (
            <AddTablesModal
                project={activeProject}
                onClose={() => setShowAddTablesModal(false)}
                onTablesAdded={(updatedProject: ProjectData) => {
                    setShowAddTablesModal(false);
                    onProjectSchemasUpdated?.(updatedProject);
                }}
            />
        )}

        {contextMenu && ReactDOM.createPortal(
            <div
                style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
                className="bg-slate-800 border border-slate-600 rounded shadow-lg py-1 min-w-[160px]"
                onMouseLeave={() => setContextMenu(null)}
            >
                <div className="px-3 py-1 text-xs text-gray-400 border-b border-slate-600 mb-1 truncate max-w-[200px]">
                    {contextMenu.nodeId.substring(contextMenu.nodeId.indexOf(".") + 1)}
                </div>
                <button
                    className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 hover:text-red-300 transition"
                    onClick={() => handleRemoveNode(contextMenu.nodeId)}
                >
                    Remove from view
                </button>
            </div>,
            document.body
        )}
        </>
    );
};

export default SchemaView;
