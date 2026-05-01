import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase
      .from('product_tag')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag')
      .update({ name, color })
      .eq('id', id)
      .eq('shop_id', shopId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
