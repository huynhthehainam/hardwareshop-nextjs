import { getCustomers } from '@/lib/db';
import CustomerList from './CustomerList';
import { requireAuth } from '@/lib/auth';

export default async function CustomersPage() {
  await requireAuth();
  const customers = await getCustomers();

  return (
    <div className="py-2">
      <CustomerList customers={customers} />
    </div>
  );
}
