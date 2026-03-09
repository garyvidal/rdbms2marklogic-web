import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { ProjectData } from "@/services/projectService";

interface DiagramTabsProps {
  projects: ProjectData[];
  activeProjectName: string | null;
  onProjectSelect: (name: string) => void;
  onProjectClose: (name: string) => void;
}

export default function DiagramTabs({ projects, activeProjectName, onProjectSelect, onProjectClose }: DiagramTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (projects.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex h-9 shrink-0 overflow-x-auto overflow-y-hidden bg-slate-800 border-b border-slate-700"
      style={{ scrollbarWidth: "none" }}
    >
      {projects.map((project) => {
        const isActive = project.name === activeProjectName;
        return (
          <div
            key={project.name}
            onClick={() => onProjectSelect(project.name)}
            className={cn(
              "flex items-center gap-1.5 px-3 h-full whitespace-nowrap cursor-pointer select-none shrink-0 border-r border-slate-700 text-sm",
              isActive
                ? "bg-slate-700 text-white border-b-2 border-b-cyan-500"
                : "bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-gray-200"
            )}
          >
            {project.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProjectClose(project.name);
              }}
              className="text-gray-500 hover:text-white leading-none ml-0.5 text-base"
              title={`Close ${project.name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
