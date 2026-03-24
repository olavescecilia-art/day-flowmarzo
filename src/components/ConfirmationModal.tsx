import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger"
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
            className="relative bg-[var(--bg)] p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              variant === "danger" ? "bg-red-100 text-red-500" :
              variant === "warning" ? "bg-yellow-100 text-yellow-500" :
              "bg-blue-100 text-blue-500"
            }`}>
              {variant === "danger" ? <Trash2 size={32} /> : <AlertTriangle size={32} />}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--text)]">{title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{message}</p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-[var(--surface-2)] text-[var(--text)] font-bold rounded-2xl text-xs active:scale-95 transition-transform"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-3 font-bold rounded-2xl text-xs text-white active:scale-95 transition-transform ${
                  variant === "danger" ? "bg-red-500" :
                  variant === "warning" ? "bg-yellow-500" :
                  "bg-blue-500"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
