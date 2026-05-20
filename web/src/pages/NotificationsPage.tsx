import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTrainerAlerts, type TrainerAlert } from '../api/alerts';

// «Системный диалог» в чате: лента активных уведомлений, оформлена
// как сообщения от приложения. Каждое сообщение ведёт в карточку клиента.
export function NotificationsPage() {
  const { data: alerts = [], isLoading } = useTrainerAlerts();
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={
          <span className="flex items-center justify-center gap-2">
            <Bell size={16} />
            <span>Уведомления</span>
          </span>
        }
        back
      />
      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2 space-y-2">
        {isLoading && (
          <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">Загрузка…</div>
        )}
        {!isLoading && alerts.length === 0 && (
          <div className="mx-auto mt-10 max-w-[280px] rounded-2xl bg-[var(--color-card)] p-6 text-center text-[13px] text-[var(--color-ink-muted)]">
            <Bell size={20} className="mx-auto mb-2 opacity-50" />
            Сейчас активных уведомлений нет. Здесь будут появляться оповещения
            об оплате и пакетах клиентов.
          </div>
        )}
        {alerts.map((a, i) => (
          <NotificationBubble key={`${a.type}-${a.clientId}-${i}`} alert={a} />
        ))}
      </div>
    </div>
  );
}

function NotificationBubble({ alert }: { alert: TrainerAlert }) {
  const navigate = useNavigate();
  const isDanger = alert.severity === 'danger';
  const color = isDanger ? 'var(--color-danger)' : '#d9912b';
  const bg = isDanger ? 'rgba(200,57,44,0.08)' : 'rgba(217,145,43,0.10)';
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: bg, color }}
      >
        <AlertTriangle size={16} />
      </div>
      <div className="min-w-0 max-w-[85%] rounded-2xl bg-[var(--color-card)] p-3 space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
          {alert.type === 'unpaid'
            ? 'Требуется оплата'
            : alert.type === 'no_upcoming'
              ? 'Нет занятий на неделю'
              : 'Скоро закончится пакет'}
        </div>
        <div className="text-[14px] font-semibold">{alert.clientName}</div>
        <div className="text-[13px] text-[var(--color-ink-muted)]">{alert.message}</div>
        <button
          onClick={() => navigate(`/trainer/clients/${alert.clientId}`)}
          className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium"
          style={{ color }}
        >
          Открыть карточку <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
