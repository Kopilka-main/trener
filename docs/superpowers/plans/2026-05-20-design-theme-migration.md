# Design Theme Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести веб-приложение «Trener» на палитру из новых HTML-макетов и добавить ручной переключатель светлой/тёмной темы в профиле тренера и клиента.

**Architecture:** Все цвета — через CSS-переменные внутри Tailwind v4 `@theme`. Светлая тема — значения по умолчанию, тёмная — селектор `[data-theme="dark"]` на `<html>`. Текущий паттерн «`bg-ink` + белый текст» (CTA-кнопки, активные чипы, бейджи) массово мигрируется на `bg-accent` (лайм `#D4FF3D`) + `text-[var(--color-accent-on)]` (чёрный) — это безопасно для обеих тем, так как лайм с чёрным текстом одинаково читаем. Переключатель темы — крошечный модуль на `localStorage` + хук на `useSyncExternalStore`, инициализация ДО рендера React (без вспышки темы).

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind CSS v4 + lucide-react. Тестового раннера в `web/` нет — верификация ручная через `npm run dev` в браузере (мобильный viewport).

**Спека:** [docs/superpowers/specs/2026-05-20-design-theme-migration.md](../specs/2026-05-20-design-theme-migration.md)

---

## Соглашения по верификации

В этом проекте нет автотестов фронтенда — все проверки делаются вручную в браузере. Каждая задача, меняющая UI, заканчивается явной ручной проверкой по чек-листу. Если `npm run dev` ещё не запущен:

```bash
npm --prefix web run dev
```

И открыть `http://localhost:5173` в DevTools → Toggle device toolbar → iPhone 14 Pro (393×852).

---

## Task 1: Расширить дизайн-токены и добавить тёмную тему

**Files:**
- Modify: `web/src/index.css` (полностью переписать)

- [ ] **Step 1: Перезаписать `web/src/index.css`**

Содержимое файла целиком:

```css
@import 'tailwindcss';

@theme {
  /* layout */
  --color-canvas: #d8d6ce;      /* «обои» вокруг моб-каркаса */
  --color-bg: #eeeee8;          /* фон приложения */
  --color-card: #ffffff;        /* приподнятые карточки */
  --color-chip: #e8e6de;        /* мелкие плашки/чипы */
  --color-line: #dcdad2;        /* разделители, бордеры */

  /* текст */
  --color-ink: #0b0c10;         /* основной */
  --color-ink-muted: #5e626b;   /* вторичный (подписи) */

  /* акценты */
  --color-accent: #d4ff3d;      /* primary CTA — лайм */
  --color-accent-on: #0b0c10;   /* текст на лайме (всегда чёрный) */
  --color-accent-2: #5c7a0e;    /* secondary — олива */

  /* семантика */
  --color-success: #5c7a0e;
  --color-success-soft: #e8efd4;
  --color-danger: #e04a2e;
  --color-danger-soft: #fbe3dc;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
}

[data-theme='dark'] {
  --color-canvas: #000000;
  --color-bg: #0b0c10;
  --color-card: #15171d;
  --color-chip: #1f2128;
  --color-line: #2a2d36;
  --color-ink: #ffffff;
  --color-ink-muted: #9a9da6;
  --color-success-soft: #1e2818;
  --color-danger-soft: #3a1c15;
  /* accent, accent-on, accent-2, success, danger — не переопределяются */
}

html, body, #root {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-canvas);
  color: var(--color-ink);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: contain;
}

input, textarea, select {
  font: inherit;
  color: inherit;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

/* Mobile container — каркас как на эскизах */
.app-shell {
  width: 100%;
  max-width: 430px;
  height: 100vh;
  height: 100dvh;
  margin-inline: auto;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Hide native number input arrows */
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type='number'] { -moz-appearance: textfield; }

/* Hide scrollbars — на мобильных Safari/Chrome они и так overlay */
html, body { scrollbar-width: none; }
html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
.app-shell *::-webkit-scrollbar { display: none; width: 0; height: 0; }
.app-shell * { scrollbar-width: none; }
```

- [ ] **Step 2: Запустить dev-сервер (если не запущен) и убедиться, что сборка не падает**

```bash
npm --prefix web run dev
```

Открыть `http://localhost:5173` в DevTools (iPhone 14 Pro). Ожидается:
- Приложение открывается без ошибок в консоли.
- Общий фон стал чуть светлее/чище (был `#f4ecdf` тёплый бежевый → стал `#eeeee8` нейтральный кремовый).
- «Обои» вокруг каркаса (видны при ширине > 430px) — тоже изменились.
- Активные CTA-кнопки **пока выглядят чёрными** (потому что они ещё используют `bg-ink`, который теперь `#0b0c10`) — это ожидаемо, пофиксим в Task 8.

- [ ] **Step 3: Коммит**

```bash
git add web/src/index.css
git commit -m "feat(theme): расширить токены палитры + тёмная тема через [data-theme=dark]"
```

---

## Task 2: Модуль управления темой (без React)

**Files:**
- Create: `web/src/lib/theme.ts`

- [ ] **Step 1: Создать `web/src/lib/theme.ts`**

```ts
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app_theme';
const ATTR = 'data-theme';

export function getStoredTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute(ATTR, theme);
  window.dispatchEvent(new Event('app:theme-changed'));
}

export function applyStoredTheme(): void {
  document.documentElement.setAttribute(ATTR, getStoredTheme());
}
```

- [ ] **Step 2: Проверить, что TS-компиляция не падает**

```bash
npm --prefix web run build
```

Ожидается: сборка успешна без ошибок (хотя dev-сервер тоже подойдёт — Vite покажет ошибку TS в браузере).

- [ ] **Step 3: Коммит**

```bash
git add web/src/lib/theme.ts
git commit -m "feat(theme): модуль theme.ts (get/set/apply, localStorage + custom event)"
```

---

## Task 3: React-хук `useTheme` в том же модуле

**Files:**
- Modify: `web/src/lib/theme.ts`

- [ ] **Step 1: Добавить хук в конец файла `web/src/lib/theme.ts`**

```ts
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('app:theme-changed', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('app:theme-changed', callback);
    window.removeEventListener('storage', callback);
  };
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const theme = useSyncExternalStore(
    subscribe,
    () => getStoredTheme(),
    () => 'light' as Theme,
  );
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}
```

Важно: `useSyncExternalStore` server snapshot возвращает `'light'` — для SSR-безопасности (на момент гидрации тема может быть не известна). У нас Vite SPA, гидрация не используется, но это всё равно корректно.

- [ ] **Step 2: Запустить сборку**

```bash
npm --prefix web run build
```

Ожидается: успешно.

- [ ] **Step 3: Коммит**

```bash
git add web/src/lib/theme.ts
git commit -m "feat(theme): хук useTheme (useSyncExternalStore + слушатель storage)"
```

---

## Task 4: Bootstrap темы до рендера React

**Files:**
- Modify: `web/src/main.tsx`

- [ ] **Step 1: Открыть `web/src/main.tsx` и добавить вызов `applyStoredTheme()` ДО `createRoot`**

Изменение: после строки `import './index.css';` (строка 7) добавить две строки.

Старое (строки 7-8):
```ts
import './index.css';

const queryClient = new QueryClient({
```

Новое:
```ts
import './index.css';
import { applyStoredTheme } from './lib/theme';

applyStoredTheme();

const queryClient = new QueryClient({
```

- [ ] **Step 2: Холодная проверка анти-вспышки**

В DevTools Application → Local Storage → выставить `app_theme = dark` вручную. Перезагрузить страницу (Cmd/Ctrl+R). Ожидается:
- Никакой «вспышки» светлой темы при загрузке.
- Страница сразу рендерится в тёмной теме (фон `#0b0c10`, текст белый).
- В консоли нет ошибок.

После проверки — вернуть значение `app_theme = light` (или удалить ключ).

- [ ] **Step 3: Коммит**

```bash
git add web/src/main.tsx
git commit -m "feat(theme): применять сохранённую тему до рендера (без вспышки)"
```

---

## Task 5: Компонент `<ThemeToggle />`

**Files:**
- Create: `web/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Создать `web/src/components/ThemeToggle.tsx`**

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="flex items-center gap-2 rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink)]"
    >
      {isDark ? <Moon size={14} /> : <Sun size={14} />}
      <span>{isDark ? 'Тёмная' : 'Светлая'}</span>
    </button>
  );
}
```

- [ ] **Step 2: Проверить сборку**

```bash
npm --prefix web run build
```

Ожидается: успешно.

- [ ] **Step 3: Коммит**

```bash
git add web/src/components/ThemeToggle.tsx
git commit -m "feat(theme): компонент ThemeToggle с иконками Sun/Moon"
```

---

## Task 6: Встроить `<ThemeToggle />` в профиль тренера

**Files:**
- Modify: `web/src/pages/TrainerPage.tsx`

- [ ] **Step 1: Импортировать компонент**

В блоке импортов (строки 1-9 файла `web/src/pages/TrainerPage.tsx`) добавить строку:

```ts
import { ThemeToggle } from '../components/ThemeToggle';
```

- [ ] **Step 2: Добавить строку настройки «Тема» в группу с настройками**

Найти в `TrainerPage.tsx` блок настроек со строками 118-122:

```tsx
          <SettingRow icon={PieChart} label="Бухгалтерия" onClick={() => navigate('/trainer/accounting')} />
          <SettingRow icon={Building2} label="Залы" onClick={() => navigate('/trainer/gyms')} />
          <SettingRow icon={Settings} label="Настройки приложения" />
          <SettingRow icon={Bell} label="Уведомления" last />
        </div>
```

Заменить на:

```tsx
          <SettingRow icon={PieChart} label="Бухгалтерия" onClick={() => navigate('/trainer/accounting')} />
          <SettingRow icon={Building2} label="Залы" onClick={() => navigate('/trainer/gyms')} />
          <div className="flex w-full items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5">
            <Settings size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
            <span className="flex-1 text-[14px] font-medium">Тема</span>
            <ThemeToggle />
          </div>
          <SettingRow icon={Bell} label="Уведомления" last />
        </div>
```

Заметь: строка «Настройки приложения» (которая была заглушкой `alert('Раздел в разработке')`) заменяется строкой «Тема» с реальным переключателем. Это намеренно — экономит вертикальное место и убирает мёртвую заглушку.

- [ ] **Step 3: Ручная проверка**

В DevTools открыть `/trainer/profile` (если кнопка-аватар в шапке главной → профиль). Ожидается:
- В блоке настроек строка «Тема» с переключателем-пилюлей справа (иконка солнца + слово «Светлая»).
- Клик по пилюле → переключается на «Тёмная», вся страница перекрашивается мгновенно.
- Перезагрузка страницы (`Cmd/Ctrl+R`) — тема сохраняется.
- Перейти на главную → она тоже в тёмной теме. Вернуться в профиль → переключить обратно.

- [ ] **Step 4: Коммит**

```bash
git add web/src/pages/TrainerPage.tsx
git commit -m "feat(theme): переключатель темы в карточке тренера"
```

---

## Task 7: Встроить `<ThemeToggle />` в профиль клиента

**Files:**
- Modify: `web/src/pages/ClientProfilePage.tsx`

- [ ] **Step 1: Открыть `web/src/pages/ClientProfilePage.tsx` и изучить структуру файла**

Прочитать файл целиком. Найти секцию с настройками/действиями в конце страницы (структура аналогична `TrainerPage.tsx` — обычно блок `Settings` / `LogOut` ближе к концу JSX).

- [ ] **Step 2: Добавить импорт**

```ts
import { ThemeToggle } from '../components/ThemeToggle';
```

- [ ] **Step 3: Вставить строку настройки «Тема»**

Найти в JSX последний блок-секцию с `rounded-2xl` (обычно перед кнопкой «Выйти» или в области настроек). Вставить туда новую строку с тем же паттерном, что и в Task 6 Step 2:

```tsx
<div className="overflow-hidden rounded-2xl">
  <div className="flex w-full items-center gap-3 bg-[var(--color-card)] px-4 py-3.5">
    <Settings size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
    <span className="flex-1 text-[14px] font-medium">Тема</span>
    <ThemeToggle />
  </div>
</div>
```

Если в файле уже есть подобный контейнер с настройками — вставлять туда новой строкой, не оборачивая в новый `<div className="rounded-2xl">`. Если такого контейнера нет — обернуть как в примере выше и разместить **прямо перед** кнопкой «Выйти».

Импорт `Settings` иконки уже должен быть в файле (см. строку 2 — `lucide-react`). Если иконки `Settings` нет в импортах — добавить её.

- [ ] **Step 4: Ручная проверка**

В DevTools перейти в режим клиента (RoleSelectPage → «Я клиент» или localStorage `app_role = client`). Открыть `/client/profile`. Ожидается:
- Строка «Тема» с пилюлей справа.
- Переключение работает мгновенно, перекрашивает все вкладки клиента (тренировки, упражнения, чат).

- [ ] **Step 5: Коммит**

```bash
git add web/src/pages/ClientProfilePage.tsx
git commit -m "feat(theme): переключатель темы в профиле клиента"
```

---

## Task 8: Миграция `bg-ink` + белый текст → `bg-accent` + `text-accent-on`

В коде есть **33 случая** паттерна «`bg-ink` (= тёмный фон) + светлый текст». В тёмной теме `--color-ink` становится белым → текст пропадёт. Решение спеки — мигрировать все такие места на акцент: фон `bg-accent` (лайм) + текст `text-[var(--color-accent-on)]` (всегда чёрный).

Это безопасно для **обеих** тем, так как `--color-accent` и `--color-accent-on` НЕ переопределяются в тёмной теме.

**Files:**
- Modify: `web/src/components/BottomTabBar.tsx`
- Modify: `web/src/components/Checkbox.tsx`
- Modify: `web/src/components/Chips.tsx`
- Modify: `web/src/pages/AccountingPage.tsx`
- Modify: `web/src/pages/ActiveWorkoutPage.tsx`
- Modify: `web/src/pages/CalendarPage.tsx`
- Modify: `web/src/pages/ChatListPage.tsx`
- Modify: `web/src/pages/ChatPage.tsx`
- Modify: `web/src/pages/ClientCardPage.tsx`
- Modify: `web/src/pages/ClientEditPage.tsx`
- Modify: `web/src/pages/ClientWorkoutsPage.tsx`
- Modify: `web/src/pages/GymsPage.tsx`
- Modify: `web/src/pages/KnowledgeBasePage.tsx`
- Modify: `web/src/pages/LoginPage.tsx`
- Modify: `web/src/pages/RegisterPage.tsx`
- Modify: `web/src/pages/RoleSelectPage.tsx`
- Modify: `web/src/pages/WorkoutBuilderPage.tsx`
- Modify: `web/src/pages/WorkoutSummaryPage.tsx`

### 8.1. Подзадачи

Каждая подзадача — отдельная замена, маленькая и проверяемая. Везде используем замену **строкой**, а не глобальный sed — чтобы не задеть служебные места (`DevInspector.tsx` — НЕ трогаем, это dev-only).

- [ ] **Step 1: BottomTabBar — бейдж непрочитанных**

Файл: `web/src/components/BottomTabBar.tsx`, строки 36-41.

Старое:
```tsx
<span
  className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold"
  style={{ color: '#ffffff' }}
>
  {unread.unread}
</span>
```

Новое:
```tsx
<span
  className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-[var(--color-accent-on)]"
>
  {unread.unread}
</span>
```

- [ ] **Step 2: Checkbox**

Файл: `web/src/components/Checkbox.tsx`, строки 7-10.

Открыть файл, найти:
```tsx
checked ? 'border-ink bg-ink' : 'border-[var(--color-line)]'
```
Заменить на:
```tsx
checked ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-line)]'
```

И ниже:
```tsx
{checked && <Check size={13} strokeWidth={3} style={{ color: '#ffffff' }} />}
```
Заменить на:
```tsx
{checked && <Check size={13} strokeWidth={3} style={{ color: 'var(--color-accent-on)' }} />}
```

- [ ] **Step 3: Chips**

Файл: `web/src/components/Chips.tsx`, строки 22-25.

Найти:
```tsx
active ? 'bg-ink' : 'bg-[var(--color-chip)]'
```
Заменить на:
```tsx
active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'
```

И:
```tsx
style={{ color: active ? '#ffffff' : '#1a1a1a' }}
```
Заменить на:
```tsx
style={{ color: active ? 'var(--color-accent-on)' : 'var(--color-ink)' }}
```

- [ ] **Step 4: AccountingPage**

Файл: `web/src/pages/AccountingPage.tsx`, две правки.

Строка 270 — чип категории:
```tsx
className={`rounded-full px-3 py-1.5 text-[12px] ${category === c ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
```
→
```tsx
className={`rounded-full px-3 py-1.5 text-[12px] ${category === c ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'}`}
```

Строка 271 (рядом, в `style`):
```tsx
style={category === c ? { color: '#ffffff' } : undefined}
```
→
```tsx
style={category === c ? { color: 'var(--color-accent-on)' } : undefined}
```

Строка 311 — кнопка действия:
```tsx
className="w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold disabled:opacity-50"
```
→
```tsx
className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
```

Строка 312:
```tsx
style={{ color: '#ffffff' }}
```
Удалить эту строку (цвет уже на classname).

- [ ] **Step 5: ActiveWorkoutPage**

Файл: `web/src/pages/ActiveWorkoutPage.tsx`, строка 73.

Найти:
```tsx
<div className="rounded-2xl bg-ink p-4 text-white">
```
Заменить на:
```tsx
<div className="rounded-2xl bg-[var(--color-accent)] p-4 text-[var(--color-accent-on)]">
```

- [ ] **Step 6: CalendarPage — все 7 случаев**

Файл: `web/src/pages/CalendarPage.tsx`.

Строка 123-124 (кнопка фильтра):
```tsx
className="flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-accent-on)]"
```
И удалить `style={{ color: '#ffffff' }}` на 124.

Строка 230-231 (вкладка периода):
```tsx
className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${active ? 'bg-ink' : 'text-[var(--color-ink-muted)]'}`}
...
style={active ? { color: '#ffffff' } : undefined}
```
→
```tsx
className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'text-[var(--color-ink-muted)]'}`}
```
И удалить `style={active ? { color: '#ffffff' } : undefined}` на 231.

Строка 487-488 (today-метка в сетке):
```tsx
className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${today ? 'bg-ink' : ''}`}
...
style={today ? { color: '#ffffff' } : undefined}
```
→
```tsx
className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${today ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : ''}`}
```
И удалить `style={today ? { color: '#ffffff' } : undefined}` на 488.

Строка 779-780 (вкладка длительности):
```tsx
className={`flex-1 rounded-2xl py-2.5 text-[13px] font-medium ${duration === d ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
...
style={duration === d ? { color: '#ffffff' } : undefined}
```
→
```tsx
className={`flex-1 rounded-2xl py-2.5 text-[13px] font-medium ${duration === d ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
```
Удалить `style` на 780.

Строка 794-795 (вкладка локации):
```tsx
className={`rounded-full px-4 py-2 text-[13px] font-medium ${location === loc ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
...
style={location === loc ? { color: '#ffffff' } : undefined}
```
→
```tsx
className={`rounded-full px-4 py-2 text-[13px] font-medium ${location === loc ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
```
Удалить `style` на 795.

Строка 823-824 (главная кнопка):
```tsx
className="w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-[15px] font-semibold text-[var(--color-accent-on)]"
```
Удалить `style` на 824.

**ВАЖНО:** строки 635 и 652 (`backgroundColor: loadColor(n)`) **не трогаем** — это предметная шкала нагрузки.

- [ ] **Step 7: ChatListPage**

Файл: `web/src/pages/ChatListPage.tsx`.

Строка 95:
```tsx
<span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold" style={{ color: '#ffffff' }}>
```
→
```tsx
<span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] font-bold text-[var(--color-accent-on)]">
```

**Строку 51 НЕ трогать.** Там бейдж количества алертов с фоном `var(--color-danger)` (красный) или `#d9912b` (золотой/pending) — это статусные цвета, белый текст на них уместен в обеих темах.

- [ ] **Step 8: ChatPage**

Файл: `web/src/pages/ChatPage.tsx`.

Строка 121-122 (Send-кнопка):
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-ink disabled:opacity-30"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-on)] disabled:opacity-30"
```
Удалить `style`.

Строки 148-150 — пузырь сообщения «моё»:
```tsx
mine ? 'bg-ink' : 'bg-[var(--color-card)]'
...
style={mine ? { color: '#ffffff' } : undefined}
```
→
```tsx
mine ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-card)]'
```
Удалить `style={mine ? ... : undefined}`.

- [ ] **Step 9: ClientCardPage**

Файл: `web/src/pages/ClientCardPage.tsx`.

Строка 66-67 (главная кнопка вверху):
```tsx
className="flex w-full items-center gap-3 rounded-2xl bg-ink p-4 text-left"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)]"
```
Удалить `style`.

Строка 385-386 (кнопка действия):
```tsx
className="w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold disabled:opacity-50"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
```
Удалить `style`.

Строка 490 (`bg-ink` на progress-bar):
```tsx
className="h-full bg-ink"
```
→
```tsx
className="h-full bg-[var(--color-accent-2)]"
```
Объяснение: это полоса заполнения прогресса — секундарный акцент (олива) подходит лучше, чем лайм-CTA. Текста на ней нет, поэтому `accent-on` не нужен.

- [ ] **Step 10: ClientEditPage**

Файл: `web/src/pages/ClientEditPage.tsx`, строки 112-113.

```tsx
className="shrink-0 rounded-2xl bg-ink px-5 text-[13px] font-semibold disabled:opacity-40"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="shrink-0 rounded-2xl bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-accent-on)] disabled:opacity-40"
```
Удалить `style`.

- [ ] **Step 11: ClientWorkoutsPage**

Файл: `web/src/pages/ClientWorkoutsPage.tsx`.

Строка 126:
```tsx
className="mt-3 w-full rounded-2xl bg-ink py-2.5 text-[13px] font-semibold"
```
→
```tsx
className="mt-3 w-full rounded-2xl bg-[var(--color-accent)] py-2.5 text-[13px] font-semibold text-[var(--color-accent-on)]"
```

Строка 268:
```tsx
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
```
→
```tsx
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] py-3.5 text-[15px] font-semibold text-[var(--color-accent-on)]"
```

Строка 332:
```tsx
<button onClick={onPickTemplate} className="mt-4 w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold" style={{ color: '#ffffff' }}>
```
→
```tsx
<button onClick={onPickTemplate} className="mt-4 w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)]">
```

Строка 406:
```tsx
className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${active ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
```
→
```tsx
className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
```

- [ ] **Step 12: GymsPage**

Файл: `web/src/pages/GymsPage.tsx`, строки 108-109.

```tsx
className="w-full rounded-2xl bg-ink py-3 text-[14px] font-semibold disabled:opacity-50"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
```
Удалить `style`.

- [ ] **Step 13: KnowledgeBasePage**

Файл: `web/src/pages/KnowledgeBasePage.tsx`.

Строка 111 (плитка):
```tsx
className={`relative flex h-[112px] flex-col items-start justify-end rounded-2xl p-3 text-left ${dark ? 'bg-ink' : 'bg-[var(--color-card)]'}`}
```
→
```tsx
className={`relative flex h-[112px] flex-col items-start justify-end rounded-2xl p-3 text-left ${dark ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-card)]'}`}
```

Строки 112 и 117 (текст плитки):
```tsx
style={{ color: dark ? '#ffffff' : '#1a1a1a' }}
```
→ обе:
```tsx
style={{ color: dark ? 'var(--color-accent-on)' : 'var(--color-ink)' }}
```

Строка 139 (чип категории):
```tsx
className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${active ? 'bg-ink' : 'bg-[var(--color-chip)]'}`}
```
→
```tsx
className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-chip)]'}`}
```

Строка 140:
```tsx
style={{ color: active ? '#ffffff' : '#1a1a1a' }}
```
→
```tsx
style={{ color: active ? 'var(--color-accent-on)' : 'var(--color-ink)' }}
```

- [ ] **Step 14: LoginPage и RegisterPage**

Файлы: `web/src/pages/LoginPage.tsx` (строки 56-57), `web/src/pages/RegisterPage.tsx` (строки 59-60).

Оба файла — одинаковая правка кнопки submit:
```tsx
className="mt-6 w-full rounded-2xl bg-ink py-3.5 text-[15px] font-semibold"
...
style={{ color: '#ffffff' }}
```
→
```tsx
className="mt-6 w-full rounded-2xl bg-[var(--color-accent)] py-3.5 text-[15px] font-semibold text-[var(--color-accent-on)]"
```
Удалить `style`.

- [ ] **Step 15: RoleSelectPage**

Файл: `web/src/pages/RoleSelectPage.tsx`, строка 28.

```tsx
className="flex w-full items-center gap-4 rounded-2xl bg-ink p-4 text-left"
```
→
```tsx
className="flex w-full items-center gap-4 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)]"
```

Если рядом есть `style={{ color: '#ffffff' }}` — удалить.

- [ ] **Step 16: WorkoutBuilderPage**

Файл: `web/src/pages/WorkoutBuilderPage.tsx`, строки 335 и 419 (чекбоксы выбранных элементов):

Строка 335:
```tsx
<div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${picked ? 'bg-ink text-white' : 'bg-[var(--color-chip)]'}`}>
```
→
```tsx
<div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${picked ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}>
```

Строка 419 — аналогично:
```tsx
<div className={`flex h-5 w-5 items-center justify-center rounded ${isPicked ? 'bg-ink text-white' : 'bg-[var(--color-chip)]'}`}>
```
→
```tsx
<div className={`flex h-5 w-5 items-center justify-center rounded ${isPicked ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}>
```

- [ ] **Step 17: WorkoutSummaryPage**

Файл: `web/src/pages/WorkoutSummaryPage.tsx`.

Строка 71 (RPE-выбор):
```tsx
className={`rounded-2xl py-4 text-center ${active ? 'bg-ink text-white' : 'bg-[var(--color-card)]'}`}
```
→
```tsx
className={`rounded-2xl py-4 text-center ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-card)]'}`}
```

Строка 81:
```tsx
<button onClick={save} className="mt-2 w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold" style={{ color: '#ffffff' }}>
```
→
```tsx
<button onClick={save} className="mt-2 w-full rounded-2xl bg-[var(--color-accent)] py-4 text-[15px] font-semibold text-[var(--color-accent-on)]">
```

- [ ] **Step 18: ClientsPage — точечная правка**

Файл: `web/src/pages/ClientsPage.tsx`, строка 45.

```tsx
style={{ background: '#1a1a1a', color: '#ffffff' }}
```
→
```tsx
style={{ background: 'var(--color-accent)', color: 'var(--color-accent-on)' }}
```

(Тут было `style={{background: '#1a1a1a'}}` — фактически тот же чёрный CTA. В тёмной теме он стал бы белым и слипся с фоном. Мигрируем на лайм.)

- [ ] **Step 19: ConfirmProvider — модальная кнопка**

Файл: `web/src/components/ConfirmProvider.tsx`, строка 49.

```tsx
style={{ background: pending.danger ? 'var(--color-danger)' : '#1a1a1a', color: '#ffffff' }}
```
→
```tsx
style={{
  background: pending.danger ? 'var(--color-danger)' : 'var(--color-accent)',
  color: pending.danger ? '#ffffff' : 'var(--color-accent-on)',
}}
```

(Для danger-кнопки белый текст на красном остаётся; для обычной — лайм с чёрным.)

- [ ] **Step 20: AlphaIndex — алфавитный индекс**

Файл: `web/src/components/AlphaIndex.tsx`, строка 24.

```tsx
color: enabled ? '#1a1a1a' : '#bfb8a8',
```
→
```tsx
color: enabled ? 'var(--color-ink)' : 'var(--color-ink-muted)',
```

(Это не CTA, а буква-индикатор; для enabled нужен основной текст, для disabled — приглушённый.)

- [ ] **Step 21: Скриншот-проверка после миграции — обе темы**

Запустить (если не запущен): `npm --prefix web run dev`. Открыть DevTools (iPhone 14 Pro 393×852).

**В светлой теме** (по умолчанию) пройти по экранам:
- `/trainer/home` → проверить кнопки/чипы.
- `/trainer/clients` → CTA «Добавить клиента» лаймовая.
- `/trainer/clients/:id` (открыть клиента) → главная CTA лаймовая, прогресс — оливковая полоса.
- `/trainer/calendar` → переключение день/неделя/месяц лаймовое; «Сегодня» лаймовый круг.
- `/trainer/chat/:id` → мои сообщения лаймовые, кнопка Send лаймовая.
- `/trainer/accounting` → выбранный чип категории и кнопка «Добавить» лаймовые.
- `/trainer/gyms` → CTA лаймовая.
- `/trainer/exercises` (KnowledgeBase) → тёмные плитки заменились лаймовыми; активный чип категории лаймовый.
- Профиль тренера → тоггл темы переключает.

Переключить тему в тёмную, повторить тот же обход. Проверить:
- Текст не пропадает нигде.
- Лаймовые CTA остаются лаймовыми (не меняются).
- Карточки `bg-card` стали тёмными (`#15171d`), приподнятыми над фоном.
- Бейджи `bg-accent` (бейдж непрочитанных в TabBar) — лайм с чёрным.

**В клиентском режиме** (выйти из тренера, выбрать «Я клиент»):
- `/client/workouts` → CTA «Начать тренировку» лаймовая.
- Активная тренировка → блок «Текущая» лаймовый с чёрным текстом.
- Итоги — RPE и «Сохранить» лаймовые.
- Профиль → тоггл темы переключает.

- [ ] **Step 22: Коммит**

```bash
git add web/src/components/BottomTabBar.tsx web/src/components/Checkbox.tsx web/src/components/Chips.tsx \
  web/src/components/AlphaIndex.tsx web/src/components/ConfirmProvider.tsx \
  web/src/pages/AccountingPage.tsx web/src/pages/ActiveWorkoutPage.tsx web/src/pages/CalendarPage.tsx \
  web/src/pages/ChatListPage.tsx web/src/pages/ChatPage.tsx web/src/pages/ClientCardPage.tsx \
  web/src/pages/ClientEditPage.tsx web/src/pages/ClientWorkoutsPage.tsx web/src/pages/ClientsPage.tsx \
  web/src/pages/GymsPage.tsx web/src/pages/KnowledgeBasePage.tsx web/src/pages/LoginPage.tsx \
  web/src/pages/RegisterPage.tsx web/src/pages/RoleSelectPage.tsx web/src/pages/WorkoutBuilderPage.tsx \
  web/src/pages/WorkoutSummaryPage.tsx
git commit -m "feat(theme): мигрировать CTA/чипы/бейджи с bg-ink на лаймовый accent"
```

---

## Task 9: Финальная сквозная проверка

**Files:** нет правок — только проверка.

- [ ] **Step 1: Полная сборка**

```bash
npm --prefix web run build
```

Ожидается: успешно, без TypeScript-ошибок.

- [ ] **Step 2: Чек-лист холодных загрузок**

Закрыть и открыть `http://localhost:5173` несколько раз с разными значениями `localStorage.app_theme`:

1. Удалить ключ → загрузка в светлой (дефолт), без вспышки.
2. `app_theme = 'dark'` → загрузка сразу тёмная, без вспышки светлой.
3. `app_theme = 'light'` → загрузка светлая.
4. Открыть две вкладки. В одной переключить тему → другая **не** обновится автоматически (это ОК, мы слушаем `storage`-событие, но оно срабатывает только при изменении из ДРУГОЙ вкладки; в этой же вкладке кастомное `app:theme-changed` уже обновило DOM).
   Проверить наоборот: открыть вкладку А, в DevTools во вкладке Б руками поменять `localStorage` и затем триггернуть `dispatchEvent(new StorageEvent('storage'))` — обновится во вкладке А.

- [ ] **Step 3: Контраст-аудит вручную**

Открыть `/trainer/home` в **тёмной** теме. Через DevTools → Inspect на блоках с `text-ink-muted` (подписи под именами клиентов, лейблы) — убедиться, что текст читаемый. Если какие-то места выглядят слишком тускло — записать в Issue, но **в этом плане не правим** (см. out of scope в спеке).

- [ ] **Step 4: Финальный коммит (если были мелкие правки)**

Если в ходе финальной проверки нашлись мелкие огрехи — поправить и закоммитить с сообщением `fix(theme): <конкретика>`. Если всё ок — задача завершена без дополнительного коммита.

---

## Сводка коммитов плана

После выполнения плана в истории должны появиться примерно такие коммиты:

1. `feat(theme): расширить токены палитры + тёмная тема через [data-theme=dark]`
2. `feat(theme): модуль theme.ts (get/set/apply, localStorage + custom event)`
3. `feat(theme): хук useTheme (useSyncExternalStore + слушатель storage)`
4. `feat(theme): применять сохранённую тему до рендера (без вспышки)`
5. `feat(theme): компонент ThemeToggle с иконками Sun/Moon`
6. `feat(theme): переключатель темы в карточке тренера`
7. `feat(theme): переключатель темы в профиле клиента`
8. `feat(theme): мигрировать CTA/чипы/бейджи с bg-ink на лаймовый accent`

---

## Что НЕ входит в этот план (см. out of scope спеки)

- Адаптация палитры аватаров (`Avatar.tsx`) под тёмную тему.
- Перерисовка layout/композиции.
- Авто-режим темы по `prefers-color-scheme`.
- `DevInspector.tsx` — служебный компонент разработки, его hardcoded цвета не трогаем.
- Статусные цвета (`loadColor()`, `APPROVED_BLUE`, `READ_BLUE`, золотые тона pending) — остаются как есть, не зависят от темы.
