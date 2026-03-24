import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, Square, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";

interface FreeTimerProps {
  onClose: () => void;
}

export function FreeTimer({ onClose }: FreeTimerProps) {
  const [activityName, setActivityName] = useState("");
  const [category, setCategory] = useState("Personal");
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [recentHistory, setRecentHistory] = useState<{ count: number, regret: number } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const checkHistory = async (name: string) => {
    if (!name || !auth.currentUser) return;
    
    const q = query(
      collection(db, "timer_sessions"),
      where("userId", "==", auth.currentUser.uid),
      where("nombreActividad", "==", name),
      limit(10)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => d.data());
      const regretCount = docs.filter(d => d.sentimientoTipo === "arrepentimiento").length;
      setRecentHistory({ count: snapshot.size, regret: regretCount });
    } else {
      setRecentHistory(null);
    }
  };

  const handleStop = () => {
    setIsActive(false);
    setShowRating(true);
  };

  const handleSave = async (rating: number, type: "disfrutable" | "neutral" | "arrepentimiento") => {
    if (!auth.currentUser) return;

    const sessionData = {
      userId: auth.currentUser.uid,
      nombreActividad: activityName || "Actividad sin nombre",
      categoria: category,
      duracionSegundos: seconds,
      puntuacion: rating,
      sentimientoTipo: type,
      fecha: new Date().toISOString().split('T')[0],
      creadaEn: Date.now()
    };

    try {
      await addDoc(collection(db, "timer_sessions"), sessionData);
      onClose();
    } catch (error) {
      console.error("Error saving timer session: ", error);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[var(--bg)] flex flex-col p-4">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
          <X size={20} />
        </button>
        <h2 className="font-bold text-[var(--text)] text-base">Cronómetro libre</h2>
        <div className="w-8" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-md mx-auto w-full">
        <div className="text-center space-y-3">
          <div className="text-5xl font-mono font-bold text-[var(--primary)] tracking-tighter">
            {formatTime(seconds)}
          </div>
          <p className="text-[var(--text-muted)] font-medium uppercase tracking-widest text-[10px]">Tiempo transcurrido</p>
        </div>

        <div className="w-full space-y-5">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="¿Qué estás haciendo?"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-base font-bold focus:ring-2 focus:ring-[var(--primary-light)] shadow-sm"
              value={activityName}
              onChange={(e) => {
                setActivityName(e.target.value);
                if (e.target.value.length > 2) checkHistory(e.target.value);
              }}
            />
          </div>

          {recentHistory && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-xl animate-in slide-in-from-left-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                <div className="text-xs">
                  <p className="font-bold text-yellow-800">Actividad recurrente</p>
                  <p className="text-yellow-700 mt-0.5">
                    Hiciste esto {recentHistory.count} veces recientemente. 
                    {recentHistory.regret > 0 && ` Te arrepentiste ${recentHistory.regret} veces.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!isActive ? (
              <button 
                onClick={() => setIsActive(true)}
                className="flex-1 btn-primary py-3 text-base flex items-center justify-center space-x-2 shadow-lg"
              >
                <Play size={20} fill="currentColor" />
                <span>Iniciar</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsActive(false)}
                  className="flex-1 btn-outlined py-3 text-base flex items-center justify-center space-x-2"
                >
                  <Pause size={20} fill="currentColor" />
                  <span>Pausar</span>
                </button>
                <button 
                  onClick={handleStop}
                  className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 text-base rounded-xl font-bold flex items-center justify-center space-x-2"
                >
                  <Square size={20} fill="currentColor" />
                  <span>Detener</span>
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {showRating && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm bg-[var(--surface)] rounded-2xl shadow-2xl p-6 space-y-6 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--text)]">¿Cómo estuvo?</h3>
              <p className="text-xs text-[var(--text-muted)]">Valora tu tiempo en "{activityName || "esta actividad"}"</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleSave(10, "disfrutable")}
                className="w-full py-3 rounded-xl bg-green-50 text-green-700 font-bold flex items-center justify-center space-x-3 hover:bg-green-100 transition-colors text-sm"
              >
                <span className="text-xl">😊</span>
                <span>Lo disfruté</span>
              </button>
              <button 
                onClick={() => handleSave(5, "neutral")}
                className="w-full py-3 rounded-xl bg-gray-50 text-gray-700 font-bold flex items-center justify-center space-x-3 hover:bg-gray-100 transition-colors text-sm"
              >
                <span className="text-xl">😐</span>
                <span>Neutral</span>
              </button>
              <button 
                onClick={() => handleSave(1, "arrepentimiento")}
                className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold flex items-center justify-center space-x-3 hover:bg-red-100 transition-colors text-sm"
              >
                <span className="text-xl">😔</span>
                <span>Me arrepiento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
