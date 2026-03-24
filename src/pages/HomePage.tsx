import React, { useState, useEffect, useMemo } from "react";
import { Zap, Repeat, Package, Flame, Folder, Eye, Plus, Play, Timer, Filter, ArrowUpDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { TaskCard } from "../components/TaskCard";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { CreateRoutineModal } from "../components/CreateRoutineModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreatePresetModal } from "../components/CreatePresetModal";
import { SessionPlayer } from "../components/SessionPlayer";
import { FreeTimer } from "../components/FreeTimer";
import { SessionSetupModal } from "../components/SessionSetupModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { Task, Project, Preset, Routine, UserProfile } from "../types";
import { cn, formatDuration } from "../lib/utils";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, deleteDoc, increment, getDocs } from "firebase/firestore";
import { MoreVertical, Edit2, Trash2, CalendarX, X, LayoutGrid } from "lucide-react";

export default function HomePage() {
  const { user, profile } = useAuth();
  const [focusMode, setFocusMode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateRoutineModalOpen, setIsCreateRoutineModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isSessionSetupOpen, setIsSessionSetupOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionTasks, setSessionTasks] = useState<Task[]>([]);
  const [isFreeTimerActive, setIsFreeTimerActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [allHabits, setAllHabits] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"priority" | "duration" | "name">("priority");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tasks: true,
    routines: false,
    presets: false,
    habits: false,
    projects: false,
  });

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("fecha", "==", today),
      orderBy("creadaEn", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    });

    const projectsQuery = query(collection(db, "projects"), where("userId", "==", user.uid));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const presetsQuery = query(collection(db, "presets"), where("userId", "==", user.uid));
    const unsubscribePresets = onSnapshot(presetsQuery, (snapshot) => {
      setPresets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset)));
    });

    const routinesQuery = query(collection(db, "routines"), where("userId", "==", user.uid));
    const unsubscribeRoutines = onSnapshot(routinesQuery, (snapshot) => {
      setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Routine)));
    });

    const habitsQuery = query(collection(db, "tasks"), where("userId", "==", user.uid), where("esHabito", "==", true));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      setAllHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    return () => {
      unsubscribe();
      unsubscribeProjects();
      unsubscribePresets();
      unsubscribeRoutines();
      unsubscribeHabits();
    };
  }, [user]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.estado === "completa" ? "pendiente" : "completa";
    try {
      const taskUpdate: any = {
        estado: newStatus,
        completadaEn: newStatus === "completa" ? Date.now() : null
      };

      if (newStatus === "completa" && task.esHabito) {
        const lastComp = task.completadaEn ? new Date(task.completadaEn) : null;
        const now = new Date();
        let newHabitStreak = task.rachaActual || 0;

        if (!lastComp) {
          newHabitStreak = 1;
        } else {
          const diffTime = Math.abs(now.getTime() - lastComp.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isSameDay = now.toDateString() === lastComp.toDateString();
          const isYesterday = diffDays === 1;

          if (!isSameDay) {
            if (isYesterday) newHabitStreak += 1;
            else newHabitStreak = 1;
          }
        }
        taskUpdate.rachaActual = newHabitStreak;
        taskUpdate.totalCompletadas = (task.totalCompletadas || 0) + 1;
        if (newHabitStreak > (task.mejorRacha || 0)) {
          taskUpdate.mejorRacha = newHabitStreak;
        }
      }

      await updateDoc(doc(db, "tasks", taskId), taskUpdate);

      if (newStatus === "completa" && user && profile) {
        const userRef = doc(db, "users", user.uid);
        const now = new Date();
        const lastActivity = profile.ultimaActividad ? new Date(profile.ultimaActividad) : null;
        
        let newStreak = profile.rachaActual || 0;
        if (!lastActivity) {
          newStreak = 1;
        } else {
          const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const isSameDay = now.toDateString() === lastActivity.toDateString();
          const isYesterday = diffDays === 1;

          if (!isSameDay) {
            if (isYesterday) {
              newStreak += 1;
            } else {
              newStreak = 1;
            }
          }
        }

        await updateDoc(userRef, {
          focoTotalMinutos: increment(task.duracion_minutos),
          rachaActual: newStreak,
          ultimaActividad: Date.now()
        });
      }
    } catch (error) {
      console.error("Error updating task: ", error);
    }
  };

  const handleRemoveFromToday = async (taskId: string) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        fecha: null
      });
      setActiveMenuId(null);
    } catch (error) {
      console.error("Error removing task from today:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar tarea?",
      message: "¿Estás seguro de que quieres eliminar esta tarea permanentemente?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "tasks", taskId));
          setActiveMenuId(null);
        } catch (error) {
          console.error("Error deleting task:", error);
        }
      }
    });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await updateDoc(doc(db, "tasks", editingTask.id), {
        nombre: editingTask.nombre,
        duracion_minutos: editingTask.duracion_minutos,
        categoria: editingTask.categoria,
        prioridad: editingTask.prioridad
      });
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleStartSession = (selectedTasks: Task[]) => {
    setSessionTasks(selectedTasks);
    setIsSessionSetupOpen(false);
    setIsSessionActive(true);
  };

  const [quickTaskName, setQuickTaskName] = useState("");

  const handleActivateRoutine = async (routine: Routine) => {
    if (!user) return;
    try {
      // Fetch the tasks for this routine
      const tasksQ = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const snap = await getDocs(tasksQ);
      const allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      const routineTasks = allTasks.filter(t => routine.tareasIds.includes(t.id));

      // Clone tasks for today
      for (const t of routineTasks) {
        const { id, ...taskData } = t;
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          routineId: routine.id,
          fecha: new Date().toISOString().split('T')[0],
          estado: "pendiente",
          creadaEn: Date.now()
        });
      }
      alert(`Rutina "${routine.nombre}" activada para hoy!`);
    } catch (error) {
      console.error("Error activating routine:", error);
    }
  };

  const sortedAndFilteredTasks = useMemo(() => {
    let result = [...tasks];
    
    if (filterCategory) {
      result = result.filter(t => t.categoria === filterCategory);
    }

    if (filterProject) {
      result = result.filter(t => t.proyectoId === filterProject);
    }

    result.sort((a, b) => {
      if (sortBy === "priority") return a.prioridad - b.prioridad;
      if (sortBy === "duration") return b.duracion_minutos - a.duracion_minutos;
      if (sortBy === "name") return a.nombre.localeCompare(b.nombre);
      return 0;
    });

    return result;
  }, [tasks, filterCategory, filterProject, sortBy]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: { type: 'routine' | 'project' | 'preset' | 'none', id: string, name: string, tasks: Task[] } } = {};
    const ungrouped: Task[] = [];

    sortedAndFilteredTasks.forEach(task => {
      if (task.routineId) {
        const routine = routines.find(r => r.id === task.routineId);
        if (routine) {
          const key = `routine_${task.routineId}`;
          if (!groups[key]) {
            groups[key] = { type: 'routine', id: task.routineId, name: routine.nombre, tasks: [] };
          }
          groups[key].tasks.push(task);
          return;
        }
      }
      if (task.proyectoId) {
        const project = projects.find(p => p.id === task.proyectoId);
        if (project) {
          const key = `project_${task.proyectoId}`;
          if (!groups[key]) {
            groups[key] = { type: 'project', id: task.proyectoId, name: project.nombre, tasks: [] };
          }
          groups[key].tasks.push(task);
          return;
        }
      }
      if (task.presetId) {
        const preset = presets.find(p => p.id === task.presetId);
        if (preset) {
          const key = `preset_${task.presetId}`;
          if (!groups[key]) {
            groups[key] = { type: 'preset', id: task.presetId, name: preset.nombre, tasks: [] };
          }
          groups[key].tasks.push(task);
          return;
        }
      }
      ungrouped.push(task);
    });

    return { groups: Object.values(groups), ungrouped };
  }, [sortedAndFilteredTasks, routines, projects, presets]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickTaskName.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const newTask: Partial<Task> = {
      userId: user.uid,
      nombre: quickTaskName.trim(),
      duracion_minutos: 25,
      categoria: "General",
      prioridad: 2,
      estado: "pendiente",
      fecha: today,
      esHabito: false,
      creadaEn: Date.now(),
    };

    try {
      await addDoc(collection(db, "tasks"), newTask);
      setQuickTaskName("");
    } catch (error) {
      console.error("Error adding quick task:", error);
    }
  };

  const pendingTasks = tasks.filter(t => t.estado !== "completa");
  const completedTasks = tasks.filter(t => t.estado === "completa");
  const priority1Tasks = tasks.filter(t => t.prioridad === 1 && t.estado !== "completa");

  const routinesTasks = useMemo(() => {
    return tasks.filter(t => t.repeticion && t.repeticion.tipo !== "nunca");
  }, [tasks]);

  const habitsTasks = useMemo(() => {
    return tasks.filter(t => t.esHabito);
  }, [tasks]);

  const totalFocusMinutes = completedTasks.reduce((acc, t) => acc + t.duracion_minutos, 0);

  const longestHabitStreak = useMemo(() => {
    if (allHabits.length === 0) return 0;
    
    const now = new Date();
    const activeHabits = allHabits.filter(h => {
      if (!h.completadaEn) return false;
      const lastComp = new Date(h.completadaEn);
      const diffTime = Math.abs(now.getTime() - lastComp.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 1; // Active if completed today or yesterday
    });

    if (activeHabits.length === 0) return 0;
    return Math.max(...activeHabits.map(h => h.rachaActual || 0));
  }, [allHabits]);

  return (
    <div className="space-y-6">
      {/* Motivation Bar */}
      <div className="bg-[var(--primary-light)] px-3 py-1.5 rounded-xl flex items-center justify-between text-[12px] font-medium text-[var(--primary)]">
        <div className="flex items-center space-x-2">
          <Flame size={14} />
          <span>Racha actual: {profile?.rachaActual || 0} días</span>
          {longestHabitStreak > 0 && (
            <span className="ml-2 text-[10px] opacity-70">(Mejor hábito: {longestHabitStreak})</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Timer size={14} />
          <span>Foco hoy: {formatDuration(totalFocusMinutes)}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Hoy</h1>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">
            Buenos días, {profile?.displayName || "Usuario"} ☀️
          </p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            {pendingTasks.length} pendientes · {completedTasks.length} completadas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setFocusMode(!focusMode)}
            className={cn(
              "btn-outlined flex items-center space-x-2 py-2 text-xs",
              focusMode && "bg-[var(--primary)] text-white"
            )}
          >
            <Eye size={16} />
            <span>Modo foco</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center space-x-2 py-2 text-xs"
          >
            <Plus size={16} />
            <span>Tarea</span>
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleQuickAdd} className="relative group">
        <input 
          type="text"
          placeholder="¿Qué quieres lograr hoy? (Enter para guardar)"
          className="w-full bg-[var(--surface)] border-2 border-transparent focus:border-[var(--primary-light)] rounded-xl px-3 py-2.5 text-xs font-medium shadow-sm transition-all placeholder:text-[var(--text-muted)]/50"
          value={quickTaskName}
          onChange={(e) => setQuickTaskName(e.target.value)}
        />
        <button 
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--primary)] opacity-0 group-focus-within:opacity-100 transition-opacity"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setIsSessionSetupOpen(true)}
          disabled={pendingTasks.length === 0}
          className="btn-outlined flex items-center justify-center space-x-2 py-2.5 text-xs disabled:opacity-50"
        >
          <Play size={16} fill="currentColor" />
          <span className="font-bold">Nueva sesión</span>
        </button>
        <button 
          onClick={() => setIsFreeTimerActive(true)}
          className="btn-outlined flex items-center justify-center space-x-2 py-2.5 text-xs"
        >
          <Timer size={16} />
          <span className="font-bold">Cronómetro libre</span>
        </button>
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <button 
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={cn(
              "flex items-center space-x-1.5 bg-[var(--surface)] border px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors",
              filterCategory ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-muted)]"
            )}
          >
            <Filter size={12} />
            <span>{filterCategory || "Filtros"}</span>
          </button>
          
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute left-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-[120] py-1">
                <button 
                  onClick={() => { setFilterCategory(null); setShowFilterMenu(false); }}
                  className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]"
                >
                  Todos
                </button>
                {["Trabajo", "Estudio", "Salud", "Personal"].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setFilterCategory(cat); setShowFilterMenu(false); }}
                    className="w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center space-x-1.5 bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-full text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowUpDown size={12} />
            <span>Ordenar</span>
          </button>

          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setShowSortMenu(false)} />
              <div className="absolute left-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-[120] py-1">
                <button 
                  onClick={() => { setSortBy("priority"); setShowSortMenu(false); }}
                  className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "priority" && "text-[var(--primary)]")}
                >
                  Prioridad
                </button>
                <button 
                  onClick={() => { setSortBy("duration"); setShowSortMenu(false); }}
                  className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "duration" && "text-[var(--primary)]")}
                >
                  Duración
                </button>
                <button 
                  onClick={() => { setSortBy("name"); setShowSortMenu(false); }}
                  className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "name" && "text-[var(--primary)]")}
                >
                  Nombre
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <CollapsibleSection
          icon={Zap}
          title="Tareas de hoy"
          count={sortedAndFilteredTasks.length}
          isOpen={openSections.tasks}
          onToggle={() => toggleSection("tasks")}
          onAdd={() => setIsCreateModalOpen(true)}
        >
          <div className="space-y-4">
            {groupedTasks.groups.map(group => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    group.type === 'routine' ? "bg-[#5B8A6F]" : 
                    group.type === 'project' ? "bg-[#4A6FA5]" : "bg-[#E8A030]"
                  )} />
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {group.name}
                  </span>
                </div>
                <div className="space-y-2 pl-3 border-l border-[var(--border)] ml-1.5">
                  {group.tasks.map(task => (
                    <div key={task.id} className="relative">
                      <TaskCard 
                        task={task} 
                        onComplete={handleCompleteTask}
                        onMenuClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                      />
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-12 z-50 w-48 bg-white rounded-xl shadow-xl border border-[#E8E3DB] overflow-hidden py-1">
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F7F4EF] transition-colors"
                          >
                            <Edit2 size={16} className="text-[#5B8A6F]" />
                            <span>Editar tarea</span>
                          </button>
                          <button 
                            onClick={() => handleRemoveFromToday(task.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F7F4EF] transition-colors"
                          >
                            <CalendarX size={16} className="text-[#8A8A8A]" />
                            <span>Quitar de hoy</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {groupedTasks.ungrouped.map(task => (
              <div key={task.id} className="relative">
                <TaskCard 
                  task={task} 
                  onComplete={handleCompleteTask}
                  onMenuClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                />
                {activeMenuId === task.id && (
                  <div className="absolute right-0 top-12 z-50 w-48 bg-white rounded-xl shadow-xl border border-[#E8E3DB] overflow-hidden py-1">
                    <button 
                      onClick={() => {
                        setEditingTask(task);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F7F4EF] transition-colors"
                    >
                      <Edit2 size={16} className="text-[#5B8A6F]" />
                      <span>Editar tarea</span>
                    </button>
                    <button 
                      onClick={() => handleRemoveFromToday(task.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F7F4EF] transition-colors"
                    >
                      <CalendarX size={16} className="text-[#8A8A8A]" />
                      <span>Quitar de hoy</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {sortedAndFilteredTasks.length === 0 && (
              <div className="p-8 text-center space-y-4">
                <p className="text-[var(--text-muted)] text-sm">No hay tareas para hoy ✨</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-outlined py-2 text-xs"
                >
                  Agregar mi primera tarea
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Repeat}
          title="Rutinas"
          count={routines.length}
          isOpen={openSections.routines}
          onToggle={() => toggleSection("routines")}
          onAdd={() => setIsCreateRoutineModalOpen(true)}
        >
          <div className="grid grid-cols-1 gap-2">
            {routines.map(routine => (
              <div key={routine.id} className="bg-white border border-[#E8E3DB] rounded-xl p-3 flex items-center justify-between group hover:bg-[#F7F4EF] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#5B8A6F]/10 text-[#5B8A6F] rounded-lg flex items-center justify-center">
                    <LayoutGrid size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2C2C2C]">{routine.nombre}</p>
                    <p className="text-[10px] text-[#8A8A8A] font-medium uppercase">{routine.tareasIds.length} tareas · {routine.repeticion.tipo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleActivateRoutine(routine)}
                  className="p-2 text-[#5B8A6F] hover:bg-[#5B8A6F]/10 rounded-full transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            ))}
            {routines.length === 0 && (
              <div className="p-4 text-center text-[var(--text-muted)] text-sm italic">
                No hay rutinas creadas
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Package}
          title="Presets"
          count={presets.length}
          isOpen={openSections.presets}
          onToggle={() => toggleSection("presets")}
          onAdd={() => setIsPresetModalOpen(true)}
        >
          <div className="grid grid-cols-2 gap-2 p-2">
            {presets.map(preset => (
              <button 
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset);
                  setIsSessionSetupOpen(true);
                }}
                className="flex items-center gap-2 p-2 bg-white border border-[#E8E3DB] rounded-lg hover:bg-[#F7F4EF] transition-colors text-left"
              >
                <span className="text-lg">{preset.icono || "✨"}</span>
                <div>
                  <p className="text-[10px] font-bold text-[#2C2C2C] truncate">{preset.nombre}</p>
                  <p className="text-[8px] text-[#8A8A8A]">{preset.duracion_minutos}min</p>
                </div>
              </button>
            ))}
            {presets.length === 0 && (
              <div className="col-span-2 p-4 text-center text-[var(--text-muted)] text-sm italic">
                No hay presets guardados
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Flame}
          title="Hábitos"
          count={habitsTasks.length}
          isOpen={openSections.habits}
          onToggle={() => toggleSection("habits")}
          onAdd={() => setIsCreateModalOpen(true)}
        >
          <div className="space-y-2">
            {habitsTasks.map(task => {
              const parentName = 
                task.routineId ? routines.find(r => r.id === task.routineId)?.nombre :
                task.proyectoId ? projects.find(p => p.id === task.proyectoId)?.nombre :
                task.presetId ? presets.find(p => p.id === task.presetId)?.nombre : undefined;
              return (
                <div key={task.id} className="relative">
                  <TaskCard 
                    task={task} 
                    onComplete={handleCompleteTask} 
                    parentName={parentName}
                    onMenuClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                  />
                  {activeMenuId === task.id && (
                    <div className="absolute right-0 top-12 z-50 w-48 bg-white rounded-xl shadow-xl border border-[#E8E3DB] overflow-hidden py-1">
                      <button 
                        onClick={() => {
                          setEditingTask(task);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#2C2C2C] hover:bg-[#F7F4EF] transition-colors"
                      >
                        <Edit2 size={16} className="text-[#5B8A6F]" />
                        <span>Editar hábito</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {habitsTasks.length === 0 && (
              <div className="p-4 text-center text-[var(--text-muted)] text-sm italic">
                No hay hábitos configurados
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          icon={Folder}
          title="Proyectos"
          count={projects.length}
          isOpen={openSections.projects}
          onToggle={() => toggleSection("projects")}
          onAdd={() => setIsProjectModalOpen(true)}
        >
          <div className="grid grid-cols-2 gap-2 p-2">
            {projects.map(project => (
              <button 
                key={project.id}
                onClick={() => {
                  setFilterCategory(null);
                  setFilterProject(filterProject === project.id ? null : project.id);
                }}
                className={cn(
                  "flex items-center gap-2 p-2 border rounded-lg transition-colors text-left",
                  filterProject === project.id 
                    ? "bg-[var(--primary-light)] border-[var(--primary)]" 
                    : "bg-white border-[#E8E3DB] hover:bg-[#F7F4EF]"
                )}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                <p className="text-[10px] font-bold text-[#2C2C2C] truncate">{project.nombre}</p>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="col-span-2 p-4 text-center text-[var(--text-muted)] text-sm italic">
                No hay proyectos activos
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Focus Mode Overlay */}
      {focusMode && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFocusMode(false)} />
          
          <div className="relative z-10 w-full max-w-lg space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider">Modo foco activo</p>
              <button 
                onClick={() => setFocusMode(false)}
                className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-[10px] transition-colors"
              >
                ✕ Salir del foco
              </button>
            </div>

            <div className="space-y-2.5">
              {priority1Tasks.slice(0, 3).map(task => (
                <div key={task.id} className="bg-[var(--surface)] rounded-xl p-3 shadow-2xl transform transition-transform hover:scale-[1.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleCompleteTask(task.id)}
                        className="w-4 h-4 rounded-full border-2 border-[var(--border)] hover:border-[var(--primary)] transition-colors" 
                      />
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-[var(--text)]">{task.nombre}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-[var(--text-muted)]">{formatDuration(task.duracion_minutos)}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--primary-light)] text-[var(--primary)]">{task.categoria}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--primary)] text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">1</div>
                  </div>
                </div>
              ))}
              {priority1Tasks.length === 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-white">
                  <p className="text-sm font-medium">No hay tareas de prioridad 1 pendientes ✨</p>
                  <p className="text-xs text-white/60 mt-1">¡Buen momento para descansar o planear!</p>
                </div>
              )}
            </div>

            {priority1Tasks.length > 0 && (
              <button 
                onClick={() => {
                  setSessionTasks(priority1Tasks);
                  setIsSessionActive(true);
                  setFocusMode(false);
                }}
                className="btn-primary w-full py-2.5 text-sm shadow-xl"
              >
                Iniciar sesión con estas tareas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTask(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2C2C2C]">Editar Tarea</h3>
              <button onClick={() => setEditingTask(null)} className="text-[#8A8A8A] p-1.5 hover:bg-[#F7F4EF] rounded-full">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTask} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#8A8A8A] uppercase tracking-wider">Nombre</label>
                <input 
                  type="text"
                  value={editingTask.nombre}
                  onChange={(e) => setEditingTask({...editingTask, nombre: e.target.value})}
                  className="w-full bg-[#F7F4EF] border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#5B8A6F]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#8A8A8A] uppercase tracking-wider">Duración (min)</label>
                  <input 
                    type="number"
                    value={editingTask.duracion_minutos}
                    onChange={(e) => setEditingTask({...editingTask, duracion_minutos: parseInt(e.target.value)})}
                    className="w-full bg-[#F7F4EF] border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#5B8A6F]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#8A8A8A] uppercase tracking-wider">Prioridad</label>
                  <select 
                    value={editingTask.prioridad}
                    onChange={(e) => setEditingTask({...editingTask, prioridad: parseInt(e.target.value) as any})}
                    className="w-full bg-[#F7F4EF] border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#5B8A6F]"
                  >
                    <option value={1}>1 - Alta</option>
                    <option value={2}>2 - Media</option>
                    <option value={3}>3 - Baja</option>
                    <option value={4}>4 - Ninguna</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-[#5B8A6F] text-white rounded-xl font-bold shadow-lg shadow-[#5B8A6F]/20 text-sm"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      <CreateRoutineModal
        isOpen={isCreateRoutineModalOpen}
        onClose={() => setIsCreateRoutineModalOpen(false)}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      <CreatePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
      />

      <SessionSetupModal
        isOpen={isSessionSetupOpen}
        onClose={() => {
          setIsSessionSetupOpen(false);
          setSelectedPreset(null);
        }}
        tasks={pendingTasks}
        onStart={handleStartSession}
        initialPreset={selectedPreset}
      />

      {isSessionActive && (
        <SessionPlayer 
          tasks={sessionTasks} 
          onClose={() => setIsSessionActive(false)} 
        />
      )}

      {isFreeTimerActive && (
        <FreeTimer onClose={() => setIsFreeTimerActive(false)} />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
