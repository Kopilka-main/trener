import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Instagram, LogOut, Mail, Pencil, Phone, Plus, Send, Settings, Share2, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { ScreenHeader } from '../components/ScreenHeader';
import { Avatar } from '../components/Avatar';
import { useConfirm } from '../components/ConfirmProvider';
import { useTrainer } from '../api/trainer';
import { useCreateGym, useDeleteGym, useGyms } from '../api/gyms';
import { appBase } from '../lib/routes';
import { fullName } from '../lib/initials';

type LucideIcon = typeof Phone;

export function TrainerPage() {
  const navigate = useNavigate();
  const { data: trainer } = useTrainer();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const confirm = useConfirm();
  if (!trainer) return null;

  const tags = (trainer.hashtags ?? '').split(/\s+/).filter(Boolean);
  const contacts: { icon: LucideIcon; label: string; value: string; href: string }[] = [];
  if (trainer.phone) contacts.push({ icon: Phone, label: 'Телефон', value: trainer.phone, href: `tel:${trainer.phone.replace(/[^\d+]/g, '')}` });
  if (trainer.email) contacts.push({ icon: Mail, label: 'Email', value: trainer.email, href: `mailto:${trainer.email}` });
  if (trainer.telegram) contacts.push({ icon: Send, label: 'Telegram', value: trainer.telegram, href: `https://t.me/${trainer.telegram.replace(/^@/, '')}` });
  if (trainer.instagram) contacts.push({ icon: Instagram, label: 'Instagram', value: trainer.instagram, href: `https://instagram.com/${trainer.instagram.replace(/^@/, '')}` });

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Карточка тренера"
        back
        right={
          <button onClick={() => navigate(`${appBase()}/profile/edit`)} className="flex h-8 w-8 items-center justify-center" aria-label="Редактировать">
            <Pencil size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        <div className="flex items-center gap-3 rounded-3xl bg-[var(--color-card)] p-4">
          <Avatar firstName={trainer.firstName} lastName={trainer.lastName} size={64} />
          <div className="min-w-0">
            <div className="text-[19px] font-bold leading-tight">{fullName(trainer.firstName, trainer.lastName)}</div>
            {trainer.title && <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">{trainer.title}</div>}
            {trainer.specialties && <div className="text-[12px] text-[var(--color-ink-muted)]">{trainer.specialties}</div>}
          </div>
        </div>

        {tags.length > 0 && (
          <Section title="Специализация">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-chip)] px-3 py-1.5 text-[13px]">{t}</span>
              ))}
            </div>
          </Section>
        )}

        {trainer.bio && (
          <Section title="О себе">
            <div className="rounded-2xl bg-[var(--color-card)] p-3 text-[13px] leading-relaxed">{trainer.bio}</div>
          </Section>
        )}

        <GymsSection />

        {contacts.length > 0 && (
          <Section title="Контакты">
            <div className="overflow-hidden rounded-2xl">
              {contacts.map((c, i) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    className={`flex items-center gap-3 bg-[var(--color-card)] px-4 py-3 ${i < contacts.length - 1 ? 'border-b border-[var(--color-line)]' : ''}`}
                  >
                    <Icon size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
                    <span className="shrink-0 text-[13px] text-[var(--color-ink-muted)]">{c.label}</span>
                    <span className="ml-auto truncate text-[14px] font-semibold">{c.value}</span>
                    <ChevronRight size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
                  </a>
                );
              })}
            </div>
          </Section>
        )}

        <div className="overflow-hidden rounded-2xl">
          <button
            onClick={() => setShareOpen((v) => !v)}
            className="flex w-full items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5 text-left"
          >
            <Share2 size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
            <span className="flex-1 text-[14px] font-medium">Поделиться контактом</span>
            <ChevronRight
              size={16}
              className={`shrink-0 text-[var(--color-ink-muted)] transition-transform ${shareOpen ? 'rotate-90' : ''}`}
            />
          </button>
          {shareOpen && (
            <div className="border-b border-[var(--color-line)] bg-[var(--color-card)] px-4 pb-4 pt-2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Персональный ID
              </div>
              <div className="mt-1 text-[20px] font-bold tabular-nums tracking-[0.18em]">{trainer.shareCode ?? '—'}</div>
              {trainer.shareCode && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(trainer.shareCode!);
                    setCopied(true);
                  }}
                  className="mt-2 text-[12px] font-medium text-[var(--color-ink-muted)]"
                >
                  {copied ? 'Скопировано ✓' : 'Скопировать'}
                </button>
              )}
            </div>
          )}
          <div className="flex w-full items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-card)] px-4 py-3.5">
            <Settings size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
            <span className="flex-1 text-[14px] font-medium">Тема</span>
            <ThemeToggle />
          </div>
          <SettingRow icon={Bell} label="Уведомления" last />
        </div>

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
      </div>
    </div>
  );
}

function GymsSection() {
  const { data: gyms = [] } = useGyms();
  const create = useCreateGym();
  const remove = useDeleteGym();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const add = async () => {
    const value = name.trim();
    if (!value) return;
    await create.mutateAsync({ name: value, monthlyRent: null, note: null });
    setName('');
    setAdding(false);
  };

  return (
    <Section title="Залы">
      <div className="overflow-hidden rounded-2xl bg-[var(--color-card)] divide-y divide-[var(--color-line)]">
        {gyms.map((g) => (
          <div key={g.id} className="flex items-center gap-2 px-4 py-3 text-[14px]">
            <span className="min-w-0 flex-1 truncate">{g.name}</span>
            <button
              onClick={() => remove.mutate(g.id)}
              className="rounded-md p-1.5 text-[var(--color-ink-muted)]"
              aria-label="Удалить"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {adding ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add();
                if (e.key === 'Escape') { setName(''); setAdding(false); }
              }}
              placeholder="Алекс Фитнес, СССР, World Class…"
              className="flex-1 bg-transparent text-[14px] focus:outline-none"
            />
            <button
              onClick={add}
              disabled={!name.trim()}
              className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-[12px] font-semibold text-[var(--color-accent-on)] disabled:opacity-40"
            >
              Готово
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-medium text-[var(--color-ink-muted)]"
          >
            <Plus size={14} /> Добавить зал
          </button>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function SettingRow({ icon: Icon, label, hint, last, onClick }: { icon: LucideIcon; label: string; hint?: string; last?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick ?? (() => alert('Раздел в разработке'))}
      className={`flex w-full items-center gap-3 bg-[var(--color-card)] px-4 py-3.5 text-left ${last ? '' : 'border-b border-[var(--color-line)]'}`}
    >
      <Icon size={17} className="shrink-0 text-[var(--color-ink-muted)]" />
      <span className="flex-1 text-[14px] font-medium">{label}</span>
      {hint && <span className="text-[12px] text-[var(--color-ink-muted)]">{hint}</span>}
      <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
    </button>
  );
}
