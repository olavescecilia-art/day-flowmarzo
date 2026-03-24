import React, { useState } from "react";
import { X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Task } from "../types";

interface AssignDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export function AssignDateModal({ isOpen, onClose, task }: AssignDateModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        fecha: selectedDate
      });
      onClose();
    } catch (error) {
      console.error("Error assigning date: ", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
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
        className="relative bg-[var(--bg)] w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">📅 Asignar fecha</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">
            Selecciona una fecha para <span className="text-[var(--text)] font-bold">{task.nombre}</span>
          </p>
          <input
            type="date"
            className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-[var(--text-muted)] font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave}
            className="flex-[2] btn-primary text-sm"
          >
            Asignar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
