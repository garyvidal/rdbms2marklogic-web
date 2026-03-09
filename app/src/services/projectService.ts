const SCHEMA_SERVICE_URL = 'http://localhost:9390';

/** Naming case options matching Java NamingCase enum (serialized as uppercase). */
export type NamingCase = 'SNAKE' | 'CAMEL' | 'PASCAL' | 'DASH';

export interface ProjectSettings {
  defaultCasing?: NamingCase;
  /** Connection line type matching @xyflow/react ConnectionLineType values. */
  connectionLineType?: string;
}

export interface ProjectTable {
  tableName: string;
  schema?: string;
  columns?: Record<string, {
    name: string;
    type: string;
    position?: number;
    primaryKey?: boolean;
    sequence?: boolean;
    nullable?: boolean;
    columnType?: { columnType: string; precision?: number; scale?: number };
    foreignKey?: { name: string };
  }>;
  relationships?: Array<{ toTable: string; [key: string]: unknown }>;
}

export interface ProjectSchema {
  name: string;
  tables?: Record<string, ProjectTable>;
}

export interface DiagramNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  collapsed?: boolean;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  startMarker?: string | null;
  endMarker?: string | null;
}

export interface DiagramObject {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramTab {
  id: string;
  name: string;
  relational?: DiagramObject;
  document?: DiagramObject | null;
}

export interface DiagramContainer {
  name: string;
  tabs: DiagramTab[];
}

export type XmlSchemaType =
  | 'xs:string'
  | 'xs:integer'
  | 'xs:long'
  | 'xs:date'
  | 'xs:dateTime'
  | 'xs:boolean';

export type TableMappingType = 'RootElement' | 'Elements';
export type ColumnMappingType = 'Element' | 'ElementAttribute';

export interface XmlColumnMapping {
  sourceColumn: string;
  xmlName: string;
  xmlType: XmlSchemaType;
  mappingType: ColumnMappingType;
}

export interface XmlTableMapping {
  sourceSchema: string;
  sourceTable: string;
  /** RootElement: the root element name. Elements: the child element name that directly contains the columns. */
  xmlName: string;
  mappingType: TableMappingType;
  /** Elements only: when true, columns are nested inside a wrapper element around the child element. */
  wrapInParent: boolean;
  /** Elements only: outer wrapper element name, used when wrapInParent is true. */
  wrapperElementName?: string;
  columns: XmlColumnMapping[];
}

export interface ProjectMapping {
  documentModel: {
    root?: XmlTableMapping;
    elements: XmlTableMapping[];
  };
}

export interface ProjectData {
  name: string;
  version?: string;
  connectionName: string;
  created?: string;
  modified?: string;
  schemas: Record<string, ProjectSchema>;
  diagrams?: DiagramContainer[] | null;
  settings?: ProjectSettings;
  mapping?: ProjectMapping;
}

export const saveProject = async (project: ProjectData): Promise<ProjectData> => {
  const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!response.ok) {
    throw new Error(`Failed to save project: ${response.statusText}`);
  }
  return response.json();
};

export const getProject = async (name: string): Promise<ProjectData> => {
  const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/projects/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }
  return response.json();
};

export const getProjects = async (): Promise<ProjectData[]> => {
  const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/projects`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  return response.json();
};

export const deleteProject = async (name: string): Promise<void> => {
  const response = await fetch(`${SCHEMA_SERVICE_URL}/v1/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }
};
