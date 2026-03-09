import React from 'react';
import { FaTimes, FaTag, FaLayerGroup, FaCode } from 'react-icons/fa';
import type { XmlTableMapping, ColumnMappingType, XmlSchemaType } from '@/services/projectService';

interface MappingTableCardProps {
    mapping: XmlTableMapping;
    onChange: (updated: XmlTableMapping) => void;
    onRemove: () => void;
}

const XML_TYPE_COLOR: Record<XmlSchemaType, string> = {
    'xs:string':   'bg-blue-900 text-blue-300',
    'xs:integer':  'bg-purple-900 text-purple-300',
    'xs:long':     'bg-purple-900 text-purple-300',
    'xs:date':     'bg-green-900 text-green-300',
    'xs:dateTime': 'bg-green-900 text-green-300',
    'xs:boolean':  'bg-yellow-900 text-yellow-300',
};

const MAPPING_TYPE_LABELS: Record<ColumnMappingType, string> = {
    Element:          'Element',
    ElementAttribute: 'Attr',
};

export default function MappingTableCard({ mapping, onChange, onRemove }: MappingTableCardProps) {
    const isRoot = mapping.mappingType === 'RootElement';
    // Default true for backwards-compat with existing records that lack the field
    const wrapInParent = mapping.wrapInParent !== false;

    const toggleColumnType = (index: number) => {
        const cols = mapping.columns.map((col, i) =>
            i !== index ? col : {
                ...col,
                mappingType: (col.mappingType === 'Element' ? 'ElementAttribute' : 'Element') as ColumnMappingType,
            }
        );
        onChange({ ...mapping, columns: cols });
    };

    const removeColumn = (index: number) => {
        onChange({ ...mapping, columns: mapping.columns.filter((_, i) => i !== index) });
    };

    const updateXmlName = (index: number, name: string) => {
        const cols = mapping.columns.map((col, i) =>
            i !== index ? col : { ...col, xmlName: name }
        );
        onChange({ ...mapping, columns: cols });
    };

    const updateChildName = (name: string) => {
        onChange({ ...mapping, xmlName: name });
    };

    const updateWrapperName = (name: string) => {
        onChange({ ...mapping, wrapperElementName: name });
    };

    const toggleWrapInParent = () => {
        onChange({ ...mapping, wrapInParent: !wrapInParent, wrapperElementName: !wrapInParent ? (mapping.wrapperElementName ?? '') : undefined });
    };

    return (
        <div className="bg-slate-700 rounded border border-slate-600 overflow-hidden">
            {/* Card header */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b border-slate-600 ${isRoot ? 'bg-cyan-900/40' : 'bg-slate-600'}`}>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-gray-300 shrink-0">
                    {isRoot ? 'ROOT' : 'ELEMENTS'}
                </span>

                {isRoot ? (
                    /* Root: always has a single root element name, no wrap concept */
                    <>
                        <span className="text-xs text-gray-400 shrink-0">&lt;</span>
                        <input
                            value={mapping.xmlName}
                            onChange={e => updateChildName(e.target.value)}
                            className="flex-1 min-w-0 bg-transparent text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
                        />
                        <span className="text-xs text-gray-400 shrink-0">&gt;</span>
                    </>
                ) : (
                    /* Elements group: wrap toggle + wrapper name (optional) + child element name */
                    <>
                        <button
                            onClick={toggleWrapInParent}
                            title={wrapInParent ? 'Wrapper ON — click to remove' : 'Wrapper OFF — click to add'}
                            className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition border ${
                                wrapInParent
                                    ? 'border-cyan-600 bg-cyan-900/40 text-cyan-300 hover:border-cyan-400'
                                    : 'border-slate-500 bg-slate-800 text-gray-500 hover:border-slate-400'
                            }`}
                        >
                            <FaCode size={9} />
                            <span>Wrap</span>
                        </button>

                        {wrapInParent && (
                            <>
                                <span className="text-xs text-gray-400 shrink-0">&lt;</span>
                                <input
                                    value={mapping.wrapperElementName ?? ''}
                                    onChange={e => updateWrapperName(e.target.value)}
                                    placeholder="wrapperElement"
                                    title="Wrapper element name"
                                    className="w-28 min-w-0 bg-slate-800/60 border border-slate-500 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1.5 py-0.5"
                                />
                                <span className="text-xs text-gray-400 shrink-0">&gt;</span>
                                <span className="text-xs text-gray-600 shrink-0">›</span>
                            </>
                        )}

                        {/* Child element name — always present for Elements */}
                        <span className="text-xs text-gray-400 shrink-0">&lt;</span>
                        <input
                            value={mapping.xmlName}
                            onChange={e => updateChildName(e.target.value)}
                            placeholder="childElement"
                            title="Child element name"
                            className="w-28 min-w-0 bg-slate-800/60 border border-slate-500 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1.5 py-0.5"
                        />
                        <span className="text-xs text-gray-400 shrink-0">&gt;</span>
                    </>
                )}

                <span className="text-xs text-gray-500 ml-1 shrink-0 truncate max-w-[120px]" title={`${mapping.sourceSchema}.${mapping.sourceTable}`}>
                    {mapping.sourceSchema}.{mapping.sourceTable}
                </span>
                <button
                    onClick={onRemove}
                    className="ml-auto text-gray-500 hover:text-red-400 transition shrink-0"
                    title="Remove entire table mapping"
                >
                    <FaTimes size={12} />
                </button>
            </div>

            {/* Column rows */}
            <div className="divide-y divide-slate-600/40">
                {mapping.columns.length === 0 && (
                    <div className="px-4 py-3 text-xs text-gray-500 italic">No columns — all removed</div>
                )}
                {mapping.columns.map((col, i) => (
                    <div key={col.sourceColumn} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-600/50 transition group">
                        {/* Toggle button: Element / ElementAttribute */}
                        <button
                            onClick={() => toggleColumnType(i)}
                            title={col.mappingType === 'Element' ? 'Switch to ElementAttribute' : 'Switch to Element'}
                            className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition border ${
                                col.mappingType === 'Element'
                                    ? 'border-slate-500 bg-slate-800 text-gray-300 hover:border-cyan-500'
                                    : 'border-cyan-600 bg-cyan-900/40 text-cyan-300 hover:border-cyan-400'
                            }`}
                        >
                            {col.mappingType === 'Element'
                                ? <FaLayerGroup size={9} />
                                : <FaTag size={9} />
                            }
                            <span>{MAPPING_TYPE_LABELS[col.mappingType]}</span>
                        </button>

                        {/* XML name (editable) */}
                        <input
                            value={col.xmlName}
                            onChange={e => updateXmlName(i, e.target.value)}
                            className="flex-1 min-w-0 bg-transparent font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
                        />

                        {/* XSD type chip */}
                        <span className={`shrink-0 px-1.5 py-0.5 rounded font-mono text-xs ${XML_TYPE_COLOR[col.xmlType]}`}>
                            {col.xmlType}
                        </span>

                        {/* Source column */}
                        <span className="shrink-0 text-gray-500 truncate max-w-[100px]" title={col.sourceColumn}>
                            {col.sourceColumn}
                        </span>

                        {/* Remove column — shown on row hover */}
                        <button
                            onClick={() => removeColumn(i)}
                            title="Remove this column from mapping"
                            className="shrink-0 text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                        >
                            <FaTimes size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
