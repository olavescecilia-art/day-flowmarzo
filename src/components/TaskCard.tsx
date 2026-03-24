import React from "react";
import { MoreHorizontal, Clock } from "lucide-react";
import { Task, Priority } from "../types";
import { cn, formatDuration } from "../lib/utils";

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => void;
  onMenuClick?: (id: string) => void;
  parentName?: string;
}

const priorityColors: Record<Priority, string> = {
  1: "bg-[#5B8A6F]",
  2: "bg-[#4A6FA5]",
  3: "bg-[#E8A030]",
  4: "bg-[#8A8A8A]",
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, onMenuClick, parentName }) => {
  const isCompleted = task.estado === "completa";

  return (
    <div className={cn(
      "card flex items-center justify-between p-3 transition-all hover:shadow-md",
      isCompleted && "opacity-50"
    )}>
      <div className="flex items-center space-x-3 flex-1">
        <button
          onClick={() => onComplete?.(task.id)}
          className={cn(
            "w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center",
            isCompleted 
              ? "bg-[var(--primary)] border-[var(--primary)]" 
              : "border-[var(--border)] hover:border-[var(--primary)]"
          )}
        >
          {isCompleted && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        
        <div className="flex-1">
          {parentName && (
            <div className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-widest mb-0.5">
              {parentName}
            </div>
          )}
          <h3 className={cn(
            "font-bold text-xs",
            isCompleted && "line-through"
          )}>
            {task.nombre}
          </h3>
          <div className="flex items-center space-x-2 mt-0.5">
            <div className="flex items-center space-x-1 bg-[var(--surface-2)] px-1.5 py-0.5 rounded-full text-[9px] text-[var(--text-muted)]">
              <Clock size={9} />
              <span>{formatDuration(task.duracion_minutos)}</span>
            </div>
            <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--primary-light)] text-[var(--primary)]">
              {task.categoria}
            </div>
            <div className={cn(
              "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-white font-bold",
              priorityColors[task.prioridad]
            )}>
              {task.prioridad}
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onMenuClick?.(task.id)}
        className="p-1 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]"
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
