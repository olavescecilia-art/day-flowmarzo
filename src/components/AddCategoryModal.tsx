import React, { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emojis = ["💼", "📚", "💚", "👨‍👩‍👧", "💰", "🧴", "🎨", "🎮", "🏠", "✈️", "🎵", "🍳"];
const colors = ["#4A90D9", "#7B68EE", "#5CB85C", "#E8A87C", "#C0392B", "#F0A500", "#FF69B4", "#00CED1"];

export function AddCategoryModal({ isOpen, onClose }: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(emojis[0]);
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "categories"), {
        userId: auth.currentUser.uid,
        nombre: name,
        icono: selectedEmoji,
        color: selectedColor,
        creadaEn: Date.now()
      });
      onClose();
    } catch (error) {
      console.error("Error adding category: ", error);
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
          <h2 className="text-lg font-bold text-[var(--text)]">🎨 Nueva categoría</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Gimnasio, Cocina..."
              className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Icono</label>
            <div className="grid grid-cols-6 gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-xl p-2 rounded-lg transition-colors ${selectedEmoji === emoji ? 'bg-[var(--primary-light)]' : 'hover:bg-[var(--surface-2)]'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === color ? 'scale-110 border-white shadow-lg' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-[var(--text-muted)] font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={!name}
            className="flex-[2] btn-primary disabled:opacity-50 text-sm"
          >
            Crear
          </button>
        </div>
      </motion.div>
    </div>
  );
}
