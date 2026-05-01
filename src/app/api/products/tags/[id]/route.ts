import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase
      .from('product_tag')
      .delete()
      .eq('id', params.id)
      .eq('shop_id', shopId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const body = await request.json();
    const { name, color } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag')
      .update({ name, color })
      .eq('id', params.id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
