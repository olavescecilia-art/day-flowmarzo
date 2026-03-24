import React, { useState } from "react";
import { X, Folder, Palette } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const colors = [
  "#4A90D9", "#7B68EE", "#5CB85C", "#E8A87C", "#C0392B", "#F0A500", "#FF6B6B", "#4ECDC4"
];

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "projects"), {
        userId: auth.currentUser.uid,
        nombre: name,
        descripcion: description,
        color: selectedColor,
        estado: "activo",
        creadoEn: Date.now()
      });
      onClose();
    } catch (error) {
      console.error("Error saving project: ", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">📁 Nuevo Proyecto</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Nombre del Proyecto</label>
            <input
              autoFocus
              type="text"
              className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
              placeholder="Ej: Rediseño Web, Tesis..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Descripción (Opcional)</label>
            <textarea
              className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)] min-h-[80px]"
              placeholder="De qué trata este proyecto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Color Identificador</label>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all border-4",
                    selectedColor === color ? "border-white shadow-lg scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--surface-2)] flex items-center space-x-4">
          <button onClick={onClose} className="flex-1 py-2.5 text-[var(--text-muted)] font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={!name}
            className="flex-[2] btn-primary disabled:opacity-50 text-sm"
          >
            Crear Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
