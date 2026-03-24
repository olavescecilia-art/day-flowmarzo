import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, SkipForward, CheckCircle2, Plus, Minus, Volume2, Music, ChevronUp, ChevronDown, MoreVertical, GripVertical, Edit2, Trash2, PlayCircle, Upload, Library, Sparkles } from "lucide-react";
import { Task, Preset, TimerSession } from "../types";
import { cn, formatDuration } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, addDoc, increment } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableTaskItemProps {
  key?: React.Key;
  task: Task;
  index: number;
  currentIndex: number;
  onRemove: (index: number) => void;
}

function SortableTaskItem({ task, index, currentIndex, onRemove }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white border border-[#E8E3DB] rounded-lg p-3 flex items-center gap-3 transition-all",
        isDragging ? "shadow-xl scale-[1.02] opacity-50" : "hover:translate-x-1"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-[#8A8A8A] hover:text-[#5B8A6F]">
        <GripVertical size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#2C2C2C]">{task.nombre}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] font-medium text-[#8A8A8A] bg-[#F7F4EF] px-2 py-0.5 rounded-lg">
          <span>{task.duracion_minutos}min</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-[#4CAF50]"></span>
        <button 
          onClick={() => onRemove(index)}
          className="text-[#8A8A8A] hover:text-red-500 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

interface SessionPlayerProps {
  tasks: Task[];
  onClose: () => void;
}

export function SessionPlayer({ tasks: initialTasks, onClose }: SessionPlayerProps) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("active_session");
    if (saved) {
      const state = JSON.parse(saved);
      const now = Date.now();
      const timePassed = Math.floor((now - state.lastTimestamp) / 1000);
      if (state.isActive) {
        return Math.max(0, state.timeLeft - timePassed);
      }
      return state.timeLeft;
    }
    return initialTasks[0] ? initialTasks[0].duracion_minutos * 60 : 0;
  });
  const [isActive, setIsActive] = useState(true);
  const [showAudio, setShowAudio] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("Sesión de enfoque");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(50);
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskTab, setAddTaskTab] = useState<"new" | "library" | "presets">("new");
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(25);
  const [currentSound, setCurrentSound] = useState({ name: "Lluvia suave", id: "rain", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" });
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [sentiment, setSentiment] = useState<"disfrutable" | "neutral" | "arrepentimiento" | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const sounds = [
    { name: "Lluvia suave", id: "rain", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Bosque profundo", id: "forest", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Cafetería", id: "cafe", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { name: "Ruido blanco", id: "white_noise", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { name: "Olas del mar", id: "waves", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  ];

  const currentTask = tasks[currentIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence & Background Timer Logic
  useEffect(() => {
    const savedState = localStorage.getItem("active_session");
    if (savedState) {
      const state = JSON.parse(savedState);
      setTasks(state.tasks);
      setCurrentIndex(state.currentIndex);
      setSessionTitle(state.sessionTitle);
      setAudioVolume(state.audioVolume);
      
      const now = Date.now();
      const timePassed = Math.floor((now - state.lastTimestamp) / 1000);
      
      if (state.isActive) {
        setElapsedTime(state.elapsedTime + timePassed);
        setTimeLeft(Math.max(0, state.timeLeft - timePassed));
      } else {
        setElapsedTime(state.elapsedTime);
        setTimeLeft(state.timeLeft);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const saved = localStorage.getItem("active_session");
        if (saved) {
          const state = JSON.parse(saved);
          if (state.isActive) {
            const now = Date.now();
            const timePassed = Math.floor((now - state.lastTimestamp) / 1000);
            setTimeLeft(Math.max(0, state.timeLeft - timePassed));
            setElapsedTime(state.elapsedTime + timePassed);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Request Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const state = {
      tasks,
      currentIndex,
      timeLeft,
      isActive,
      elapsedTime,
      sessionTitle,
      audioVolume,
      lastTimestamp: Date.now()
    };
    localStorage.setItem("active_session", JSON.stringify(state));
  }, [tasks, currentIndex, timeLeft, isActive, elapsedTime, sessionTitle, audioVolume]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      // Don't allow moving tasks before or at the current index
      if (oldIndex <= currentIndex || newIndex <= currentIndex) return;

      setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  // Audio Control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume / 100;
      if (isAudioPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isAudioPlaying, audioVolume, currentSound]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft <= 0 && isActive) {
      // Only complete if we actually had a task and time ran out
      if (currentTask && timeLeft <= 0) {
        handleTaskComplete();
        sendNotification();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [isActive, timeLeft === 0]); // Only re-run when isActive changes or timeLeft hits 0

  const sendNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("¡Tarea completada!", {
        body: `Has terminado: ${currentTask?.nombre}`,
        icon: "/favicon.ico"
      });
    }
    // Play a completion sound
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(console.error);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCurrentSound({ name: file.name, id: "custom", url });
      setIsAudioPlaying(true);
      setIsAudioMenuOpen(false);
    }
  };

  const fetchLibraryData = async () => {
    if (!tasks[0]?.userId) return;
    try {
      const tasksQ = query(collection(db, "tasks"), where("userId", "==", tasks[0].userId));
      const presetsQ = query(collection(db, "presets"), where("userId", "==", tasks[0].userId));
      
      const [tasksSnap, presetsSnap] = await Promise.all([
        getDocs(tasksQ),
        getDocs(presetsQ)
      ]);

      setLibraryTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setPresets(presetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Preset)));
    } catch (error) {
      console.error("Error fetching library data:", error);
    }
  };

  useEffect(() => {
    if (showAddTask) {
      fetchLibraryData();
    }
  }, [showAddTask]);

  const handleTaskComplete = () => {
    setIsActive(false);
    setRating(0);
    setSentiment(null);
    setShowRating(true);
  };

  const handleRatingSubmit = async (ratingVal: number, type: "disfrutable" | "neutral" | "arrepentimiento") => {
    const taskId = currentTask.id;
    try {
      const taskUpdate: any = {
        estado: "completa",
        sentimientoValor: ratingVal,
        sentimientoTipo: type,
        completadaEn: Date.now(),
        totalCompletadas: (currentTask.totalCompletadas || 0) + 1
      };

      if (currentTask.esHabito) {
        const lastComp = currentTask.completadaEn ? new Date(currentTask.completadaEn) : null;
        const now = new Date();
        let newHabitStreak = currentTask.rachaActual || 0;

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
        if (newHabitStreak > (currentTask.mejorRacha || 0)) {
          taskUpdate.mejorRacha = newHabitStreak;
        }
      }

      await updateDoc(doc(db, "tasks", taskId), taskUpdate);

      // Update user profile stats
      if (user && profile) {
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
          focoTotalMinutos: increment(currentTask.duracion_minutos),
          rachaActual: newStreak,
          ultimaActividad: Date.now()
        });
      }
    } catch (error) {
      console.error("Error updating task: ", error);
    }

    setShowRating(false);
    if (currentIndex < tasks.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeLeft(tasks[nextIndex].duracion_minutos * 60);
      setIsActive(true); // Auto-start next task
    } else {
      // Session finished - save to timer_sessions
      if (user) {
        try {
          const sessionData: Partial<TimerSession> = {
            userId: user.uid,
            nombreActividad: sessionTitle,
            categoria: tasks[0]?.categoria || "General",
            duracionSegundos: elapsedTime,
            puntuacion: ratingVal, // Using the last task's rating as session rating for now
            sentimientoTipo: type,
            fecha: new Date().toISOString().split('T')[0],
            creadaEn: Date.now()
          };
          await addDoc(collection(db, "timer_sessions"), sessionData);
        } catch (error) {
          console.error("Error saving session:", error);
        }
      }
      setSessionFinished(true);
      localStorage.removeItem("active_session");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalEstimatedTime = tasks.reduce((acc, t) => acc + t.duracion_minutos, 0);
  const progress = currentTask ? (1 - timeLeft / (currentTask.duracion_minutos * 60)) * 100 : 0;

  const removeTask = (index: number) => {
    if (tasks.length <= 1) return;
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
    if (index === currentIndex) {
      // If we remove the current task, reset timer for the new current task
      setTimeLeft(newTasks[currentIndex].duracion_minutos * 60);
    } else if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const addTask = (taskData?: Partial<Task>) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: taskData?.nombre || newTaskName,
      duracion_minutos: taskData?.duracion_minutos || newTaskDuration,
      categoria: taskData?.categoria || "Enfoque",
      estado: "pendiente",
      totalCompletadas: 0,
      userId: tasks[0]?.userId || "",
      creadaEn: Date.now(),
      prioridad: 1,
      esHabito: false,
      rachaActual: 0,
      mejorRacha: 0
    };
    setTasks([...tasks, newTask]);
    setNewTaskName("");
    setShowAddTask(false);
  };

  const moveTask = (from: number, to: number) => {
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(from, 1);
    newTasks.splice(to, 0, moved);
    setTasks(newTasks);
  };

  const handleClose = () => {
    localStorage.removeItem("active_session");
    onClose();
  };

  if (sessionFinished) {
    return (
      <div className="fixed inset-0 z-[300] bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">¡Sesión completada! 🎉</h1>
        <p className="text-[var(--text-muted)] mb-8">Has completado {tasks.length} tareas con éxito.</p>
        
        <div className="w-full max-w-md space-y-4 mb-12">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Tareas</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{tasks.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--text-muted)] uppercase font-bold">Tiempo total</p>
              <p className="text-2xl font-bold text-[var(--primary)]">
                {formatDuration(Math.floor(elapsedTime / 60))}
              </p>
            </div>
          </div>
        </div>

        <button onClick={handleClose} className="btn-primary w-full max-w-md py-4 text-lg">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#F7F4EF] flex flex-col overflow-y-auto">
      <audio ref={audioRef} src={currentSound.url} loop />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="audio/*" 
        onChange={handleFileUpload}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F7F4EF]/80 backdrop-blur-xl border-b border-[#E8E3DB] h-14 flex items-center justify-between px-6">
        <button onClick={handleClose} className="text-[#5B8A6F] active:scale-95 transition-transform">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 group">
          {isEditingTitle ? (
            <input
              autoFocus
              className="bg-[#F0ECE6] border-none focus:ring-2 focus:ring-[#5B8A6F] text-sm font-bold text-center px-4 py-1 rounded-lg"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
            />
          ) : (
            <button 
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-2 hover:bg-[#5B8A6F]/5 px-3 py-1 rounded-full transition-colors"
            >
              <h1 className="text-sm font-bold text-[#2C2C2C]">{sessionTitle}</h1>
              <Edit2 size={14} className="text-[#8A8A8A] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <button className="text-[#5B8A6F] hover:bg-[#5B8A6F]/5 p-2 rounded-full transition-colors active:scale-90">
          <MoreVertical size={20} />
        </button>
      </header>

      <main className="max-w-lg mx-auto w-full px-6 py-6 flex flex-col items-center">
        {/* Subheader Stats */}
        <div className="text-center mb-6">
          <p className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-semibold mb-1">PROGRESO DE SESIÓN</p>
          <p className="text-xs text-[#8A8A8A] font-medium">
            ⏱ Estimado: <span className="text-[#2C2C2C]">{totalEstimatedTime}min</span> · Real: <span className="text-[#5B8A6F] font-bold">{Math.floor(elapsedTime / 60)}min</span>
          </p>
        </div>

        {/* Central Timer Section */}
        <div className="relative w-[220px] h-[220px] flex items-center justify-center mb-8">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              className="text-[#E8E3DB]" 
              cx="50" cy="50" r="46" 
              fill="none" stroke="currentColor" strokeWidth="1.5" 
            />
            <motion.circle 
              className="text-[#5B8A6F]" 
              cx="50" cy="50" r="46" 
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "289", strokeDashoffset: "289" }}
              animate={{ strokeDashoffset: 289 - (289 * progress) / 100 }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="text-center z-10">
            <h2 className="text-4xl font-extrabold tracking-tighter text-[#2C2C2C] mb-1">
              {formatTime(timeLeft)}
            </h2>
            <p className="text-xs font-medium text-[#8A8A8A] max-w-[160px] truncate">{currentTask?.nombre}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 px-3 py-1 bg-[#F0ECE6] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#4A6FA5]"></span>
              <span className="text-[10px] font-bold text-[#8A8A8A] tracking-wide uppercase">
                {currentTask?.categoria}
              </span>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="w-full grid grid-cols-5 gap-2 mb-10">
          <button 
            onClick={() => setIsActive(!isActive)}
            className="flex flex-col items-center justify-center h-12 bg-white border border-[#E8E3DB] rounded-xl shadow-sm hover:bg-[#F0ECE6] active:scale-95 transition-all"
          >
            {isActive ? <Pause size={18} className="text-[#5B8A6F] mb-1" /> : <Play size={18} className="text-[#5B8A6F] mb-1" />}
            <span className="text-[10px] font-bold text-[#8A8A8A]">{isActive ? "Pausa" : "Reanudar"}</span>
          </button>

          <button 
            onClick={() => {
              if (currentIndex < tasks.length - 1) setCurrentIndex(prev => prev + 1);
              else setSessionFinished(true);
            }}
            className="flex flex-col items-center justify-center h-12 bg-white border border-[#E8E3DB] rounded-xl shadow-sm hover:bg-[#F0ECE6] active:scale-95 transition-all"
          >
            <SkipForward size={18} className="text-[#5B8A6F] mb-1" />
            <span className="text-[10px] font-bold text-[#8A8A8A]">Saltar</span>
          </button>

          <button 
            onClick={handleTaskComplete}
            className="flex flex-col items-center justify-center h-12 bg-[#5B8A6F] text-white rounded-xl shadow-lg shadow-[#5B8A6F]/20 active:scale-95 transition-all"
          >
            <CheckCircle2 size={18} className="mb-1" />
            <span className="text-[10px] font-bold">Listo</span>
          </button>

          <button 
            onClick={() => setTimeLeft(prev => Math.max(0, prev - 300))}
            className="flex flex-col items-center justify-center h-12 bg-white border border-[#E8E3DB] rounded-xl shadow-sm hover:bg-[#F0ECE6] active:scale-95 transition-all"
          >
            <Minus size={18} className="text-[#8A8A8A] mb-1" />
            <span className="text-[10px] font-bold text-[#8A8A8A]">-5min</span>
          </button>

          <button 
            onClick={() => setTimeLeft(prev => prev + 300)}
            className="flex flex-col items-center justify-center h-12 bg-white border border-[#E8E3DB] rounded-xl shadow-sm hover:bg-[#F0ECE6] active:scale-95 transition-all"
          >
            <Plus size={18} className="text-[#8A8A8A] mb-1" />
            <span className="text-[10px] font-bold text-[#8A8A8A]">+5min</span>
          </button>
        </div>

        {/* Audio Player Bar */}
        <div className="w-full mb-8 relative">
          <div className="bg-white/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E8E3DB]">
            <button 
              onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
              className="flex items-center gap-2 hover:bg-[#F0ECE6] px-2 py-1 rounded-full transition-colors"
            >
              <Music size={16} className="text-[#5B8A6F]" />
              <div className="overflow-hidden max-w-[80px]">
                <p className="text-[10px] font-bold text-[#2C2C2C] truncate uppercase tracking-tight">{currentSound.name}</p>
              </div>
              <ChevronUp size={12} className={cn("text-[#8A8A8A] transition-transform", isAudioMenuOpen && "rotate-180")} />
            </button>
            
            <div className="flex-1 h-1 bg-[#F0ECE6] rounded-full relative">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-[#5B8A6F] rounded-full"
                animate={{ width: isAudioPlaying ? "100%" : "0%" }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                className="text-[#5B8A6F] active:scale-90 p-1 hover:bg-[#5B8A6F]/10 rounded-full transition-colors"
              >
                {isAudioPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <div className="flex items-center gap-1 group relative">
                <Volume2 size={18} className="text-[#8A8A8A]" />
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                  className="w-16 h-1 bg-[#F0ECE6] rounded-lg appearance-none cursor-pointer accent-[#5B8A6F]"
                />
              </div>
            </div>
          </div>

          {/* Audio Menu */}
          <AnimatePresence>
            {isAudioMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-[#E8E3DB] rounded-2xl shadow-xl p-2 z-50"
              >
                {sounds.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => {
                      setCurrentSound(sound);
                      setIsAudioMenuOpen(false);
                      setIsAudioPlaying(true);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between",
                      currentSound.id === sound.id ? "bg-[#5B8A6F] text-white" : "text-[#2C2C2C] hover:bg-[#F7F4EF]"
                    )}
                  >
                    {sound.name}
                    {currentSound.id === sound.id && <PlayCircle size={14} />}
                  </button>
                ))}
                <div className="h-px bg-[#E8E3DB] my-1" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#5B8A6F] hover:bg-[#5B8A6F]/5 flex items-center gap-2"
                >
                  <Upload size={14} />
                  Subir MP3
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Task Queue */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wider">A continuación</h3>
            <span className="text-[10px] font-medium text-[#8A8A8A] bg-[#F0ECE6] px-2 py-0.5 rounded-full">
              {tasks.length - currentIndex - 1} tareas · {tasks.slice(currentIndex + 1).reduce((acc, t) => acc + t.duracion_minutos, 0)}min
            </span>
          </div>

          <div className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tasks.slice(currentIndex + 1).map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence mode="popLayout">
                  {tasks.slice(currentIndex + 1).map((task, idx) => {
                    const actualIdx = currentIndex + 1 + idx;
                    return (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        index={actualIdx}
                        currentIndex={currentIndex}
                        onRemove={removeTask}
                      />
                    );
                  })}
                </AnimatePresence>
              </SortableContext>
            </DndContext>

            {/* Add Task Button */}
            <button 
              onClick={() => setShowAddTask(true)}
              className="w-full py-3 border-2 border-dashed border-[#E8E3DB] rounded-xl flex items-center justify-center gap-2 text-[#8A8A8A] hover:bg-[#F0ECE6] transition-colors active:scale-[0.98]"
            >
              <Plus size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Agregar tarea</span>
            </button>
          </div>
        </section>
      </main>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddTask && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTask(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-[#E8E3DB] flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2C2C2C]">Agregar tarea</h3>
                <button onClick={() => setShowAddTask(false)} className="text-[#8A8A8A] p-2 hover:bg-[#F7F4EF] rounded-full"><X size={20} /></button>
              </div>

              <div className="flex border-b border-[#E8E3DB]">
                <button 
                  onClick={() => setAddTaskTab("new")}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    addTaskTab === "new" ? "border-[#5B8A6F] text-[#5B8A6F]" : "border-transparent text-[#8A8A8A]"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Nuevo
                  </div>
                </button>
                <button 
                  onClick={() => setAddTaskTab("library")}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    addTaskTab === "library" ? "border-[#5B8A6F] text-[#5B8A6F]" : "border-transparent text-[#8A8A8A]"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Library size={14} />
                    Biblioteca
                  </div>
                </button>
                <button 
                  onClick={() => setAddTaskTab("presets")}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
                    addTaskTab === "presets" ? "border-[#5B8A6F] text-[#5B8A6F]" : "border-transparent text-[#8A8A8A]"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles size={14} />
                    Presets
                  </div>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {addTaskTab === "new" && (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Nombre</label>
                      <input 
                        autoFocus
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="¿Qué vas a hacer?"
                        className="w-full bg-[#F7F4EF] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#5B8A6F] transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-wider">Duración (minutos)</label>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setNewTaskDuration(prev => Math.max(1, prev - 5))}
                          className="w-10 h-10 rounded-full bg-[#F7F4EF] flex items-center justify-center text-[#5B8A6F] hover:bg-[#E8E3DB]"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="flex-1 text-center font-bold text-xl">{newTaskDuration}</span>
                        <button 
                          onClick={() => setNewTaskDuration(prev => prev + 5)}
                          className="w-10 h-10 rounded-full bg-[#F7F4EF] flex items-center justify-center text-[#5B8A6F] hover:bg-[#E8E3DB]"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => addTask()}
                      disabled={!newTaskName.trim()}
                      className="w-full py-4 bg-[#5B8A6F] text-white rounded-2xl font-bold shadow-lg shadow-[#5B8A6F]/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                      Crear y agregar
                    </button>
                  </div>
                )}

                {addTaskTab === "library" && (
                  <div className="space-y-2">
                    {libraryTasks.length > 0 ? (
                      libraryTasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => addTask(task)}
                          className="w-full p-4 bg-[#F7F4EF] rounded-2xl flex items-center justify-between hover:bg-[#E8E3DB] transition-colors group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-bold text-[#2C2C2C]">{task.nombre}</p>
                            <p className="text-[10px] text-[#8A8A8A] font-medium uppercase">{task.categoria} · {task.duracion_minutos}min</p>
                          </div>
                          <Plus size={18} className="text-[#5B8A6F] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-[#8A8A8A] text-sm py-8">No hay tareas en tu biblioteca</p>
                    )}
                  </div>
                )}

                {addTaskTab === "presets" && (
                  <div className="space-y-2">
                    {presets.length > 0 ? (
                      presets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => addTask(preset)}
                          className="w-full p-4 bg-[#F7F4EF] rounded-2xl flex items-center justify-between hover:bg-[#E8E3DB] transition-colors group"
                        >
                          <div className="text-left">
                            <p className="text-sm font-bold text-[#2C2C2C]">{preset.nombre}</p>
                            <p className="text-[10px] text-[#8A8A8A] font-medium uppercase">{preset.categoria} · {preset.duracion_minutos}min</p>
                          </div>
                          <Plus size={18} className="text-[#5B8A6F] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-[#8A8A8A] text-sm py-8">No hay presets guardados</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#2C2C2C]">¡Tarea completada!</h3>
                <p className="text-sm text-[#8A8A8A]">¿Cómo calificarías tu experiencia con "{currentTask?.nombre}"?</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest block text-center">Nivel de Disfrute (1-10)</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => setRating(num)}
                        className={cn(
                          "flex-1 aspect-square rounded-lg text-xs font-bold transition-all",
                          rating === num 
                            ? "bg-[#5B8A6F] text-white scale-110 shadow-md" 
                            : "bg-[#F7F4EF] text-[#8A8A8A] hover:bg-[#E8E3DB]"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest block text-center">¿Cómo te sientes ahora?</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => setSentiment("disfrutable")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                        sentiment === "disfrutable" 
                          ? "bg-green-50 border-green-500 shadow-sm" 
                          : "bg-[#F7F4EF] border-transparent grayscale opacity-60"
                      )}
                    >
                      <span className="text-2xl">😊</span>
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-tight">Repetiría</span>
                    </button>
                    <button 
                      onClick={() => setSentiment("neutral")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                        sentiment === "neutral" 
                          ? "bg-gray-50 border-gray-500 shadow-sm" 
                          : "bg-[#F7F4EF] border-transparent grayscale opacity-60"
                      )}
                    >
                      <span className="text-2xl">😐</span>
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Neutral</span>
                    </button>
                    <button 
                      onClick={() => setSentiment("arrepentimiento")}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                        sentiment === "arrepentimiento" 
                          ? "bg-red-50 border-red-500 shadow-sm" 
                          : "bg-[#F7F4EF] border-transparent grayscale opacity-60"
                      )}
                    >
                      <span className="text-2xl">😔</span>
                      <span className="text-[10px] font-bold text-red-700 uppercase tracking-tight">Arrepentido</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleRatingSubmit(rating, sentiment)}
                  disabled={rating === 0 || !sentiment}
                  className="w-full py-4 bg-[#5B8A6F] text-white rounded-2xl font-bold shadow-lg shadow-[#5B8A6F]/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  Guardar y Continuar
                </button>
                <button 
                  onClick={() => handleRatingSubmit(0, "neutral")}
                  className="text-[#8A8A8A] text-xs font-bold uppercase tracking-widest hover:text-[#2C2C2C] transition-colors py-2"
                >
                  Omitir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
