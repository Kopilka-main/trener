import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, FileText, Link2, Link2Off, MessageSquare, Pencil, Plus, TrendingUp, Trophy, Wallet, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { Field, TextArea, TextInput } from '../components/Field';
import { useConfirm } from '../components/ConfirmProvider';
import { useClient, useClientBalance, useUpdateClient } from '../api/clients';
import { useClientWorkouts } from '../api/client-workouts';
import { useSessions } from '../api/sessions';
import { useChatUnread } from '../api/chat';
import { useClientPackages, useCreatePackage, useDeletePackage } from '../api/packages';
import { useCreateIncomeRecord } from '../api/incomes';
import { useCreateExpense } from '../api/expenses';
import { useTrainerAlerts } from '../api/alerts';
import { useClientStats, type ClientStats } from '../api/client-stats';
import { calcAge } from '../lib/format';
import { fullName } from '../lib/initials';
import type { PaymentPackage, PaymentPackageInput } from '../api/types';

// Полноценная страница карточки клиента. Открывается тапом по клиенту в списке.
// Сверху — крупная CTA «Перейти к тренировкам», ниже — данные и история.
export function ClientCardPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client } = useClient(id);
  const { data: alerts = [] } = useTrainerAlerts();
  const { data: balance } = useClientBalance(id);
  const { data: stats } = useClientStats(id);
  const { data: chatUnread } = useChatUnread('trainer', id);
  const unread = chatUnread?.unread ?? 0;
  const myAlert = alerts.find((a) => a.clientId === id);

  // Статистика: количество новых PR (личных рекордов) за последние 30 дней + эмодзи кубка.
  const statsMetric = (() => {
    if (!stats?.records?.length) return undefined;
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const newPRs = stats.records.filter((r) => r.date && r.date >= since).length;
    if (newPRs === 0) return undefined;
    return pad2num(newPRs);
  })();

  // Запланированные тренировки клиента: текущий месяц — для плитки "Календарь";
  // будущие (от сегодня на 365 дней) — для расчёта баланса оплаты.
  const now = new Date();
  const today = `${now.getFullYear()}-${pad2num(now.getMonth() + 1)}-${pad2num(now.getDate())}`;
  const monthFrom = `${now.getFullYear()}-${pad2num(now.getMonth() + 1)}-01`;
  const yearAhead = new Date(now.getTime() + 365 * 86400000);
  const yearAheadIso = `${yearAhead.getFullYear()}-${pad2num(yearAhead.getMonth() + 1)}-${pad2num(yearAhead.getDate())}`;
  const { data: rangeSessions = [] } = useSessions(monthFrom, yearAheadIso, id);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthEndIso = `${monthEnd.getFullYear()}-${pad2num(monthEnd.getMonth() + 1)}-${pad2num(monthEnd.getDate())}`;
  const monthPlanned = rangeSessions.filter(
    (s) => s.status !== 'cancelled' && s.date >= monthFrom && s.date <= monthEndIso,
  ).length;
  const futurePlanned = rangeSessions.filter(
    (s) => s.status !== 'cancelled' && s.date >= today,
  ).length;
  // Сколько из запланированных будущих тренировок не покрыты оплатой.
  const futureNotPaid = balance ? Math.max(0, futurePlanned - balance.remaining) : 0;
  // Сколько оплаченных тренировок ещё НЕ назначены в календаре (свободный остаток).
  const futureNotAssigned = balance ? Math.max(0, balance.remaining - futurePlanned) : 0;

  // Ближайшее запланированное занятие клиента — для блока «след.»
  // Минутный курсор «сейчас» для отсечения уже прошедших слотов сегодня.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextSession = rangeSessions
    .filter((s) => {
      if (s.status === 'cancelled') return false;
      if (s.date > today) return true;
      if (s.date < today) return false;
      const [h, m] = s.startTime.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    })
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))[0];
  const nextSessionDate = nextSession
    ? (() => {
        const [y, mo, d] = nextSession.date.split('-').map(Number);
        const [hh, mm] = nextSession.startTime.split(':').map(Number);
        return new Date(y, mo - 1, d, hh, mm);
      })()
    : null;

  // Календарь: компактный формат "назначено / остаток". Если перерасход — остаток отрицательный.
  const calendarMetric =
    futurePlanned === 0 && futureNotPaid === 0 && futureNotAssigned === 0
      ? undefined
      : futureNotPaid > 0
        ? `${pad2num(futurePlanned)}/−${futureNotPaid}`
        : `${pad2num(futurePlanned)}/${futureNotAssigned}`;
  // Тон применяется только ко второй части (после '/'): зелёный для остатка, красный для долга.
  const calendarMetricTone: 'success' | 'danger' | undefined =
    futureNotPaid > 0 ? 'danger' : futureNotAssigned > 0 ? 'success' : undefined;

  if (!client) return null;

  const age = calcAge(client.birthDate);
  const tags = (client.hashtags ?? '').split(/\s+/).filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-4">
        {/* Шапка: аватар + имя + теги — без подложки, прямо на фоне приложения. */}
        <div className="space-y-3 px-1 pt-1">
          <div className="flex items-center gap-3">
            <Avatar firstName={client.firstName} lastName={client.lastName} size={64} />
            <div className="min-w-0 flex-1">
              <div className="text-[19px] font-bold leading-tight">
                {fullName(client.firstName, client.lastName)}
              </div>
              {age !== null && (
                <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">{age} лет</div>
              )}
            </div>
            <ConnectionBadge connected={!!client.accountId} />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[13px]">{t}</span>
              ))}
            </div>
          )}
        </div>

        {myAlert && (
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-medium"
            style={{
              background: myAlert.severity === 'danger' ? 'rgba(200,57,44,0.10)' : 'rgba(217,145,43,0.12)',
              color: myAlert.severity === 'danger' ? 'var(--color-danger)' : '#9a6118',
            }}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{myAlert.message}</span>
          </div>
        )}

        {/* Следующее запланированное занятие — kicker-строка с деталями.
            Тап ведёт прямо в день календаря, где это занятие. */}
        {nextSession && nextSessionDate && (
          <button
            onClick={() =>
              navigate(`/trainer/calendar?clientId=${id}&date=${nextSession.date}&view=day`)
            }
            className="row-glow flex w-full items-center gap-2 px-1 text-left active:scale-[0.99]"
            aria-label="Открыть занятие в календаре"
          >
            <div className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-muted)]">
              СЛЕД. {dayLabelForKicker(nextSession.date, today)} · {nextSession.startTime} · {sessionStageLabel(nextSession)}
            </div>
            <span className="inline-block rounded bg-[var(--color-accent)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.06em] text-[var(--color-accent-on)]">
              {diffShort(nextSessionDate, now)}
            </span>
            <ArrowRight size={18} strokeWidth={2.4} className="tile-chevron shrink-0" />
          </button>
        )}

        {/* CTA: переход к тренировкам — каскад из 3 шевронов («разгон») */}
        <button
          onClick={() => navigate(`/trainer/clients/${id}/workouts`)}
          className="cta-launch flex w-full items-center gap-3 rounded-2xl bg-[var(--color-accent)] p-4 text-left text-[var(--color-accent-on)]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/10">
            <Dumbbell size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Перейти к тренировкам</span>
            <span className="block text-[12px] opacity-70">
              текущая + история
            </span>
          </span>
          <span className="flex shrink-0 items-center">
            <ChevronRight size={18} className="cta-chevron cta-chevron-1" strokeWidth={2.4} />
            <ChevronRight size={18} className="cta-chevron cta-chevron-2 -ml-2.5" strokeWidth={2.4} />
            <ChevronRight size={18} className="cta-chevron cta-chevron-3 -ml-2.5" strokeWidth={2.4} />
          </span>
        </button>

        {/* Сетка плиток-якорей: навигация и быстрый переход к секциям ниже */}
        <div className="grid grid-cols-2 gap-3">
          <ClientNavTile
            Icon={CalendarDays}
            title="Календарь"
            sub="занятия клиента"
            metric={calendarMetric}
            metricTone={calendarMetricTone}
            onClick={() => navigate(`/trainer/calendar?clientId=${id}`)}
          />
          <ClientNavTile
            Icon={MessageSquare}
            title="Написать"
            sub="чат с клиентом"
            metric={unread > 0 ? pad2num(unread) : undefined}
            primary={unread > 0}
            onClick={() => navigate(`/trainer/chat/${id}`)}
          />
          <ClientNavTile
            Icon={BarChart3}
            title="Статистика"
            sub="прогресс и история"
            metric={statsMetric}
            metricIcon={statsMetric ? TrendingUp : undefined}
            onClick={() => navigate(`/trainer/clients/${id}/stats`)}
          />
          <ClientNavTile
            Icon={Wallet}
            title="Оплата"
            sub="пакеты и расходы"
            metric={
              balance && balance.paid > 0 && balance.remaining > 0
                ? `+${balance.remaining}`
                : undefined
            }
            metricTone={balance && balance.remaining > 0 ? 'success' : undefined}
            metricFooter={
              client.onlineUntil && client.onlineUntil >= today
                ? `онлайн до ${formatDayShort(client.onlineUntil)}`
                : undefined
            }
            onClick={() => navigate(`/trainer/clients/${id}/payment`)}
          />
          <ClientNavTile
            Icon={FileText}
            title="Медкарта"
            sub="файлы и заметки"
            onClick={() => navigate(`/trainer/clients/${id}/medical`)}
          />
          <ClientNavTile
            Icon={Pencil}
            title="Профиль"
            sub="контакты и данные"
            onClick={() => navigate(`/trainer/clients/${id}/profile`)}
          />
        </div>

        {client.notes && (
          <Section title="Заметки">
            <div className="px-1 text-[14px] leading-relaxed whitespace-pre-line">
              {client.notes}
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ClientNavTile({
  Icon,
  title,
  sub,
  onClick,
  indicator,
  metric,
  metricTone,
  metricIcon: MetricIcon,
  metricFooter,
  stats,
  primary,
}: {
  Icon: typeof CalendarDays;
  title: string;
  sub: string;
  onClick: () => void;
  indicator?: boolean;
  metric?: string;
  metricTone?: 'success' | 'danger';
  metricIcon?: typeof CalendarDays;
  /** Маленькая подпись под метрикой — например «онлайн до 31/06». */
  metricFooter?: string;
  stats?: Array<{ value: string; label: string; tone?: 'success' | 'danger' }>;
  primary?: boolean;
}) {
  const metricColor =
    metricTone === 'success'
      ? 'var(--color-accent)'
      : metricTone === 'danger'
        ? 'var(--color-danger)'
        : undefined;
  const hasMetric = metric !== undefined;
  const hasStats = stats && stats.length > 0;
  return (
    <button
      onClick={onClick}
      className={
        'relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left active:scale-[0.98] ' +
        (primary ? 'tile-shadow-primary' : 'tile-shadow')
      }
    >
      <div className="flex w-full items-start justify-between">
        <span
          className={`-ml-3 -mt-3 flex h-11 w-11 items-center justify-center rounded-lg ${primary ? 'tile-icon-shell-primary' : 'tile-icon-shell'}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
        {hasStats && (
          <div className="flex flex-col items-end gap-1 text-right">
            {stats!.map((s, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span
                  className="font-[family-name:var(--font-display)] text-[22px] leading-none tracking-[-0.02em] tabular-nums"
                  style={{
                    color:
                      s.tone === 'success'
                        ? 'var(--color-accent)'
                        : s.tone === 'danger'
                          ? 'var(--color-danger)'
                          : undefined,
                  }}
                >
                  {s.value}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
        {hasMetric && !hasStats && (
          <div className="flex flex-col items-end gap-0.5">
            {metric!.includes('/')
              ? (() => {
                  const [base, accent] = metric!.split('/');
                  // Типографическая дробь: числитель приподнят, знаменатель опущен,
                  // слэш заметно крупнее и под наклоном — почти как «¾» в книге.
                  return (
                    <span className="flex items-center font-[family-name:var(--font-display)] tabular-nums leading-none tracking-[-0.02em]">
                      <span className="text-[22px] -translate-y-[6px]">{base}</span>
                      <span
                        aria-hidden
                        className="text-[40px] opacity-45 mx-[-2px]"
                        style={{ transform: 'rotate(8deg)' }}
                      >
                        /
                      </span>
                      <span
                        className="text-[22px] translate-y-[6px]"
                        style={metricColor ? { color: metricColor } : undefined}
                      >
                        {accent}
                      </span>
                      {MetricIcon && <MetricIcon size={22} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} className="ml-1.5" />}
                    </span>
                  );
                })()
              : (
                <span className="flex items-center gap-1.5">
                  <span
                    className="font-[family-name:var(--font-display)] text-[22px] leading-none tracking-[-0.02em] tabular-nums"
                    style={metricColor ? { color: metricColor } : undefined}
                  >
                    {metric}
                  </span>
                  {MetricIcon && <MetricIcon size={22} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} />}
                </span>
              )
            }
            {metricFooter && (
              <span className="font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-ink-mutedXL)]">
                {metricFooter}
              </span>
            )}
          </div>
        )}
      </div>
      {indicator && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
      )}
      <span>
        <span className="block text-[14px] font-bold leading-tight">{title}</span>
        <span className="block text-[11px] text-[var(--color-ink-muted)]">{sub}</span>
      </span>
    </button>
  );
}

function pad2num(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Формат «31/05» из YYYY-MM-DD — короткая дата для kicker-строки.
function formatDayShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

// Подпись даты в kicker-строке: СЕГОДНЯ / ЗАВТРА / 31/05.
function dayLabelForKicker(iso: string, today: string): string {
  if (iso === today) return 'СЕГОДНЯ';
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = new Date(y, m - 1, d + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (iso === tomorrowIso) return 'ЗАВТРА';
  return formatDayShort(iso);
}

// Текстовый статус согласования занятия для отображения в kicker-строке.
function sessionStageLabel(s: { approval: 'none' | 'pending' | 'approved'; deliveredAt: string | null }): string {
  if (s.approval === 'approved') return 'ПОДТВЕРЖДЕНА';
  if (s.approval === 'pending') return s.deliveredAt ? 'ПОЛУЧЕНА' : 'ОТПРАВЛЕНА';
  return 'НЕ ОТПРАВЛЕНА';
}

// «4Ч 48М» / «3Д» / «15М» — компактный диффер до будущего времени.
// Дублируем тот же формат, что и на главном экране в kicker-строке.
function diffShort(future: Date, now: Date): string {
  const ms = future.getTime() - now.getTime();
  if (ms <= 0) return 'СЕЙЧАС';
  const totalMin = Math.round(ms / 60000);
  const totalH = Math.floor(totalMin / 60);
  if (totalH >= 24) {
    const d = Math.floor(totalH / 24);
    const h = totalH % 24;
    return h === 0 ? `${d}Д` : `${d}Д ${h}Ч`;
  }
  const m = totalMin % 60;
  if (totalH === 0) return `${m}М`;
  if (m === 0) return `${totalH}Ч`;
  return `${totalH}Ч ${m}М`;
}

// Значок «соединения» с клиентом в шапке карточки:
//  • есть accountId — целая цепь, лайм (клиент подключён к приложению)
//  • нет accountId  — разорванная цепь, серая (клиент не привязан)
function ConnectionBadge({ connected }: { connected: boolean }) {
  const Icon = connected ? Link2 : Link2Off;
  const color = connected ? 'var(--color-ink)' : 'var(--color-ink-mutedXL)';
  const bg = 'var(--color-chip)';
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: bg }}
      title={connected ? 'Клиент подключён' : 'Нет соединения с клиентом'}
      aria-label={connected ? 'Клиент подключён' : 'Нет соединения с клиентом'}
    >
      <Icon size={15} strokeWidth={2.2} style={{ color }} />
    </span>
  );
}

export function Section({ id, title, children, indicator }: { id?: string; title: string; children: React.ReactNode; indicator?: boolean }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-4">
      <h3 className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        {indicator && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 bg-[var(--color-card)] px-4 py-3 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      }`}
    >
      <div className="text-[13px] text-[var(--color-ink-muted)]">{label}</div>
      <div className="text-right text-[14px] font-semibold">{value}</div>
    </div>
  );
}

// ─── Баланс тренировок ──────────────────────────────────────────────────────

export function BalanceCard({ clientId }: { clientId: string }) {
  const { data: balance } = useClientBalance(clientId);
  if (!balance) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-ink-muted)]">
        Загрузка баланса…
      </div>
    );
  }
  // remaining = paid − completedApproved. >0 — оплачено сверх; <0 — в долг; 0 — ровно.
  const r = balance.remaining;
  const balanceLabel = r === 0 ? '0' : r > 0 ? `+${r}` : `${r}`;
  const balanceTone = r === 0 ? undefined : r > 0 ? 'success' : 'danger';
  const balanceColor =
    balanceTone === 'success' ? 'var(--color-success)' : balanceTone === 'danger' ? 'var(--color-danger)' : undefined;
  const balanceHint = r === 0 ? 'ровно по оплате' : r > 0 ? 'тренировок оплачено сверх' : 'тренировок в долг';
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[28px] font-bold tabular-nums leading-none">{balance.completed}</div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">проведено</div>
        </div>
        <div>
          <div
            className="text-[28px] font-bold tabular-nums leading-none"
            style={balanceColor ? { color: balanceColor } : undefined}
          >
            {balanceLabel}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">{balanceHint}</div>
        </div>
      </div>
    </div>
  );
}


// ─── Пакеты ─────────────────────────────────────────────────────────────────

export function PackagesBlock({ clientId }: { clientId: string }) {
  const { data: packages = [] } = useClientPackages(clientId);
  const deleteMut = useDeletePackage(clientId);
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);

  const onDelete = async (pkg: PaymentPackage) => {
    if (!(await confirm(`Удалить пакет на ${pkg.lessonsPaid} тренировок?`, { confirmLabel: 'Удалить', danger: true }))) return;
    deleteMut.mutate(pkg.id);
  };

  return (
    <div className="space-y-2">
      {packages.length > 0 && (
        <ul className="overflow-hidden rounded-2xl">
          {packages.map((p, i) => (
            <PackageRow
              key={p.id}
              pkg={p}
              last={i === packages.length - 1 && !adding}
              onDelete={() => onDelete(p)}
            />
          ))}
        </ul>
      )}
      {adding ? (
        <IncomeForm clientId={clientId} onClose={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
        >
          <Plus size={15} /> Добавить доход
        </button>
      )}
    </div>
  );
}

// Универсальная форма дохода от клиента: выбирается тип, под него
// разные поля. Для пакета тренировок — POST /api/clients/:id/packages,
// для всего остального — POST /api/incomes с заметкой про клиента.
type IncomeKind = 'package' | 'online' | 'inventory' | 'pharma' | 'other';

function IncomeForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const createPackage = useCreatePackage(clientId);
  const createIncome = useCreateIncomeRecord();
  const updateClient = useUpdateClient(clientId);
  const { data: client } = useClient(clientId);
  const [kind, setKind] = useState<IncomeKind>('package');

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый доход</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <KindChip active={kind === 'package'} onClick={() => setKind('package')}>Пакет тренировок</KindChip>
        <KindChip active={kind === 'online'} onClick={() => setKind('online')}>Онлайн сопровождение</KindChip>
        <KindChip active={kind === 'inventory'} onClick={() => setKind('inventory')}>Инвентарь</KindChip>
        <KindChip active={kind === 'pharma'} onClick={() => setKind('pharma')}>Фарма</KindChip>
        <KindChip active={kind === 'other'} onClick={() => setKind('other')}>Прочее</KindChip>
      </div>

      {kind === 'package' && (
        <PackageFields onSubmit={(input) => createPackage.mutateAsync(input).then(onClose)} pending={createPackage.isPending} />
      )}
      {kind === 'online' && (
        <OnlinePeriodFields
          onSubmit={async (amount, from, to) => {
            await createIncome.mutateAsync({
              category: 'Онлайн сопровождение',
              amount,
              date: from,
              note: `Онлайн ${formatRuShort(from)}–${formatRuShort(to)}`,
            });
            // Запоминаем дату окончания подписки в клиенте — она отобразится
            // мелким шрифтом под балансом в плитке «Оплата».
            if (client) {
              const prevUntil = client.onlineUntil ?? '';
              const nextUntil = to > prevUntil ? to : prevUntil;
              await updateClient.mutateAsync({
                firstName: client.firstName,
                lastName: client.lastName,
                birthDate: client.birthDate ?? null,
                heightCm: client.heightCm ?? null,
                weightKg: client.weightKg ?? null,
                phone: client.phone ?? null,
                telegram: client.telegram ?? null,
                whatsapp: client.whatsapp ?? null,
                instagram: client.instagram ?? null,
                max: client.max ?? null,
                hashtags: client.hashtags ?? null,
                notes: client.notes ?? null,
                medicalNotes: client.medicalNotes ?? null,
                restingPulse: client.restingPulse ?? null,
                scheduleDay: client.scheduleDay ?? null,
                scheduleTime: client.scheduleTime ?? null,
                currentTrainingType: client.currentTrainingType ?? null,
                accountId: client.accountId ?? null,
                onlineUntil: nextUntil,
              });
            }
            onClose();
          }}
          pending={createIncome.isPending}
        />
      )}
      {(kind === 'inventory' || kind === 'pharma' || kind === 'other') && (
        <SimpleIncomeFields
          category={kind === 'inventory' ? 'Инвентарь' : kind === 'pharma' ? 'Фарма' : 'Прочее'}
          onSubmit={async (amount, date, note) => {
            await createIncome.mutateAsync({
              category: kind === 'inventory' ? 'Инвентарь' : kind === 'pharma' ? 'Фарма' : 'Прочее',
              amount,
              date,
              note: note || null,
            });
            onClose();
          }}
          pending={createIncome.isPending}
        />
      )}
    </div>
  );
}

function KindChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition"
      style={{
        background: active ? 'var(--color-accent)' : 'var(--color-chip)',
        color: active ? 'var(--color-accent-on)' : 'var(--color-ink-muted)',
      }}
    >
      {children}
    </button>
  );
}

function PackageFields({ onSubmit, pending }: { onSubmit: (input: PaymentPackageInput) => Promise<unknown>; pending: boolean }) {
  const [lessons, setLessons] = useState('20');
  const [price, setPrice] = useState('2000');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [workoutType, setWorkoutType] = useState('');
  const [note, setNote] = useState('');
  const lessonsNum = Number(lessons);
  const priceNum = Number(price);
  const total = Number.isFinite(lessonsNum) && Number.isFinite(priceNum) ? lessonsNum * priceNum : 0;

  const submit = () => {
    if (!Number.isFinite(lessonsNum) || lessonsNum <= 0) return alert('Укажите число тренировок');
    if (!Number.isFinite(priceNum) || priceNum < 0) return alert('Укажите цену');
    if (!startsAt) return alert('Укажите дату начала');
    onSubmit({
      lessonsPaid: Math.round(lessonsNum),
      pricePerLesson: priceNum,
      totalPaid: total,
      startsAt,
      workoutType: workoutType.trim() || null,
      note: note.trim() || null,
    });
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тренировок">
          <TextInput inputMode="numeric" value={lessons} onChange={(e) => setLessons(e.target.value)} />
        </Field>
        <Field label="₽ за тренировку">
          <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <Field label="Дата начала">
        <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={dateInputCls} />
      </Field>
      <Field label="Тип (необязательно)">
        <TextInput placeholder="Силовая, Йога…" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} />
      </Field>
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="rounded-xl bg-[var(--color-chip)] px-3 py-2 text-[12px] text-center">
        Итого пакет: <span className="font-bold tabular-nums">{formatMoney(total)}</span>
      </div>
      <SaveBtn onClick={submit} pending={pending} label="Сохранить пакет" />
    </>
  );
}

function OnlinePeriodFields({
  onSubmit, pending,
}: { onSubmit: (amount: number, from: string, to: string) => Promise<unknown>; pending: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAhead = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(monthAhead);
  const [amount, setAmount] = useState('');
  const amountNum = Number(amount);

  const submit = () => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) return alert('Укажите сумму');
    if (!from || !to) return alert('Укажите период');
    if (to < from) return alert('Дата окончания раньше начала');
    onSubmit(amountNum, from, to);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="С">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInputCls} />
        </Field>
        <Field label="По">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInputCls} />
        </Field>
      </div>
      <Field label="Сумма, ₽">
        <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <SaveBtn onClick={submit} pending={pending} label="Сохранить" />
    </>
  );
}

function SimpleIncomeFields({
  category, onSubmit, pending,
}: { category: string; onSubmit: (amount: number, date: string, note: string) => Promise<unknown>; pending: boolean }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const amountNum = Number(amount);

  const submit = () => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) return alert('Укажите сумму');
    if (!date) return alert('Укажите дату');
    onSubmit(amountNum, date, note.trim());
  };
  return (
    <>
      <Field label={`${category} — сумма, ₽`}>
        <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Дата">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={dateInputCls} />
      </Field>
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <SaveBtn onClick={submit} pending={pending} label="Сохранить" />
    </>
  );
}

const dateInputCls =
  'w-full rounded-2xl bg-[var(--color-chip)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10';

function SaveBtn({ onClick, pending, label }: { onClick: () => void; pending: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
    >
      {pending ? 'Сохранение…' : label}
    </button>
  );
}

function formatRuShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(y).slice(2)}`;
}

const EXPENSE_CATEGORIES = ['Аренда', 'Инвентарь', 'Обучение', 'Фарма', 'Прочее'];

export function ExpenseBlock({ clientName }: { clientName: string }) {
  const [adding, setAdding] = useState(false);
  return adding ? (
    <ExpenseForm clientName={clientName} onClose={() => setAdding(false)} />
  ) : (
    <button
      onClick={() => setAdding(true)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
    >
      <Plus size={15} /> Добавить расход
    </button>
  );
}

function ExpenseForm({ clientName, onClose }: { clientName: string; onClose: () => void }) {
  const createMut = useCreateExpense();
  const [category, setCategory] = useState<string>('Прочее');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(`Для ${clientName}`);

  const amountNum = Number(amount);

  const submit = async () => {
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      alert('Укажите сумму расхода');
      return;
    }
    if (!date) {
      alert('Укажите дату');
      return;
    }
    await createMut.mutateAsync({
      category,
      amount: amountNum,
      date,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый расход</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <Field label="Категория">
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${active ? 'bg-[var(--color-accent)] text-[var(--color-accent-on)]' : 'bg-[var(--color-chip)]'}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="₽ сумма">
          <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2 text-[14px] focus:border-[var(--color-line-strong)] focus:outline-none"
          />
        </Field>
      </div>
      <Field label="Примечание">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </Field>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
      >
        {createMut.isPending ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  );
}

function PackageRow({ pkg, last, onDelete }: { pkg: PaymentPackage; last: boolean; onDelete: () => void }) {
  const closed = pkg.status !== 'active';
  return (
    <li
      className={`flex items-center gap-3 bg-[var(--color-card)] px-3 py-3 ${
        last ? '' : 'border-b border-[var(--color-line)]'
      } ${closed ? 'opacity-50' : ''}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip)]">
        <Wallet size={16} className="text-[var(--color-ink-muted)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">
          {pkg.lessonsPaid} × {formatMoney(pkg.pricePerLesson)} = {formatMoney(pkg.totalPaid)}
        </div>
        <div className="text-[11px] text-[var(--color-ink-muted)]">
          {[
            `с ${formatDateRu(pkg.startsAt)}`,
            pkg.workoutType,
            closed ? (pkg.status === 'closed' ? 'закрыт' : 'отменён') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] active:bg-black/5"
        aria-label="Удалить пакет"
      >
        <X size={14} />
      </button>
    </li>
  );
}

function PackageForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const createMut = useCreatePackage(clientId);
  const [lessons, setLessons] = useState('20');
  const [price, setPrice] = useState('2000');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [workoutType, setWorkoutType] = useState('');
  const [note, setNote] = useState('');

  const lessonsNum = Number(lessons);
  const priceNum = Number(price);
  const totalPreview = Number.isFinite(lessonsNum) && Number.isFinite(priceNum) ? lessonsNum * priceNum : 0;

  const submit = async () => {
    if (!Number.isFinite(lessonsNum) || lessonsNum <= 0) {
      alert('Укажите число оплаченных тренировок');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Укажите стоимость одной тренировки');
      return;
    }
    if (!startsAt) {
      alert('Укажите дату начала пакета');
      return;
    }
    const input: PaymentPackageInput = {
      lessonsPaid: Math.round(lessonsNum),
      pricePerLesson: priceNum,
      totalPaid: lessonsNum * priceNum,
      startsAt,
      workoutType: workoutType.trim() || null,
      note: note.trim() || null,
    };
    await createMut.mutateAsync(input);
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">Новый пакет</h4>
        <button onClick={onClose} className="text-[12px] text-[var(--color-ink-muted)]">Отмена</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тренировок">
          <TextInput inputMode="numeric" value={lessons} onChange={(e) => setLessons(e.target.value)} />
        </Field>
        <Field label="₽ за тренировку">
          <TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <Field label="Дата начала">
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="w-full rounded-2xl bg-[var(--color-chip)] px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-ink/10"
        />
      </Field>
      <Field label="Тип (необязательно)">
        <TextInput placeholder="Силовая, Йога…" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} />
      </Field>
      <Field label="Заметка">
        <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="rounded-xl bg-[var(--color-chip)] px-3 py-2 text-[12px] text-center">
        Итого пакет: <span className="font-bold tabular-nums">{formatMoney(totalPreview)}</span>
      </div>
      <button
        onClick={submit}
        disabled={createMut.isPending}
        className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-[14px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
      >
        {createMut.isPending ? 'Сохранение…' : 'Сохранить пакет'}
      </button>
    </div>
  );
}

// ─── Статистика ─────────────────────────────────────────────────────────────

export function StatsSection({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]"
      >
        <BarChart3 size={12} />
        <span>Статистика</span>
        <span className="ml-auto">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <StatsBody clientId={clientId} />}
    </section>
  );
}

function StatsBody({ clientId }: { clientId: string }) {
  const { data: stats } = useClientStats(clientId);
  const { data: workouts } = useClientWorkouts(clientId);
  const history = workouts?.history ?? [];
  if (!stats) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-ink-muted)]">
        Загрузка…
      </div>
    );
  }
  if (stats.total === 0) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-4 text-center text-[13px] text-[var(--color-ink-muted)]">
        Завершённых тренировок ещё нет
      </div>
    );
  }
  const maxFreq = Math.max(1, ...stats.frequency.map((f) => f.count));
  const maxTonnage = Math.max(1, ...stats.totals.map((t) => t.tonnage));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Всего тренировок" value={`${stats.total}`} />
        <StatTile label="В среднем в неделю" value={stats.avgPerWeek.toFixed(1).replace('.', ',')} />
      </div>

      <div className="rounded-2xl bg-[var(--color-card)] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Посещаемость за 12 недель
        </div>
        <div className="mt-3 flex items-end gap-1 h-12">
          {buildLast12Weeks(stats.frequency).map((c, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(8, (c / maxFreq) * 100)}%`,
                background: c === 0 ? 'var(--color-chip)' : 'var(--color-ink)',
                opacity: c === 0 ? 0.5 : 0.3 + 0.7 * (c / maxFreq),
              }}
              title={`${c} тренировок`}
            />
          ))}
        </div>
      </div>

      {stats.records.length > 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            <Trophy size={12} /> Личные рекорды
          </div>
          <ul className="mt-2 space-y-1.5">
            {stats.records.map((r, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate">{r.exerciseName}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {r.weightKg} кг × {r.reps}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            <span>Проведённые тренировки</span>
            <span className="text-[10px] tabular-nums">{history.length}</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {history.slice(0, 10).map((w) => (
              <li key={w.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{w.name}</div>
                  {w.categoryTag && (
                    <div className="truncate text-[11px] text-[var(--color-ink-muted)]">
                      {w.categoryTag}
                      {w.rpe ? ` · RPE ${w.rpe}` : ''}
                      {w.durationSec ? ` · ${Math.round(w.durationSec / 60)} мин` : ''}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-muted)]">
                  {w.completedAt ? new Date(w.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—'}
                </span>
              </li>
            ))}
          </ul>
          {history.length > 10 && (
            <div className="mt-2 text-center text-[11px] text-[var(--color-ink-muted)]">
              и ещё {history.length - 10} …
            </div>
          )}
        </div>
      )}

      {stats.totals.length > 0 && (
        <div className="rounded-2xl bg-[var(--color-card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
            Тоннаж по месяцам (последние 6)
          </div>
          <ul className="mt-2 space-y-1.5">
            {stats.totals.map((t) => (
              <li key={t.month}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="capitalize text-[var(--color-ink-muted)]">{formatMonthShort(t.month)}</span>
                  <span className="font-semibold tabular-nums">{t.tonnage.toLocaleString('ru-RU')} кг</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-chip)]">
                  <div
                    className="h-full bg-[var(--color-accent-2)]"
                    style={{ width: `${(t.tonnage / maxTonnage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-3 text-center">
      <div className="text-[20px] font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-muted)]">{label}</div>
    </div>
  );
}

// Возвращает массив длиной 12 — количество тренировок по неделям подряд,
// от 12 недель назад до текущей. Гарантирует наличие нулей для пустых недель.
function buildLast12Weeks(frequency: ClientStats['frequency']): number[] {
  const byKey = new Map(frequency.map((f) => [f.week, f.count]));
  const result: number[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const week = `${d.getFullYear()}-${String(getWeek(d)).padStart(2, '0')}`;
    result.push(byKey.get(week) ?? 0);
  }
  return result;
}

function getWeek(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

function formatMonthShort(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function formatDateRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

