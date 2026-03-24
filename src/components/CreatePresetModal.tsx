import React, { useState } from "react";
import { X, Package, Sparkles } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

interface CreatePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  { id: "Trabajo", icon: "💼" },
  { id: "Estudio", icon: "📚" },
  { id: "Salud", icon: "💚" },
  { id: "Familia", icon: "👨‍👩‍👧" },
  { id: "Finanzas", icon: "💰" },
  { id: "Personal", icon: "🧴" },
];

const icons = ["📝", "💻", "📚", "🏃‍♂️", "🧘‍♂️", "🍎", "🎨", "🎸", "🧹", "🛒", "📞", "📧"];

export function CreatePresetModal({ isOpen, onClose }: CreatePresetModalProps) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(25);
  const [category, setCategory] = useState("Trabajo");
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "presets"), {
        userId: auth.currentUser.uid,
        nombre: name,
        duracion_minutos: duration,
        categoria: category,
        icono: selectedIcon,
        creadaEn: Date.now()
      });
      onClose();
    } catch (error) {
      console.error("Error saving preset: ", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">✨ Nuevo Preset</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Nombre del Preset</label>
            <input
              autoFocus
              type="text"
              className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
              placeholder="Ej: Pomodoro Trabajo, Meditación..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Duración (min)</label>
              <input
                type="number"
                className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Categoría</label>
              <select
                className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Icono</label>
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all flex items-center justify-center text-xl",
                    selectedIcon === icon ? "bg-[var(--primary-light)] ring-2 ring-[var(--primary)]" : "bg-[var(--surface-2)] hover:bg-[var(--border)]"
                  )}
                >
                  {icon}
                </button>
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
            Crear Preset
          </button>
        </div>
      </div>
    </div>
  );
}
