import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { cn } from "../lib/utils";

interface CollapsibleSectionProps {
  icon: React.ElementType;
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon: Icon,
  title,
  count,
  isOpen,
  onToggle,
  onAdd,
  children
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <div 
        className="flex items-center justify-between py-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors px-2 rounded-lg"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2.5">
          <div className="text-[var(--text-muted)]">
            <Icon size={18} />
          </div>
          <span className="font-bold text-sm text-[var(--text)]">{title}</span>
          {count !== undefined && (
            <span className="bg-[var(--border)] text-[var(--text-muted)] text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {onAdd && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="p-1 hover:bg-[var(--primary-light)] rounded-md text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            >
              <Plus size={18} />
            </button>
          )}
          <div className="text-[var(--text-muted)]">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="py-1.5 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
