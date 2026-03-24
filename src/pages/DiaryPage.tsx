import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Image as ImageIcon, Smile, ChevronRight, X, Save, FileText, Trash2, TrendingUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DiaryEntry, Emotion, Task } from "../types";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const emotionsList: { emoji: string, nombre: string, tipo: "positiva" | "negativa" | "neutral" }[] = [
  { emoji: "😊", nombre: "Alegría", tipo: "positiva" },
  { emoji: "😌", nombre: "Calma", tipo: "positiva" },
  { emoji: "💪", nombre: "Motivación", tipo: "positiva" },
  { emoji: "🥰", nombre: "Amor", tipo: "positiva" },
  { emoji: "🙏", nombre: "Gratitud", tipo: "positiva" },
  { emoji: "🌟", nombre: "Orgullo", tipo: "positiva" },
  { emoji: "💫", nombre: "Esperanza", tipo: "positiva" },
  { emoji: "😰", nombre: "Ansiedad", tipo: "negativa" },
  { emoji: "😢", nombre: "Tristeza", tipo: "negativa" },
  { emoji: "😤", nombre: "Frustración", tipo: "negativa" },
  { emoji: "😠", nombre: "Enojo", tipo: "negativa" },
  { emoji: "😤", nombre: "Abrumada", tipo: "negativa" },
  { emoji: "😔", nombre: "Arrepentimiento", tipo: "negativa" },
  { emoji: "😴", nombre: "Cansancio", tipo: "neutral" },
  { emoji: "🤔", nombre: "Confusión", tipo: "neutral" },
  { emoji: "😮", nombre: "Sorpresa", tipo: "neutral" },
];

export default function DiaryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // New/Edit Entry State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<Record<string, number>>({});
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredEntries = entries.filter(e => 
    e.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.contenidoHtml.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const templates = [
    { nombre: "📝 Libre", emoji: "📝", prompt: "" },
    { nombre: "☀️ Check-in", emoji: "☀️", prompt: "¿Cómo te sientes hoy? ¿Qué esperas del día?" },
    { nombre: "🌊 Brain dump", emoji: "🌊", prompt: "Escribe todo lo que tienes en la cabeza sin juzgar." },
    { nombre: "📊 Revisión", emoji: "📊", prompt: "¿Qué lograste hoy? ¿Qué podrías mejorar mañana?" },
    { nombre: "🙏 Gratitud", emoji: "🙏", prompt: "3 cosas por las que estás agradecido hoy." },
  ];

  const applyTemplate = (prompt: string) => {
    setContent(prev => prev ? prev + "\n\n" + prompt : prompt);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "entries"),
      where("userId", "==", user.uid),
      orderBy("creadaEn", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)));
    });

    // Fetch today's tasks for linking
    const today = new Date().toISOString().split('T')[0];
    const tasksQ = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("fecha", "==", today)
    );
    const unsubscribeTasks = onSnapshot(tasksQ, (snapshot) => {
      setTodayTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => {
      unsubscribe();
      unsubscribeTasks();
    };
  }, [user]);

  const handleEmotionTap = (nombre: string) => {
    setSelectedEmotions(prev => ({
      ...prev,
      [nombre]: (prev[nombre] || 0) + 1
    }));
  };

  const handleRemoveEmotion = (nombre: string) => {
    setSelectedEmotions(prev => {
      const next = { ...prev };
      delete next[nombre];
      return next;
    });
  };

  const handleSaveEntry = async () => {
    if (!user || (!title && !content)) return;
    setLoading(true);

    const emotions: Emotion[] = Object.entries(selectedEmotions).map(([nombre, intensidad]) => {
      const base = emotionsList.find(e => e.nombre === nombre)!;
      return { ...base, intensidad: intensidad as number };
    });

    const balanceDia = emotions.reduce((acc, e) => {
      if (e.tipo === "positiva") return acc + e.intensidad;
      if (e.tipo === "negativa") return acc - e.intensidad;
      return acc;
    }, 0);

    // Upload images
    setUploadingImages(true);
    const imageUrls: any[] = selectedEntry?.fotos || [];
    for (const file of images) {
      const storageRef = ref(storage, `users/${user.uid}/diary/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      imageUrls.push({ url, tags: [], fecha: Date.now() });
    }

    const entryData: Partial<DiaryEntry> = {
      userId: user.uid,
      diarioId: "personal",
      titulo: title || "Sin título",
      contenidoHtml: content,
      emociones: emotions,
      balanceDia,
      tareasVinculadas: linkedTasks,
      sesionesVinculadas: [],
      fotos: imageUrls,
      editadaEn: Date.now(),
    };

    try {
      if (selectedEntry) {
        await updateDoc(doc(db, "entries", selectedEntry.id), entryData);
      } else {
        await addDoc(collection(db, "entries"), {
          ...entryData,
          creadaEn: Date.now(),
        });
      }
      setIsCreating(false);
      setSelectedEntry(null);
      // Reset
      setTitle("");
      setContent("");
      setSelectedEmotions({});
      setLinkedTasks([]);
      setImages([]);
    } catch (error) {
      console.error("Error saving entry: ", error);
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setTitle(entry.titulo);
    setContent(entry.contenidoHtml);
    const emotionsMap: Record<string, number> = {};
    entry.emociones.forEach(e => {
      emotionsMap[e.nombre] = e.intensidad;
    });
    setSelectedEmotions(emotionsMap);
    setLinkedTasks(entry.tareasVinculadas);
    setIsCreating(true);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, "entries", id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting entry: ", error);
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => { setIsCreating(false); setSelectedEntry(null); setTitle(""); setContent(""); setSelectedEmotions({}); setLinkedTasks([]); setImages([]); }} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={24} />
          </button>
          <h2 className="font-bold text-[var(--text)]">{selectedEntry ? "Editar entrada" : "Nueva entrada"}</h2>
          <button 
            onClick={handleSaveEntry}
            disabled={loading}
            className="btn-primary py-2 px-6 flex items-center space-x-2"
          >
            <Save size={18} />
            <span>{loading ? "Guardando..." : "Guardar"}</span>
          </button>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Título de la entrada"
            className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-[var(--text-muted)]/40"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {templates.map(t => (
              <button 
                key={t.nombre} 
                onClick={() => applyTemplate(t.prompt)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors text-xs font-bold text-[var(--text-muted)] whitespace-nowrap"
              >
                {t.nombre}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Escribe aquí tu día..."
            className="w-full min-h-[300px] bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 focus:ring-2 focus:ring-[var(--primary-light)] shadow-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Emotions Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-[var(--text)]">¿Cómo te sentiste hoy?</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {emotionsList.map((emo) => (
                <button
                  key={emo.nombre}
                  onClick={() => handleEmotionTap(emo.nombre)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                    selectedEmotions[emo.nombre] 
                      ? "border-[var(--primary)] bg-[var(--primary-light)]" 
                      : "border-transparent bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <span className="text-2xl mb-1">{emo.emoji}</span>
                  <span className="text-[10px] font-bold text-[var(--text)]">{emo.nombre}</span>
                  {selectedEmotions[emo.nombre] && (
                    <span className="mt-1 bg-[var(--primary)] text-white text-[10px] px-1.5 rounded-full font-bold">
                      ×{selectedEmotions[emo.nombre]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {Object.keys(selectedEmotions).length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-[var(--surface-2)] rounded-2xl">
                {Object.entries(selectedEmotions).map(([nombre, count]) => (
                  <div key={nombre} className="flex items-center space-x-1 bg-white px-3 py-1.5 rounded-full shadow-sm text-xs font-bold">
                    <span>{emotionsList.find(e => e.nombre === nombre)?.emoji}</span>
                    <span>{nombre} ×{count}</span>
                    <button onClick={() => handleRemoveEmotion(nombre)} className="ml-1 text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Tasks */}
          <div className="space-y-4">
            <h3 className="font-bold text-[var(--text)]">Vincular actividades</h3>
            <div className="flex flex-wrap gap-2">
              {todayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => {
                    setLinkedTasks(prev => 
                      prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                    );
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold border-2 transition-all",
                    linkedTasks.includes(task.id)
                      ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                      : "border-transparent bg-[var(--surface)] text-[var(--text-muted)]"
                  )}
                >
                  {task.estado === "completa" ? "✅" : "○"} {task.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <h3 className="font-bold text-[var(--text)]">Fotos</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Existing Photos */}
              {selectedEntry?.fotos.map((foto, i) => (
                <div key={`existing-${i}`} className="aspect-square rounded-2xl overflow-hidden relative group">
                  <img src={foto.url} alt="Existing" className="w-full h-full object-cover" />
                  <button 
                    onClick={async () => {
                      if (!selectedEntry) return;
                      const newFotos = selectedEntry.fotos.filter((_, idx) => idx !== i);
                      await updateDoc(doc(db, "entries", selectedEntry.id), { fotos: newFotos });
                      setSelectedEntry({ ...selectedEntry, fotos: newFotos });
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {/* New Photos Preview */}
              {images.map((img, i) => (
                <div key={`new-${i}`} className="aspect-square rounded-2xl overflow-hidden relative group">
                  <img src={URL.createObjectURL(img)} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-2)] cursor-pointer transition-colors">
                <ImageIcon size={24} />
                <span className="text-[10px] font-bold mt-2 uppercase">Subir foto</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files!)]);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text)]">📖 Diario</h1>
        <button 
          onClick={() => setIsCreating(true)}
          className="btn-primary flex items-center space-x-2 py-2 px-4 text-xs"
        >
          <Plus size={18} />
          <span>Nueva entrada</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
        <input 
          type="text" 
          placeholder="Buscar en el diario..."
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Mood Summary */}
      {entries.length > 0 && (
        <div className="card p-4 space-y-4 bg-gradient-to-br from-[var(--primary-light)] to-[var(--surface)] border-none shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-white/50 rounded-lg text-[var(--primary)]">
                <TrendingUp size={16} />
              </div>
              <h3 className="font-bold text-[var(--primary)] text-[10px] uppercase tracking-wider">Tendencia de ánimo</h3>
            </div>
            <span className="text-[var(--primary)] font-bold text-[10px]">Últimas 10 entradas</span>
          </div>
          
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entries.slice(0, 10).reverse().map(e => ({ 
                name: format(new Date(e.creadaEn), 'dd/MM'), 
                value: e.balanceDia,
                emoji: e.emociones[0]?.emoji || "📝"
              }))}>
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 rounded-xl shadow-xl border border-[var(--border)] text-[10px] font-bold">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{payload[0].payload.emoji}</span>
                            <span>Balance: {payload[0].value}</span>
                          </div>
                          <div className="text-[var(--text-muted)] mt-1">{payload[0].payload.name}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="var(--primary)" strokeDasharray="3 3" strokeOpacity={0.2} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredEntries.map(entry => (
          <div 
            key={entry.id} 
            onClick={() => handleEditEntry(entry)}
            className="card hover:shadow-md transition-all p-4 space-y-3 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {new Date(entry.creadaEn).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h3 className="text-base font-bold text-[var(--text)] mt-0.5">{entry.titulo}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  entry.balanceDia > 0 ? "bg-green-100 text-green-700" : entry.balanceDia < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                )}>
                  Balance: {entry.balanceDia > 0 ? "+" : ""}{entry.balanceDia}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(entry.id);
                  }}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {entry.contenidoHtml}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {entry.emociones.slice(0, 5).map((emo, i) => (
                <div key={i} className="flex items-center space-x-1 bg-[var(--surface-2)] px-1.5 py-0.5 rounded-lg text-[9px] font-bold">
                  <span>{emo.emoji}</span>
                  <span>×{emo.intensidad}</span>
                </div>
              ))}
              {entry.emociones.length > 5 && (
                <div className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-[var(--text-muted)]">
                  +{entry.emociones.length - 5}
                </div>
              )}
            </div>

            {entry.fotos.length > 0 && (
              <div className="flex gap-1.5 overflow-hidden h-10">
                {entry.fotos.map((foto, i) => (
                  <img key={i} src={foto.url} alt="Entry" className="w-10 h-10 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}

        {entries.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <FileText size={32} />
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Aún no has escrito en tu diario</p>
            <button onClick={() => setIsCreating(true)} className="btn-outlined py-1.5 px-4 text-[10px]">
              Escribir mi primera entrada
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[var(--bg)] p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[var(--text)]">¿Eliminar entrada?</h3>
                <p className="text-xs text-[var(--text-muted)]">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-[var(--surface-2)] text-[var(--text)] font-bold rounded-2xl text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteEntry(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-xs"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
