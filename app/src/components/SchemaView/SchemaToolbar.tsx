import React from 'react'
import { FaCog, FaFileCode, FaMousePointer, FaProjectDiagram, FaRedo, FaUndo } from 'react-icons/fa';
import { LayoutControls, LayoutAlgorithm } from './LayoutControls';
import { ConnectionLineTypeControl } from './ConnectionLineTypeControl';
import { ConnectionLineType } from '@xyflow/react';

export type ViewMode = 'relational' | 'document';

interface SchemaToolbarProps {
  hasNodes: boolean;
  showEdges: boolean;
  onToggleEdges: () => void;
  onLayout: (algorithm: LayoutAlgorithm) => void;
  connectionLineType: ConnectionLineType;
  onConnectionLineTypeChange: (type: ConnectionLineType) => void;
  hasActiveProject?: boolean;
  onOpenConfig?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

function SchemaToolbar({
  hasNodes,
  showEdges,
  onToggleEdges,
  onLayout,
  connectionLineType,
  onConnectionLineTypeChange,
  hasActiveProject,
  onOpenConfig,
  viewMode = 'relational',
  onViewModeChange,
}: SchemaToolbarProps) {
  return (
    <div className="w-full h-10 align-top border-b overflow-y-hidden flex items-stretch justify-between">

      {/* Left: view mode toggle + relational tools */}
      <div className="flex items-center px-1 shrink-0 gap-0.5">

        {/* Relational / Document toggle — only when a project is open */}
        {hasActiveProject && onViewModeChange && (
          <div className="flex items-stretch mr-1 border border-slate-600 rounded overflow-hidden">
            <button
              onClick={() => onViewModeChange('relational')}
              title="Relational diagram"
              className={`px-2.5 text-xs flex items-center gap-1.5 transition ${
                viewMode === 'relational'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-600'
              }`}
            >
              <FaProjectDiagram size={11} />
              <span className="hidden sm:inline">Relational</span>
            </button>
            <button
              onClick={() => onViewModeChange('document')}
              title="Document model mapping"
              className={`px-2.5 text-xs flex items-center gap-1.5 transition border-l border-slate-600 ${
                viewMode === 'document'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-600'
              }`}
            >
              <FaFileCode size={11} />
              <span className="hidden sm:inline">Document</span>
            </button>
          </div>
        )}

        {/* Relational-only controls */}
        {viewMode === 'relational' && (
          <>
            <button id="select-tool" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
              <FaMousePointer />
            </button>
            <button
              id="connections"
              onClick={onToggleEdges}
              title="Toggle connections"
              className={`p-1.5 rounded-none transition ${
                showEdges
                  ? 'bg-cyan-700 text-white hover:bg-cyan-600'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <FaProjectDiagram />
            </button>
            <ConnectionLineTypeControl value={connectionLineType} onChange={onConnectionLineTypeChange} />
            <LayoutControls onLayout={onLayout} disabled={!hasNodes} />
            <button id="redo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
              <FaRedo />
            </button>
            <button id="undo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
              <FaUndo />
            </button>
          </>
        )}
      </div>

      {/* Right: settings */}
      {hasActiveProject && onOpenConfig && (
        <div className="flex items-center px-2">
          <button
            onClick={onOpenConfig}
            title="Project settings"
            className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300 flex items-center gap-1.5 text-xs"
          >
            <FaCog />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default SchemaToolbar;
