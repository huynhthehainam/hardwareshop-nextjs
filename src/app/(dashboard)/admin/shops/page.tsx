import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminShopList from './AdminShopList';

export default async function AdminShopsPage() {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="py-2">
      <AdminShopList />
    </div>
  );
}
