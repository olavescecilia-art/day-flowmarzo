import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { User, Mail, Palette, Moon, Bell, Globe, LogOut, Trash2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { palette, setPalette, theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const palettes = [
    { id: "salvia", name: "Salvia", colors: ["#5B8A6F", "#F7F4EF", "#2C2C2C"] },
    { id: "noche", name: "Noche", colors: ["#7BAF96", "#1A1D23", "#E8E6E1"] },
    { id: "arena", name: "Arena", colors: ["#C4956A", "#F5EFE6", "#3A2E26"] },
    { id: "lavanda", name: "Lavanda", colors: ["#8B7BB8", "#F4F2F8", "#2E2B35"] },
    { id: "bruma", name: "Bruma", colors: ["#6B8FA8", "#F0F2F4", "#2A3038"] },
  ];

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-bold text-[var(--text)]">⚙️ Configuración</h1>

      {/* Profile Section */}
      <div className="card p-3 flex items-center space-x-3">
        <div className="w-12 h-12 bg-[var(--primary-light)] rounded-full flex items-center justify-center text-[var(--primary)] font-bold text-lg border-2 border-white shadow-sm">
          {profile?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "I"}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-[var(--text)]">{profile?.displayName || "Usuario"}</h3>
            {user?.isAnonymous && (
              <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1">
                <ShieldAlert size={8} />
                <span>Invitado</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center space-x-1 mt-0.5">
            <Mail size={10} />
            <span>{user?.email || "Sin correo electrónico"}</span>
          </p>
          <button className="text-[9px] font-bold text-[var(--primary)] mt-1 hover:underline">Editar perfil</button>
        </div>
      </div>

      {/* Palette Switcher */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-[var(--text)]">
          <Palette size={16} />
          <h3 className="font-bold text-xs">Paleta de colores</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={() => setPalette(p.id as any)}
              className={cn(
                "card p-2 flex flex-col items-center space-y-1.5 transition-all border-2",
                palette === p.id ? "border-[var(--primary)] scale-[1.02] shadow-md" : "border-transparent hover:bg-[var(--surface-2)]"
              )}
            >
              <div className="flex space-x-1">
                {p.colors.map((c, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-[9px] font-bold text-[var(--text)]">{p.name}</span>
              {palette === p.id && (
                <div className="w-3.5 h-3.5 bg-[var(--primary)] text-white rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-[var(--text)]">
          <Moon size={16} />
          <h3 className="font-bold text-xs">Tema</h3>
        </div>
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl w-fit">
          {[
            { id: "light", label: "Claro", icon: "☀️" },
            { id: "dark", label: "Oscuro", icon: "🌙" },
            { id: "auto", label: "Sistema", icon: "⚙️" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-2 transition-all",
                theme === t.id ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
              )}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-[var(--text)]">
          <Bell size={16} />
          <h3 className="font-bold text-xs">Notificaciones</h3>
        </div>
        <div className="card divide-y divide-[var(--border)] p-0 overflow-hidden">
          {[
            { label: "Recordatorio de tareas", time: "08:00" },
            { label: "Alerta de racha en riesgo", time: "21:00" },
            { label: "Resumen diario", time: "21:30" },
            { label: "Revisión semanal", time: "Dom 19:00" }
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between p-2 hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="text-[11px] font-bold text-[var(--text)]">{n.label}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{n.time}</p>
              </div>
              <div className="w-8 h-4 bg-[var(--primary)] rounded-full relative">
                <div className="absolute top-0.5 left-5 w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data & Account */}
      <div className="pt-4 border-t border-[var(--border)] space-y-2">
        <button 
          onClick={handleSignOut}
          className="btn-outlined w-full py-2 flex items-center justify-center space-x-2"
        >
          <LogOut size={16} />
          <span className="font-bold text-[11px]">Cerrar sesión</span>
        </button>
        <button className="w-full py-2 text-red-500 font-bold text-[11px] flex items-center justify-center space-x-2 hover:bg-red-50 rounded-xl transition-colors">
          <Trash2 size={16} />
          <span>Eliminar mi cuenta</span>
        </button>
      </div>
    </div>
  );
}
