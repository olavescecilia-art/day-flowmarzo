import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import CalendarPage from "./pages/CalendarPage";
import StatsPage from "./pages/StatsPage";
import DiaryPage from "./pages/DiaryPage";
import SettingsPage from "./pages/SettingsPage";

// Placeholder Pages
const Home = () => <div>Home</div>;
const Library = () => <div>Library</div>;
const Calendar = () => <div>Calendar</div>;
const Stats = () => <div>Stats</div>;
const Diary = () => <div>Diary</div>;
const Settings = () => <div>Settings</div>;

function AppRoutes() {
  const { user, loading } = useAuth();

  console.log("App.tsx: AppRoutes rendering, loading:", loading, "user:", user?.uid);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      
      <Route
        path="/*"
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/diary" element={<DiaryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
