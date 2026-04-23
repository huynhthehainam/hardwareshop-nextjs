import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_shops')
    .select('role, shop_id')
    .eq('user_id', userId)
    .single();
    
  if (error) return null;
  return data;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
