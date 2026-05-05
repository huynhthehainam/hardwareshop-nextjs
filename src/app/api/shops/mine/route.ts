import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = await getUserRole(user.id);
  if (!userRole || !userRole.shop_id) {
    return NextResponse.json({ error: 'No shop associated' }, { status: 404 });
  }

  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', userRole.shop_id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
