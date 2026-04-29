import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { user } = await requireAuth();
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product')
      .select('*, unit:default_unit_id(*)')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, role } = await requireAuth();
    
    // Only shop admin can manage products for now
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, default_unit_id, default_price, image_url } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product')
      .insert({
        name,
        default_unit_id,
        default_price,
        image_url
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
