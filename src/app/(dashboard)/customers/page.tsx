import { getCustomers } from '@/lib/db';
import CustomerList from './CustomerList';
import { requireAuth } from '@/lib/auth';

export default async function CustomersPage() {
  const { shopId } = await requireAuth();
  const customers = await getCustomers(shopId || undefined);

  return (
    <div className="py-2">
      <CustomerList customers={customers} />
    </div>
  );
}
