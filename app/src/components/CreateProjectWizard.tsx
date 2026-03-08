import React, { useState, useEffect, useRef } from 'react';
import {
  analyzeSchema,
  getSavedConnections,
  saveConnection,
  deleteConnection,
  testConnection,
  DbConnection,
  DbDatabase,
  ConnectionType,
  SavedConnection,
} from '@/services/schemaService';
import { saveProject } from '@/services/projectService';
import { FaCheck, FaChevronRight, FaSpinner, FaTable, FaFolder, FaDatabase, FaTimes, FaTrash } from 'react-icons/fa';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

type WizardStep = 'name-connection' | 'select-tables' | 'review';

interface SelectedTables {
  [schemaName: string]: Set<string>;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'name-connection', label: 'Connection' },
  { id: 'select-tables', label: 'Select Tables' },
  { id: 'review', label: 'Review & Save' },
];

const StepIndicator: React.FC<{ current: WizardStep }> = ({ current }) => {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition
                ${idx < currentIdx ? 'bg-green-600 text-white' : ''}
                ${idx === currentIdx ? 'bg-blue-600 text-white' : ''}
                ${idx > currentIdx ? 'bg-slate-600 text-gray-400' : ''}`}
            >
              {idx < currentIdx ? <FaCheck size={12} /> : idx + 1}
            </div>
            <span className={`text-sm ${idx === currentIdx ? 'text-white' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <FaChevronRight className="text-slate-500 mx-1" size={12} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const defaultConnection: DbConnection = {
  type: ConnectionType.Postgres,
  url: 'localhost',
  port: 55432,
  database: 'northwind',
  userName: 'postgres',
  password: 'postgres',
};

interface CreateProjectWizardProps {
  onClose: () => void;
  onSaved: (projectName: string) => void;
}

const CreateProjectWizard: React.FC<CreateProjectWizardProps> = ({ onClose, onSaved }) => {
  const [step, setStep] = useState<WizardStep>('name-connection');

  // Step 1 state
  const [projectName, setProjectName] = useState('');
  const [connectionMode, setConnectionMode] = useState<'saved' | 'new'>('saved');
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState<DbConnection>(defaultConnection);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [connTestMessage, setConnTestMessage] = useState<string | null>(null);

  // Step 2 state
  const [database, setDatabase] = useState<DbDatabase | null>(null);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<SelectedTables>({});

  // Step 3 state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getSavedConnections()
      .then((conns) => {
        setSavedConnections(conns);
        if (conns.length === 0) setConnectionMode('new');
      })
      .catch(() => setConnectionMode('new'));
  }, []);

  const resetConnStatus = () => {
    setConnStatus('idle');
    setConnTestMessage(null);
  };

  const handleConnectionModeChange = (mode: 'saved' | 'new') => {
    setConnectionMode(mode);
    resetConnStatus();
  };

  const handleSavedConnectionSelect = (name: string) => {
    setSelectedConnectionName(name);
    resetConnStatus();
  };

  const handleNewConnectionChange = (field: keyof DbConnection, value: string | number) => {
    setNewConnection((p) => ({ ...p, [field]: field === 'port' ? Number(value) || 0 : value }));
    resetConnStatus();
  };

  const handleDeleteConnection = async (name: string) => {
    try {
      await deleteConnection(name);
      const updated = savedConnections.filter((c) => c.name !== name);
      setSavedConnections(updated);
      if (selectedConnectionName === name) {
        setSelectedConnectionName(null);
        resetConnStatus();
      }
      if (updated.length === 0) setConnectionMode('new');
    } catch (e) {
      setStep1Error(e instanceof Error ? e.message : 'Failed to delete connection');
    }
  };

  const handleTestConnection = async () => {
    const conn = effectiveConnection;
    if (!conn) return;
    setConnStatus('testing');
    setConnTestMessage(null);
    const result = await testConnection(conn);
    setConnStatus(result.success ? 'success' : 'failed');
    setConnTestMessage(result.message);
  };

  const effectiveConnection: DbConnection | null =
    connectionMode === 'saved'
      ? savedConnections.find((c) => c.name === selectedConnectionName)?.connection ?? null
      : newConnection;

  const effectiveConnectionName: string =
    connectionMode === 'saved' ? (selectedConnectionName ?? '') : newConnectionName;

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────────
  const handleStep1Next = async () => {
    setStep1Error(null);
    if (!projectName.trim()) { setStep1Error('Enter a project name'); return; }
    if (connectionMode === 'saved' && !selectedConnectionName) { setStep1Error('Select a saved connection'); return; }
    if (connectionMode === 'new') {
      if (!newConnectionName.trim()) { setStep1Error('Enter a name for the new connection'); return; }
      if (!newConnection.url || !newConnection.database || !newConnection.userName) {
        setStep1Error('Fill in all required connection fields (Host, Database, Username)');
        return;
      }
      try {
        await saveConnection({ name: newConnectionName, connection: newConnection });
      } catch (e) {
        setStep1Error(e instanceof Error ? e.message : 'Failed to save connection');
        return;
      }
    }

    setStep('select-tables');
    setLoadingSchemas(true);
    setSchemaError(null);
    try {
      const conn = effectiveConnection!;
      const db = await analyzeSchema({
        connection: conn,
        includeTables: true,
        includeColumns: true,
        includeRelationships: true,
      });
      setDatabase(db);
      // Pre-select all tables
      const initial: SelectedTables = {};
      for (const [schName, schema] of Object.entries(db.schemas)) {
        initial[schName] = new Set(Object.keys(schema.tables ?? {}));
      }
      setSelectedTables(initial);
    } catch (e) {
      setSchemaError(e instanceof Error ? e.message : 'Failed to connect to database');
    } finally {
      setLoadingSchemas(false);
    }
  };

  // ── Table selection helpers ─────────────────────────────────────────────────
  const toggleTable = (schemaName: string, tableName: string) => {
    setSelectedTables((prev) => {
      const next = { ...prev };
      const set = new Set(next[schemaName] ?? []);
      if (set.has(tableName)) set.delete(tableName);
      else set.add(tableName);
      next[schemaName] = set;
      return next;
    });
  };

  const toggleSchema = (schemaName: string, allTables: string[]) => {
    setSelectedTables((prev) => {
      const next = { ...prev };
      const set = next[schemaName] ?? new Set<string>();
      const allSelected = allTables.every((t) => set.has(t));
      next[schemaName] = allSelected ? new Set() : new Set(allTables);
      return next;
    });
  };

  const totalSelected = Object.values(selectedTables).reduce((sum, s) => sum + s.size, 0);

  // ── Save project ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const schemas: Record<string, { name: string; tables: Record<string, object> }> = {};
      for (const [schName, tableSet] of Object.entries(selectedTables)) {
        if (tableSet.size === 0) continue;
        const tables: Record<string, object> = {};
        for (const tableName of tableSet) {
          const fullTable = database?.schemas[schName]?.tables?.[tableName];
          tables[tableName] = {
            tableName,
            schema: schName,
            columns: fullTable?.columns ?? null,
            relationships: fullTable?.relationships ?? null,
          };
        }
        schemas[schName] = { name: schName, tables };
      }
      await saveProject({
        name: projectName,
        version: '1.0',
        connectionName: effectiveConnectionName,
        schemas,
      });
      onSaved(projectName);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'select-tables') setStep('name-connection');
    else if (step === 'review') setStep('select-tables');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5">
          <StepIndicator current={step} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* ── STEP 1: Name & Connection ── */}
          {step === 'name-connection' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Project"
                  className="w-full px-4 py-2.5 bg-slate-700 text-white border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Database Connection *</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => handleConnectionModeChange('saved')}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition ${connectionMode === 'saved' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
                  >
                    Use Saved
                  </button>
                  <button
                    onClick={() => handleConnectionModeChange('new')}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition ${connectionMode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
                  >
                    New Connection
                  </button>
                </div>

                {connectionMode === 'saved' && (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {savedConnections.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        No saved connections — switch to "New Connection"
                      </p>
                    ) : (
                      savedConnections.map((sc) => (
                        <div
                          key={sc.name}
                          className={`flex items-center gap-2 p-3 rounded border transition ${selectedConnectionName === sc.name ? 'border-blue-500 bg-blue-900/40' : 'border-slate-600 bg-slate-700 hover:border-slate-500'}`}
                        >
                          <button
                            onClick={() => handleSavedConnectionSelect(sc.name)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <FaDatabase className={selectedConnectionName === sc.name ? 'text-blue-400' : 'text-gray-500'} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white">{sc.name}</div>
                              <div className="text-xs text-gray-400 truncate">
                                {sc.connection.type} @ {sc.connection.url}:{sc.connection.port} / {sc.connection.database}
                              </div>
                            </div>
                            {selectedConnectionName === sc.name && <FaCheck className="text-blue-400 shrink-0" size={12} />}
                          </button>
                          <button
                            onClick={() => handleDeleteConnection(sc.name)}
                            className="text-red-400 hover:text-red-300 p-1.5 shrink-0 transition"
                            title={`Delete "${sc.name}"`}
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {connectionMode === 'new' && (
                  <div className="space-y-3 bg-slate-700 p-4 rounded">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Connection Name *</label>
                      <input
                        type="text"
                        value={newConnectionName}
                        onChange={(e) => setNewConnectionName(e.target.value)}
                        placeholder="my-database"
                        className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Database Type</label>
                      <select
                        value={newConnection.type}
                        onChange={(e) => handleNewConnectionChange('type', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={ConnectionType.Postgres}>PostgreSQL</option>
                        <option value={ConnectionType.MySql}>MySQL</option>
                        <option value={ConnectionType.SqlServer}>SQL Server</option>
                        <option value={ConnectionType.Oracle}>Oracle</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Host *</label>
                        <input
                          type="text"
                          value={newConnection.url}
                          onChange={(e) => handleNewConnectionChange('url', e.target.value)}
                          placeholder="localhost"
                          className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Port *</label>
                        <input
                          type="number"
                          value={newConnection.port}
                          onChange={(e) => handleNewConnectionChange('port', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Database *</label>
                      <input
                        type="text"
                        value={newConnection.database}
                        onChange={(e) => handleNewConnectionChange('database', e.target.value)}
                        placeholder="database"
                        className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Username *</label>
                        <input
                          type="text"
                          value={newConnection.userName}
                          onChange={(e) => handleNewConnectionChange('userName', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                        <input
                          type="password"
                          value={newConnection.password}
                          onChange={(e) => handleNewConnectionChange('password', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Connection */}
              {(connectionMode === 'new' || selectedConnectionName) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={connStatus === 'testing' || (connectionMode === 'saved' && !selectedConnectionName)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {connStatus === 'testing' ? (
                        <><FaSpinner className="animate-spin" size={12} /> Testing...</>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                    {connStatus === 'success' && (
                      <span className="flex items-center gap-1.5 text-sm text-green-400">
                        <FaCheck size={12} /> Connected
                      </span>
                    )}
                    {connStatus === 'failed' && (
                      <span className="flex items-center gap-1.5 text-sm text-red-400">
                        <FaTimes size={12} /> Failed
                      </span>
                    )}
                  </div>
                  {connStatus === 'failed' && connTestMessage && (
                    <div className="p-3 bg-red-900/60 border border-red-700 rounded text-xs text-red-200 font-mono break-all">
                      {connTestMessage}
                    </div>
                  )}
                </div>
              )}

              {step1Error && (
                <div className="p-3 bg-red-900 border border-red-700 rounded text-sm text-red-100">{step1Error}</div>
              )}
            </div>
          )}

          {/* ── STEP 2: Select Tables ── */}
          {step === 'select-tables' && (
            <div>
              {loadingSchemas && (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <FaSpinner className="animate-spin text-lg" />
                  <span>Connecting to database...</span>
                </div>
              )}
              {schemaError && (
                <div className="p-3 bg-red-900 border border-red-700 rounded text-sm text-red-100 mb-4">{schemaError}</div>
              )}
              {!loadingSchemas && database && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">
                      {totalSelected} table{totalSelected !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(database.schemas).map(([schemaName, schema]) => {
                      const tableNames = Object.keys(schema.tables ?? {});
                      const selectedCount = selectedTables[schemaName]?.size ?? 0;
                      const allSelected = selectedCount === tableNames.length && tableNames.length > 0;
                      const someSelected = selectedCount > 0 && !allSelected;
                      return (
                        <SchemaTreeNode
                          key={schemaName}
                          schemaName={schemaName}
                          tableNames={tableNames}
                          selectedCount={selectedCount}
                          allSelected={allSelected}
                          someSelected={someSelected}
                          selectedSet={selectedTables[schemaName] ?? new Set()}
                          onToggleSchema={() => toggleSchema(schemaName, tableNames)}
                          onToggleTable={(t) => toggleTable(schemaName, t)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review & Save ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-slate-700 rounded p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Project Name</span>
                  <span className="text-sm font-medium text-white">{projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Connection</span>
                  <span className="text-sm font-medium text-white">{effectiveConnectionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Tables Selected</span>
                  <span className="text-sm font-medium text-white">{totalSelected}</span>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(selectedTables)
                  .filter(([, s]) => s.size > 0)
                  .map(([schemaName, tableSet]) => (
                    <div key={schemaName} className="bg-slate-700 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FaFolder className="text-yellow-500" size={13} />
                        <span className="text-sm font-semibold text-white">{schemaName}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {tableSet.size} table{tableSet.size !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[...tableSet].sort().map((t) => (
                          <span key={t} className="text-xs bg-slate-600 text-blue-300 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {saveError && (
                <div className="p-3 bg-red-900 border border-red-700 rounded text-sm text-red-100">{saveError}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 mt-2">
          <div>
            {step !== 'name-connection' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
            >
              Cancel
            </button>
            {step === 'name-connection' && (
              <button
                onClick={handleStep1Next}
                disabled={connStatus !== 'success'}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
                title={connStatus !== 'success' ? 'Test the connection first' : undefined}
              >
                Next
              </button>
            )}
            {step === 'select-tables' && !loadingSchemas && !schemaError && (
              <button
                onClick={() => setStep('review')}
                disabled={totalSelected === 0}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
              >
                {saving ? <><FaSpinner className="animate-spin" /> Saving...</> : 'Save Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Schema tree node (extracted to handle indeterminate checkbox ref) ──────────
interface SchemaTreeNodeProps {
  schemaName: string;
  tableNames: string[];
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  selectedSet: Set<string>;
  onToggleSchema: () => void;
  onToggleTable: (tableName: string) => void;
}

const SchemaTreeNode: React.FC<SchemaTreeNodeProps> = ({
  schemaName,
  tableNames,
  selectedCount,
  allSelected,
  someSelected,
  selectedSet,
  onToggleSchema,
  onToggleTable,
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="bg-slate-700 rounded overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 cursor-pointer select-none"
        onClick={onToggleSchema}
      >
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSchema}
          className="accent-blue-500 w-4 h-4"
          onClick={(e) => e.stopPropagation()}
        />
        <FaFolder className="text-yellow-500" size={14} />
        <span className="text-sm font-semibold text-white flex-1">{schemaName}</span>
        <span className="text-xs text-gray-400">{selectedCount}/{tableNames.length}</span>
      </div>
      <div className="divide-y divide-slate-600/40">
        {tableNames.map((tableName) => (
          <div
            key={tableName}
            className="flex items-center gap-2 px-3 py-1.5 pl-8 hover:bg-slate-600 cursor-pointer select-none"
            onClick={() => onToggleTable(tableName)}
          >
            <input
              type="checkbox"
              checked={selectedSet.has(tableName)}
              onChange={() => onToggleTable(tableName)}
              className="accent-blue-500 w-4 h-4"
              onClick={(e) => e.stopPropagation()}
            />
            <FaTable className="text-blue-400" size={11} />
            <span className="text-sm text-gray-200">{tableName}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateProjectWizard;
