import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { user, shopId, systemRole } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    const supabase = await createClient();
    
    let query = supabase
      .from('product')
      .select('*, unit:default_unit_id(*)', { count: 'exact' })
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by shop_id unless system_admin
    if (systemRole !== 'system_admin') {
      if (!shopId) return NextResponse.json([], { status: 200 });
      query = query.eq('shop_id', shopId);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return NextResponse.json({ data, count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, role, shopId } = await requireAuth();
    
    // Only shop admin can manage products for now
    if (role !== 'admin' && !shopId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, default_unit_id, default_price, price_for_frequent_customer, image_url } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product')
      .insert({
        name,
        default_unit_id,
        default_price,
        price_for_frequent_customer,
        image_url,
        shop_id: shopId
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
