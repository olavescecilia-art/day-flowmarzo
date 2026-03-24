import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Library, Calendar, BarChart2, Book, Settings, LogOut, Wifi, WifiOff } from "lucide-react";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { onSnapshot, doc } from "firebase/firestore";

const navItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Library, label: "Biblioteca", path: "/library" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: BarChart2, label: "Estadísticas", path: "/stats" },
  { icon: Book, label: "Diario", path: "/diary" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!user) return;

    // A simple way to check if Firestore is reachable
    const unsubscribe = onSnapshot(
      doc(db, "_connection_test_", "ping"),
      () => setIsOnline(true),
      (error) => {
        if (error.code === "unavailable") {
          setIsOnline(false);
        }
      }
    );

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user]);

  if (!user) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-[64px] bg-[var(--bg)] border-r border-[var(--border)] items-center py-6 space-y-6">
        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white font-bold text-lg">
          F
        </div>
        
        <nav className="flex-1 flex flex-col space-y-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center space-y-1 transition-colors",
                  isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive && "bg-[var(--primary-light)]"
                )}>
                  <item.icon size={20} />
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col space-y-4 mt-auto">
          <Link
            to="/settings"
            className={cn(
              "flex flex-col items-center space-y-1",
              location.pathname === "/settings" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
            )}
          >
            <Settings size={20} />
            <span className="text-[9px] font-medium">Ajustes</span>
          </Link>
          <button
            onClick={() => auth.signOut()}
            className="flex flex-col items-center space-y-1 text-[var(--text-muted)] hover:text-red-500"
          >
            <LogOut size={20} />
            <span className="text-[9px] font-medium">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative">
        {!isOnline && (
          <div className="sticky top-0 left-0 right-0 bg-orange-500 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-center space-x-2 z-[100] animate-in slide-in-from-top">
            <WifiOff size={12} />
            <span>Modo offline: Los cambios se sincronizarán al conectar</span>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around px-2 z-50">
        {[...navItems, { icon: Settings, label: "Ajustes", path: "/settings" }].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center space-y-1 transition-colors",
                isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-colors",
                isActive && "bg-[var(--primary-light)]"
              )}>
                <item.icon size={20} />
              </div>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
