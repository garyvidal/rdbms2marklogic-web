import React from 'react'
import { FaCog, FaMousePointer, FaProjectDiagram, FaRedo, FaUndo, FaLink } from 'react-icons/fa';
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
  onCreateJoin?: () => void;
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
  onCreateJoin,
}: SchemaToolbarProps) {
  return (
    <div className="w-full h-10 align-top border-b overflow-y-hidden flex items-stretch justify-between">

      {/* Left: toolbar tools */}
      <div className="flex items-center px-1 shrink-0 gap-0.5">
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
        {hasActiveProject && onCreateJoin && (
          <button
            onClick={onCreateJoin}
            disabled={!hasNodes}
            title="Create synthetic join between two tables"
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-none transition ${
              hasNodes
                ? 'bg-slate-800 text-cyan-300 hover:bg-slate-600 hover:text-cyan-200'
                : 'bg-slate-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <FaLink size={11} />
            <span className="hidden sm:inline">Join</span>
          </button>
        )}
        <button id="redo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaRedo />
        </button>
        <button id="undo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaUndo />
        </button>
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
