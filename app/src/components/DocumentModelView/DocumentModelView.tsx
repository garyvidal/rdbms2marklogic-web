import React, { useState, useCallback } from 'react';
import { FaFileCode } from 'react-icons/fa';
import type {
    ProjectData,
    ProjectMapping,
    XmlTableMapping,
    XmlColumnMapping,
    TableMappingType,
} from '@/services/projectService';
import { convertCaseFromSetting } from '@/lib/caseConverter';
import { mapSqlTypeToXsd } from '@/lib/typeMapper';
import MappingTableCard from './MappingTableCard';

interface DocumentModelViewProps {
    project: ProjectData;
    /** Table the user clicked in ProjectPanel (null when no pending action). */
    pendingTable: { tableName: string; schemaName: string } | null;
    onPendingTableConsumed: () => void;
    onMappingChange: (updatedProject: ProjectData) => void;
}

/** Build a full XmlTableMapping for a given table using the project's column data. */
function buildTableMapping(
    tableName: string,
    schemaName: string,
    project: ProjectData,
    mappingType: TableMappingType,
): XmlTableMapping {
    const namingCase = project.settings?.defaultCasing ?? 'SNAKE';
    const tableColumns = project.schemas[schemaName]?.tables?.[tableName]?.columns ?? {};

    const columns: XmlColumnMapping[] = Object.values(tableColumns).map(col => ({
        sourceColumn: col.name,
        xmlName: convertCaseFromSetting(col.name, namingCase),
        xmlType: mapSqlTypeToXsd(col.type ?? ''),
        mappingType: 'Element',
    }));

    return {
        sourceSchema: schemaName,
        sourceTable: tableName,
        xmlName: convertCaseFromSetting(tableName, namingCase),
        mappingType,
        wrapInParent: mappingType === 'Elements',
        wrapperElementName: mappingType === 'Elements' ? '' : undefined,
        columns,
    };
}

function emptyMapping(): ProjectMapping {
    return { documentModel: { elements: [] } };
}

export default function DocumentModelView({
    project,
    pendingTable,
    onPendingTableConsumed,
    onMappingChange,
}: DocumentModelViewProps) {
    const mapping = project.mapping ?? emptyMapping();
    const { root, elements } = mapping.documentModel;

    /** Whether a popover asking RootElement vs Elements is shown. */
    const [showPopover, setShowPopover] = useState(false);

    // Show the popover whenever a new pending table arrives.
    React.useEffect(() => {
        if (pendingTable) setShowPopover(true);
    }, [pendingTable]);

    const handleAddMapping = useCallback((type: TableMappingType) => {
        if (!pendingTable) return;
        const { tableName, schemaName } = pendingTable;
        const newMap = buildTableMapping(tableName, schemaName, project, type);

        let updatedDocModel: ProjectMapping['documentModel'];
        if (type === 'RootElement') {
            updatedDocModel = { root: newMap, elements: elements ?? [] };
        } else {
            updatedDocModel = { root, elements: [...(elements ?? []), newMap] };
        }

        const updatedProject: ProjectData = {
            ...project,
            mapping: { documentModel: updatedDocModel },
        };
        onMappingChange(updatedProject);
        setShowPopover(false);
        onPendingTableConsumed();
    }, [pendingTable, project, root, elements, onMappingChange, onPendingTableConsumed]);

    const handleDismissPopover = () => {
        setShowPopover(false);
        onPendingTableConsumed();
    };

    const handleCardChange = useCallback((updated: XmlTableMapping) => {
        let updatedDocModel: ProjectMapping['documentModel'];
        if (updated.mappingType === 'RootElement' && root?.sourceTable === updated.sourceTable && root?.sourceSchema === updated.sourceSchema) {
            updatedDocModel = { root: updated, elements: elements ?? [] };
        } else {
            updatedDocModel = {
                root,
                elements: (elements ?? []).map(e =>
                    e.sourceTable === updated.sourceTable && e.sourceSchema === updated.sourceSchema ? updated : e
                ),
            };
        }
        onMappingChange({ ...project, mapping: { documentModel: updatedDocModel } });
    }, [project, root, elements, onMappingChange]);

    const handleRemoveRoot = useCallback(() => {
        onMappingChange({
            ...project,
            mapping: { documentModel: { root: undefined, elements: elements ?? [] } },
        });
    }, [project, elements, onMappingChange]);

    const handleRemoveElement = useCallback((index: number) => {
        const updated = (elements ?? []).filter((_, i) => i !== index);
        onMappingChange({
            ...project,
            mapping: { documentModel: { root, elements: updated } },
        });
    }, [project, root, elements, onMappingChange]);

    const hasMapping = root || (elements && elements.length > 0);

    return (
        <div className="flex flex-col h-full bg-slate-800 text-white relative overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-600 shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <FaFileCode size={14} className="text-cyan-400" />
                    Document Model
                    <span className="text-xs text-gray-500">— {project.name}</span>
                </div>
                {hasMapping && (
                    <span className="text-xs text-gray-500">
                        {root ? '1 root' : ''}
                        {root && elements && elements.length > 0 ? ', ' : ''}
                        {elements && elements.length > 0 ? `${elements.length} element group${elements.length !== 1 ? 's' : ''}` : ''}
                    </span>
                )}
            </div>

            {/* Popover: choose mapping type */}
            {showPopover && pendingTable && (
                <div className="absolute inset-0 bg-black/50 flex items-start justify-center pt-24 z-20"
                    onClick={handleDismissPopover}
                >
                    <div
                        className="bg-slate-700 rounded-lg shadow-2xl border border-slate-500 w-80 p-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-sm font-semibold text-white mb-1">
                            Add <span className="text-cyan-300 font-mono">{pendingTable.schemaName}.{pendingTable.tableName}</span>
                        </p>
                        <p className="text-xs text-gray-400 mb-4">How should this table appear in the XML document model?</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleAddMapping('RootElement')}
                                disabled={!!root}
                                className="w-full text-left px-4 py-3 rounded border transition
                                    enabled:border-cyan-600 enabled:bg-cyan-900/30 enabled:hover:bg-cyan-900/60 enabled:text-white
                                    disabled:border-slate-600 disabled:bg-slate-800 disabled:text-gray-600 disabled:cursor-not-allowed"
                            >
                                <div className="font-semibold text-sm">Root Element</div>
                                <div className="text-xs mt-0.5 text-gray-400">
                                    {root
                                        ? `Root already set to <${root.xmlName}>`
                                        : 'Creates the top-level XML element for each row'}
                                </div>
                            </button>
                            <button
                                onClick={() => handleAddMapping('Elements')}
                                className="w-full text-left px-4 py-3 rounded border border-slate-500 bg-slate-800 hover:border-slate-400 hover:bg-slate-700 text-white transition"
                            >
                                <div className="font-semibold text-sm">Elements</div>
                                <div className="text-xs mt-0.5 text-gray-400">Creates a nested sequence of child elements</div>
                            </button>
                        </div>
                        <button
                            onClick={handleDismissPopover}
                            className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!hasMapping && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                        <FaFileCode size={32} className="opacity-30" />
                        <p className="text-sm">Click a table in the left panel to start mapping</p>
                        <p className="text-xs text-gray-600">You'll be asked whether it's a Root Element or Elements group</p>
                    </div>
                )}

                {/* Root element card */}
                {root && (
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">Root Element</div>
                        <MappingTableCard
                            mapping={root}
                            onChange={handleCardChange}
                            onRemove={handleRemoveRoot}
                        />
                    </div>
                )}

                {/* Elements groups */}
                {elements && elements.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1 mt-4">Elements Groups</div>
                        <div className="space-y-2">
                            {elements.map((el, i) => (
                                <MappingTableCard
                                    key={`${el.sourceSchema}.${el.sourceTable}.${i}`}
                                    mapping={el}
                                    onChange={handleCardChange}
                                    onRemove={() => handleRemoveElement(i)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
