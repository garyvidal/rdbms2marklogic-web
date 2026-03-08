import React from 'react'
import { FaMousePointer, FaProjectDiagram, FaRedo, FaUndo } from 'react-icons/fa';
import DiagramTabs from './DiagramTabs';
import { ProjectData } from '@/services/projectService';
import { LayoutControls, LayoutAlgorithm } from './LayoutControls';

interface SchemaToolbarProps {
  openProjects: ProjectData[];
  activeProjectName: string | null;
  onProjectSelect: (name: string) => void;
  onProjectClose: (name: string) => void;
  showEdges: boolean;
  onToggleEdges: () => void;
  onLayout: (algorithm: LayoutAlgorithm) => void;
}

function SchemaToolbar({ openProjects, activeProjectName, onProjectSelect, onProjectClose, showEdges, onToggleEdges, onLayout }: SchemaToolbarProps) {
  const hasNodes = openProjects.some(p => p.name === activeProjectName);
  return (
    <div className="w-full h-10 align-top border-b overflow-y-hidden flex items-stretch">
      <div className="flex items-center border-r border-slate-600 px-1 shrink-0 gap-0.5">
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
        <LayoutControls onLayout={onLayout} disabled={!hasNodes} />
        <button id="redo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaRedo />
        </button>
        <button id="undo" className="p-1.5 bg-slate-800 rounded-none hover:bg-slate-600 text-gray-300">
          <FaUndo />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <DiagramTabs
          projects={openProjects}
          activeProjectName={activeProjectName}
          onProjectSelect={onProjectSelect}
          onProjectClose={onProjectClose}
        />
      </div>
    </div>
  )
}

export default SchemaToolbar;
