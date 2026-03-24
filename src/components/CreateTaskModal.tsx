import React, { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Star, Pin, Zap, Clock, Library, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { Priority, Task, Project, Preset } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, getDocs } from "firebase/firestore";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

const categories = [
  { id: "Trabajo", icon: "💼", color: "#4A90D9" },
  { id: "Estudio", icon: "📚", color: "#7B68EE" },
  { id: "Salud", icon: "💚", color: "#5CB85C" },
  { id: "Familia", icon: "👨‍👩‍👧", color: "#E8A87C" },
  { id: "Finanzas", icon: "💰", color: "#C0392B" },
  { id: "Personal", icon: "🧴", color: "#F0A500" },
];

const priorities: { id: Priority; label: string; icon: any }[] = [
  { id: 1, label: "Urgente + importante", icon: Star },
  { id: 2, label: "Solo importante", icon: Pin },
  { id: 3, label: "Solo urgente", icon: Zap },
  { id: 4, label: "Puede esperar", icon: Clock },
];

export function CreateTaskModal({ isOpen, onClose, taskToEdit }: CreateTaskModalProps) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(25);
  const [category, setCategory] = useState("Trabajo");
  const [priority, setPriority] = useState<Priority>(1);
  const [date, setDate] = useState<string>("hoy");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced fields
  const [notes, setNotes] = useState("");
  const [isHabit, setIsHabit] = useState(false);
  const [habitGoal, setHabitGoal] = useState(100);
  const [reward, setReward] = useState("");
  const [repetitionType, setRepetitionType] = useState<"nunca" | "diario" | "semanal" | "personalizado">("nunca");
  const [repetitionValue, setRepetitionValue] = useState(1);
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "library">("new");

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;
    const q = query(collection(db, "categories"), where("userId", "==", auth.currentUser.uid));
    const unsubscribeCats = onSnapshot(q, (snapshot) => {
      setUserCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qProjects = query(collection(db, "projects"), where("userId", "==", auth.currentUser.uid));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const qPresets = query(collection(db, "presets"), where("userId", "==", auth.currentUser.uid));
    const unsubscribePresets = onSnapshot(qPresets, (snapshot) => {
      setPresets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset)));
    });

    // Fetch library tasks (tasks with no date or just all tasks to pick from)
    const fetchLibrary = async () => {
      const libQ = query(collection(db, "tasks"), where("userId", "==", auth.currentUser!.uid));
      const snap = await getDocs(libQ);
      const uniqueTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      // Filter unique by name to act as a library
      const library = Array.from(new Map(uniqueTasks.map(t => [t.nombre, t])).values());
      setLibraryTasks(library);
    };
    fetchLibrary();

    return () => {
      unsubscribeCats();
      unsubscribeProjects();
      unsubscribePresets();
    };
  }, [isOpen]);

  const allCategories = [
    ...categories,
    ...userCategories.map(c => ({ id: c.nombre, icon: c.icono, color: c.color }))
  ];

  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.nombre);
      setDuration(taskToEdit.duracion_minutos);
      setCategory(taskToEdit.categoria);
      setPriority(taskToEdit.prioridad);
      setDate(taskToEdit.fecha ? "elegir" : "biblioteca");
      setSelectedDate(taskToEdit.fecha || new Date().toISOString().split('T')[0]);
      setShowAdvanced(!!(taskToEdit.notas || taskToEdit.esHabito));
      setNotes(taskToEdit.notas || "");
      setIsHabit(taskToEdit.esHabito || false);
      setHabitGoal(taskToEdit.metaRepeticiones || 100);
      setReward(taskToEdit.recompensa || "");
      setRepetitionType(taskToEdit.repeticion?.tipo || "nunca");
      setRepetitionValue(taskToEdit.repeticion?.config?.cada_n || 1);
      setSelectedProjectId(taskToEdit.proyectoId || "");
      setSelectedPresetId(taskToEdit.presetId || "");
    } else {
      setName("");
      setDuration(25);
      setCategory("Trabajo");
      setPriority(1);
      setDate("hoy");
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setShowAdvanced(false);
      setNotes("");
      setIsHabit(false);
      setHabitGoal(100);
      setReward("");
      setRepetitionType("nunca");
      setRepetitionValue(1);
      setSelectedProjectId("");
      setSelectedPresetId("");
    }
  }, [taskToEdit, isOpen]);

  const handleSelectFromLibrary = (libTask: Task) => {
    setName(libTask.nombre);
    setDuration(libTask.duracion_minutos);
    setCategory(libTask.categoria);
    setPriority(libTask.prioridad);
    setIsHabit(libTask.esHabito || false);
    setNotes(libTask.notas || "");
    setActiveTab("new");
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name || !auth.currentUser) return;

    const taskData: Partial<Task> = {
      userId: auth.currentUser.uid,
      nombre: name,
      duracion_minutos: duration,
      categoria: category,
      prioridad: priority,
      estado: taskToEdit?.estado || "pendiente",
      esHabito: isHabit,
      notas: notes,
      repeticion: {
        tipo: repetitionType,
        config: repetitionType !== "nunca" ? {
          cada_n: repetitionValue,
          unidad: "dias", // Defaulting to days for simplicity in this quick UI
          dias_semana: []
        } : undefined
      },
      proyectoId: selectedProjectId || undefined,
      presetId: selectedPresetId || undefined
    };

    if (!taskToEdit) {
      taskData.creadaEn = Date.now();
    }

    if (date === "hoy") taskData.fecha = new Date().toISOString().split('T')[0];
    else if (date === "mañana") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      taskData.fecha = tomorrow.toISOString().split('T')[0];
    } else if (date === "elegir") {
      taskData.fecha = selectedDate;
    } else {
      taskData.fecha = undefined;
    }

    if (isHabit) {
      taskData.rachaActual = taskToEdit?.rachaActual || 0;
      taskData.mejorRacha = taskToEdit?.mejorRacha || 0;
      taskData.totalCompletadas = taskToEdit?.totalCompletadas || 0;
      taskData.metaRepeticiones = habitGoal;
      taskData.recompensa = reward;
    }

    try {
      if (taskToEdit) {
        await updateDoc(doc(db, "tasks", taskToEdit.id), taskData);
      } else {
        await addDoc(collection(db, "tasks"), taskData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving task: ", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-xl bg-[var(--surface)] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">{taskToEdit ? "✏️ Editar tarea" : "✨ Nueva tarea"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-2)] rounded-full text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        {!taskToEdit && (
          <div className="flex border-b border-[var(--border)]">
            <button 
              onClick={() => setActiveTab("new")}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                activeTab === "new" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-muted)]"
              )}
            >
              Crear desde cero
            </button>
            <button 
              onClick={() => setActiveTab("library")}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                activeTab === "library" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-muted)]"
              )}
            >
              Biblioteca
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === "library" && !taskToEdit ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)] font-medium mb-4">Elegí una tarea de tu biblioteca para agregarla a hoy:</p>
              {libraryTasks.length > 0 ? (
                libraryTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectFromLibrary(t)}
                    className="w-full p-4 bg-[var(--surface-2)] rounded-xl flex items-center justify-between hover:bg-[var(--border)] transition-colors text-left group"
                  >
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{t.nombre}</p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">{t.categoria} · {t.duracion_minutos}min</p>
                    </div>
                    <Plus size={18} className="text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <Library size={32} className="mx-auto text-[var(--text-muted)] opacity-20 mb-2" />
                  <p className="text-sm text-[var(--text-muted)] italic">Tu biblioteca está vacía</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Name Input */}
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="¿Qué querés hacer?"
              className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-[var(--text-muted)]/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">⏱ Duración</label>
            <div className="flex flex-wrap gap-2">
              {[15, 25, 45, 60, 120].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    duration === m ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--border)]"
                  )}
                >
                  {m < 60 ? `${m}m` : `${m/60}h`}
                </button>
              ))}
              <div className="flex items-center space-x-2 bg-[var(--surface-2)] px-2.5 py-1.5 rounded-full">
                <input
                  type="number"
                  className="w-10 bg-transparent border-none focus:ring-0 text-sm font-medium p-0 text-center"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                />
                <span className="text-xs text-[var(--text-muted)] font-medium">min</span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Categoría</label>
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
              {allCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border-2",
                    category === cat.id 
                      ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]" 
                      : "border-transparent bg-[var(--surface-2)] text-[var(--text-muted)]"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">📅 Fecha</label>
            <div className="flex gap-2">
              {["hoy", "mañana", "elegir", "biblioteca"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
                    date === d ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                  )}
                >
                  {d === "biblioteca" ? "Sin fecha" : d}
                </button>
              ))}
            </div>
            {date === "elegir" && (
              <input
                type="date"
                className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            )}
            {date === "biblioteca" && (
              <p className="text-[10px] text-[var(--text-muted)] italic">Se guardará solo en Biblioteca</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Prioridad</label>
            <div className="grid grid-cols-2 gap-3">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    "flex items-center space-x-3 p-2.5 rounded-xl text-left transition-all border-2",
                    priority === p.id 
                      ? "border-[var(--primary)] bg-[var(--primary-light)]" 
                      : "border-transparent bg-[var(--surface-2)]"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-white",
                    p.id === 1 ? "bg-[#5B8A6F]" : p.id === 2 ? "bg-[#4A6FA5]" : p.id === 3 ? "bg-[#E8A030]" : "bg-[#8A8A8A]"
                  )}>
                    <p.icon size={14} />
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold leading-tight",
                    priority === p.id ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                  )}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center space-x-2 py-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {showAdvanced ? "Ocultar opciones avanzadas" : "Opciones avanzadas"}
            </span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvanced && (
            <div className="space-y-6 pb-4 animate-in slide-in-from-top-4 duration-300">
              {/* Notes */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Notas</label>
                <textarea
                  placeholder="Agregar notas..."
                  className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)] min-h-[80px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Project & Preset Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Proyecto</label>
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Ninguno</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Preset</label>
                  <select 
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Ninguno</option>
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Habit Toggle */}
              <div className="flex items-center justify-between bg-[var(--surface-2)] p-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                    <Zap size={16} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text)]">Convertir en hábito</p>
                    <p className="text-[9px] text-[var(--text-muted)]">Trackea rachas y progreso</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHabit(!isHabit)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    isHabit ? "bg-[var(--primary)]" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                    isHabit ? "left-5.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {/* Repetition Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">🔄 Repetir</label>
                <div className="flex gap-2">
                  {(["nunca", "diario", "semanal"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRepetitionType(type)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors",
                        repetitionType === type ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {repetitionType !== "nunca" && (
                  <div className="flex items-center space-x-3 bg-[var(--surface-2)] p-3 rounded-xl">
                    <span className="text-xs text-[var(--text-muted)]">Cada</span>
                    <input
                      type="number"
                      min="1"
                      className="w-12 bg-white border-none rounded-lg p-1 text-center text-sm font-bold"
                      value={repetitionValue}
                      onChange={(e) => setRepetitionValue(parseInt(e.target.value) || 1)}
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                      {repetitionType === "diario" ? "días" : "semanas"}
                    </span>
                  </div>
                )}
              </div>

              {isHabit && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Meta de repeticiones</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="365"
                        className="flex-1 accent-[var(--primary)]"
                        value={habitGoal}
                        onChange={(e) => setHabitGoal(parseInt(e.target.value))}
                      />
                      <span className="text-sm font-bold text-[var(--primary)] w-12 text-right">{habitGoal}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">🎁 Recompensa</label>
                    <input
                      type="text"
                      placeholder="¿Qué te vas a dar cuando lo logres?"
                      className="w-full bg-[var(--surface-2)] border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--primary-light)]"
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>

        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center space-x-4">
          <button onClick={onClose} className="flex-1 py-2.5 text-[var(--text-muted)] font-bold text-sm">Cancelar</button>
          <button 
            onClick={handleSave}
            disabled={!name}
            className="flex-[2] btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {taskToEdit ? "Actualizar tarea" : "Guardar tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
