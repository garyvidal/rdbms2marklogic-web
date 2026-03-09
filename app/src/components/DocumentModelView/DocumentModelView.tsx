import React, { useState, useCallback } from 'react';
import { FaFileCode, FaPlus, FaCode } from 'react-icons/fa';
import type {
    ProjectData,
    ProjectMapping,
    XmlTableMapping,
    XmlColumnMapping,
    XmlSchemaType,
    TableMappingType,
} from '@/services/projectService';
import { convertCaseFromSetting } from '@/lib/caseConverter';
import { mapSqlTypeToXsd } from '@/lib/typeMapper';
import MappingTableCard from './MappingTableCard';
import CustomElementDialog from './CustomElementDialog';

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
    parentRef?: string,
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
        parentRef,
        columns,
    };
}

function emptyMapping(): ProjectMapping {
    return { documentModel: { elements: [] } };
}

type PopoverStep = 'type' | 'inline-parent';

export default function DocumentModelView({
    project,
    pendingTable,
    onPendingTableConsumed,
    onMappingChange,
}: DocumentModelViewProps) {
    const mapping = project.mapping ?? emptyMapping();
    const { root, elements } = mapping.documentModel;

    const [showPopover, setShowPopover] = useState(false);
    const [popoverStep, setPopoverStep] = useState<PopoverStep>('type');
    const [inlineParentRef, setInlineParentRef] = useState<string>('');
    const [showCustomDialog, setShowCustomDialog] = useState(false);

    // Show the popover whenever a new pending table arrives.
    React.useEffect(() => {
        if (pendingTable) {
            setShowPopover(true);
            setPopoverStep('type');
            setInlineParentRef('');
        }
    }, [pendingTable]);

    // Options for inline-element parent selection: root + non-CUSTOM elements
    const parentOptions = [
        ...(root ? [{ xmlName: root.xmlName, label: `Root: <${root.xmlName}>` }] : []),
        ...(elements ?? [])
            .filter(e => e.mappingType === 'Elements' || e.mappingType === 'InlineElement')
            .map(e => ({ xmlName: e.xmlName, label: `Element: <${e.xmlName}>` })),
    ];

    const handleAddMapping = useCallback((type: TableMappingType, parentRef?: string) => {
        if (!pendingTable) return;
        const { tableName, schemaName } = pendingTable;
        const newMap = buildTableMapping(tableName, schemaName, project, type, parentRef);

        let updatedDocModel: ProjectMapping['documentModel'];
        if (type === 'RootElement') {
            updatedDocModel = { root: newMap, elements: elements ?? [] };
        } else {
            updatedDocModel = { root, elements: [...(elements ?? []), newMap] };
        }

        onMappingChange({ ...project, mapping: { documentModel: updatedDocModel } });
        setShowPopover(false);
        setPopoverStep('type');
        onPendingTableConsumed();
    }, [pendingTable, project, root, elements, onMappingChange, onPendingTableConsumed]);

    const handleDismissPopover = () => {
        setShowPopover(false);
        setPopoverStep('type');
        onPendingTableConsumed();
    };

    const handleInlineElementClick = () => {
        if (parentOptions.length === 0) return;
        setInlineParentRef(parentOptions[0].xmlName);
        setPopoverStep('inline-parent');
    };

    const handleAddCustom = useCallback((xmlName: string, xmlType: XmlSchemaType, cols: XmlColumnMapping[], customFunction: string) => {
        const customMap: XmlTableMapping = {
            sourceSchema: '',
            sourceTable: '',
            xmlName,
            mappingType: 'CUSTOM',
            wrapInParent: false,
            columns: cols,
            customFunction,
            xmlType,
        };
        onMappingChange({
            ...project,
            mapping: { documentModel: { root, elements: [...(elements ?? []), customMap] } },
        });
        setShowCustomDialog(false);
    }, [project, root, elements, onMappingChange]);

    const handleCardChange = useCallback((updated: XmlTableMapping) => {
        let updatedDocModel: ProjectMapping['documentModel'];
        if (updated.mappingType === 'RootElement' && root?.sourceTable === updated.sourceTable && root?.sourceSchema === updated.sourceSchema) {
            updatedDocModel = { root: updated, elements: elements ?? [] };
        } else {
            updatedDocModel = {
                root,
                elements: (elements ?? []).map(e =>
                    e.sourceTable === updated.sourceTable && e.sourceSchema === updated.sourceSchema && e.mappingType === updated.mappingType
                        ? updated : e
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
    const normalElements = (elements ?? []).filter(e => e.mappingType !== 'CUSTOM');
    const customElements = (elements ?? []).filter(e => e.mappingType === 'CUSTOM');

    const elementCountLabel = [
        root ? '1 root' : '',
        normalElements.length > 0 ? `${normalElements.length} element${normalElements.length !== 1 ? 's' : ''}` : '',
        customElements.length > 0 ? `${customElements.length} custom` : '',
    ].filter(Boolean).join(', ');

    return (
        <div className="flex flex-col h-full bg-slate-800 text-white relative overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-600 shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <FaFileCode size={14} className="text-cyan-400" />
                    Document Model
                    <span className="text-xs text-gray-500">— {project.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {hasMapping && (
                        <span className="text-xs text-gray-500">{elementCountLabel}</span>
                    )}
                    <button
                        onClick={() => setShowCustomDialog(true)}
                        title="Add a custom computed element"
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/50 hover:border-amber-500 transition"
                    >
                        <FaPlus size={9} />
                        <FaCode size={9} />
                        Custom
                    </button>
                </div>
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
                        {popoverStep === 'type' ? (
                            <>
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
                                    <button
                                        onClick={handleInlineElementClick}
                                        disabled={parentOptions.length === 0}
                                        className="w-full text-left px-4 py-3 rounded border transition
                                            enabled:border-violet-600 enabled:bg-violet-900/30 enabled:hover:bg-violet-900/60 enabled:text-white
                                            disabled:border-slate-600 disabled:bg-slate-800 disabled:text-gray-600 disabled:cursor-not-allowed"
                                    >
                                        <div className="font-semibold text-sm">Inline Element</div>
                                        <div className="text-xs mt-0.5 text-gray-400">
                                            {parentOptions.length === 0
                                                ? 'Add a Root or Elements mapping first'
                                                : 'Nests this table inside another element'}
                                        </div>
                                    </button>
                                </div>
                                <button
                                    onClick={handleDismissPopover}
                                    className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-white mb-1">Select Parent</p>
                                <p className="text-xs text-gray-400 mb-3">
                                    <span className="text-violet-300 font-mono">{pendingTable.schemaName}.{pendingTable.tableName}</span> will be nested inside:
                                </p>
                                <div className="space-y-1 mb-4">
                                    {parentOptions.map(p => (
                                        <button
                                            key={p.xmlName}
                                            onClick={() => setInlineParentRef(p.xmlName)}
                                            className={`w-full text-left px-3 py-2 rounded border text-sm font-mono transition ${
                                                inlineParentRef === p.xmlName
                                                    ? 'border-violet-500 bg-violet-900/40 text-violet-200'
                                                    : 'border-slate-600 bg-slate-800 text-gray-300 hover:border-slate-400'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPopoverStep('type')}
                                        className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-600 text-gray-400 hover:text-white hover:border-slate-400 transition"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => handleAddMapping('InlineElement', inlineParentRef)}
                                        disabled={!inlineParentRef}
                                        className="flex-1 px-3 py-1.5 text-xs font-semibold rounded transition
                                            enabled:bg-violet-700 enabled:hover:bg-violet-600 enabled:text-white
                                            disabled:bg-slate-700 disabled:text-gray-600 disabled:cursor-not-allowed"
                                    >
                                        Add Inline
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Custom element dialog */}
            {showCustomDialog && (
                <CustomElementDialog
                    mapping={mapping}
                    onConfirm={handleAddCustom}
                    onCancel={() => setShowCustomDialog(false)}
                />
            )}

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!hasMapping && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                        <FaFileCode size={32} className="opacity-30" />
                        <p className="text-sm">Click a table in the left panel to start mapping</p>
                        <p className="text-xs text-gray-600">You'll be asked whether it's a Root Element, Elements, or Inline Element</p>
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

                {/* Elements + Inline Elements */}
                {normalElements.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1 mt-4">Elements</div>
                        <div className="space-y-2">
                            {normalElements.map((el, i) => {
                                // Index in the full elements array for removal
                                const fullIndex = (elements ?? []).indexOf(el);
                                return (
                                    <MappingTableCard
                                        key={`${el.sourceSchema}.${el.sourceTable}.${el.mappingType}.${i}`}
                                        mapping={el}
                                        onChange={handleCardChange}
                                        onRemove={() => handleRemoveElement(fullIndex)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Custom elements */}
                {customElements.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1 mt-4">Custom Elements</div>
                        <div className="space-y-2">
                            {customElements.map((el, i) => {
                                const fullIndex = (elements ?? []).indexOf(el);
                                return (
                                    <MappingTableCard
                                        key={`custom.${el.xmlName}.${i}`}
                                        mapping={el}
                                        onChange={handleCardChange}
                                        onRemove={() => handleRemoveElement(fullIndex)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
