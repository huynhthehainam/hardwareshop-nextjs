import { requireAuth } from '@/lib/auth';
import { getShop } from '@/lib/db';
import { redirect } from 'next/navigation';
import ShopAdminForm from './ShopAdminForm';

export default async function ShopAdminPage() {
  const { shopId, role } = await requireAuth();

  if (role !== 'admin' || !shopId) {
    redirect('/dashboard');
  }

  const shop = await getShop(shopId);

  return (
    <div className="space-y-6">
      <ShopAdminForm shop={shop} />
    </div>
  );
}
