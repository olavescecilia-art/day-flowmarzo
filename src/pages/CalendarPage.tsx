import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Bolt, 
  RefreshCw, 
  Flame, 
  Folder, 
  ChevronDown, 
  ChevronUp,
  Plus,
  ArrowLeft,
  Clock,
  MoreHorizontal,
  Play,
  Zap,
  LayoutGrid,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Task, Project, Routine, Preset } from "../types";
import { cn, formatDuration } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

type ViewType = "month" | "week" | "day";

export default function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summaryFilter, setSummaryFilter] = useState<string[]>(["tareas", "rutinas", "habitos", "proyectos", "presets"]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    tasks: true,
    routines: true,
    habits: true,
    projects: true
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid)
    );

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    });

    const qProjects = query(collection(db, "projects"), where("userId", "==", user.uid));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const qRoutines = query(collection(db, "routines"), where("userId", "==", user.uid));
    const unsubscribeRoutines = onSnapshot(qRoutines, (snapshot) => {
      setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Routine)));
    });

    const qPresets = query(collection(db, "presets"), where("userId", "==", user.uid));
    const unsubscribePresets = onSnapshot(qPresets, (snapshot) => {
      setPresets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Preset)));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
      unsubscribeRoutines();
      unsubscribePresets();
    };
  }, [user]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const monthDays = getDaysInMonth(currentDate);
  const weekDays = getDaysInWeek(selectedDate);
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const tasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.fecha === dateStr);
  };

  const toggleSummaryFilter = (filter: string) => {
    setSummaryFilter(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter) 
        : [...prev, filter]
    );
  };

  const getFilteredSummaryData = () => {
    let filteredTasks = [...tasks];
    let filteredRoutines = [...routines];
    let filteredProjects = [...projects];
    let filteredPresets = [...presets];

    const filterByRange = (start: Date, end: Date) => {
      filteredTasks = tasks.filter(t => {
        if (!t.fecha) return false;
        const d = new Date(t.fecha + 'T00:00:00'); // Ensure local date
        return d >= start && d <= end;
      });
      filteredProjects = projects.filter(p => {
        const d = new Date(p.creadaEn);
        return d >= start && d <= end;
      });
      filteredPresets = presets.filter(p => {
        const d = new Date(p.creadaEn);
        return d >= start && d <= end;
      });
      filteredRoutines = routines.filter(r => {
        const d = new Date(r.creadaEn);
        return d >= start && d <= end;
      });
    };

    if (view === "month") {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      filterByRange(start, end);
    } else if (view === "week") {
      const start = new Date(weekDays[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekDays[6]);
      end.setHours(23, 59, 59, 999);
      filterByRange(start, end);
    } else if (view === "day") {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      filterByRange(start, end);
    }

    return {
      tasks: filteredTasks.filter(t => !t.esHabito && !t.routineId && !t.proyectoId && !t.presetId),
      habits: filteredTasks.filter(t => t.esHabito && !t.routineId && !t.proyectoId && !t.presetId),
      groupedTasks: (() => {
        const groups: { [key: string]: { type: 'routine' | 'project' | 'preset', id: string, name: string, tasks: Task[] } } = {};
        filteredTasks.forEach(task => {
          if (task.routineId) {
            const routine = routines.find(r => r.id === task.routineId);
            if (routine) {
              const key = `routine_${task.routineId}`;
              if (!groups[key]) groups[key] = { type: 'routine', id: task.routineId, name: routine.nombre, tasks: [] };
              groups[key].tasks.push(task);
              return;
            }
          }
          if (task.proyectoId) {
            const project = projects.find(p => p.id === task.proyectoId);
            if (project) {
              const key = `project_${task.proyectoId}`;
              if (!groups[key]) groups[key] = { type: 'project', id: task.proyectoId, name: project.nombre, tasks: [] };
              groups[key].tasks.push(task);
              return;
            }
          }
          if (task.presetId) {
            const preset = presets.find(p => p.id === task.presetId);
            if (preset) {
              const key = `preset_${task.presetId}`;
              if (!groups[key]) groups[key] = { type: 'preset', id: task.presetId, name: preset.nombre, tasks: [] };
              groups[key].tasks.push(task);
              return;
            }
          }
        });
        return Object.values(groups);
      })(),
      routines: filteredRoutines,
      projects: filteredProjects,
      presets: filteredPresets
    };
  };

  const summaryData = getFilteredSummaryData();

  const renderSummarySection = () => (
    <section className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text)]">
          Resumen {view === "month" ? "del Mes" : view === "week" ? "de la Semana" : "del Día"}
        </h3>
      </div>
      
      {/* Toggles */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "tareas", label: "Tareas", icon: CheckCircle2 },
          { id: "habitos", label: "Hábitos", icon: Zap },
          { id: "rutinas", label: "Rutinas", icon: RefreshCw },
          { id: "proyectos", label: "Proyectos", icon: Folder },
          { id: "presets", label: "Presets", icon: LayoutGrid },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => toggleSummaryFilter(f.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
              summaryFilter.includes(f.id)
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg)]"
            )}
          >
            <f.icon size={12} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {summaryFilter.includes("tareas") && (summaryData.tasks.length > 0 || summaryData.groupedTasks.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-[var(--primary)]" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tareas ({summaryData.tasks.length + summaryData.groupedTasks.reduce((acc, g) => acc + g.tasks.length, 0)})</span>
            </div>
            
            {/* Grouped Tasks */}
            {summaryData.groupedTasks.map(group => (
              <div key={group.id} className="space-y-2 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    group.type === 'routine' ? "bg-[#5B8A6F]" : 
                    group.type === 'project' ? "bg-[#4A6FA5]" : "bg-[#E8A030]"
                  )} />
                  <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-widest">{group.name}</span>
                </div>
                <div className="space-y-1.5 pl-3 border-l border-[var(--border)] ml-0.5">
                  {group.tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between text-[10px]">
                      <span className={cn("font-medium", task.estado === 'completa' && "line-through text-[var(--text-muted)]")}>{task.nombre}</span>
                      <span className={cn(
                        "text-[8px] font-bold px-1.5 py-0.5 rounded",
                        task.estado === "completa" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {task.estado === "completa" ? "COMPLETA" : "PENDIENTE"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped Tasks */}
            <div className="grid grid-cols-1 gap-2">
              {summaryData.tasks.map(t => (
                <div key={t.id} className="bg-[var(--surface)] p-3 rounded-xl shadow-sm border border-[var(--border)] flex justify-between items-center">
                  <span className="text-xs font-medium">{t.nombre}</span>
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded",
                    t.estado === "completa" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {t.estado === "completa" ? "COMPLETA" : "PENDIENTE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryFilter.includes("habitos") && summaryData.habits.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-orange-500" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Hábitos ({summaryData.habits.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {summaryData.habits.map(h => (
                <div key={h.id} className="bg-[var(--surface)] p-3 rounded-xl shadow-sm border border-[var(--border)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium">{h.nombre}</span>
                    <span className="text-[10px] text-[var(--primary)] font-semibold">🔥 {h.rachaActual || 0} días racha</span>
                  </div>
                  <div className="w-full bg-[var(--bg)] h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-[var(--primary)] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((h.rachaActual || 0) / (h.metaRepeticiones || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryFilter.includes("rutinas") && summaryData.routines.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="text-blue-500" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Rutinas ({summaryData.routines.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryData.routines.map(r => (
                <div key={r.id} className="bg-[var(--surface)] px-3 py-2 rounded-lg shadow-sm border border-[var(--border)] text-[10px] font-medium">
                  {r.nombre}
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryFilter.includes("proyectos") && summaryData.projects.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Folder size={12} className="text-purple-500" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Proyectos ({summaryData.projects.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryData.projects.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-[var(--surface)] px-3 py-2 rounded-lg shadow-sm border border-[var(--border)] text-[10px] font-medium">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || 'var(--primary)' }}></div>
                  {p.nombre}
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryFilter.includes("presets") && summaryData.presets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-teal-500" />
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Presets ({summaryData.presets.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaryData.presets.map(p => (
                <div key={p.id} className="bg-[var(--surface)] px-3 py-2 rounded-lg shadow-sm border border-[var(--border)] text-[10px] font-medium flex items-center gap-1.5">
                  <span>{p.icono || '⏱'}</span>
                  {p.nombre}
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryFilter.every(f => summaryData[f as keyof typeof summaryData]?.length === 0) && (
          <div className="text-center py-8 bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border)]">
            <p className="text-[10px] text-[var(--text-muted)] font-medium italic">No hay datos para los filtros seleccionados en este periodo</p>
          </div>
        )}
      </div>
    </section>
  );

  const renderMonthView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-light tracking-tight text-[var(--text)] capitalize">{monthName} {year}</h2>
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{monthName} {year}</span>
        </div>
        <div className="flex items-center gap-1 bg-[var(--surface)] rounded-full p-1 shadow-sm border border-[var(--border)]">
          <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--bg)] rounded-full transition-colors">
            <ChevronLeft size={16} className="text-[var(--primary)]" />
          </button>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] rounded-full">Hoy</button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--bg)] rounded-full transition-colors">
            <ChevronRight size={16} className="text-[var(--primary)]" />
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
        <div className="grid grid-cols-7 border-b border-[var(--bg)] text-center py-2 bg-[var(--surface)]">
          {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(d => (
            <span key={d} className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((d, i) => {
            const dayTasks = tasksForDate(d.date);
            const isToday = d.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            const isSelected = d.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];

            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedDate(d.date);
                  setView("day");
                }}
                className={cn(
                  "h-14 p-1 border-b border-r border-[var(--bg)] flex flex-col items-center transition-colors hover:bg-[var(--bg)]/50",
                  !d.currentMonth && "opacity-20",
                  isSelected && "bg-[var(--primary-light)]/30"
                )}
              >
                <span className={cn(
                  "text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                  isToday ? "bg-[var(--primary)] text-white" : "text-[var(--text)]"
                )}>
                  {d.day}
                </span>
                <div className="flex gap-1 mt-1 flex-wrap justify-center">
                  {dayTasks.slice(0, 3).map((t, idx) => (
                    <div key={idx} className="w-1 h-1 rounded-full bg-[var(--primary)]" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--surface)] p-2 rounded-xl flex items-center gap-2 shadow-sm border border-[var(--border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">Salud</span>
        </div>
        <div className="bg-[var(--surface)] p-2 rounded-xl flex items-center gap-2 shadow-sm border border-[var(--border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
          <span className="text-[10px] font-medium text-[var(--text-muted)]">Trabajo</span>
        </div>
      </div>

      {renderSummarySection()}
    </div>
  );

  const renderWeekView = () => {
    const startOfWeek = weekDays[0];
    const endOfWeek = weekDays[6];
    const weekRange = `Semana del ${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startOfWeek.toLocaleString('es-ES', { month: 'long' })}`;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-light tracking-tight text-[var(--text)] capitalize">{weekRange}</h2>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{monthName} {year}</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--surface)] rounded-full p-1 shadow-sm border border-[var(--border)]">
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 7);
              setSelectedDate(d);
            }} className="p-1.5 hover:bg-[var(--bg)] rounded-full transition-colors">
              <ChevronLeft size={16} className="text-[var(--primary)]" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary-light)] rounded-full">Hoy</button>
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 7);
              setSelectedDate(d);
            }} className="p-1.5 hover:bg-[var(--bg)] rounded-full transition-colors">
              <ChevronRight size={16} className="text-[var(--primary)]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 overflow-x-auto scrollbar-hide pb-2">
          {weekDays.map((d, i) => {
            const isSelected = d.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
            const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-lg shadow-soft min-w-[40px] transition-all",
                  isSelected ? "bg-[var(--primary)] text-white shadow-lg scale-105" : "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]"
                )}
              >
                <span className={cn("text-[8px] font-bold uppercase", isSelected ? "opacity-80" : "text-[var(--text-muted)]")}>
                  {d.toLocaleString('es-ES', { weekday: 'short' }).substring(0, 2)}
                </span>
                <span className="text-sm font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <CollapsibleSection 
            icon={Bolt} 
            title="Tareas de la semana" 
            count={tasksForDate(selectedDate).length} 
            isOpen={openSections.tasks} 
            onToggle={() => toggleSection("tasks")}
            color="var(--primary)"
          >
            <div className="bg-[var(--bg)]/40 p-2 flex flex-col gap-1.5">
              {tasksForDate(selectedDate).map(task => (
                <div key={task.id} className="bg-[var(--surface)] p-2 rounded-md flex items-center gap-2 shadow-sm border border-[var(--border)]">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]" />
                  <div className="flex-1">
                    <h4 className="text-[11px] font-medium">{task.nombre}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-[var(--text-muted)]">{task.duracion_minutos}min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection 
            icon={RefreshCw} 
            title="Rutinas" 
            count={3} 
            isOpen={openSections.routines} 
            onToggle={() => toggleSection("routines")}
            color="var(--accent)"
          >
            <div className="bg-[var(--bg)]/40 p-2 flex flex-col gap-1.5">
              <div className="bg-[var(--surface)] p-2 rounded-md flex items-center justify-between shadow-sm border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--accent)] text-sm">wb_sunny</span>
                  <span className="text-[11px] font-medium">Mañana Enfocada</span>
                </div>
                <button className="px-2 py-0.5 bg-[var(--accent)] text-white text-[9px] font-bold rounded-full flex items-center gap-1">
                  <Play size={8} fill="currentColor" /> Iniciar
                </button>
              </div>
            </div>
          </CollapsibleSection>
        </div>
        {renderSummarySection()}
      </div>
    );
  };

  const renderDayView = () => {
    const dateStr = selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', weekday: 'long' });
    const dayTasks = tasksForDate(selectedDate);
    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView("month")} className="p-1.5 hover:bg-[var(--surface)] rounded-full transition-colors">
            <ArrowLeft size={20} className="text-[var(--primary)]" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-[var(--text)] capitalize">{dateStr}</h2>
            <p className="text-[var(--text-muted)] text-[10px] font-medium">{dayTasks.length} tareas • {dayTasks.reduce((acc, t) => acc + t.duracion_minutos, 0)}min estimado</p>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl shadow-sm p-2 relative overflow-hidden border border-[var(--border)]">
          <div className="max-h-[400px] overflow-y-auto hide-scrollbar relative pr-2">
            <div className="space-y-0">
              {hours.map(hour => (
                <div key={hour} className="flex h-12 border-b border-[var(--bg)] items-start relative">
                  <span className="w-8 text-[8px] text-[var(--text-muted)] pt-1 font-bold">{hour.toString().padStart(2, '0')}:00</span>
                  {/* Simplified task placement for demo */}
                  {hour === 9 && dayTasks[0] && (
                    <div className="absolute left-10 right-0 top-1 h-[40px] bg-[var(--accent)]/10 border-l-4 border-[var(--accent)] rounded-lg p-2 flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-[var(--accent)] flex items-center gap-1">
                          {dayTasks[0].nombre}
                        </span>
                        <span className="text-[8px] font-bold px-1 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded">①</span>
                      </div>
                      <span className="text-[8px] text-[var(--accent)]/70">{dayTasks[0].duracion_minutos}m</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[9px] font-bold text-[var(--text)] uppercase tracking-widest">Sin hora específica</h3>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2">
            <button className="flex items-center gap-1 px-2.5 py-1 bg-[var(--primary)] text-white text-[9px] font-semibold rounded-full shadow-sm">
              Tareas
            </button>
            <button className="px-2.5 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] text-[9px] font-medium rounded-full">
              Rutinas
            </button>
            <button className="px-2.5 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] text-[9px] font-medium rounded-full">
              Hábitos
            </button>
          </div>
          <div className="space-y-1.5">
            {dayTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2.5 bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--border)]" />
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text)]">{task.nombre}</p>
                    <p className="text-[8px] text-[var(--text-muted)]">{task.duracion_minutos}min</p>
                  </div>
                </div>
                <button className="text-[var(--text-muted)]">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        {renderSummarySection()}
      </div>
    );
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="text-[var(--primary)]" size={20} />
          <h1 className="text-lg font-bold text-[var(--primary)]">Calendario</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] rounded-full transition-colors">
            <Search size={18} />
          </button>
          <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--primary)]/10">
            <img src="https://picsum.photos/seed/user/100/100" alt="Profile" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-3">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setView("month")}
            className={cn(
              "text-sm font-bold transition-colors pb-1 border-b-2",
              view === "month" ? "text-[var(--primary)] border-[var(--primary)]" : "text-[var(--text-muted)] border-transparent"
            )}
          >
            Mes
          </button>
          <button 
            onClick={() => setView("week")}
            className={cn(
              "text-sm font-bold transition-colors pb-1 border-b-2",
              view === "week" ? "text-[var(--primary)] border-[var(--primary)]" : "text-[var(--text-muted)] border-transparent"
            )}
          >
            Semana
          </button>
          <button 
            onClick={() => setView("day")}
            className={cn(
              "text-sm font-bold transition-colors pb-1 border-b-2",
              view === "day" ? "text-[var(--primary)] border-[var(--primary)]" : "text-[var(--text-muted)] border-transparent"
            )}
          >
            Día
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <button className="fixed bottom-28 right-6 w-10 h-10 bg-[var(--primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40">
        <Plus size={24} />
      </button>
    </div>
  );
}

function CollapsibleSection({ icon: Icon, title, count, isOpen, onToggle, color, children }: any) {
  return (
    <div className="bg-[var(--surface)] rounded-lg shadow-sm overflow-hidden border border-[var(--border)]">
      <button 
        onClick={onToggle}
        className="w-full h-10 px-4 flex items-center justify-between hover:bg-[var(--bg)]/50 transition-colors"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} style={{ color }} />
          <span className="text-[11px] font-bold text-[var(--text)]">{title}</span>
          <span className="px-1.5 py-0.5 bg-[var(--bg)] text-[var(--text-muted)] text-[8px] font-bold rounded-full">{count}</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {children || (
              <div className="p-4 text-center text-[var(--text-muted)] text-xs italic">
                No hay elementos para mostrar
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
