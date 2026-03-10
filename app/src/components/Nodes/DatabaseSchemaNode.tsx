import { Node, NodeProps, Position, Handle, useReactFlow } from "@xyflow/react";
import * as React from "react";
import { useState } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { BaseNode } from "@/components/base-node";
import { LabeledHandle } from "@/components/labeled-handle";

type DatabaseSchemaNode = Node<{
  label: string;
  schema: { title: string; type: string; primaryKey?: boolean }[];
  collapsed?: boolean;
}>;

export function DatabaseSchemaNode({
  id,
  data,
  selected,
}: NodeProps<DatabaseSchemaNode>) {
  const { updateNodeData } = useReactFlow();
  const [collapsed, setCollapsed] = useState(data.collapsed ?? false);
  return (
    <BaseNode className="p-0" selected={selected}>
      {/* Always-present hidden handles on both sides so edges can re-anchor based on layout */}
      <Handle id="left-target"  type="target" position={Position.Left}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="right-source" type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle id="left-source"  type="source" position={Position.Left}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <h2 className="rounded-tl-md rounded-tr-md bg-secondary p-2 text-sm text-muted-foreground w-full flex items-center justify-between select-none">
        <span className="flex-1 text-center">{data.label}</span>
        <button
          className="ml-2 bg-transparent border-none p-1 flex items-center justify-center pointer-events-none"
          tabIndex={-1}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span
            className="pointer-events-auto"
            onClick={e => {
              e.stopPropagation();
              const next = !collapsed;
              setCollapsed(next);
              updateNodeData(id, { collapsed: next });
            }}
          >
            {collapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>
            )}
          </span>
        </button>
      </h2>
      <table className="border-spacing-10 overflow-visible">
        {!collapsed && (
          <TableBody>
            {data.schema.map((entry) => (
              <TableRow key={entry.title} className="relative text-xs">
                <TableCell className="pl-4 pr-6 font-light flex items-center gap-1">
                  <LabeledHandle
                    id={entry.title}
                    title={entry.title}
                    type="target"
                    position={Position.Left}
                  >
                    {entry.primaryKey && (
                      <span title="Primary Key" className="text-yellow-400 mr-1 ml-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-2"/><path d="M7 7v4"/><circle cx="7" cy="7" r="4"/></svg>
                      </span>
                    )}
                    
                  </LabeledHandle>
                </TableCell>
                <TableCell className="pr-4 text-right font-thin">
                  <LabeledHandle
                    id={entry.title}
                    title={entry.type}
                    type="source"
                    position={Position.Right}
                    className="p-0"
                    handleClassName="p-0"
                    labelClassName="p-0"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </table>
    </BaseNode>
  );
}
