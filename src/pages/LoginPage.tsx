import React from "react";
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";
import { UserCircle } from "lucide-react";

export default function LoginPage() {
  const { palette, setPalette } = useTheme();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously", error);
    }
  };

  const palettes = [
    { id: "salvia", colors: ["#5B8A6F", "#F7F4EF", "#2C2C2C"] },
    { id: "noche", colors: ["#7BAF96", "#1A1D23", "#E8E6E1"] },
    { id: "arena", colors: ["#C4956A", "#F5EFE6", "#3A2E26"] },
    { id: "lavanda", colors: ["#8B7BB8", "#F4F2F8", "#2E2B35"] },
    { id: "bruma", colors: ["#6B8FA8", "#F0F2F4", "#2A3038"] },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-xl p-8 md:p-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
            F
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)]">FlowDay</h1>
          <p className="text-[var(--text-muted)]">Tu día, en calma</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-[var(--border)] text-[var(--text)] py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span>Continuar con Google</span>
          </button>

          <button
            onClick={handleAnonymousLogin}
            className="w-full flex items-center justify-center space-x-3 bg-[var(--surface-2)] text-[var(--text)] py-3 rounded-xl font-medium hover:bg-[var(--border)] transition-colors"
          >
            <UserCircle size={20} className="text-[var(--text-muted)]" />
            <span>Continuar como invitado</span>
          </button>
        </div>

        <div className="pt-8 border-t border-[var(--border)]">
          <p className="text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Elige tu paleta
          </p>
          <div className="flex justify-center space-x-3">
            {palettes.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p.id as any)}
                className={cn(
                  "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden",
                  palette === p.id ? "border-[var(--primary)] scale-110" : "border-transparent"
                )}
              >
                <div className="flex w-full h-full rotate-45">
                  <div style={{ backgroundColor: p.colors[0] }} className="flex-1" />
                  <div style={{ backgroundColor: p.colors[1] }} className="flex-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
