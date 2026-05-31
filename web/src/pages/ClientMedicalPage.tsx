import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient, useUpdateClient } from '../api/clients';
import { useClientProgressPhotos, useUploadProgressPhoto, useDeleteProgressPhoto, type ProgressPhoto } from '../api/progress-photos';
import { useConfirm } from '../components/ConfirmProvider';
import { fullName } from '../lib/initials';
import { Section } from './ClientCardPage';

/**
 * Подэкран медкарты клиента. Заметки и файлы выводятся одним хронологическим
 * списком (новые сверху) и добавляются через две кнопки внизу секции.
 */
export function ClientMedicalPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  const { data: files = [] } = useClientProgressPhotos(id);

  // Парсим medicalNotes на отдельные заметки: формат «DD.MM.YYYY — текст»,
  // разделитель — пустая строка. Заметки старого формата (без даты)
  // отдаём как одну запись с прочерком.
  const noteItems = useMemo(() => parseNotes(client?.medicalNotes ?? null), [client?.medicalNotes]);

  // Файлы — только те, что помечены note='medical' (общий бакет с прогрессом).
  const fileItems = useMemo(() => files.filter((f) => f.note?.startsWith('medical')), [files]);

  // Объединяем в один таймлайн (новое сверху).
  // index в note сохраняем — он нужен для редактирования/удаления конкретной заметки.
  const timeline = useMemo(() => {
    const note: TimelineItem[] = noteItems.map((n, i) => ({
      kind: 'note', ts: n.iso ?? '0000-00-00', date: n.date, body: n.body, index: i,
    }));
    const file: TimelineItem[] = fileItems.map((f) => ({ kind: 'file', ts: f.date, date: formatDateRu(f.date), file: f }));
    return [...note, ...file].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [noteItems, fileItems]);

  if (!client) return null;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Медкарта · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-3">
        <Section title="Медкарта" indicator={timeline.length > 0}>
          <div className="space-y-2">
            {timeline.length === 0 && (
              <div className="rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
                Пока пусто. Добавьте заметку или загрузите файл.
              </div>
            )}
            {timeline.map((it, i) => (
              <TimelineRow key={`${it.kind}-${i}`} item={it} clientId={id} />
            ))}
            <Actions clientId={id} />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Типы и парсинг ─────────────────────────────────────────────────────────

type ParsedNote = { date: string; body: string; iso?: string };
type TimelineItem =
  | { kind: 'note'; ts: string; date: string; body: string; index: number }
  | { kind: 'file'; ts: string; date: string; file: ProgressPhoto };

// Распарсить medicalNotes в массив. Каждая запись — блок, разделённый
// пустой строкой. Если первая строка имеет формат «DD.MM.YYYY — …»,
// выделяем дату; иначе считаем «без даты».
function parseNotes(raw: string | null): ParsedNote[] {
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+[—\-]\s+([\s\S]+)$/);
      if (m) {
        const [, d, mo, y, body] = m;
        return { date: `${d}.${mo}.${y}`, body: body.trim(), iso: `${y}-${mo}-${d}` };
      }
      return { date: '—', body: chunk };
    });
}

// ─── Рендер строки таймлайна ────────────────────────────────────────────────

function TimelineRow({ item, clientId }: { item: TimelineItem; clientId: string }) {
  const remove = useDeleteProgressPhoto(clientId);
  const confirm = useConfirm();
  const onDeleteFile = async (id: string) => {
    if (!(await confirm('Удалить файл?', { confirmLabel: 'Удалить', danger: true }))) return;
    await remove.mutateAsync(id);
  };
  if (item.kind === 'note') {
    return <NoteRow item={item} clientId={clientId} />;
  }
  const f = item.file;
  // Имя файла из note: «medical:Анализы крови» → «Анализы крови».
  const title = f.note?.startsWith('medical:') ? f.note.slice('medical:'.length) : 'Файл';
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(f.url);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-card)] p-3">
      <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
        {isImage ? (
          <img src={f.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-card-elevated)]">
            <FileText size={18} className="text-[var(--color-ink-muted)]" />
          </span>
        )}
      </a>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{title}</div>
        <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-mutedXL)]">
          {item.date}
        </div>
      </div>
      <button
        onClick={() => onDeleteFile(f.id)}
        className="rounded-md p-1.5 text-[var(--color-ink-muted)]"
        aria-label="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// Отдельная строка-заметка с редактированием и hold-to-delete.
function NoteRow({
  item,
  clientId,
}: {
  item: Extract<TimelineItem, { kind: 'note' }>;
  clientId: string;
}) {
  const { data: client } = useClient(clientId);
  const update = useUpdateClient(clientId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.body);

  const saveAll = async (next: ParsedNote[]) => {
    if (!client) return;
    const merged = next.length === 0
      ? null
      : next.map((n) => (n.date && n.date !== '—' ? `${n.date} — ${n.body}` : n.body)).join('\n\n');
    await update.mutateAsync({
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
      medicalNotes: merged,
      restingPulse: client.restingPulse ?? null,
      scheduleDay: client.scheduleDay ?? null,
      scheduleTime: client.scheduleTime ?? null,
      currentTrainingType: client.currentTrainingType ?? null,
      accountId: client.accountId ?? null,
    });
  };

  const onSave = async () => {
    const t = text.trim();
    if (!t || !client) return;
    const current = parseNotes(client.medicalNotes ?? null);
    current[item.index] = { ...current[item.index], body: t };
    await saveAll(current);
    setEditing(false);
  };

  const onDelete = async () => {
    if (!client) return;
    const current = parseNotes(client.medicalNotes ?? null);
    current.splice(item.index, 1);
    await saveAll(current);
  };

  if (editing) {
    return (
      <div className="rounded-2xl bg-[var(--color-card)] p-3 space-y-2">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-xl bg-[var(--color-card-elevated)] p-3 text-[14px] resize-none focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setText(item.body); setEditing(false); }}
            className="flex-1 rounded-xl bg-[var(--color-chip)] py-2 text-[13px] font-medium"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={!text.trim() || update.isPending}
            className="flex-1 rounded-xl bg-[var(--color-accent)] py-2 text-[13px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
          >
            {update.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-[var(--color-card)] p-4 pr-16">
      <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-mutedXL)]">
        {item.date}
      </div>
      <div className="mt-1 text-[14px] leading-relaxed whitespace-pre-line">{item.body}</div>
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-muted)] active:bg-black/10"
          aria-label="Редактировать"
        >
          <Pencil size={14} />
        </button>
        <HoldDeleteButton onConfirm={onDelete} />
      </div>
    </div>
  );
}

// Кнопка-крестик: удерживай 1.2 сек, по дуге снизу заполняется прогресс,
// после чего onConfirm. Если палец отпустил — таймер сбрасывается.
function HoldDeleteButton({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [pressing, setPressing] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  const HOLD_MS = 1200;

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const start = () => {
    if (done) return;
    setPressing(true);
    timerRef.current = window.setTimeout(async () => {
      setDone(true);
      try { await onConfirm(); } catch { /* noop */ }
    }, HOLD_MS);
  };
  const stop = () => {
    if (done) return;
    setPressing(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // SVG-кольцо вокруг крестика: stroke-dashoffset анимируется keyframes hold-progress.
  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-muted)] active:bg-black/10"
      aria-label={done ? 'Удалено' : 'Удерживайте для удаления'}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 28 28" width={28} height={28}>
        <circle cx="14" cy="14" r="11" stroke="transparent" strokeWidth="1.5" fill="none" />
        <circle
          cx="14" cy="14" r="11"
          stroke={done ? 'var(--color-accent)' : 'var(--color-danger)'}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: 69.1,
            strokeDashoffset: done ? 0 : 69.1,
            animation: pressing && !done ? `hold-progress ${HOLD_MS}ms linear forwards` : undefined,
          }}
        />
      </svg>
      {done
        ? <Check size={14} strokeWidth={2.4} style={{ color: 'var(--color-accent)' }} />
        : <X size={14} strokeWidth={2.2} />}
    </button>
  );
}

// ─── Кнопки добавления ─────────────────────────────────────────────────────

type Sheet = null | 'note' | 'file';

function Actions({ clientId }: { clientId: string }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  if (sheet === 'note') return <NoteForm clientId={clientId} onClose={() => setSheet(null)} />;
  if (sheet === 'file') return <FileForm clientId={clientId} onClose={() => setSheet(null)} />;
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <button
        onClick={() => setSheet('note')}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
      >
        <Plus size={15} /> Заметка
      </button>
      <button
        onClick={() => setSheet('file')}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]"
      >
        <Paperclip size={15} /> Файл
      </button>
    </div>
  );
}

function NoteForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data: client } = useClient(clientId);
  const update = useUpdateClient(clientId);
  const [text, setText] = useState('');

  const save = async () => {
    if (!client) return;
    const t = text.trim();
    if (!t) return;
    const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const stamped = `${today} — ${t}`;
    const merged = client.medicalNotes ? `${stamped}\n\n${client.medicalNotes}` : stamped;
    await update.mutateAsync({
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
      medicalNotes: merged,
      restingPulse: client.restingPulse ?? null,
      scheduleDay: client.scheduleDay ?? null,
      scheduleTime: client.scheduleTime ?? null,
      currentTrainingType: client.currentTrainingType ?? null,
      accountId: client.accountId ?? null,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-3 space-y-2">
      <div className="text-[12px] text-[var(--color-ink-muted)]">Новая заметка</div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Например: жалуется на колено, рекомендована мягкая нагрузка…"
        className="w-full rounded-xl bg-[var(--color-card-elevated)] p-3 text-[14px] resize-none focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-[var(--color-chip)] py-2 text-[13px] font-medium"
        >
          Отмена
        </button>
        <button
          onClick={save}
          disabled={!text.trim() || update.isPending}
          className="flex-1 rounded-xl bg-[var(--color-accent)] py-2 text-[13px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
        >
          {update.isPending ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function FileForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const upload = useUploadProgressPhoto(clientId);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const save = async () => {
    if (!file) return;
    const t = name.trim() || 'Файл';
    const date = new Date().toISOString().slice(0, 10);
    await upload.mutateAsync({ file, date, angle: 'front', note: `medical:${t}` });
    onClose();
  };

  return (
    <div className="rounded-2xl bg-[var(--color-card)] p-3 space-y-2">
      <div className="text-[12px] text-[var(--color-ink-muted)]">Новый файл</div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название (Анализ крови, МРТ колена…)"
        className="w-full rounded-xl bg-[var(--color-card-elevated)] px-3 py-2.5 text-[14px] focus:outline-none"
      />
      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-line)] py-3 text-[13px] font-medium text-[var(--color-ink-muted)]">
        <Paperclip size={15} />
        {file ? file.name : 'Выбрать файл'}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-[var(--color-chip)] py-2 text-[13px] font-medium"
        >
          Отмена
        </button>
        <button
          onClick={save}
          disabled={!file || upload.isPending}
          className="flex-1 rounded-xl bg-[var(--color-accent)] py-2 text-[13px] font-semibold text-[var(--color-accent-on)] disabled:opacity-50"
        >
          {upload.isPending ? 'Загрузка…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}
