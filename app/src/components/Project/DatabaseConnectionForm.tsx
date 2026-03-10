import React, { useState } from 'react';
import { ConnectionType, DbConnection, saveConnection } from '@/services/SchemaService';
import { FaDatabase, FaEye, FaEyeSlash } from 'react-icons/fa';
import SavedConnectionsList from './SavedConnectionsList';

interface DatabaseConnectionFormProps {
  onConnect: (connection: DbConnection) => void;
  isLoading?: boolean;
  onSaved?: () => void;
}

const defaultConnection: DbConnection = {
  type: ConnectionType.Postgres,
  url: 'localhost',
  port: 55432,
  database: 'northwind',
  userName: 'postgres',
  password: 'postgres',
};

const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({ onConnect, isLoading, onSaved }) => {
  const [connectionName, setConnectionName] = useState<string>('');
  const [connection, setConnection] = useState<DbConnection>(defaultConnection);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof DbConnection, value: any) => {
    setConnection((prev) => ({
      ...prev,
      [field]: field === 'port' ? parseInt(value) || 0 : value,
    }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!connection.url || !connection.database || !connection.userName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!connection.port || connection.port <= 0) {
      setError('Please enter a valid port number');
      return;
    }

    onConnect(connection);
  };

  const handleSaveConnection = async () => {
    if (!connectionName.trim()) {
      setError('Please enter a connection name');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await saveConnection({
        name: connectionName,
        connection,
      });
      
      setConnectionName('');
      onSaved?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save connection';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-slate-700 rounded-lg max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-600">
        <FaDatabase className="text-blue-400 text-lg" />
        <h3 className="text-xl font-semibold text-white">Database Connection</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Connection Name (optional)
        </label>
        <input
          type="text"
          value={connectionName}
          onChange={(e) => setConnectionName(e.target.value)}
          placeholder="My Database Connection"
          className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
        <p className="text-xs text-gray-400 mt-1">Give this connection a name to save it for later use</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Database Type *
        </label>
        <select
          value={connection.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        >
          <option value={ConnectionType.Postgres}>PostgreSQL</option>
          <option value={ConnectionType.MySql}>MySQL</option>
          <option value={ConnectionType.SqlServer}>SQL Server</option>
          <option value={ConnectionType.Oracle}>Oracle</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Host/URL *
          </label>
          <input
            type="text"
            value={connection.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="localhost"
            className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Port *
          </label>
          <input
            type="number"
            value={connection.port}
            onChange={(e) => handleChange('port', e.target.value)}
            placeholder="55432"
            className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Database Name *
        </label>
        <input
          type="text"
          value={connection.database}
          onChange={(e) => handleChange('database', e.target.value)}
          placeholder="database"
          className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Username *
        </label>
        <input
          type="text"
          value={connection.userName}
          onChange={(e) => handleChange('userName', e.target.value)}
          placeholder="username"
          className="w-full px-4 py-2.5 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={connection.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="password"
            className="w-full px-4 py-2.5 pr-12 bg-slate-600 text-white border border-slate-500 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900 border border-red-700 rounded">
          <p className="text-sm text-red-100">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition text-base"
      >
        {isLoading ? 'Connecting...' : 'Connect'}
      </button>

      {connectionName && (
        <button
          type="button"
          onClick={handleSaveConnection}
          disabled={saving}
          className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition text-base"
        >
          {saving ? 'Saving...' : 'Save Connection'}
        </button>
      )}

      <div className="border-t border-slate-600 pt-6">
        <SavedConnectionsList onConnectionSelect={(conn) => {
          setConnection(conn);
          onConnect(conn);
        }} />
      </div>
    </form>
  );
};

export default DatabaseConnectionForm;
