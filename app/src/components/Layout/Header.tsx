import React from 'react'
import { FaPlus, FaFolderOpen, FaDatabase } from 'react-icons/fa'

interface HeaderProps {
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onConnections?: () => void;
  onMarkLogicConnections?: () => void;
}

function Header({ onNewProject, onOpenProject, onConnections, onMarkLogicConnections }: HeaderProps) {
  return (
    <nav className="bg-slate-800 dark:bg-gray-900 w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600 py-1">
      <div className="flex flex-wrap justify-between items-center mx-auto p-4">
        <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
          RDBMS 2 MarkLogic
        </span>
        <div className="flex items-center gap-2">
          {onMarkLogicConnections && (
            <button
              onClick={onMarkLogicConnections}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-500 transition"
            >
              <FaDatabase className="text-amber-400" size={13} />
              MarkLogic
            </button>
          )}
          {onConnections && (
            <button
              onClick={onConnections}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-500 transition"
            >
              <FaDatabase size={13} />
              Connections
            </button>
          )}
          {onOpenProject && (
            <button
              onClick={onOpenProject}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-500 transition"
            >
              <FaFolderOpen size={13} />
              Open Project
            </button>
          )}
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
            >
              <FaPlus size={12} />
              New Project
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Header
