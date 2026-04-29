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
  
  const shopData = await getUserRole(user.id);
  // Check both app_metadata and user_metadata for robustness
  const systemRole = (user.app_metadata?.system_role || user.user_metadata?.system_role) as string | undefined;
  
  console.log('[Auth] requireAuth:', { 
    email: user.email, 
    systemRole, 
    shopId: shopData?.shop_id, 
    role: shopData?.role 
  });
  
  return { user, shopId: shopData?.shop_id, role: shopData?.role, systemRole };
}
