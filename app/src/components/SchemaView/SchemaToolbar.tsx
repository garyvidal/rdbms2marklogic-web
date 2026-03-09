import React from 'react'
import { FaMousePointer, FaProjectDiagram, FaRedo, FaUndo } from 'react-icons/fa';
import { LayoutControls, LayoutAlgorithm } from './LayoutControls';
import { ConnectionLineTypeControl } from './ConnectionLineTypeControl';
import { ConnectionLineType } from '@xyflow/react';

interface SchemaToolbarProps {
  hasNodes: boolean;
  showEdges: boolean;
  onToggleEdges: () => void;
  onLayout: (algorithm: LayoutAlgorithm) => void;
  connectionLineType: ConnectionLineType;
  onConnectionLineTypeChange: (type: ConnectionLineType) => void;
}

function SchemaToolbar({ hasNodes, showEdges, onToggleEdges, onLayout, connectionLineType, onConnectionLineTypeChange }: SchemaToolbarProps) {
  return (
    <div className="w-full h-10 align-top border-b overflow-y-hidden flex items-stretch">
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
        <button id="redo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaRedo />
        </button>
        <button id="undo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaUndo />
        </button>
      </div>
    </div>
  )
}

export default SchemaToolbar;
