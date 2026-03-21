import React from 'react'
import { FaPlus, FaFolderOpen, FaDatabase, FaSun, FaMoon, FaCube } from 'react-icons/fa'
import { useTheme } from '@/contexts/ThemeContext'

interface HeaderProps {
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onConnections?: () => void;
  onMarkLogicConnections?: () => void;
}

function Header({ onNewProject, onOpenProject, onConnections, onMarkLogicConnections }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <nav className="bg-gray-900 dark:bg-slate-900 w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600 py-1">
      <div className="flex flex-wrap justify-between items-center mx-auto p-4">
        <span className="self-center text-2xl font-semibold whitespace-nowrap text-white dark:text-white flex items-center gap-2">
          <FaCube size={24} className="text-red-600" />
          Data Migration Framework
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-white text-sm rounded hover:bg-gray-100 dark:hover:bg-white/10 transition"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <FaSun size={14} /> : <FaMoon size={14} />}
          </button>
          {onMarkLogicConnections && (
            <button
              onClick={onMarkLogicConnections}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-white/20 transition"
            >
              <FaDatabase className="text-amber-400" size={13} />
              MarkLogic
            </button>
          )}
          {onConnections && (
            <button
              onClick={onConnections}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-white/20 transition"
            >
              <FaDatabase size={13} />
              Connections
            </button>
          )}
          {onOpenProject && (
            <button
              onClick={onOpenProject}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-white/20 transition"
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
