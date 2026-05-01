import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json([], { status: 200 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag')
      .select('*')
      .eq('shop_id', shopId)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { name, color } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag')
      .insert({
        name,
        color: color || '#64748B',
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
