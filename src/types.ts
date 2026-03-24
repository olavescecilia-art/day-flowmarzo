export type Priority = 1 | 2 | 3 | 4;

export type SentimentType = "disfrutable" | "neutral" | "arrepentimiento";

export interface Task {
  id: string;
  userId: string;
  nombre: string;
  duracion_minutos: number;
  categoria: string;
  subcategoria?: string;
  proyectoId?: string;
  routineId?: string;
  presetId?: string;
  prioridad: Priority;
  fecha?: string; // ISO date string
  hora?: string;
  turno?: "mañana" | "tarde" | "noche";
  repeticion?: {
    tipo: "nunca" | "diario" | "semanal" | "personalizado";
    config?: {
      dias_semana: number[];
      cada_n: number;
      unidad: "dias" | "semanas" | "meses";
    };
  };
  estado: "pendiente" | "completa" | "saltada";
  sentimientoValor?: number;
  sentimientoTipo?: SentimentType;
  esHabito: boolean;
  rachaActual: number;
  mejorRacha: number;
  totalCompletadas: number;
  metaRepeticiones?: number;
  recompensa?: string;
  notas?: string;
  creadaEn: number;
  completadaEn?: number;
}

export interface Category {
  id: string;
  userId: string;
  nombre: string;
  colorHex: string;
  esBase: boolean;
}

export interface Emotion {
  emoji: string;
  nombre: string;
  intensidad: number;
  tipo: "positiva" | "negativa" | "neutral";
}

export interface DiaryEntry {
  id: string;
  userId: string;
  diarioId: string;
  titulo: string;
  contenidoHtml: string;
  emociones: Emotion[];
  balanceDia: number;
  tareasVinculadas: string[];
  sesionesVinculadas: string[];
  fotos: {
    url: string;
    caption?: string;
    tags: string[];
    taskId?: string;
    fecha: number;
  }[];
  plantilla?: string;
  creadaEn: number;
  editadaEn: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  timezone: string;
  palette: string;
  theme: "light" | "dark" | "auto";
  notifications: {
    taskReminder: boolean;
    taskReminderTime: string;
    habitAlert: boolean;
    dailySummary: boolean;
    dailySummaryTime: string;
    weeklyReview: boolean;
    weeklyReviewDay: string;
    weeklyReviewTime: string;
  };
  role: "admin" | "user";
  rachaActual: number;
  focoTotalMinutos: number;
  ultimaActividad: number;
  createdAt: number;
}

export interface Preset {
  id: string;
  userId: string;
  nombre: string;
  duracion_minutos: number;
  categoria: string;
  icono?: string;
  creadaEn: number;
}

export interface Project {
  id: string;
  userId: string;
  nombre: string;
  color?: string;
  estado: "activo" | "completado" | "archivado";
  creadaEn: number;
}

export interface TimerSession {
  id: string;
  userId: string;
  nombreActividad: string;
  categoria: string;
  duracionSegundos: number;
  puntuacion: number;
  sentimientoTipo: SentimentType;
  fecha: string;
  creadaEn: number;
}

export type RepetitionType = "diario" | "semanal" | "mensual" | "personalizado" | "nunca";

export interface Routine {
  id: string;
  userId: string;
  nombre: string;
  tareasIds: string[];
  repeticion: {
    tipo: RepetitionType;
    valor?: number;
    config?: {
      dias_semana: number[];
      cada_n: number;
      unidad: "dias" | "semanas" | "meses";
    };
  };
  activa: boolean;
  creadaEn: number;
}
