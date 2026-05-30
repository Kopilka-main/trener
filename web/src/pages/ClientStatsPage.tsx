import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { fullName } from '../lib/initials';
import { Section, StatsSection } from './ClientCardPage';

/**
 * Подэкран статистики клиента: графики прогресса, история тренировок,
 * посещаемость, тоннаж, личные рекорды + блок-заглушки прогресса тела.
 */
export function ClientStatsPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  if (!client) return null;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Статистика · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3 space-y-5">
        <StatsSection clientId={id} />

        {/* Прогресс тела — заглушки */}
        <Section title="Прогресс тела">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] p-3">
              <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-mutedXL)]">
                ОБЪЁМЫ
              </div>
              <div className="mt-1 text-[12px] text-[var(--color-ink-muted)]">Вес, обхваты, % жира</div>
              <span className="mt-2 inline-block rounded bg-[var(--color-chip)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                СКОРО
              </span>
            </div>
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-card)] p-3">
              <div className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-mutedXL)]">
                ФОТО
              </div>
              <div className="mt-1 text-[12px] text-[var(--color-ink-muted)]">До / после</div>
              <span className="mt-2 inline-block rounded bg-[var(--color-chip)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                СКОРО
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
