import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

export default async function RootPage() {
  const { systemRole } = await requireAuth();
  
  if (systemRole === 'system_admin') {
    redirect('/admin/shops');
  } else {
    redirect('/dashboard');
  }
}

