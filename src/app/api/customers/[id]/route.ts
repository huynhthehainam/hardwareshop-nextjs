import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, shopId } = await requireAuth();
    const { id } = await params;

    const { name, phone, is_frequent_customer } = await request.json();
    const supabase = await createClient();
    
    // Use shopId filter to ensure we only update customers in our shop
    // RLS also handles this, but explicit filter is better.
    let query = supabase
      .from('customer')
      .update({ name, phone, is_frequent_customer })
      .eq('id', id);

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ customer: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}