import { Instagram, MessageCircle, Phone, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ContactKind = 'phone' | 'telegram' | 'whatsapp' | 'instagram' | 'max';

const META: Record<ContactKind, { icon: LucideIcon; label: string; href: (v: string) => string }> = {
  phone: {
    icon: Phone,
    label: 'Телефон',
    href: (v) => `tel:${v.replace(/[^\d+]/g, '')}`,
  },
  telegram: {
    icon: Send,
    label: 'Telegram',
    href: (v) => `https://t.me/${v.replace(/^@/, '')}`,
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    href: (v) => `https://wa.me/${v.replace(/[^\d]/g, '')}`,
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    href: (v) => `https://instagram.com/${v.replace(/^@/, '')}`,
  },
  max: {
    icon: MessageCircle,
    label: 'MAX',
    href: (v) => `https://max.ru/${v.replace(/^@/, '')}`,
  },
};

export function ContactLink({ kind, value, last }: { kind: ContactKind; value: string; last?: boolean }) {
  const m = META[kind];
  const Icon = m.icon;
  return (
    <a
      href={m.href(value)}
      target={kind === 'phone' ? undefined : '_blank'}
      rel="noopener noreferrer"
      className={`flex items-center gap-3 bg-[var(--color-card)] px-4 py-3 ${last ? '' : 'border-b border-[var(--color-line)]'}`}
    >
      <Icon size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
      <span className="shrink-0 text-[13px] text-[var(--color-ink-muted)]">{m.label}</span>
      <span className="ml-auto truncate text-[14px] font-semibold">{value}</span>
    </a>
  );
}

export function contactList(client: {
  phone: string | null;
  telegram: string | null;
  whatsapp: string | null;
  instagram: string | null;
  max: string | null;
}): { kind: ContactKind; value: string }[] {
  const out: { kind: ContactKind; value: string }[] = [];
  if (client.phone) out.push({ kind: 'phone', value: client.phone });
  if (client.telegram) out.push({ kind: 'telegram', value: client.telegram });
  if (client.whatsapp) out.push({ kind: 'whatsapp', value: client.whatsapp });
  if (client.instagram) out.push({ kind: 'instagram', value: client.instagram });
  if (client.max) out.push({ kind: 'max', value: client.max });
  return out;
}
