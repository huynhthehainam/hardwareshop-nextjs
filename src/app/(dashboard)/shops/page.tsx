import { requireAuth, getUserRole } from '@/lib/auth';
import { getShop } from '@/lib/db';
import { redirect } from 'next/navigation';
import ShopAdminForm from './ShopAdminForm';

export default async function ShopAdminPage() {
  const user = await requireAuth();
  const userRole = await getUserRole(user.id);

  if (!userRole || userRole.role !== 'admin') {
    redirect('/dashboard');
  }

  const shop = await getShop(userRole.shop_id);

  return (
    <div className="space-y-6">
      <ShopAdminForm shop={shop} />
    </div>
  );
}
