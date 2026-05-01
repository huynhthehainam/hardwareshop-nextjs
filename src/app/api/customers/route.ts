import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { user, shopId } = await requireAuth();

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const { name, phone, is_frequent_customer } = await request.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customer')
      .insert({ 
        name, 
        phone, 
        is_frequent_customer,
        shop_id: shopId
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ customer: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
