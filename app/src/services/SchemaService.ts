const SCHEMA_SERVICE_URL = 'http://localhost:9390';

export enum ConnectionType {
  Postgres = 'Postgres',
  MySql = 'MySql',
  SqlServer = 'SqlServer',
  Oracle = 'Oracle'
}

export interface DbConnection {
  type: ConnectionType;
  url: string;
  port: number;
  database: string;
  userName: string;
  password: string;
}

export interface SchemaAnalysisRequest {
  connection: DbConnection;
  includeTables: boolean;
  includeColumns: boolean;
  includeRelationships: boolean;
  includeViews?: boolean;
  includeProcedures?: boolean;
}

export interface Column {
  name: string;
  type: string;
  position?: number;
  primaryKey?: boolean;
  sequence?: boolean;
  nullable?: boolean;
  columnType?: {
    columnType: string;
    precision?: number;
    scale?: number;
  };
  foreignKey?: {
    name: string;
  };
}

export interface DbTable {
  tableName: string;
  schema?: string;
  columns?: Record<string, Column>;
  relationships?: Array<{
    toTable: string;
  }>;
}

export interface DbSchema {
  name: string;
  tables?: Record<string, DbTable>;
}

export interface DbDatabase {
  name?: string;
  schemas: Record<string, DbSchema>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

/**
 * Test a database connection without saving it
 */
export const testConnection = async (connection: DbConnection): Promise<ConnectionTestResult> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/connections/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(connection),
    });
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection test failed' };
  }
};

/**
 * Analyze database schema using SchemaCrawler
 */
export const analyzeSchema = async (request: SchemaAnalysisRequest): Promise<DbDatabase> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/schemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to analyze schema: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing schema:', error);
    throw error;
  }
};

/**
 * Get all schemas from database
 */
export const fetchSchemas = async (request: SchemaAnalysisRequest): Promise<DbSchema[]> => {
  try {
    const database = await analyzeSchema(request);
    return Object.values(database.schemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    throw error;
  }
};

/**
 * Get all tables from a specific schema
 */
export const fetchTablesForSchema = async (
  request: SchemaAnalysisRequest,
  schemaName: string
): Promise<DbTable[]> => {
  try {
    const database = await analyzeSchema(request);
    const schema = database.schemas[schemaName];
    if (!schema || !schema.tables) {
      return [];
    }
    return Object.values(schema.tables);
  } catch (error) {
    console.error(`Error fetching tables for schema ${schemaName}:`, error);
    throw error;
  }
};

export interface SaveConnectionRequest {
  name: string;
  connection: DbConnection;
}

export interface SavedConnection {
  name: string;
  connection: DbConnection;
}

/**
 * Save a database connection for later use
 */
export const saveConnection = async (request: SaveConnectionRequest): Promise<SavedConnection> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to save connection: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving connection:', error);
    throw error;
  }
};

/**
 * Get all saved connections
 */
export const getSavedConnections = async (): Promise<SavedConnection[]> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/connections`);
    if (!response.ok) {
      throw new Error(`Failed to fetch saved connections: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching saved connections:', error);
    throw error;
  }
};

/**
 * Get a specific saved connection
 */
export const getConnection = async (name: string): Promise<SavedConnection> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/connections/${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch connection: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching connection ${name}:`, error);
    throw error;
  }
};

/**
 * Delete a saved connection
 */
export const deleteConnection = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/connections/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete connection: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error deleting connection ${name}:`, error);
    throw error;
  }
};
