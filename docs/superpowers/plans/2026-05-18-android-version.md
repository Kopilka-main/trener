# Android-версия приложения «Тренер» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать отдельный проект `trener-mobile/` — тренерское-только приложение «Тренер», упакованное в Android APK через Capacitor, работающее офлайн.

**Architecture:** Фронтенд `github_demo` (React + Vite, бессерверный, данные в `localStorage`) копируется в новую папку `trener-mobile/`, физически вычищается от клиентской части и выбора роли, затем оборачивается Capacitor'ом, который собирает APK из статической сборки Vite. `github_demo` остаётся нетронутой.

**Tech Stack:** React 18, Vite 6, TypeScript 5.7, Tailwind CSS v4, react-router-dom (HashRouter), @tanstack/react-query, @dnd-kit, lucide-react, Capacitor 6 (Android).

**Спецификация:** [docs/superpowers/specs/2026-05-18-android-version-design.md](../specs/2026-05-18-android-version-design.md)

---

## Структура файлов

Новый проект создаётся как копия `github_demo/` со следующими изменениями:

**Удаляются:**
- `src/pages/RoleSelectPage.tsx` — выбор роли
- `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx` — вход/регистрация
- `src/pages/ClientProfilePage.tsx` — экран клиентского приложения

**Правятся:**
- `src/App.tsx` — только тренерские маршруты, без ролей и авторизации
- `src/lib/routes.ts` — убирается `CLIENT_BASE`, `DEMO_CLIENT_ID`, клиентские ветки
- `src/components/BottomTabBar.tsx` — убирается параметр `role`
- `src/pages/ClientEditPage.tsx`, `src/pages/ClientWorkoutsPage.tsx` — убираются ветки `isClient`
- `src/pages/TrainerPage.tsx` — убирается кнопка «Выйти»
- `src/api/demo-seed.ts` — пустые `clients` и `sessions`

**Создаются (Capacitor):**
- `capacitor.config.ts` — конфиг Capacitor
- `android/` — нативный Android-проект (генерируется `npx cap add android`)

Все команды выполняются из корня репозитория `c:\Users\shlya\Desktop\Trener`, если не указано иное. Shell — PowerShell.

---

## Task 1: Создать проект trener-mobile

Скопировать фронтенд `github_demo` в новую папку и убедиться, что копия собирается.

**Files:**
- Create: `trener-mobile/` (копия `github_demo/` без `node_modules`, `dist`, `tsconfig.tsbuildinfo`)
- Modify: `trener-mobile/package.json` (переименование)

- [ ] **Step 1: Скопировать github_demo в trener-mobile без артефактов**

Из корня репозитория:

```powershell
Copy-Item -Path github_demo -Destination trener-mobile -Recurse
Remove-Item -Recurse -Force trener-mobile\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force trener-mobile\dist -ErrorAction SilentlyContinue
Remove-Item -Force trener-mobile\tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
Remove-Item -Force trener-mobile\package-lock.json -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Переименовать проект в package.json**

В `trener-mobile/package.json` изменить поле `name`:

```json
"name": "trener-mobile",
```

(остальные поля `package.json` пока не трогать)

- [ ] **Step 3: Установить зависимости**

```powershell
npm --prefix trener-mobile install
```

Expected: установка завершается без ошибок, появляется `trener-mobile/node_modules` и `trener-mobile/package-lock.json`.

- [ ] **Step 4: Проверить, что копия собирается**

```powershell
npm --prefix trener-mobile run build
```

Expected: `tsc -b` и `vite build` завершаются успешно, появляется `trener-mobile/dist/`. На этом шаге проект ещё содержит клиентскую часть — это нормально, проверяется только целостность копии.

- [ ] **Step 5: Commit**

```powershell
git add trener-mobile
git commit -m @'
chore: создать проект trener-mobile как копию github_demo

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

## Task 2: Удалить клиентскую часть приложения

Привести `trener-mobile` к тренерскому-только виду. Шаги идут в порядке, при котором проект гарантированно компилируется только в конце задачи — это нормально, проверка сборки в Step 9.

**Files:**
- Modify: `trener-mobile/src/lib/routes.ts`
- Modify: `trener-mobile/src/components/BottomTabBar.tsx`
- Modify: `trener-mobile/src/pages/ClientEditPage.tsx`
- Modify: `trener-mobile/src/pages/ClientWorkoutsPage.tsx`
- Modify: `trener-mobile/src/pages/TrainerPage.tsx`
- Modify: `trener-mobile/src/App.tsx`
- Modify: `trener-mobile/src/api/demo-seed.ts`
- Delete: `trener-mobile/src/pages/RoleSelectPage.tsx`
- Delete: `trener-mobile/src/pages/LoginPage.tsx`
- Delete: `trener-mobile/src/pages/RegisterPage.tsx`
- Delete: `trener-mobile/src/pages/ClientProfilePage.tsx`

- [ ] **Step 1: Переписать `src/lib/routes.ts`**

Полностью заменить содержимое файла `trener-mobile/src/lib/routes.ts` на:

```ts
// Тренерское приложение живёт под /trainer/*.
export const TRAINER_BASE = '/trainer';

/** Префикс маршрутов приложения. */
export function appBase(): string {
  return TRAINER_BASE;
}

/** Экран тренировок клиента — открывается у тренера по id клиента. */
export function clientWorkoutsPath(clientId: string): string {
  return `${TRAINER_BASE}/clients/${clientId}/workouts`;
}

/**
 * Родительский экран для кнопки «назад» — переход по иерархии разделов,
 * а не по истории браузера.
 */
export function backTarget(pathname: string, search = ''): string {
  const segs = pathname.split('/').filter(Boolean);
  const sub = segs[1] ?? '';
  const sectionHome = `${TRAINER_BASE}/clients`;

  if (sub === 'exercises' || sub === 'templates') return `${TRAINER_BASE}/exercises`;
  if (sub === 'profile') return segs[2] === 'edit' ? `${TRAINER_BASE}/profile` : sectionHome;
  if (sub === 'calendar') {
    const clientId = new URLSearchParams(search).get('clientId');
    if (clientId) return `${TRAINER_BASE}/clients/${clientId}/workouts`;
    return sectionHome;
  }
  if (sub === 'clients') return `${TRAINER_BASE}/clients`;
  if (sub === 'workouts') return sectionHome;
  return sectionHome;
}
```

(`appBase` и `clientWorkoutsPath` сохранены — их вызывают общие экраны `ClientsPage`, `KnowledgeBasePage`, `TrainerPage`, `ClientPreviewSheet`, `ActiveWorkoutPage`, `WorkoutSummaryPage`; их трогать не нужно.)

- [ ] **Step 2: Переписать `src/components/BottomTabBar.tsx`**

Полностью заменить содержимое файла `trener-mobile/src/components/BottomTabBar.tsx` на:

```tsx
import { NavLink } from 'react-router-dom';
import { TRAINER_BASE } from '../lib/routes';

const tabs = [
  { to: `${TRAINER_BASE}/exercises`, label: 'Упражнения' },
  { to: `${TRAINER_BASE}/clients`, label: 'Клиенты' },
];

export function BottomTabBar() {
  return (
    <nav className="border-t border-[var(--color-line)] bg-[var(--color-bg)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-2">
        {tabs.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-center py-3 text-sm ${isActive ? 'font-semibold text-ink' : 'text-[var(--color-ink-muted)]'}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: Убрать клиентские ветки из `src/pages/ClientEditPage.tsx`**

Сделать 4 точечные замены в `trener-mobile/src/pages/ClientEditPage.tsx`:

Замена 1 — строка импорта (строка 11):
```tsx
import { appBase, DEMO_CLIENT_ID } from '../lib/routes';
```
→
```tsx
import { appBase } from '../lib/routes';
```

Замена 2 — определение `id` (строки 34-37):
```tsx
  // У клиента маршрут /client/profile/edit без id — правим демо-клиента.
  const { id: routeId } = useParams<{ id: string }>();
  const isClient = localStorage.getItem('app_role') === 'client';
  const id = routeId ?? (isClient ? DEMO_CLIENT_ID : undefined);
```
→
```tsx
  const { id } = useParams<{ id: string }>();
```

Замена 3 — заголовок экрана (строка 98):
```tsx
        title={editing ? (isClient ? 'Мой профиль' : 'Редактирование') : 'Новый клиент'}
```
→
```tsx
        title={editing ? 'Редактирование' : 'Новый клиент'}
```

Замена 4 — условие кнопки удаления (строка 210):
```tsx
        {editing && !isClient && (
```
→
```tsx
        {editing && (
```

- [ ] **Step 4: Убрать клиентские ветки из `src/pages/ClientWorkoutsPage.tsx`**

Сделать 4 замены в `trener-mobile/src/pages/ClientWorkoutsPage.tsx`:

Замена 1 — строка импорта (строка 15):
```tsx
import { appBase, DEMO_CLIENT_ID } from '../lib/routes';
```
→
```tsx
import { appBase } from '../lib/routes';
```

Замена 2 — определение `id` (строки 21-23):
```tsx
  // У тренера id приходит из URL, у клиента маршрут единый — берём демо-клиента.
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId || DEMO_CLIENT_ID;
```
→
```tsx
  const { id = '' } = useParams<{ id: string }>();
```

Замена 3 — убрать строку `isClient` (строка 34):
```tsx
  const isClient = localStorage.getItem('app_role') === 'client';
```
→ удалить строку целиком.

Замена 4 — заменить тернар `isClient ? (...) : (...)` карточки клиента (строки 73-97) на тренерский вариант:
```tsx
          {isClient ? (
            // В клиентском режиме блок ведёт на профиль клиента.
            <button
              onClick={() => navigate(`${appBase()}/profile`)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
            >
              <Avatar firstName={client.firstName} lastName={client.lastName} size={48} />
              <div className="min-w-0">
                <div className="text-[20px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
                <div className="text-[12px] text-[var(--color-ink-muted)]">{totalWorkouts} тренировок</div>
              </div>
            </button>
          ) : (
            // В тренерском режиме тап по клиенту открывает карточку-шторку.
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
            >
              <Avatar firstName={client.firstName} lastName={client.lastName} size={48} />
              <div className="min-w-0">
                <div className="text-[20px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
                <div className="text-[12px] text-[var(--color-ink-muted)]">{totalWorkouts} тренировок</div>
              </div>
            </button>
          )}
```
→
```tsx
          {/* Тап по клиенту открывает карточку-шторку. */}
          <button
            onClick={() => setPreviewOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
          >
            <Avatar firstName={client.firstName} lastName={client.lastName} size={48} />
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-tight">{fullName(client.firstName, client.lastName)}</div>
              <div className="text-[12px] text-[var(--color-ink-muted)]">{totalWorkouts} тренировок</div>
            </div>
          </button>
```

Замена 5 — раскрыть условие `!isClient` для `ClientPreviewSheet` (строки 165-167):
```tsx
      {!isClient && (
        <ClientPreviewSheet client={client} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}
```
→
```tsx
      <ClientPreviewSheet client={client} open={previewOpen} onClose={() => setPreviewOpen(false)} />
```

- [ ] **Step 5: Убрать кнопку «Выйти» из `src/pages/TrainerPage.tsx`**

Замена 1 — импорт иконок (строка 3), убрать `LogOut`:
```tsx
import { Bell, ChevronRight, Instagram, LogOut, Mail, Pencil, Phone, Send, Settings, Share2 } from 'lucide-react';
```
→
```tsx
import { Bell, ChevronRight, Instagram, Mail, Pencil, Phone, Send, Settings, Share2 } from 'lucide-react';
```

Замена 2 — удалить блок кнопки «Выйти» целиком (строки 122-132):
```tsx
        <button
          onClick={async () => {
            if (!(await confirm('Выйти из аккаунта?', { confirmLabel: 'Выйти', danger: true }))) return;
            localStorage.removeItem('trener_auth');
            localStorage.removeItem('app_role');
            navigate('/', { replace: true });
          }}
          className="flex w-full items-center justify-center gap-2 py-2 text-[14px] font-semibold text-[var(--color-danger)]"
        >
          <LogOut size={16} /> Выйти
        </button>
```
→ удалить блок целиком.

После удаления `confirm` в `TrainerPage` больше не используется. Удалить строку объявления (строка 18):
```tsx
  const confirm = useConfirm();
```
и строку импорта (строка 6):
```tsx
import { useConfirm } from '../components/ConfirmProvider';
```
(`noUnusedLocals` выключен в tsconfig, но `useConfirm` создаёт лишний контекстный вызов — убираем для чистоты.)

- [ ] **Step 6: Переписать `src/App.tsx`**

Полностью заменить содержимое файла `trener-mobile/src/App.tsx` на:

```tsx
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomTabBar } from './components/BottomTabBar';
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
import { DevInspector } from './components/DevInspector';
import { TRAINER_BASE } from './lib/routes';

// Адреса, на которых виден нижний таб-бар (точное совпадение).
const TAB_PATHS = [`${TRAINER_BASE}/clients`, `${TRAINER_BASE}/exercises`];

export function App() {
  const location = useLocation();
  const showTabs = TAB_PATHS.includes(location.pathname);

  return (
    <div className="app-shell">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Routes>
          <Route path={`${TRAINER_BASE}/clients`} element={<ClientsPage />} />
          <Route path={`${TRAINER_BASE}/clients/new`} element={<ClientEditPage mode="create" />} />
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
          <Route path="*" element={<Navigate to={`${TRAINER_BASE}/clients`} replace />} />
        </Routes>
      </main>
      {showTabs && <BottomTabBar />}
      {import.meta.env.DEV && <DevInspector />}
    </div>
  );
}
```

- [ ] **Step 7: Удалить клиентские страницы**

```powershell
Remove-Item trener-mobile\src\pages\RoleSelectPage.tsx
Remove-Item trener-mobile\src\pages\LoginPage.tsx
Remove-Item trener-mobile\src\pages\RegisterPage.tsx
Remove-Item trener-mobile\src\pages\ClientProfilePage.tsx
```

- [ ] **Step 8: Очистить стартовые данные в `src/api/demo-seed.ts`**

Цель: оставить упражнения и шаблоны, убрать клиентов и занятия.

Замена 1 — удалить строку `SEED_TS` (строка 55):
```ts
const SEED_TS = '2026-01-10T09:00:00.000Z';
```
→ удалить строку.

Замена 2 — удалить функцию `seedClients` целиком (строки 58-102, от `function seedClients(): Client[] {` до её закрывающей `}`).

Замена 3 — удалить константу `RAW_SESSIONS` и функцию `seedSessions` целиком (строки 250-282, от `const RAW_SESSIONS = [` до закрывающей `}` функции `seedSessions`).

Замена 4 — переписать функцию `buildSeed` (строки 308-318):
```ts
export function buildSeed(): DemoStore {
  const exercises = seedExercises();
  return {
    clients: seedClients(),
    exercises,
    templates: seedTemplates(exercises),
    workouts: [],
    sessions: seedSessions(),
    trainer: seedTrainer(),
  };
}
```
→
```ts
export function buildSeed(): DemoStore {
  const exercises = seedExercises();
  return {
    clients: [],
    exercises,
    templates: seedTemplates(exercises),
    workouts: [],
    sessions: [],
    trainer: seedTrainer(),
  };
}
```

Импорт типов в строке 2 не трогать: `Client` и `Session` всё ещё используются в типах `DemoStore` и `DemoSession`.

- [ ] **Step 9: Проверить сборку**

```powershell
npm --prefix trener-mobile run build
```

Expected: `tsc -b` и `vite build` завершаются успешно, без ошибок про несуществующие модули `RoleSelectPage`/`LoginPage`/`RegisterPage`/`ClientProfilePage` или `CLIENT_BASE`/`DEMO_CLIENT_ID`.

Если `tsc` ругается на неиспользуемые импорты в `DevInspector.tsx` или других файлах — исправить указанный импорт и повторить сборку.

- [ ] **Step 10: Запустить дев-сервер и проверить вручную**

```powershell
npm --prefix trener-mobile run dev
```

Открыть `http://127.0.0.1:5173` в браузере (режим мобильного устройства в DevTools). Проверить:
- приложение открывается сразу на списке клиентов (адрес `/#/trainer/clients`), без экрана выбора роли и без логина;
- список клиентов пуст, есть кнопка добавить клиента;
- вкладка «Упражнения» показывает базу упражнений и шаблоны;
- добавить клиента → создать тренировку из шаблона → начать → завершить → она появляется в истории;
- ручной переход на `/#/client/workouts` редиректит на `/#/trainer/clients` (клиентских маршрутов нет).

Остановить дев-сервер (Ctrl+C).

- [ ] **Step 11: Commit**

```powershell
git add trener-mobile
git commit -m @'
feat: trener-mobile — только тренерская часть, без выбора роли и логина

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

## Task 3: Подключить Capacitor и Android-проект

Добавить Capacitor и сгенерировать нативный Android-проект.

**Files:**
- Create: `trener-mobile/capacitor.config.ts`
- Create: `trener-mobile/android/` (генерируется Capacitor)
- Modify: `trener-mobile/package.json` (зависимости и скрипты)
- Modify: `trener-mobile/index.html` (убрать мёртвую ссылку favicon)

- [ ] **Step 1: Убрать мёртвую ссылку favicon в `index.html`**

В `trener-mobile/index.html` удалить строку:
```html
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
```
Файл `vite.svg` в проекте отсутствует; в упаковке `file://` абсолютный путь даёт лишний 404. Иконку приложения задаёт Capacitor (Task 4).

- [ ] **Step 2: Установить зависимости Capacitor**

```powershell
npm --prefix trener-mobile install @capacitor/core @capacitor/cli @capacitor/android
```

Expected: пакеты установлены, в `package.json` появились `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.

- [ ] **Step 3: Создать `capacitor.config.ts`**

Создать файл `trener-mobile/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trener.mobile',
  appName: 'Тренер',
  webDir: 'dist',
};

export default config;
```

- [ ] **Step 4: Добавить скрипты сборки в `package.json`**

В `trener-mobile/package.json` в раздел `scripts` добавить:

```json
"cap:sync": "npm run build && cap sync",
"android:open": "cap open android",
"android:apk": "npm run build && cap sync && cd android && gradlew.bat assembleDebug"
```

- [ ] **Step 5: Собрать веб-часть**

```powershell
npm --prefix trener-mobile run build
```

Expected: `trener-mobile/dist/` создан.

- [ ] **Step 6: Добавить Android-платформу**

Команды `cap` читают `capacitor.config.ts` из текущего каталога — выполнять их из `trener-mobile`:

```powershell
cd trener-mobile
npx cap add android
cd ..
```

Expected: создаётся папка `trener-mobile/android/` с нативным проектом, внутри есть `trener-mobile/android/.gitignore` (Capacitor создаёт его сам — артефакты сборки не попадут в git).

- [ ] **Step 7: Синхронизировать веб-сборку в Android-проект**

```powershell
npm --prefix trener-mobile run cap:sync
```

(npm-скрипт `cap:sync` из Step 4 выполняется в каталоге пакета `trener-mobile` — рабочий каталог корректный.)

Expected: `npm run build` пересобирает `dist/`, затем `cap sync` копирует его в `android/app/src/main/assets/public`, команда завершается сообщением `sync finished`.

- [ ] **Step 8: Commit**

```powershell
git add trener-mobile
git commit -m @'
feat: подключить Capacitor и Android-проект к trener-mobile

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

## Task 4: Иконка, сплэш и сборка APK

Собрать debug-APK. Иконка приложения — опционально, если есть логотип.

**Files:**
- Modify: `trener-mobile/package.json` (dev-зависимость `@capacitor/assets`, опционально)
- Create: APK по пути `trener-mobile/android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 1: Проверить окружение сборки**

```powershell
java -version
$env:ANDROID_HOME
$env:ANDROID_SDK_ROOT
```

Expected: `java -version` показывает JDK 17 (или новее); `ANDROID_HOME` или `ANDROID_SDK_ROOT` указывает на установленный Android SDK.

Если JDK 17 или Android SDK отсутствуют — **остановиться здесь** и сообщить пользователю: для сборки APK нужно установить Android Studio (он ставит JDK и Android SDK), затем задать переменную окружения `ANDROID_HOME` на путь SDK. Проект уже готов к сборке — после установки SDK можно вернуться к Step 3.

- [ ] **Step 2: Сгенерировать иконку и сплэш (опционально)**

Если у пользователя есть PNG логотипа 1024×1024:

```powershell
npm --prefix trener-mobile install -D @capacitor/assets
New-Item -ItemType Directory -Force trener-mobile\assets
# поместить логотип в trener-mobile\assets\icon-only.png (1024x1024)
# и trener-mobile\assets\splash.png (2732x2732)
npm --prefix trener-mobile exec capacitor-assets generate -- --android
```

Если логотипа нет — пропустить этот шаг: Capacitor использует иконку по умолчанию, кастомную можно добавить позже.

- [ ] **Step 3: Собрать debug-APK**

```powershell
npm --prefix trener-mobile run build
npm --prefix trener-mobile exec cap sync
cd trener-mobile\android
.\gradlew.bat assembleDebug
cd ..\..
```

Expected: Gradle скачивает зависимости (нужен интернет при первом запуске) и завершается сообщением `BUILD SUCCESSFUL`. APK появляется по пути `trener-mobile\android\app\build\outputs\apk\debug\app-debug.apk`.

- [ ] **Step 4: Проверить, что APK создан**

```powershell
Get-Item trener-mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

Expected: файл существует, размер несколько МБ.

- [ ] **Step 5: Проверить APK на устройстве**

Установить `app-debug.apk` на Android-устройство или эмулятор (на устройстве включить «Установка из неизвестных источников»). Проверить:
- приложение открывается на списке клиентов, без выбора роли и логина;
- база упражнений и шаблоны на месте, клиентов нет;
- пройти сценарий: добавить клиента → создать тренировку → провести с таймером отдыха → завершить → история;
- закрыть и снова открыть приложение — добавленные данные сохранились.

- [ ] **Step 6: Обновить README проекта**

Заменить содержимое `trener-mobile/README.md` на описание Android-проекта: что это тренерское-только офлайн-приложение, как собрать APK (`npm run android:apk`), требования (JDK 17, Android SDK), где лежит готовый APK. Убрать из README упоминания GitHub Pages и клиентской части, унаследованные от `github_demo`.

- [ ] **Step 7: Commit**

```powershell
git add trener-mobile
git commit -m @'
feat: сборка debug-APK trener-mobile + README

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

---

## Примечания по выполнению

- **Артефакты сборки.** Корневой `.gitignore` уже игнорирует `node_modules/`, `dist/`, `build/`, `*.tsbuildinfo` — это покрывает `trener-mobile/`. Папка `android/` коммитится (нативный проект), её артефакты сборки игнорируются через `android/.gitignore`, создаваемый Capacitor.
- **`github_demo` не трогаем.** Все изменения — только внутри `trener-mobile/`.
- **Зависимость задач.** Task 4 Step 3+ требует Android SDK. Если его нет, Task 1–3 всё равно дают готовый к сборке проект — APK добирается после установки SDK.
