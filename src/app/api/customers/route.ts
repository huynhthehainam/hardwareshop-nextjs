import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getCustomers } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const { shopId } = await requireAuth();
  const { searchParams } = new URL(request.url);
  
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';
  const hasDebt = searchParams.get('hasDebt') === 'true';

  try {
    const supabase = await createClient();
    let query = supabase
      .from('customer')
      .select('*')
      .is('deleted_at', null);

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    if (hasDebt) {
      query = query.neq('debt', 0);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ customers: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { shopId } = await requireAuth();
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customer')
    .insert({ ...body, shop_id: shopId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
