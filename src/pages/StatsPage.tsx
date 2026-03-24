import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { CheckCircle2, Clock, Trophy, Flame, ChevronDown, ChevronUp, Target, Zap, Layers, Briefcase, Calendar as CalendarIcon, Filter, Package, Smile, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, writeBatch, doc } from "firebase/firestore";
import { Task, Priority, Project, Preset, DiaryEntry } from "../types";
import { cn, formatDuration } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { CreatePresetModal } from "../components/CreatePresetModal";
import ConfirmationModal from "../components/ConfirmationModal";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, isWithinInterval, subDays, subMonths, eachMonthOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const COLORS = ["#5B8A6F", "#4A6FA5", "#E8A030", "#C0392B", "#7B68EE", "#F0A500", "#FF6B6B", "#4ECDC4"];

type Period = "Hoy" | "Semana" | "Mes" | "Año";

interface SectionToggleProps {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function SectionToggle({ title, icon: Icon, isOpen, onToggle, children, count }: SectionToggleProps) {
  return (
    <div className="card p-0 overflow-hidden border border-[var(--border)]">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[var(--primary-light)] text-[var(--primary)] rounded-lg">
            <Icon size={18} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-[var(--text)]">{title}</h3>
            {count !== undefined && (
              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                {count} {count === 1 ? 'elemento' : 'elementos'} detectados
              </p>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-[var(--text-muted)]" /> : <ChevronDown size={18} className="text-[var(--text-muted)]" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-[var(--border)] p-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("Semana");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timerSessions, setTimerSessions] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
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
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    tasks: true,
    habits: false,
    projects: false,
    routines: false,
    presets: false,
    sentiment: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const tasksQ = query(
          collection(db, "tasks"),
          where("userId", "==", user.uid)
        );
        const timerQ = query(
          collection(db, "timer_sessions"),
          where("userId", "==", user.uid)
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
          where("userId", "==", user.uid)
        );

        const [tasksSnap, timerSnap, projectsSnap, presetsSnap, entriesSnap] = await Promise.all([
          getDocs(tasksQ),
          getDocs(timerQ),
          getDocs(projectsQ),
          getDocs(presetsQ),
          getDocs(entriesQ)
        ]);

        setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        setTimerSessions(timerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
        setPresets(presetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Preset)));
        setEntries(entriesSnap.docs.map(d => ({ id: d.id, ...d.data() } as DiaryEntry)));
      } catch (error) {
        console.error("Error fetching stats data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter data based on period
  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "Hoy":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "Semana":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "Mes":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "Año":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
    }

    const filteredTasks = tasks.filter(t => {
      const date = t.completadaEn ? new Date(t.completadaEn) : (t.fecha ? new Date(t.fecha) : new Date(t.creadaEn));
      const matchesPeriod = isWithinInterval(date, { start, end });
      const matchesCategory = !filterCategory || t.categoria === filterCategory;
      return matchesPeriod && matchesCategory;
    });

    const completedTasks = filteredTasks.filter(t => t.estado === "completa");

    const filteredSessions = timerSessions.filter(s => {
      const date = new Date(s.creadaEn);
      return isWithinInterval(date, { start, end });
    });

    const filteredEntries = entries.filter(e => {
      const date = new Date(e.creadaEn);
      return isWithinInterval(date, { start, end });
    });

    return { tasks: filteredTasks, completedTasks, sessions: filteredSessions, entries: filteredEntries };
  }, [tasks, timerSessions, entries, period]);

  const { tasks: pTasks, completedTasks: pCompletedTasks, sessions: pSessions, entries: pEntries } = filteredData;

  // Stats Calculations
  const totalFocusTime = pCompletedTasks.reduce((acc, t) => acc + t.duracion_minutos, 0) + 
                        Math.floor(pSessions.reduce((acc, s) => acc + s.duracionSegundos, 0) / 60);

  const successRate = pTasks.length > 0 ? (pCompletedTasks.length / pTasks.length) * 100 : 0;

  const tasksByCategory = pCompletedTasks.reduce((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(tasksByCategory).map(([name, value]) => ({ name, value }));

  // Chart Data Generation
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (period === "Hoy") {
      // Hourly breakdown
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const count = pCompletedTasks.filter(t => {
          const d = t.completadaEn ? new Date(t.completadaEn) : new Date(t.creadaEn);
          return d.getHours() === hour;
        }).length;
        return { name: `${hour}:00`, value: count };
      });
    }

    if (period === "Semana") {
      const days = eachDayOfInterval({
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      });
      return days.map(day => {
        const count = pCompletedTasks.filter(t => {
          const d = t.completadaEn ? new Date(t.completadaEn) : (t.fecha ? new Date(t.fecha) : new Date(t.creadaEn));
          return format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        }).length;
        return { name: format(day, 'EEE', { locale: es }), value: count };
      });
    }

    if (period === "Mes") {
      // Weekly breakdown within month
      const weeks = [1, 2, 3, 4];
      return weeks.map(w => {
        const count = pCompletedTasks.filter(t => {
          const d = t.completadaEn ? new Date(t.completadaEn) : (t.fecha ? new Date(t.fecha) : new Date(t.creadaEn));
          const weekNum = Math.ceil(format(d, 'd') as any / 7);
          return weekNum === w;
        }).length;
        return { name: `Sem ${w}`, value: count };
      });
    }

    if (period === "Año") {
      const months = eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfYear(now)
      });
      return months.map(m => {
        const count = pCompletedTasks.filter(t => {
          const d = t.completadaEn ? new Date(t.completadaEn) : (t.fecha ? new Date(t.fecha) : new Date(t.creadaEn));
          return format(d, 'MM') === format(m, 'MM');
        }).length;
        return { name: format(m, 'MMM', { locale: es }), value: count };
      });
    }

    return [];
  }, [pTasks, period]);

  // Habit Stats & Streak Calculation
  const habits = pCompletedTasks.filter(t => t.esHabito);
  const habitCompletionRate = habits.length > 0 ? (habits.length / pTasks.filter(t => t.esHabito).length) * 100 : 0;

  const currentStreak = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completedHabits = tasks.filter(t => t.esHabito && t.estado === "completa")
      .sort((a, b) => b.completadaEn! - a.completadaEn!);
    
    if (completedHabits.length === 0) return 0;

    let streak = 0;
    let lastDate = startOfDay(new Date());
    
    // Check if completed today
    const completedToday = completedHabits.some(h => isSameDay(new Date(h.completadaEn!), lastDate));
    if (!completedToday) {
      lastDate = subDays(lastDate, 1);
    }

    for (let i = 0; i < 365; i++) {
      const dateToCheck = subDays(startOfDay(new Date()), i);
      const hasCompletedOnDate = completedHabits.some(h => isSameDay(new Date(h.completadaEn!), dateToCheck));
      
      if (hasCompletedOnDate) {
        streak++;
      } else {
        if (i === 0) continue; // Allow missing today if streak started before
        break;
      }
    }
    return streak;
  }, [tasks]);

  // Project Stats
  const tasksByProject = pCompletedTasks.reduce((acc, t) => {
    if (t.proyectoId) {
      acc[t.proyectoId] = (acc[t.proyectoId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const projectStats = projects.map(p => ({
    ...p,
    taskCount: tasksByProject[p.id] || 0
  })).sort((a, b) => b.taskCount - a.taskCount);

  // Sentiment Stats
  const sentimentBalance = pEntries.reduce((acc, e) => acc + (e.balanceDia || 0), 0);
  const avgSentiment = pEntries.length > 0 ? sentimentBalance / pEntries.length : 0;
  
  const emotionsDistribution = pEntries.flatMap(e => e.emociones).reduce((acc, emo) => {
    acc[emo.nombre] = (acc[emo.nombre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emotionsPieData = Object.entries(emotionsDistribution).map(([name, value]) => ({ name, value }));

  const handleResetStats = async () => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: "¿Reiniciar estadísticas?",
      message: "Esta acción eliminará permanentemente todas las tareas completadas, sesiones de temporizador y entradas de diario. Las tareas pendientes se conservarán.",
      onConfirm: async () => {
        setResetting(true);
        try {
          const batch = writeBatch(db);
          
          // Delete completed tasks (keep pending ones)
          const completedTasksToDel = tasks.filter(t => t.estado === "completa");
          completedTasksToDel.forEach(t => {
            batch.delete(doc(db, "tasks", t.id));
          });

          // Delete all sessions
          timerSessions.forEach(s => {
            batch.delete(doc(db, "timer_sessions", s.id));
          });

          // Delete all diary entries
          entries.forEach(e => {
            batch.delete(doc(db, "entries", e.id));
          });

          await batch.commit();
          
          // Refresh data
          window.location.reload();
        } catch (error) {
          console.error("Error resetting stats:", error);
          alert("Error al reiniciar las estadísticas. Por favor intenta de nuevo.");
        } finally {
          setResetting(false);
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (tasks.length === 0) return;
    
    const headers = ["Nombre", "Categoría", "Duración (min)", "Estado", "Fecha", "Prioridad", "Es Hábito"];
    const rows = tasks.map(t => [
      `"${t.nombre.replace(/"/g, '""')}"`,
      `"${t.categoria}"`,
      t.duracion_minutos,
      `"${t.estado}"`,
      t.completadaEn ? format(new Date(t.completadaEn), 'yyyy-MM-dd HH:mm') : (t.fecha || 'N/A'),
      t.prioridad,
      t.esHabito ? "Sí" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_productividad_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-[var(--text)]">📊 Estadísticas</h1>
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl w-fit">
          {(["Hoy", "Semana", "Mes", "Año"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-6 py-1.5 rounded-lg text-xs font-bold transition-all",
                period === p ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card space-y-1.5 border-b-4 border-green-500 p-3">
          <div className="w-7 h-7 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-lg font-bold text-[var(--text)]">{pCompletedTasks.length}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Completadas</p>
        </div>
        <div className="card space-y-1.5 border-b-4 border-blue-500 p-3">
          <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Clock size={16} />
          </div>
          <p className="text-lg font-bold text-[var(--text)]">{formatDuration(totalFocusTime)}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Tiempo Total</p>
        </div>
        <div className="card space-y-1.5 border-b-4 border-orange-500 p-3">
          <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
            <Target size={16} />
          </div>
          <p className="text-lg font-bold text-[var(--text)]">{Math.round(successRate)}%</p>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Tasa de Éxito</p>
        </div>
        <div className="card space-y-1.5 border-b-4 border-yellow-500 p-3">
          <div className="w-7 h-7 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
            <Flame size={16} />
          </div>
          <p className="text-lg font-bold text-[var(--text)]">{currentStreak} días</p>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Racha Actual</p>
        </div>
        <div className="card space-y-1.5 border-b-4 border-purple-500 p-3">
          <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
            <Briefcase size={16} />
          </div>
          <p className="text-lg font-bold text-[var(--text)]">{projectStats.length}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Proyectos</p>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[var(--text)]">Rendimiento en {period}</h3>
          <div className="flex items-center space-x-2 text-[var(--text-muted)] text-[10px] font-bold">
            <CalendarIcon size={12} />
            <span>{format(new Date(), 'MMMM yyyy', { locale: es })}</span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
              />
              <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toggled Sections */}
      <div className="space-y-4">
        {/* Tareas Section */}
        <SectionToggle 
          title="Tareas y Categorías" 
          icon={CheckCircle2} 
          isOpen={openSections.tasks} 
          onToggle={() => toggleSection('tasks')}
          count={pCompletedTasks.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)]">Distribución por categoría</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1 }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)]">Top Categorías</h4>
              <div className="space-y-3">
                {(pieData as {name: string, value: number}[]).sort((a, b) => b.value - a.value).slice(0, 4).map((entry, index) => (
                  <div key={entry.name} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase">
                      <span className="text-[var(--text)]">{entry.name}</span>
                      <span className="text-[var(--text-muted)]">{entry.value} tareas</span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${(entry.value / (pCompletedTasks.length || 1)) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionToggle>

        {/* Hábitos Section */}
        <SectionToggle 
          title="Hábitos y Consistencia" 
          icon={Zap} 
          isOpen={openSections.habits} 
          onToggle={() => toggleSection('habits')}
          count={habits.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2 p-4 bg-[var(--surface-2)] rounded-2xl">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-[var(--border)]" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                      <circle 
                        className="text-[var(--primary)]" 
                        strokeWidth="8" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * (habitCompletionRate as number)) / 100} 
                        strokeLinecap="round" 
                        stroke="currentColor" 
                        fill="transparent" 
                        r="40" 
                        cx="50" 
                        cy="50" 
                      />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[var(--text)]">{Math.round(habitCompletionRate)}%</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Tasa de Hábitos</p>
            </div>
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)]">Hábitos más constantes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {habits.slice(0, 4).map(habit => (
                  <div key={habit.id} className="p-3 bg-[var(--surface-2)] rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-xs font-bold text-[var(--text)] truncate max-w-[100px]">{habit.nombre}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-orange-600">
                      <Flame size={14} />
                      <span className="text-xs font-bold">{habit.rachaActual || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionToggle>

        {/* Proyectos Section */}
        <SectionToggle 
          title="Proyectos y Enfoque" 
          icon={Layers} 
          isOpen={openSections.projects} 
          onToggle={() => toggleSection('projects')}
          count={projectStats.length}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectStats.map((p, index) => (
                <div key={p.id} className="p-4 border border-[var(--border)] rounded-2xl space-y-3 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || COLORS[index % COLORS.length] }} />
                      <span className="text-sm font-bold text-[var(--text)]">{p.nombre}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full">
                      {p.taskCount} tareas
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div 
                      className="h-full" 
                      style={{ 
                        width: `${pCompletedTasks.length > 0 ? (p.taskCount / pCompletedTasks.length) * 100 : 0}%`,
                        backgroundColor: p.color || COLORS[index % COLORS.length]
                      }} 
                    />
                  </div>
                </div>
              ))}
              {projectStats.length === 0 && (
                <div className="col-span-3 py-8 text-center text-[var(--text-muted)] text-sm italic">
                  No se han detectado proyectos activos en este periodo.
                </div>
              )}
            </div>
          </div>
        </SectionToggle>

        {/* Presets Section */}
        <SectionToggle 
          title="Presets Utilizados" 
          icon={Package} 
          isOpen={openSections.presets} 
          onToggle={() => toggleSection('presets')}
          count={presets.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)]">Tus plantillas guardadas</h4>
              <div className="space-y-2">
                {presets.map(preset => (
                  <div key={preset.id} className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{preset.icono || "📝"}</div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text)]">{preset.nombre}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{preset.categoria} · {preset.duracion_minutos} min</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-[var(--primary)]">
                      {pCompletedTasks.filter(t => t.nombre === preset.nombre).length} usos
                    </div>
                  </div>
                ))}
                {presets.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] italic">No tienes presets guardados aún.</p>
                )}
              </div>
            </div>
            <div className="bg-[var(--primary-light)] p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <Package size={32} className="text-[var(--primary)]" />
              <h4 className="text-sm font-bold text-[var(--primary)]">Optimiza tu tiempo</h4>
              <p className="text-xs text-[var(--primary)] opacity-80">
                Los presets te ayudan a iniciar tareas comunes más rápido. Has usado presets en el {Math.round((pCompletedTasks.filter(t => presets.some(p => p.nombre === t.nombre)).length / (pCompletedTasks.length || 1)) * 100)}% de tus tareas.
              </p>
            </div>
          </div>
        </SectionToggle>

        {/* Sentiment Section */}
        <SectionToggle 
          title="Estado de Ánimo y Bienestar" 
          icon={Smile} 
          isOpen={openSections.sentiment} 
          onToggle={() => toggleSection('sentiment')}
          count={pEntries.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text)]">Balance emocional</h4>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  avgSentiment > 0 ? "bg-green-100 text-green-700" : avgSentiment < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                )}>
                  Promedio: {avgSentiment > 0 ? "+" : ""}{avgSentiment.toFixed(1)}
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pEntries.slice().reverse().map(e => ({ name: format(new Date(e.creadaEn), 'dd/MM'), value: e.balanceDia }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)]">Emociones predominantes</h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emotionsPieData.length > 0 ? emotionsPieData : [{ name: 'Sin datos', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(emotionsPieData.length > 0 ? emotionsPieData : [{ name: 'Sin datos', value: 1 }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {emotionsPieData.slice(0, 5).map((emo, i) => (
                  <div key={emo.name} className="flex items-center space-x-1 bg-[var(--surface-2)] px-2 py-1 rounded-lg text-[10px] font-bold">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{emo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionToggle>

        {/* Rutinas Section */}
        <SectionToggle 
          title="Rutinas y Sesiones" 
          icon={Clock} 
          isOpen={openSections.routines} 
          onToggle={() => toggleSection('routines')}
          count={pSessions.length}
        >
          <div className="space-y-6">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pSessions.slice(0, 10).map(s => ({ name: s.nombreActividad, value: Math.floor(s.duracionSegundos / 60) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                  <Bar dataKey="value" fill="#4A6FA5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[var(--surface-2)] rounded-xl text-center">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Promedio Sesión</p>
                <p className="text-lg font-bold text-[var(--text)]">
                  {pSessions.length > 0 ? Math.floor(pSessions.reduce((acc, s) => acc + s.duracionSegundos, 0) / pSessions.length / 60) : 0}m
                </p>
              </div>
              <div className="p-3 bg-[var(--surface-2)] rounded-xl text-center">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Sesión más larga</p>
                <p className="text-lg font-bold text-[var(--text)]">
                  {pSessions.length > 0 ? Math.floor(Math.max(...pSessions.map(s => s.duracionSegundos)) / 60) : 0}m
                </p>
              </div>
            </div>
          </div>
        </SectionToggle>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <button 
            onClick={() => {
              const cats = ["Trabajo", "Estudio", "Salud", "Personal"];
              const currentIdx = filterCategory ? cats.indexOf(filterCategory) : -1;
              const nextIdx = (currentIdx + 1) % (cats.length + 1);
              setFilterCategory(nextIdx === cats.length ? null : cats[nextIdx]);
            }}
            className="btn-outlined w-full py-3 font-bold flex items-center justify-center space-x-2 text-xs"
          >
            <Filter size={16} />
            <span>{filterCategory ? `Filtrado: ${filterCategory}` : "Filtros avanzados"}</span>
          </button>
        </div>
        <button 
          onClick={handleExportCSV}
          className="btn-primary flex-1 py-3 font-bold text-xs"
        >
          📄 Exportar reporte completo
        </button>
      </div>

      <div className="pt-8 border-t border-[var(--border)]">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">Zona de Peligro</h4>
              <p className="text-[10px] text-red-700">Reiniciar las estadísticas borrará permanentemente tu historial de tareas completadas, sesiones y diario.</p>
            </div>
          </div>
          <button 
            onClick={handleResetStats}
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <RotateCcw size={14} />
            <span>Reiniciar Estadísticas</span>
          </button>
        </div>
      </div>

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
