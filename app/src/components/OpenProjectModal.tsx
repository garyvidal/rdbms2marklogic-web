import React, { useEffect, useState } from 'react';
import { FaFolderOpen, FaTimes, FaTrash } from 'react-icons/fa';
import { ProjectData, getProjects, deleteProject } from '@/services/projectService';

interface OpenProjectModalProps {
  onOpen: (project: ProjectData) => void;
  onClose: () => void;
  onDeleted?: (projectName: string) => void;
  alreadyOpenNames: string[];
}

export default function OpenProjectModal({ onOpen, onClose, onDeleted, alreadyOpenNames }: OpenProjectModalProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (projectName: string) => {
    setDeleting(true);
    try {
      await deleteProject(projectName);
      setProjects((prev) => prev.filter((p) => p.name !== projectName));
      onDeleted?.(projectName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-slate-700 rounded-lg shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
          <h2 className="text-white font-semibold text-lg">Open Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading && <p className="text-gray-400 text-sm">Loading projects...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {!loading && !error && projects.length === 0 && (
            <p className="text-gray-400 text-sm">No saved projects found.</p>
          )}
          {!loading && !error && projects.length > 0 && (
            <ul className="space-y-2">
              {projects.map((project) => {
                const isOpen = alreadyOpenNames.includes(project.name);
                const isConfirming = confirmDelete === project.name;
                const tableCount = Object.values(project.schemas).reduce(
                  (sum, s) => sum + Object.keys(s.tables ?? {}).length,
                  0
                );
                return (
                  <li key={project.name} className="flex items-stretch gap-2">
                    <button
                      onClick={() => { if (!isOpen) onOpen(project); }}
                      disabled={isOpen}
                      className={`flex-1 text-left px-4 py-3 rounded flex items-start gap-3 transition ${
                        isOpen
                          ? 'bg-slate-600 opacity-50 cursor-default'
                          : 'bg-slate-600 hover:bg-slate-500 cursor-pointer'
                      }`}
                    >
                      <FaFolderOpen className="text-yellow-400 mt-0.5 shrink-0" size={16} />
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium truncate">{project.name}</div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {Object.keys(project.schemas).length} schema{Object.keys(project.schemas).length !== 1 ? 's' : ''} &bull; {tableCount} table{tableCount !== 1 ? 's' : ''}
                          {project.connectionName && <> &bull; {project.connectionName}</>}
                        </div>
                        {isOpen && <div className="text-cyan-400 text-xs mt-0.5">Already open</div>}
                      </div>
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDelete(project.name)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
                        >
                          {deleting ? '...' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs bg-slate-500 hover:bg-slate-400 text-white rounded transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(project.name)}
                        className="shrink-0 px-3 rounded bg-slate-600 hover:bg-red-800 text-gray-400 hover:text-white transition"
                        title={`Delete ${project.name}`}
                      >
                        <FaTrash size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-600 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
