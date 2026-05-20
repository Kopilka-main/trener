# Миграция темы оформления: «Trener» → новая палитра + dark/light

**Дата:** 2026-05-20
**Источник вдохновения:** свежие HTML-макеты в корне репозитория — `_ _ _ _ _ PR.html`, `_ _ _ _ _ PR (1).html`, `_ _ _ _ _.html`, `_ _ _ _ _ (1).html`, `_ _ 3-_ _.html`, `_ _ 3-_ _ (1).html` (Figma-экспорт от 2026-05-20).

## 1. Цель

Полностью сменить визуальную тему веб-приложения на палитру из новых макетов и добавить поддержку **двух тем** (светлая по умолчанию + тёмная) с ручным переключателем в профиле пользователя. Композиция экранов и компоненты не переделываются — только цвета, токены и связанная инфраструктура переключения.

## 2. Палитра (извлечена из макетов)

Подсчёт `rgb(...)`-вхождений в HTML-макетах:

| Цвет | HEX | Роль |
| --- | --- | --- |
| Почти-чёрный | `#0B0C10` | основной фон (тёмная тема) / основной текст (светлая) |
| Кремовый | `#EEEEE8` | основной фон (светлая тема) |
| Лаймовый/неон | `#D4FF3D` | **primary CTA** — главные кнопки действия, активные бейджи |
| Оливковый | `#5C7A0E` | secondary accent — success-блоки, statuses |
| Серый средний | `#9A9DA6` | вторичный текст (muted) в тёмной теме |
| Серый тёмный | `#5E626B` | вторичный текст (muted) в светлой теме |
| Оранжево-красный | `#E04A2E` | danger / алерты |
| Белый | `#FFFFFF` | карточки в светлой / текст на чёрном в тёмной |
| Тёплый бежевый | `#F4F4EE` / `#E8E6DE` | chip-фоны, тонкие плашки |

## 3. Решения, принятые с пользователем

1. **Объём:** сменить тему **целиком** — не точечно (вариант «только акценты» отклонён).
2. **Базовая схема:** **обе** — светлая (по умолчанию) и тёмная, **ручной переключатель**.
3. **Primary accent:** **лаймовый `#D4FF3D`** с чёрным текстом `#0B0C10`. На лайме всегда чёрный — это даёт максимальный контраст в обеих темах.
4. **Способ переключения:** ручной тоггл в профиле (тренера и клиента), персист в `localStorage`. Системный `prefers-color-scheme` **не** используем.

## 4. Архитектура: токены через CSS-переменные

Tailwind v4 уже использует `@theme` директиву в [web/src/index.css](web/src/index.css). Используем её как **значения по умолчанию = светлая тема**, а тёмную задаём через селектор `[data-theme="dark"]` на `<html>`.

### 4.1. Финальный набор токенов

```css
@theme {
  /* layout */
  --color-bg: #EEEEE8;          /* фон-«полотно» приложения */
  --color-card: #FFFFFF;        /* приподнятые карточки */
  --color-chip: #E8E6DE;        /* мелкие плашки/чипы */
  --color-line: #DCDAD2;        /* разделители, бордеры */

  /* текст */
  --color-ink: #0B0C10;         /* основной */
  --color-ink-muted: #5E626B;   /* вторичный (подписи) */

  /* акценты */
  --color-accent: #D4FF3D;      /* primary CTA — лайм */
  --color-accent-on: #0B0C10;   /* текст на лайме (всегда чёрный) */
  --color-accent-2: #5C7A0E;    /* secondary — олива */

  /* семантика */
  --color-success: #5C7A0E;     /* успех = олива (как в макетах) */
  --color-success-soft: #E8EFD4;
  --color-danger: #E04A2E;
  --color-danger-soft: #FBE3DC;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
}

[data-theme="dark"] {
  --color-bg: #0B0C10;
  --color-card: #15171D;        /* приподнятые карточки на 1 ступень светлее фона */
  --color-chip: #1F2128;
  --color-line: #2A2D36;
  --color-ink: #FFFFFF;
  --color-ink-muted: #9A9DA6;
  --color-success-soft: #1E2818;
  --color-danger-soft: #3A1C15;
  /* accent, accent-on, accent-2, success, danger — НЕ переопределяются:
     лайм одинаково хорошо смотрится на чёрном и кремовом, чёрный текст на нём остаётся чёрным */
}
```

### 4.2. Обои вокруг моб-каркаса

Текущее `body { background: #d8d2c6 }` в [web/src/index.css:24](web/src/index.css#L24) — это «обои» вокруг моб-каркаса (видны на десктопе шире 430px). Заменяем хардкод на отдельный токен `--color-canvas`, чтобы каркас «всплывал» над фоном:

```css
@theme { --color-canvas: #D8D6CE; }      /* светлая: чуть темнее --color-bg */
[data-theme="dark"] { --color-canvas: #000000; } /* тёмная: чёрный — каркас #0B0C10 на нём чуть всплывает */
```

И `body { background: var(--color-canvas) }`.

## 5. Переключатель темы

### 5.1. Модуль `web/src/lib/theme.ts` (новый)

```ts
export type Theme = 'light' | 'dark';
const KEY = 'app_theme';

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyStoredTheme(): void {
  document.documentElement.setAttribute('data-theme', getTheme());
}
```

### 5.2. Bootstrap до рендера React

В [web/src/main.tsx](web/src/main.tsx) — вызвать `applyStoredTheme()` **до** `createRoot().render(...)`, чтобы не было «вспышки» неверной темы при первой загрузке.

### 5.3. React-хук `useTheme()`

В том же `lib/theme.ts` экспортировать хук:

- читает текущую тему из `document.documentElement.dataset.theme` через `useSyncExternalStore`;
- возвращает `{ theme, toggle, setTheme }`;
- слушает событие `storage` (для синхронизации между вкладками).

### 5.4. Компонент `web/src/components/ThemeToggle.tsx` (новый)

- Кнопка-переключатель с иконками `Sun` / `Moon` из `lucide-react` (уже в зависимостях).
- Стилизация: компактная пилюля или сегмент-контрол, в едином стиле с остальными настройками профиля.
- Использует `useTheme()`.

### 5.5. Места размещения

- [web/src/pages/TrainerPage.tsx](web/src/pages/TrainerPage.tsx) — строка-настройка «Тема» в профиле тренера.
- [web/src/pages/ClientProfilePage.tsx](web/src/pages/ClientProfilePage.tsx) — то же в профиле клиента.

## 6. Что меняется в коде

### 6.1. Файлы под автоматическую перекраску (через токены)

39 случаев использования утилит `bg-card`/`bg-bg`/`bg-chip`/`text-ink`/`text-ink-muted`/`text-accent`/`bg-success`/`bg-danger` в 18 файлах — перекрашиваются автоматически смены CSS-переменных, **код не трогаем**.

### 6.2. Точечные правки hardcoded хексов

В коде есть **75 хардкод-хексов в 25 файлах**. Категории:

**(a) Заменяем на токены** — общий текст/фон, не статусные:

- `body { background: #d8d2c6 }` в [web/src/index.css:24](web/src/index.css#L24) → `var(--color-canvas)` (см. 4.2).
- Любые `#1a1a1a` / `#ffffff` в `style={{...}}`, обозначающие текст на акцентном фоне → `var(--color-accent-on)`.

**(b) Оставляем как есть** — это **статусные/предметные цвета**, не зависят от темы оформления:

- [web/src/components/Avatar.tsx](web/src/components/Avatar.tsx) — палитра пастельных аватаров.
- [web/src/pages/CalendarPage.tsx](web/src/pages/CalendarPage.tsx): `loadColor(n)` для шкалы нагрузки, `APPROVED_BLUE = '#2f6fed'`, золотые тона pending.
- [web/src/pages/ChatPage.tsx](web/src/pages/ChatPage.tsx): `READ_BLUE = '#2f6fed'` — иконка прочитано.
- Цвета галочек статусов сообщений/занятий (WhatsApp-style).

Если после перекраски контраст некоторых аватаров на тёмной теме окажется проблемным — адаптируем во **второй итерации** (вне этой спеки).

### 6.3. Изменение значения `--color-success`

Сейчас `#2e7d4f` (зелёный травяной) → меняем на `#5C7A0E` (олива из макетов). Это «глобальное» изменение, но визуально мягкое; все use-case (бейджи «оплачено», success-плашки в Confirm-диалоге) остаются осмысленными.

### 6.4. Изменение `--color-danger`

`#c8392c` → `#E04A2E` (чуть теплее, ярче). Незначительно, но согласует с макетами.

## 7. Принципы применения акцентов

- **Один лайм на экран.** Главный CTA окрашивается в `bg-accent`. Вторичные действия — outline (`border-line text-ink`) или олива (`bg-success/10 text-success`).
- **Текстовая иерархия** только через `text-ink` / `text-ink-muted`. Никаких сторонних серых.
- **Бейджи активных состояний** (например, текущая тренировка, новые уведомления) — лаймовый бейдж с чёрным текстом.
- **Success-индикаторы** (статус «оплачено», «завершено») — олива на soft-фоне `bg-success-soft text-success`.

## 8. Out of scope (явные не-цели)

- Не перерисовываем layout/композицию экранов.
- Не меняем шрифт (Inter остаётся). JetBrains Mono из макетов — служебный шрифт Figma.
- Нет «авто-режима» по `prefers-color-scheme` (только ручной).
- Не трогаем серверную часть.
- Не адаптируем палитру `Avatar.tsx` под тёмную тему (отдельная задача, если потребуется).

## 9. План тестирования

После реализации запустить `npm run dev` и в DevTools (iPhone 14 Pro 393×852) **в каждой теме**:

1. **Тренер:** главная → клиенты → карточка клиента → редактирование → календарь (день/неделя/месяц) → активная тренировка → итоги → чат → бухгалтерия → залы → уведомления.
2. **Клиент:** тренировки → активная → итоги → профиль → база упражнений → календарь → чат.
3. **Переключение темы** в обоих профилях — без перезагрузки, мгновенно.
4. **Холодная загрузка** при `app_theme=dark` — нет «вспышки» светлой темы.
5. **Контраст:** `text-ink-muted` на `text-card` в обеих темах должен пройти WCAG AA (4.5:1 для мелкого текста). В тёмной `#9A9DA6` на `#15171D` ≈ 5.6:1 — OK. В светлой `#5E626B` на `#FFFFFF` ≈ 6.5:1 — OK.
6. **Цвета статусов** (галочки WhatsApp, оплаты, нагрузка, аватары) читаемы и не сливаются с фоном в обеих темах.

## 10. Список изменяемых файлов

**Изменить:**

- [web/src/index.css](web/src/index.css) — расширить токены, добавить тёмную тему.
- [web/src/main.tsx](web/src/main.tsx) — `applyStoredTheme()` до рендера.
- [web/src/pages/TrainerPage.tsx](web/src/pages/TrainerPage.tsx) — встроить `<ThemeToggle />`.
- [web/src/pages/ClientProfilePage.tsx](web/src/pages/ClientProfilePage.tsx) — встроить `<ThemeToggle />`.
- ~5–10 точечных правок hex→token в страницах (см. 6.2(a)).

**Создать:**

- `web/src/lib/theme.ts` — модуль + хук.
- `web/src/components/ThemeToggle.tsx` — UI-компонент.
