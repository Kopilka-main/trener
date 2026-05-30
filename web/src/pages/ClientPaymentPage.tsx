import { useParams } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { useClient } from '../api/clients';
import { fullName } from '../lib/initials';
import { BalanceCard, ExpenseBlock, PackagesBlock, Section } from './ClientCardPage';

/**
 * Подэкран оплаты клиента: баланс (проведено / по оплате),
 * пакеты тренировок и расходы по этому клиенту.
 */
export function ClientPaymentPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: client } = useClient(id);
  if (!client) return null;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={`Оплата · ${fullName(client.firstName, client.lastName)}`} back />
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
        <Section title="Тренировки и оплата">
          <BalanceCard clientId={id} />
          <PackagesBlock clientId={id} />
          <ExpenseBlock clientName={fullName(client.firstName, client.lastName)} />
        </Section>
      </div>
    </div>
  );
}
