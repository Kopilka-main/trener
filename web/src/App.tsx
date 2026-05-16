import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomTabBar } from './components/BottomTabBar';
import { StatusBar } from './components/StatusBar';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientEditPage } from './pages/ClientEditPage';
import { ClientWorkoutsPage } from './pages/ClientWorkoutsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { ExerciseEditorPage } from './pages/ExerciseEditorPage';
import { WorkoutBuilderPage } from './pages/WorkoutBuilderPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { WorkoutSummaryPage } from './pages/WorkoutSummaryPage';
import { CalendarPage } from './pages/CalendarPage';
import { TrainerPage } from './pages/TrainerPage';
import { TrainerEditPage } from './pages/TrainerEditPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DevInspector } from './components/DevInspector';

const tabRoutes = ['/clients', '/exercises', '/calendar'];
// В клиентском режиме приложение работает от лица одного демо-клиента.
const CLIENT_HOME = '/clients/cl_001/workouts';

export function App() {
  const location = useLocation();
  const role = localStorage.getItem('app_role') as 'trainer' | 'client' | null;
  const path = location.pathname;

  // Роль не выбрана — первый экран выбора режима.
  if (role !== 'trainer' && role !== 'client') {
    return (
      <div className="app-shell">
        <StatusBar />
        <main className="flex-1 overflow-y-auto">
          <RoleSelectPage />
        </main>
      </div>
    );
  }

  const isClient = role === 'client';
  const authed = isClient || !!localStorage.getItem('trener_auth');
  const isAuthRoute = path === '/login' || path === '/register';
  const home = isClient ? CLIENT_HOME : '/clients';

  // Скрыть таб-бар на полноэкранных модальных страницах.
  const hideOnFullscreen = ['/edit', '/new', '/active', '/summary', '/builder', '/workouts'].some((seg) => path.includes(seg));
  const showTabs = isClient
    ? path === CLIENT_HOME || path === '/exercises'
    : authed && tabRoutes.some((r) => path === r || path.startsWith(`${r}/`)) && !hideOnFullscreen;

  return (
    <div className="app-shell">
      <StatusBar />
      <main className="flex-1 overflow-y-auto">
        {!authed && !isAuthRoute ? (
          <Navigate to="/login" replace />
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to={authed ? home : '/login'} replace />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/new" element={<ClientEditPage mode="create" />} />
            <Route path="/clients/:id/edit" element={<ClientEditPage mode="edit" />} />
            <Route path="/clients/:id/workouts" element={<ClientWorkoutsPage />} />
            <Route path="/exercises" element={<KnowledgeBasePage />} />
            <Route path="/exercises/new" element={<ExerciseEditorPage mode="create" />} />
            <Route path="/exercises/:id/edit" element={<ExerciseEditorPage mode="edit" />} />
            <Route path="/templates/new" element={<WorkoutBuilderPage mode="create" />} />
            <Route path="/templates/:id/edit" element={<WorkoutBuilderPage mode="edit" />} />
            <Route path="/workouts/:id/active" element={<ActiveWorkoutPage />} />
            <Route path="/workouts/:id/summary" element={<WorkoutSummaryPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/trainer" element={<TrainerPage />} />
            <Route path="/trainer/edit" element={<TrainerEditPage />} />
            <Route path="*" element={<Navigate to={authed ? home : '/login'} replace />} />
          </Routes>
        )}
      </main>
      {showTabs && <BottomTabBar role={role} />}
      {import.meta.env.DEV && <DevInspector />}
    </div>
  );
}
