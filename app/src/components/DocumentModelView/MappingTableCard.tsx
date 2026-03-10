import React, { useState, useRef, useCallback } from 'react';
import { FaTimes, FaTag, FaLayerGroup, FaLink, FaGripVertical, FaChevronDown, FaChevronUp, FaPlus, FaDatabase } from 'react-icons/fa';
import type { XmlTableMapping, ColumnMappingType, XmlSchemaType } from '@/services/ProjectService';

// ── FunctionTextarea: textarea with field-name autocomplete ───────────────────

interface FunctionTextareaProps {
    value: string;
    onChange: (v: string) => void;
    fieldNames: string[];
    placeholder?: string;
    rows?: number;
    className?: string;
    onMouseDown?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
}

function getTokenAtCursor(text: string, cursor: number): { token: string; start: number } {
    let start = cursor;
    while (start > 0 && /[\w.]/.test(text[start - 1])) start--;
    return { token: text.slice(start, cursor), start };
}

function FunctionTextarea({ value, onChange, fieldNames, placeholder, rows = 5, className, onMouseDown }: FunctionTextareaProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const computeSuggestions = useCallback((text: string, cursor: number): string[] => {
        const { token } = getTokenAtCursor(text, cursor);
        if (!token) return [];

        // fields.xxx → suggest matching column names as completions
        const fieldsMatch = token.match(/^fields\.(\w*)$/);
        if (fieldsMatch) {
            const partial = fieldsMatch[1].toLowerCase();
            return fieldNames
                .filter(f => f.toLowerCase().startsWith(partial))
                .map(f => `fields.${f}`);
        }

        // partial word → suggest 'fields' if it matches
        if (token.length >= 1 && 'fields'.startsWith(token.toLowerCase()) && token.toLowerCase() !== 'fields') {
            return ['fields'];
        }

        return [];
    }, [fieldNames]);

    const applySuggestion = useCallback((suggestion: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const cursor = ta.selectionStart ?? 0;
        const { start } = getTokenAtCursor(value, cursor);
        const newValue = value.slice(0, start) + suggestion + value.slice(cursor);
        onChange(newValue);
        setSuggestions([]);
        const newCursor = start + suggestion.length;
        requestAnimationFrame(() => {
            ta.selectionStart = newCursor;
            ta.selectionEnd = newCursor;
            ta.focus();
        });
    }, [value, onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        const cursor = e.target.selectionStart ?? 0;
        setSuggestions(computeSuggestions(e.target.value, cursor));
        setSelectedIdx(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            applySuggestion(suggestions[selectedIdx]);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        }
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                onMouseDown={onMouseDown}
                rows={rows}
                spellCheck={false}
                placeholder={placeholder}
                className={className}
            />
            {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-slate-800 border border-amber-700 rounded shadow-lg overflow-hidden mt-0.5">
                    {suggestions.map((s, idx) => (
                        <div
                            key={s}
                            onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
                            className={`px-2 py-1 text-xs font-mono cursor-pointer ${
                                idx === selectedIdx
                                    ? 'bg-amber-900/60 text-amber-200'
                                    : 'text-green-300 hover:bg-slate-700'
                            }`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
    'xs:boolean':   'bg-yellow-900 text-yellow-300',
    'xs:decimal':   'bg-purple-900 text-purple-300',
    'xs:hexBinary': 'bg-orange-900 text-orange-300',
};

const MAPPING_TYPE_LABELS: Record<ColumnMappingType, string> = {
    Element:          'Element',
    ElementAttribute: 'Attr',
    CUSTOM:           'Ref',
};

const BADGE_LABEL: Record<string, string> = {
    RootElement:   'ROOT',
    Elements:      'ELEMENTS',
    InlineElement: 'INLINE',
    CUSTOM:        'CUSTOM',
};

const HEADER_BG: Record<string, string> = {
    RootElement:   'bg-cyan-900/40',
    Elements:      'bg-slate-600',
    InlineElement: 'bg-violet-900/40',
    CUSTOM:        'bg-amber-900/30',
};

const ACCENT: Record<string, string> = {
    RootElement:   'text-cyan-300',
    Elements:      'text-gray-200',
    InlineElement: 'text-violet-300',
    CUSTOM:        'text-amber-300',
};

const DND_KEY = 'application/x-row-index';

export default function MappingTableCard({ mapping, onChange, onRemove }: MappingTableCardProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    /** Index of custom field row whose fn editor is open (-1 = none). */
    const [expandedFnIndex, setExpandedFnIndex] = useState(-1);
    /** Index of DB column row whose relational info panel is open (-1 = none). */
    const [expandedSourceIndex, setExpandedSourceIndex] = useState(-1);
    /** Index of the row currently being dragged (-1 = none). */
    const [dragIndex, setDragIndex] = useState(-1);
    /** Index before which the drop indicator line should appear (-1 = none). */
    const [insertBefore, setInsertBefore] = useState(-1);

    /**
     * Guard: only drags that originate on the grip handle are allowed.
     * This prevents clicking an input from accidentally starting a drag.
     */
    const gripPressed = useRef(false);

    const isInline = mapping.mappingType === 'InlineElement';
    const isCustom = mapping.mappingType === 'CUSTOM';
    const isElems  = mapping.mappingType === 'Elements';
    const wrapInParent = mapping.wrapInParent !== false;

    // ── column mutation helpers ───────────────────────────────────────────────
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

    const XSD_TYPES: XmlSchemaType[] = ['xs:string', 'xs:integer', 'xs:long', 'xs:decimal', 'xs:date', 'xs:dateTime', 'xs:boolean','xs:hexBinary'];

    /** DB column names available as `fields.X` in custom functions */
    const availableFieldNames = mapping.columns
        .filter(c => c.sourceColumn !== '')
        .map(c => c.sourceColumn);

    const addCustomField = () => {
        onChange({ ...mapping, columns: [...mapping.columns, { sourceColumn: '', xmlName: 'customField', xmlType: 'xs:string' as XmlSchemaType, mappingType: 'Element' as ColumnMappingType }] });
    };

    const updateColumnFn = (index: number, fn: string) => {
        onChange({ ...mapping, columns: mapping.columns.map((c, i) => i !== index ? c : { ...c, customFunction: fn }) });
    };

    const toggleWrapInParent = () => {
        onChange({
            ...mapping,
            wrapInParent: !wrapInParent,
            wrapperElementName: !wrapInParent ? (mapping.wrapperElementName ?? '') : undefined,
        });
    };

    // ── drag-and-drop ─────────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, i: number) => {
        if (!gripPressed.current) {
            e.preventDefault();
            return;
        }
        gripPressed.current = false;
        e.dataTransfer.effectAllowed = 'move';
        // Store the source index in the transfer payload — this is the reliable
        // way to read it in onDrop, independent of React state timing.
        e.dataTransfer.setData(DND_KEY, String(i));
        // Delay the state change so the drag ghost captures the row before it fades.
        setTimeout(() => setDragIndex(i), 0);
    };

    const handleDragOver = (e: React.DragEvent, i: number) => {
        if (!e.dataTransfer.types.includes(DND_KEY)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setInsertBefore(i);
    };

    /** Drop after the last row */
    const handleDragOverEnd = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DND_KEY)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setInsertBefore(mapping.columns.length);
    };

    const handleDrop = (e: React.DragEvent, target: number) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData(DND_KEY), 10);
        resetDrag();
        if (isNaN(from) || from === target || from === target - 1) return;
        const cols = [...mapping.columns];
        const [moved] = cols.splice(from, 1);
        // Adjust target index after removal
        const adjustedTarget = target > from ? target - 1 : target;
        cols.splice(adjustedTarget, 0, moved);
        onChange({ ...mapping, columns: cols });
    };

    const resetDrag = () => {
        setDragIndex(-1);
        setInsertBefore(-1);
        gripPressed.current = false;
    };

    // ── derived display values ────────────────────────────────────────────────
    const headerBg = HEADER_BG[mapping.mappingType] ?? 'bg-slate-600';
    const badge    = BADGE_LABEL[mapping.mappingType] ?? mapping.mappingType;
    const accent   = ACCENT[mapping.mappingType] ?? 'text-gray-200';

    const DropLine = ({ before }: { before: number }) =>
        insertBefore === before && dragIndex >= 0 ? (
            <div
                className="h-0.5 bg-cyan-400 mx-2 rounded-full pointer-events-none"
                style={{ boxShadow: '0 0 6px 1px rgb(34 211 238 / 0.6)' }}
            />
        ) : null;

    return (
        <div className="bg-slate-700 rounded border border-slate-600 overflow-hidden">

            {/* ── Compact header ───────────────────────────────────────────── */}
            <div className={`flex items-center gap-2 px-3 py-2 ${headerBg}`}>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 shrink-0 ${accent}`}>
                    {badge}
                </span>

                <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                    {isInline && mapping.parentRef && (
                        <>
                            <FaLink size={8} className="text-violet-400 shrink-0" />
                            <span className="text-xs text-violet-400 font-mono shrink-0 max-w-[80px] truncate"
                                  title={mapping.parentRef}>
                                {mapping.parentRef}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">›</span>
                        </>
                    )}
                    <span className={`text-sm font-mono truncate ${accent}`}>
                        &lt;{mapping.xmlName || '…'}&gt;
                    </span>
                    {!isCustom && (
                        <span className="text-xs text-gray-500 ml-1 shrink-0 truncate max-w-[110px]"
                              title={`${mapping.sourceSchema}.${mapping.sourceTable}`}>
                            {mapping.sourceSchema}.{mapping.sourceTable}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setSettingsOpen(v => !v)}
                    title={settingsOpen ? 'Close settings' : 'Edit settings'}
                    className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition border ${
                        settingsOpen
                            ? 'border-slate-400 bg-slate-600 text-white'
                            : 'border-slate-600 bg-transparent text-gray-400 hover:text-gray-200 hover:border-slate-500'
                    }`}
                >
                    {settingsOpen ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                </button>

                <button
                    onClick={onRemove}
                    className="shrink-0 text-gray-400 hover:text-red-400 transition"
                    title="Remove entire table mapping"
                >
                    <FaTimes size={12} />
                </button>
            </div>

            {/* ── Settings panel ────────────────────────────────────────────── */}
            {settingsOpen && (
                <div className="px-4 py-3 border-b border-slate-600 bg-slate-800/70 space-y-3">

                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-24 shrink-0">Element Name</label>
                        <span className="text-xs text-gray-500">&lt;</span>
                        <input
                            value={mapping.xmlName}
                            onChange={e => onChange({ ...mapping, xmlName: e.target.value })}
                            className="flex-1 min-w-0 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <span className="text-xs text-gray-500">&gt;</span>
                    </div>

                    {isInline && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 w-24 shrink-0">Nested Under</label>
                            <span className="text-xs font-mono text-violet-300 bg-violet-900/20 border border-violet-800 px-2 py-1 rounded">
                                {mapping.parentRef || '(none)'}
                            </span>
                        </div>
                    )}

                    {isElems && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 w-24 shrink-0">Wrap In Parent</label>
                                <button
                                    onClick={toggleWrapInParent}
                                    className={`px-2 py-1 rounded text-xs font-medium border transition ${
                                        wrapInParent
                                            ? 'border-cyan-600 bg-cyan-900/40 text-cyan-300 hover:border-cyan-400'
                                            : 'border-slate-500 bg-slate-700 text-gray-500 hover:border-slate-400'
                                    }`}
                                >
                                    {wrapInParent ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                            {wrapInParent && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 w-24 shrink-0">Wrapper Name</label>
                                    <span className="text-xs text-gray-500">&lt;</span>
                                    <input
                                        value={mapping.wrapperElementName ?? ''}
                                        onChange={e => onChange({ ...mapping, wrapperElementName: e.target.value })}
                                        placeholder="wrapperElement"
                                        className="flex-1 min-w-0 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                    <span className="text-xs text-gray-500">&gt;</span>
                                </div>
                            )}
                        </>
                    )}

                    {isCustom && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 w-24 shrink-0">Return Type</label>
                                <select
                                    value={mapping.xmlType ?? 'xs:string'}
                                    onChange={e => onChange({ ...mapping, xmlType: e.target.value as XmlSchemaType })}
                                    className={`rounded font-mono text-xs px-1.5 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${XML_TYPE_COLOR[mapping.xmlType ?? 'xs:string'] ?? 'bg-slate-700 text-gray-400'}`}
                                >
                                    {XSD_TYPES.map(t => (
                                        <option key={t} value={t} className="bg-slate-800 text-gray-200">{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    JavaScript Function
                                    <span className="text-gray-600 ml-1">
                                        — <code className="text-amber-300">fields</code> contains referenced columns
                                    </span>
                                </label>
                                <FunctionTextarea
                                    value={mapping.customFunction ?? ''}
                                    onChange={v => onChange({ ...mapping, customFunction: v })}
                                    fieldNames={availableFieldNames}
                                    rows={6}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-green-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y leading-relaxed"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Column rows ───────────────────────────────────────────────── */}
            {/* Drop zone covers the whole column list area */}
            <div onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) resetDrag(); }}>
                {mapping.columns.length === 0 && (
                    <div className="px-4 py-3 text-xs text-gray-500 italic">
                        {isCustom ? 'No field references' : 'No columns — all removed'}
                    </div>
                )}

                {mapping.columns.map((col, i) => {
                    const isRef        = col.mappingType === 'CUSTOM';
                    const isCustomCol  = col.sourceColumn === '';
                    const isDragging   = dragIndex === i;

                    return (
                        <React.Fragment key={`col-${i}-${col.sourceColumn}`}>
                            {/* Insert indicator ABOVE row i */}
                            <DropLine before={i} />

                            <div
                                draggable
                                onDragStart={e => handleDragStart(e, i)}
                                onDragOver={e => handleDragOver(e, i)}
                                onDrop={e => handleDrop(e, i)}
                                onDragEnd={resetDrag}
                                className={`flex items-center gap-2 px-2 py-1.5 text-xs border-t border-slate-600/40 transition-colors group select-none ${
                                    isDragging
                                        ? 'opacity-30 bg-slate-500/30'
                                        : 'hover:bg-slate-600/50'
                                }`}
                            >
                                {/* Grip handle — only this activates drag */}
                                <span
                                    title="Drag to reorder"
                                    className="shrink-0 text-gray-400 hover:text-gray-200 cursor-grab active:cursor-grabbing"
                                    onMouseDown={() => { gripPressed.current = true; }}
                                    onMouseUp={() => { gripPressed.current = false; }}
                                >
                                    <FaGripVertical size={10} />
                                </span>

                                {/* Element / Attr toggle (or Ref badge) */}
                                {isRef ? (
                                    <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border border-amber-700 bg-amber-900/20 text-amber-400">
                                        <FaLink size={8} />
                                        <span>Ref</span>
                                    </span>
                                ) : (
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
                                )}

                                {/* XML name */}
                                <input
                                    value={col.xmlName}
                                    onChange={e => updateXmlName(i, e.target.value)}
                                    readOnly={isRef}
                                    onMouseDown={e => e.stopPropagation()}
                                    className={`flex-1 min-w-0 bg-transparent font-mono text-white focus:outline-none rounded px-1 ${
                                        isRef ? 'text-gray-400 cursor-default' : 'focus:ring-1 focus:ring-cyan-500'
                                    }`}
                                />

                                {/* Custom badge */}
                                {isCustomCol && (
                                    <span className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-dashed border-slate-500 text-gray-400 italic">
                                        custom
                                    </span>
                                )}

                                {/* DB column info toggle */}
                                {!isCustomCol && !isRef && (
                                    <button
                                        onClick={() => setExpandedSourceIndex(expandedSourceIndex === i ? -1 : i)}
                                        onMouseDown={e => e.stopPropagation()}
                                        title={expandedSourceIndex === i ? 'Hide source info' : 'Show source column info'}
                                        className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition ${
                                            expandedSourceIndex === i
                                                ? 'border-slate-400 bg-slate-600 text-gray-300'
                                                : 'border-slate-600 text-gray-400 hover:text-gray-200 hover:border-slate-500'
                                        }`}
                                    >
                                        <FaDatabase size={8} />
                                    </button>
                                )}

                                {/* Fn expand toggle — custom fields only */}
                                {isCustomCol && (
                                    <button
                                        onClick={() => setExpandedFnIndex(expandedFnIndex === i ? -1 : i)}
                                        onMouseDown={e => e.stopPropagation()}
                                        title={expandedFnIndex === i ? 'Close function editor' : 'Edit JavaScript function'}
                                        className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition ${
                                            expandedFnIndex === i
                                                ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                                                : 'border-slate-600 text-gray-400 hover:text-amber-300 hover:border-amber-700'
                                        }`}
                                    >
                                        <span className="font-serif font-bold text-sm leading-none">ƒ</span>
                                    </button>
                                )}

                                {/* Remove — revealed on hover */}
                                <button
                                    onClick={() => removeColumn(i)}
                                    title="Remove this column"
                                    className="shrink-0 text-gray-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                                >
                                    <FaTimes size={10} />
                                </button>
                            </div>

                            {/* Relational info panel — DB columns only */}
                            {!isCustomCol && !isRef && expandedSourceIndex === i && (
                                <div className="px-3 py-2 bg-slate-800/60 border-t border-slate-600/50 flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Column</span>
                                        <span className="text-xs font-mono text-gray-300 bg-slate-700 px-1.5 py-0.5 rounded" title={col.sourceColumn}>
                                            {col.sourceColumn}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-500">Type</span>
                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${XML_TYPE_COLOR[col.xmlType] ?? 'bg-slate-700 text-gray-400'}`}>
                                            {col.xmlType}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Inline function editor */}
                            {isCustomCol && expandedFnIndex === i && (
                                <div className="px-3 pb-2 pt-1 bg-slate-800/60 border-t border-amber-900/40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-gray-500">Return Type</span>
                                        <select
                                            value={col.xmlType}
                                            onChange={e => {
                                                const next = e.target.value as XmlSchemaType;
                                                onChange({ ...mapping, columns: mapping.columns.map((c, ci) => ci !== i ? c : { ...c, xmlType: next }) });
                                            }}
                                            onMouseDown={e => e.stopPropagation()}
                                            className={`rounded font-mono text-xs px-1 py-0.5 border-0 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${XML_TYPE_COLOR[col.xmlType] ?? 'bg-slate-700 text-gray-400'}`}
                                        >
                                            {XSD_TYPES.map(t => (
                                                <option key={t} value={t} className="bg-slate-800 text-gray-200">{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        JavaScript Function
                                        <span className="text-gray-600 ml-1">— return the computed value for <code className="text-amber-300">{col.xmlName || 'this field'}</code></span>
                                    </label>
                                    <FunctionTextarea
                                        value={col.customFunction ?? ''}
                                        onChange={v => updateColumnFn(i, v)}
                                        onMouseDown={e => e.stopPropagation()}
                                        fieldNames={availableFieldNames}
                                        rows={5}
                                        placeholder={`// return the value for ${col.xmlName || 'this field'}\nreturn null;`}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-green-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y leading-relaxed"
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Drop zone after the last row */}
                {mapping.columns.length > 0 && (
                    <div
                        className="h-2"
                        onDragOver={handleDragOverEnd}
                        onDrop={e => handleDrop(e, mapping.columns.length)}
                    >
                        <DropLine before={mapping.columns.length} />
                    </div>
                )}

                {/* Add custom field */}
                <div className="px-2 py-2 border-t border-slate-600/40">
                    <button
                        onClick={addCustomField}
                        onMouseDown={e => e.stopPropagation()}
                        title="Add a custom field not sourced from a DB column"
                        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-dashed border-slate-500 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 hover:bg-cyan-900/20 transition"
                    >
                        <FaPlus size={8} />
                        <span>Add custom field</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
