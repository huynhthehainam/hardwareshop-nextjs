import { 
  getCustomer, 
  getCustomerDebtHistory, 
  getCustomerOrders 
} from '@/lib/db';
import CustomerDetail from './CustomerDetail';
import { requireAuth } from '@/lib/auth';
import { notFound } from 'next/navigation';

export default async function CustomerDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  await requireAuth();
  
  try {
    const { id } = await params;
    const [customer, debtHistory, orders] = await Promise.all([
      getCustomer(id),
      getCustomerDebtHistory(id),
      getCustomerOrders(id)
    ]);

    if (!customer) {
      return notFound();
    }

    return (
      <div className="py-2">
        <CustomerDetail 
          customer={customer} 
          debtHistory={debtHistory} 
          orders={orders} 
        />
      </div>
    );
  } catch (e) {
    console.error(e);
    return notFound();
  }
}
