import React, { useState, useEffect } from "react";
import { X, LayoutGrid, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { Task, Routine, RepetitionType } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoutineModal({ isOpen, onClose }: CreateRoutineModalProps) {
  const [nombre, setNombre] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([]);
  const [repetitionType, setRepetitionType] = useState<RepetitionType>("diaria");
  const [repetitionValue, setRepetitionValue] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;
    const fetchLibrary = async () => {
      const q = query(collection(db, "tasks"), where("userId", "==", auth.currentUser!.uid));
      const snap = await getDocs(q);
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      // Unique by name
      const unique = Array.from(new Map(tasks.map(t => [t.nombre, t])).values());
      setLibraryTasks(unique);
    };
    fetchLibrary();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTask = (task: Task) => {
    if (selectedTasks.find(t => t.id === task.id)) {
      setSelectedTasks(selectedTasks.filter(t => t.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const handleSave = async () => {
    if (!nombre || selectedTasks.length === 0 || !auth.currentUser) return;
    setIsLoading(true);
    try {
      const routineData: Partial<Routine> = {
        userId: auth.currentUser.uid,
        nombre,
        tareasIds: selectedTasks.map(t => t.id),
        repeticion: {
          tipo: repetitionType,
          valor: repetitionValue
        },
        activa: true,
        creadaEn: Date.now()
      };
      await addDoc(collection(db, "routines"), routineData);
      onClose();
    } catch (error) {
      console.error("Error saving routine:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-xl bg-[var(--surface)] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">🔄 Nueva Rutina</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Nombre de la Rutina</label>
            <input
              autoFocus
              type="text"
              placeholder="Ej: Rutina de Mañana"
              className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-[var(--text-muted)]/40"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          {/* Repetition */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Frecuencia</label>
            <div className="flex gap-2 p-1 bg-[var(--surface-2)] rounded-xl">
              {(["diaria", "semanal", "mensual"] as RepetitionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setRepetitionType(type)}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all",
                    repetitionType === type ? "bg-white text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Seleccionar Tareas</label>
              <span className="text-[10px] font-bold text-[var(--primary)]">{selectedTasks.length} seleccionadas</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {libraryTasks.map(task => {
                const isSelected = selectedTasks.find(t => t.id === task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task)}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center justify-between border-2 transition-all text-left",
                      isSelected 
                        ? "bg-[var(--primary-light)]/10 border-[var(--primary)]" 
                        : "bg-[var(--surface-2)] border-transparent hover:border-[var(--border)]"
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{task.nombre}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">{task.categoria} · {task.duracion_minutos}min</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-[var(--primary)] border-[var(--primary)] text-white" : "border-[var(--border)]"
                    )}>
                      {isSelected && <Plus size={12} className="rotate-45" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center space-x-4">
          <button onClick={onClose} className="flex-1 py-2.5 text-[var(--text-muted)] font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={!nombre || selectedTasks.length === 0 || isLoading}
            className="flex-[2] btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? "Guardando..." : "Crear Rutina"}
          </button>
        </div>
      </div>
    </div>
  );
}
