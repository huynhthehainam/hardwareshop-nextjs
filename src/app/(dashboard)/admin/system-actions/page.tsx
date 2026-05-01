import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SystemActionsClient from './SystemActionsClient';

export default async function SystemActionsPage() {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    redirect('/dashboard');
  }

  return <SystemActionsClient />;
}
