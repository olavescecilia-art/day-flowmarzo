import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, MoreHorizontal, Clock, CheckCircle2, History, Edit, Trash2, Calendar, Library, Plus, ChevronDown, ChevronUp, X, BarChart2, Smile, Target, Zap, Layers, Package, MoreVertical, RefreshCcw, TrendingUp, ArrowUpDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc, addDoc, getDocs, writeBatch } from "firebase/firestore";
import { Task, Category, Project, DiaryEntry, Preset } from "../types";
import { cn, formatDuration } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { AssignDateModal } from "../components/AssignDateModal";
import { AddCategoryModal } from "../components/AddCategoryModal";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreatePresetModal } from "../components/CreatePresetModal";
import ConfirmationModal from "../components/ConfirmationModal";

const categories = [
  { id: "Trabajo", icon: "💼", color: "#4A90D9" },
  { id: "Estudio", icon: "📚", color: "#7B68EE" },
  { id: "Salud", icon: "💚", color: "#5CB85C" },
  { id: "Familia", icon: "👨‍👩‍👧", color: "#E8A87C" },
  { id: "Finanzas", icon: "💰", color: "#C0392B" },
  { id: "Personal", icon: "🧴", color: "#F0A500" },
];

type Tab = "Tareas" | "Rutinas" | "Proyectos" | "Hábitos" | "Categorías" | "Presets";

export default function LibraryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Tareas");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToAssignDate, setTaskToAssignDate] = useState<Task | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "duration" | "completions">("name");
  const [showSortMenu, setShowSortMenu] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    const tasksQ = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("creadaEn", "desc")
    );

    const projectsQ = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );

    const presetsQ = query(
      collection(db, "presets"),
      where("userId", "==", user.uid)
    );

    const entriesQ = query(
      collection(db, "entries"),
      where("userId", "==", user.uid),
      orderBy("creadaEn", "desc")
    );

    const categoriesQ = query(
      collection(db, "categories"),
      where("userId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
      
      // Initialize open categories
      const cats = [...new Set(tasksData.map(t => t.categoria))];
      const initialOpen: Record<string, boolean> = {};
      cats.forEach(c => initialOpen[c] = true);
      setOpenCategories(prev => ({ ...initialOpen, ...prev }));
    });

    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const unsubPresets = onSnapshot(presetsQ, (snapshot) => {
      setPresets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset)));
    });

    const unsubEntries = onSnapshot(entriesQ, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)));
    });

    const unsubCategories = onSnapshot(categoriesQ, (snapshot) => {
      setUserCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTasks();
      unsubProjects();
      unsubPresets();
      unsubEntries();
      unsubCategories();
    };
  }, [user]);

  const allCategories = useMemo(() => {
    const userCats = userCategories.map(c => ({ id: c.nombre, icon: c.icono, color: c.color, isUser: true, docId: c.id }));
    return [...categories, ...userCats];
  }, [userCategories]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      const matchesSearch = task.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || task.categoria === selectedCategory;
      const matchesTab = activeTab === "Tareas" ? !task.esHabito : 
                         activeTab === "Rutinas" ? task.repeticion?.tipo !== "nunca" :
                         activeTab === "Hábitos" ? task.esHabito : true;
      return matchesSearch && matchesCategory && matchesTab;
    });

    result.sort((a, b) => {
      if (sortBy === "name") return a.nombre.localeCompare(b.nombre);
      if (sortBy === "duration") return b.duracion_minutos - a.duracion_minutos;
      if (sortBy === "completions") return (b.totalCompletadas || 0) - (a.totalCompletadas || 0);
      return 0;
    });

    return result;
  }, [tasks, searchQuery, selectedCategory, activeTab, sortBy]);

  const tasksByCategory = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      if (!acc[task.categoria]) acc[task.categoria] = [];
      acc[task.categoria].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);

  const handleUseToday = async (task: Task) => {
    if (!user) return;
    const newTask: Partial<Task> = {
      ...task,
      id: undefined,
      fecha: new Date().toISOString().split('T')[0],
      estado: "pendiente",
      creadaEn: Date.now(),
      completadaEn: undefined,
    };
    delete (newTask as any).id;
    
    try {
      await addDoc(collection(db, "tasks"), newTask);
      setOpenMenuTaskId(null);
    } catch (error) {
      console.error("Error copying task: ", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "¿Eliminar tarea?",
      message: "¿Estás seguro de que quieres eliminar esta tarea de tu biblioteca?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "tasks", taskId));
          setOpenMenuTaskId(null);
        } catch (error) {
          console.error("Error deleting task: ", error);
        }
      }
    });
  };

  const getTaskHistory = (taskName: string) => {
    return tasks.filter(t => t.nombre === taskName && t.estado === "completa")
      .sort((a, b) => (b.completadaEn || 0) - (a.completadaEn || 0));
  };

  const getTaskStats = (taskName: string) => {
    const history = getTaskHistory(taskName);
    const total = history.length;
    const avgDuration = total > 0 ? history.reduce((acc, t) => acc + t.duracion_minutos, 0) / total : 0;
    const avgSentiment = total > 0 ? history.reduce((acc, t) => acc + (t.sentimientoValor || 0), 0) / total : 0;
    
    // Success rate calculation (completed vs total attempts/days)
    // For simplicity, we'll use total completed / (total completed + skipped) if we had skipped
    // But since we only have completed in history, let's assume success rate is high if it's done often
    const successRate = total > 0 ? 100 : 0; // Placeholder logic for now
    
    return { total, avgDuration, avgSentiment, history, successRate };
  };

  const handleResetStats = async (taskName: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: "¿Reiniciar estadísticas?",
      message: `¿Estás seguro de que quieres borrar todos los datos de estadísticas para "${taskName}"? Esto eliminará el historial de completado.`,
      onConfirm: async () => {
        try {
          const history = getTaskHistory(taskName);
          const batch = writeBatch(db);
          history.forEach(t => {
            batch.delete(doc(db, "tasks", t.id));
          });
          await batch.commit();
          setSelectedTaskForHistory(null);
        } catch (error) {
          console.error("Error resetting stats: ", error);
        }
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-[var(--text)]">📚 Biblioteca</h1>
          <span className="bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {user?.photoURL && (
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border)]">
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
          <Search size={14} />
        </div>
        <input
          type="text"
          placeholder="Buscar tarea o rutina..."
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-[var(--primary-light)] focus:border-transparent shadow-sm transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex p-1 bg-[var(--surface-2)] rounded-xl overflow-x-auto no-scrollbar">
        {(["Tareas", "Rutinas", "Proyectos", "Hábitos", "Categorías", "Presets"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-lg transition-all",
              activeTab === tab 
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" 
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Categorías" ? (
        <div className="space-y-3">
          {allCategories.map((cat: any) => {
            const catTasks = tasks.filter(t => t.categoria === cat.id);
            return (
              <div key={cat.id} className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${cat.color}20` }}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text)]">{cat.id}</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{catTasks.length} tareas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cat.isUser && (
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: "¿Eliminar categoría?",
                          message: `¿Eliminar categoría "${cat.id}"?`,
                          onConfirm: async () => {
                            try {
                              await deleteDoc(doc(db, "categories", cat.docId));
                            } catch (error) {
                              console.error("Error deleting category: ", error);
                            }
                          }
                        });
                      }}
                      className="p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-full transition-colors"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button 
            onClick={() => setIsAddCategoryOpen(true)}
            className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-muted)] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[var(--surface-2)] transition-all"
          >
            <Plus size={16} />
            <span>Añadir nueva categoría</span>
          </button>
        </div>
      ) : activeTab === "Presets" ? (
        <div className="space-y-3">
          {presets.map(preset => (
            <div key={preset.id} className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-2xl">
                  {preset.icono || "✨"}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">{preset.nombre}</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{preset.categoria} · {preset.duracion_minutos} min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleUseToday(preset as any)}
                  className="p-2 text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-full transition-colors"
                  title="Usar hoy"
                >
                  <Calendar size={16} />
                </button>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "¿Eliminar preset?",
                      message: `¿Eliminar preset "${preset.nombre}"?`,
                      onConfirm: async () => {
                        try {
                          await deleteDoc(doc(db, "presets", preset.id));
                        } catch (error) {
                          console.error("Error deleting preset: ", error);
                        }
                      }
                    });
                  }}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={() => setIsPresetModalOpen(true)}
            className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-muted)] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[var(--surface-2)] transition-all"
          >
            <Plus size={16} />
            <span>Crear nuevo preset</span>
          </button>
        </div>
      ) : activeTab !== "Proyectos" ? (
        <>
          {/* Filter & Sort Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-all"
              >
                <ArrowUpDown size={10} />
                <span>Ordenar</span>
              </button>
              
              <AnimatePresence>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowSortMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 mt-2 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-[120] py-1"
                    >
                      <button 
                        onClick={() => { setSortBy("name"); setShowSortMenu(false); }}
                        className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "name" && "text-[var(--primary)]")}
                      >
                        Nombre
                      </button>
                      <button 
                        onClick={() => { setSortBy("duration"); setShowSortMenu(false); }}
                        className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "duration" && "text-[var(--primary)]")}
                      >
                        Duración
                      </button>
                      <button 
                        onClick={() => { setSortBy("completions"); setShowSortMenu(false); }}
                        className={cn("w-full px-4 py-2 text-left text-[11px] font-bold hover:bg-[var(--surface-2)]", sortBy === "completions" && "text-[var(--primary)]")}
                      >
                        Completadas
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 rounded-full text-[9px] font-bold transition-all whitespace-nowrap",
                !selectedCategory ? "bg-[var(--primary)] text-white shadow-md" : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
              )}
            >
              Todos ✓
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-bold transition-all whitespace-nowrap border",
                  selectedCategory === cat.id 
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md" 
                    : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-2)]"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
              </button>
            ))}
          </div>

          {/* Task Groups */}
          <div className="space-y-4">
            {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
              <div key={category} className="space-y-2">
                <button 
                  onClick={() => setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                  className="flex items-center justify-between w-full text-left group px-1"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    <span className="font-bold text-xs text-[var(--text)] uppercase tracking-tight">{category}</span>
                    <span className="text-[var(--text-muted)] text-[8px] font-bold bg-[var(--surface-2)] px-1.5 py-0.5 rounded-full">
                      {(categoryTasks as Task[]).length}
                    </span>
                  </div>
                  {openCategories[category] ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                </button>

                <AnimatePresence>
                  {openCategories[category] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {(categoryTasks as Task[]).map(task => (
                        <div key={task.id} className="relative">
                          <div 
                            className={cn(
                              "card group transition-all p-3 flex items-center justify-between cursor-pointer",
                              openMenuTaskId === task.id ? "ring-2 ring-[var(--primary)] shadow-lg" : "hover:shadow-md"
                            )}
                            onClick={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
                                <Package size={18} />
                              </div>
                              <div>
                                <h3 className="font-bold text-[13px] text-[var(--text)]">{task.nombre}</h3>
                                {task.subcategoria && (
                                  <span className="text-[8px] text-[var(--primary)] font-bold uppercase tracking-widest bg-[var(--primary-light)] px-1 py-0.5 rounded-md">
                                    {task.subcategoria}
                                  </span>
                                )}
                                <div className="flex items-center space-x-3 mt-0.5">
                                  <div className="flex items-center space-x-1 text-[9px] text-[var(--text-muted)] font-bold">
                                    <Clock size={10} />
                                    <span>{formatDuration(task.duracion_minutos)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 text-[9px] text-[var(--text-muted)] font-bold">
                                    <CheckCircle2 size={10} />
                                    <span>{task.totalCompletadas || 0}×</span>
                                  </div>
                                  {task.sentimientoTipo && (
                                    <div className="text-[10px]">
                                      {task.sentimientoTipo === "disfrutable" ? "😊" : task.sentimientoTipo === "neutral" ? "😐" : "😔"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-full transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>

                          {/* Dropdown Menu */}
                          <AnimatePresence>
                            {openMenuTaskId === task.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[100]" 
                                  onClick={() => setOpenMenuTaskId(null)}
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg)] rounded-xl shadow-2xl border border-[var(--border)] z-[110] overflow-hidden"
                                >
                                  <div className="py-1">
                                    <button 
                                      onClick={() => handleUseToday(task)}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-bold transition-colors"
                                    >
                                      <Calendar size={14} className="text-[var(--primary)]" />
                                      <span>Usar hoy</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTaskToAssignDate(task);
                                        setOpenMenuTaskId(null);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-bold transition-colors"
                                    >
                                      <Clock size={14} className="text-blue-500" />
                                      <span>Asignar fecha</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedTaskForHistory(task);
                                        setOpenMenuTaskId(null);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-bold transition-colors border-b border-[var(--border)]"
                                    >
                                      <BarChart2 size={14} className="text-purple-500" />
                                      <span>Ver historial</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setTaskToEdit(task);
                                        setIsCreateModalOpen(true);
                                        setOpenMenuTaskId(null);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[var(--surface-2)] text-[var(--text)] text-[11px] font-bold transition-colors"
                                    >
                                      <Edit size={14} className="text-gray-500" />
                                      <span>Editar</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="w-full px-4 py-2 flex items-center gap-3 hover:bg-red-50 text-red-500 text-[11px] font-bold transition-colors"
                                    >
                                      <Trash2 size={14} />
                                      <span>Eliminar</span>
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {Object.keys(tasksByCategory).length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
                  <Library size={32} />
                </div>
                <p className="text-[var(--text-muted)] text-xs font-bold">No se encontraron {activeTab.toLowerCase()} en tu biblioteca</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Proyectos Tab */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => {
              const projectTasks = tasks.filter(t => t.proyectoId === project.id);
              const completedCount = projectTasks.filter(t => t.estado === "completa").length;
              const progress = projectTasks.length > 0 ? (completedCount / projectTasks.length) * 100 : 0;
              
              return (
                <div key={project.id} className="card p-4 space-y-4 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || "#ccc" }} />
                      <h3 className="font-bold text-sm text-[var(--text)]">{project.nombre}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Activo</span>
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: "¿Eliminar proyecto?",
                            message: `¿Eliminar proyecto "${project.nombre}"?`,
                            onConfirm: async () => {
                              try {
                                await deleteDoc(doc(db, "projects", project.id));
                              } catch (error) {
                                console.error("Error deleting project: ", error);
                              }
                            }
                          });
                        }}
                        className="text-red-400 p-1 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-[var(--primary)]"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] font-bold">
                      <span>{Math.round(progress)}% completado</span>
                      <span>{projectTasks.length - completedCount} tareas pendientes</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-2xl text-[var(--text-muted)] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[var(--surface-2)] transition-all"
          >
            <Plus size={16} />
            <span>Crear nuevo proyecto</span>
          </button>
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center space-y-3">
              <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Layers size={32} />
              </div>
              <p className="text-[var(--text-muted)] text-xs font-bold">No tienes proyectos activos</p>
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      <AnimatePresence>
        {selectedTaskForHistory && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskForHistory(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--bg)] w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 pb-4 flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <h2 className="text-[var(--text)] font-bold text-lg tracking-tight">{selectedTaskForHistory.nombre}</h2>
                  <span className="bg-[var(--primary-light)] text-[var(--primary)] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {selectedTaskForHistory.categoria}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedTaskForHistory(null)}
                  className="text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-full p-1.5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Stats Row */}
                {(() => {
                  const stats = getTaskStats(selectedTaskForHistory.nombre);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[var(--surface-2)] p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                          <CheckCircle2 size={18} className="text-[var(--primary)] mb-1" />
                          <span className="text-[var(--text)] font-bold text-sm">{stats.total} veces</span>
                        </div>
                        <div className="bg-[var(--surface-2)] p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                          <TrendingUp size={18} className="text-green-500 mb-1" />
                          <span className="text-[var(--text)] font-bold text-sm">{stats.successRate}% éxito</span>
                        </div>
                        <div className="bg-[var(--surface-2)] p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                          <Clock size={18} className="text-blue-500 mb-1" />
                          <span className="text-[var(--text)] font-bold text-sm">{Math.round(stats.avgDuration)}m prom.</span>
                        </div>
                        <div className="bg-[var(--surface-2)] p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                          <Smile size={18} className="text-yellow-500 mb-1" />
                          <span className="text-[var(--text)] font-bold text-sm">{stats.avgSentiment.toFixed(1)}/10</span>
                        </div>
                      </div>

                      {/* Satisfaction Chart */}
                      <div className="space-y-4">
                        <h3 className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">Satisfacción últimas 4 veces</h3>
                        <div className="flex items-end justify-between h-20 px-4">
                          {stats.history.slice(0, 4).reverse().map((h, i) => (
                            <div key={h.id} className="flex flex-col items-center gap-2 w-1/5">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${(h.sentimientoValor || 0) * 10}%` }}
                                className="w-full bg-[var(--primary)] rounded-t-lg"
                              />
                            </div>
                          ))}
                          {stats.history.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-[10px] italic">
                              Sin datos suficientes
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recent History */}
                      <div className="space-y-3">
                        <h3 className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">Historial reciente</h3>
                        <div className="space-y-2">
                          {stats.history.slice(0, 5).map(h => (
                            <div key={h.id} className="flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                              <span className="text-[var(--text)] text-xs font-bold">{format(new Date(h.completadaEn!), 'd MMM', { locale: es })}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs">{h.sentimientoTipo === "disfrutable" ? "😊" : h.sentimientoTipo === "neutral" ? "😐" : "😔"}</span>
                                <span className="text-[var(--text-muted)] text-xs font-bold">{h.duracion_minutos}min</span>
                              </div>
                            </div>
                          ))}
                          {stats.history.length === 0 && (
                            <p className="text-center text-[var(--text-muted)] text-xs italic py-4">No hay historial de completado para esta tarea.</p>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="p-6 pt-2 border-t border-[var(--border)] flex gap-3">
                <button 
                  onClick={() => handleResetStats(selectedTaskForHistory.nombre)}
                  className="flex-1 py-3 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <RefreshCcw size={14} />
                  Reiniciar
                </button>
                <button 
                  onClick={() => setSelectedTaskForHistory(null)}
                  className="flex-[2] py-3 bg-[var(--surface-2)] text-[var(--text)] font-bold rounded-2xl hover:bg-[var(--border)] transition-all active:scale-95 text-xs"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button 
        onClick={() => {
          setTaskToEdit(null);
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={24} />
      </button>

      {/* Modals */}
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        taskToEdit={taskToEdit}
      />
      <AssignDateModal
        isOpen={!!taskToAssignDate}
        onClose={() => setTaskToAssignDate(null)}
        task={taskToAssignDate}
      />
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <CreatePresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
      />
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
