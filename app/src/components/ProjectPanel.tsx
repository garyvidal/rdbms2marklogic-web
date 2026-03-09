import React, { useState } from 'react';
import { ProjectData } from '@/services/projectService';
import { FaChevronDown, FaChevronRight, FaTable, FaFolder, FaEye, FaPlus } from 'react-icons/fa';

interface ProjectPanelProps {
  project: ProjectData;
  onTableSelect?: (tableName: string, schemaName: string) => void;
  visibleNodeIds?: Set<string>;
  onAddTables?: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ project, onTableSelect, visibleNodeIds, onAddTables }) => {
  const schemas = Object.entries(project.schemas);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(
    new Set(schemas.map(([key]) => key))
  );
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const toggleSchema = (schemaKey: string) => {
    setExpandedSchemas((prev) => {
      const next = new Set(prev);
      if (next.has(schemaKey)) next.delete(schemaKey);
      else next.add(schemaKey);
      return next;
    });
  };

  const totalTables = schemas.reduce(
    (sum, [, s]) => sum + Object.keys(s.tables ?? {}).length,
    0
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-700 text-white overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-600">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-400">
            {schemas.length} schema{schemas.length !== 1 ? 's' : ''} &bull; {totalTables} table{totalTables !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onAddTables}
            title="Add tables to project"
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition"
          >
            <FaPlus size={9} /> Add
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">
          Connection: {project.connectionName}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-600">
        {schemas.map(([schemaKey, schema]) => {
          const tables = Object.values(schema.tables ?? {});
          const isExpanded = expandedSchemas.has(schemaKey);

          return (
            <div key={schemaKey}>
              <button
                onClick={() => toggleSchema(schemaKey)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-600 transition text-left"
              >
                {isExpanded
                  ? <FaChevronDown className="text-gray-400 shrink-0" size={11} />
                  : <FaChevronRight className="text-gray-400 shrink-0" size={11} />}
                <FaFolder className="text-yellow-500 shrink-0" size={13} />
                <span className="text-sm font-medium truncate">{schema.name || schemaKey}</span>
                <span className="text-xs text-gray-400 ml-auto">{tables.length}</span>
              </button>

              {isExpanded && (
                <div className="bg-slate-800 divide-y divide-slate-700">
                  {tables.length === 0 ? (
                    <div className="px-8 py-2 text-xs text-gray-500">No tables</div>
                  ) : (
                    tables.map((table) => {
                      const key = `${schemaKey}.${table.tableName}`;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedTable(key);
                            onTableSelect?.(table.tableName, schemaKey);
                          }}
                          className={`w-full flex items-center gap-2 px-8 py-2 text-left hover:bg-slate-600 transition text-sm ${
                            selectedTable === key ? 'bg-slate-500' : ''
                          }`}
                        >
                          <FaTable className="text-green-400 shrink-0" size={11} />
                          <span className="truncate">{table.tableName}</span>
                          {visibleNodeIds?.has(key) && (
                            <FaEye className="text-cyan-400 shrink-0 ml-auto" size={11} title="Visible in diagram" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectPanel;
