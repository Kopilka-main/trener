import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomTabBar } from './components/BottomTabBar';
import { RoleSelectPage } from './pages/RoleSelectPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientEditPage } from './pages/ClientEditPage';
import { ClientWorkoutsPage } from './pages/ClientWorkoutsPage';
import { ClientCardPage } from './pages/ClientCardPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
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
import { CLIENT_BASE, TRAINER_BASE } from './lib/routes';

// Адреса, на которых виден нижний таб-бар (точное совпадение).
const TRAINER_TAB_PATHS = [`${TRAINER_BASE}/clients`, `${TRAINER_BASE}/exercises`, `${TRAINER_BASE}/calendar`];
const CLIENT_TAB_PATHS = [`${CLIENT_BASE}/workouts`, `${CLIENT_BASE}/exercises`];

export function App() {
  const location = useLocation();
  const role = localStorage.getItem('app_role') as 'trainer' | 'client' | null;
  const path = location.pathname;

  // Роль не выбрана — первый экран выбора режима.
  if (role !== 'trainer' && role !== 'client') {
    return (
      <div className="app-shell">
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <RoleSelectPage />
        </main>
      </div>
    );
  }

  const isClient = role === 'client';
  const authed = isClient || !!localStorage.getItem('trener_auth');
  const isAuthRoute = path === `${TRAINER_BASE}/login` || path === `${TRAINER_BASE}/register`;
  const home = isClient ? `${CLIENT_BASE}/workouts` : `${TRAINER_BASE}/clients`;

  const showTabs = authed && (isClient ? CLIENT_TAB_PATHS : TRAINER_TAB_PATHS).includes(path);

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {!authed && !isAuthRoute ? (
          <Navigate to={`${TRAINER_BASE}/login`} replace />
        ) : isClient ? (
          // Клиентское приложение — /client/*
          <Routes>
            <Route path={`${CLIENT_BASE}/workouts`} element={<ClientWorkoutsPage />} />
            <Route path={`${CLIENT_BASE}/workouts/:id/active`} element={<ActiveWorkoutPage />} />
            <Route path={`${CLIENT_BASE}/workouts/:id/summary`} element={<WorkoutSummaryPage />} />
            <Route path={`${CLIENT_BASE}/profile`} element={<ClientProfilePage />} />
            <Route path={`${CLIENT_BASE}/profile/edit`} element={<ClientEditPage mode="edit" />} />
            <Route path={`${CLIENT_BASE}/exercises`} element={<KnowledgeBasePage />} />
            <Route path={`${CLIENT_BASE}/exercises/new`} element={<ExerciseEditorPage mode="create" />} />
            <Route path={`${CLIENT_BASE}/exercises/:id/edit`} element={<ExerciseEditorPage mode="edit" />} />
            <Route path={`${CLIENT_BASE}/templates/new`} element={<WorkoutBuilderPage mode="create" />} />
            <Route path={`${CLIENT_BASE}/templates/:id/edit`} element={<WorkoutBuilderPage mode="edit" />} />
            <Route path={`${CLIENT_BASE}/calendar`} element={<CalendarPage />} />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        ) : (
          // Тренерское приложение — /trainer/*
          <Routes>
            <Route path={`${TRAINER_BASE}/login`} element={<LoginPage />} />
            <Route path={`${TRAINER_BASE}/register`} element={<RegisterPage />} />
            <Route path={`${TRAINER_BASE}/clients`} element={<ClientsPage />} />
            <Route path={`${TRAINER_BASE}/clients/new`} element={<ClientEditPage mode="create" />} />
            <Route path={`${TRAINER_BASE}/clients/:id`} element={<ClientCardPage />} />
            <Route path={`${TRAINER_BASE}/clients/:id/edit`} element={<ClientEditPage mode="edit" />} />
            <Route path={`${TRAINER_BASE}/clients/:id/workouts`} element={<ClientWorkoutsPage />} />
            <Route path={`${TRAINER_BASE}/exercises`} element={<KnowledgeBasePage />} />
            <Route path={`${TRAINER_BASE}/exercises/new`} element={<ExerciseEditorPage mode="create" />} />
            <Route path={`${TRAINER_BASE}/exercises/:id/edit`} element={<ExerciseEditorPage mode="edit" />} />
            <Route path={`${TRAINER_BASE}/templates/new`} element={<WorkoutBuilderPage mode="create" />} />
            <Route path={`${TRAINER_BASE}/templates/:id/edit`} element={<WorkoutBuilderPage mode="edit" />} />
            <Route path={`${TRAINER_BASE}/workouts/:id/active`} element={<ActiveWorkoutPage />} />
            <Route path={`${TRAINER_BASE}/workouts/:id/summary`} element={<WorkoutSummaryPage />} />
            <Route path={`${TRAINER_BASE}/calendar`} element={<CalendarPage />} />
            <Route path={`${TRAINER_BASE}/profile`} element={<TrainerPage />} />
            <Route path={`${TRAINER_BASE}/profile/edit`} element={<TrainerEditPage />} />
            <Route path="*" element={<Navigate to={authed ? home : `${TRAINER_BASE}/login`} replace />} />
          </Routes>
        )}
      </main>
      {showTabs && <BottomTabBar role={role} />}
      {import.meta.env.DEV && <DevInspector />}
    </div>
  );
}
