import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = await getUserRole(user.id);
  if (!userRole || userRole.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, phone, address, logo_url, qr_code_url } = body;

    const { data, error } = await supabase
      .from('shops')
      .update({
        name,
        phone,
        address,
        logo_url,
        qr_code_url,
      })
      .eq('id', userRole.shop_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ shop: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
