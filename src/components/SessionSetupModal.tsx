import React, { useState } from "react";
import { X, Check, Play } from "lucide-react";
import { Task } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDuration } from "../lib/utils";

interface SessionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onStart: (selectedTasks: Task[]) => void;
}

export const SessionSetupModal: React.FC<SessionSetupModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onStart,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(tasks.map(t => t.id));

  const toggleTask = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    const selectedTasks = tasks.filter(t => selectedIds.includes(t.id));
    if (selectedTasks.length > 0) {
      onStart(selectedTasks);
    }
  };

  const totalMinutes = tasks
    .filter(t => selectedIds.includes(t.id))
    .reduce((acc, t) => acc + t.duracion_minutos, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-[#E8E3DB] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#2C2C2C]">Preparar Sesión</h3>
                <p className="text-xs text-[#8A8A8A] mt-0.5">Selecciona las tareas para esta sesión</p>
              </div>
              <button onClick={onClose} className="text-[#8A8A8A] p-2 hover:bg-[#F7F4EF] rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all border-2",
                    selectedIds.includes(task.id)
                      ? "bg-[#5B8A6F]/5 border-[#5B8A6F] shadow-sm"
                      : "bg-[#F7F4EF] border-transparent opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedIds.includes(task.id)
                        ? "bg-[#5B8A6F] border-[#5B8A6F] text-white"
                        : "border-[#8A8A8A]"
                    )}>
                      {selectedIds.includes(task.id) && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#2C2C2C]">{task.nombre}</p>
                      <p className="text-[10px] text-[#8A8A8A] font-medium uppercase">
                        {task.categoria} · {task.duracion_minutos}min
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[#8A8A8A] text-sm">No hay tareas pendientes para hoy</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#F7F4EF] border-t border-[#E8E3DB]">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Total Estimado</span>
                <span className="text-base font-bold text-[#5B8A6F]">{formatDuration(totalMinutes)}</span>
              </div>
              <button
                onClick={handleStart}
                disabled={selectedIds.length === 0}
                className="w-full py-3 bg-[#5B8A6F] text-white rounded-xl font-bold shadow-lg shadow-[#5B8A6F]/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                Iniciar Sesión
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
