import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { tagIds } = body; // Array of tag IDs

    const supabase = await createClient();

    // First, verify the product belongs to the shop
    const { data: product } = await supabase
      .from('product')
      .select('id')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete existing assignments
    await supabase
      .from('product_tag_assignment')
      .delete()
      .eq('product_id', id);

    // Insert new assignments if any
    if (tagIds && tagIds.length > 0) {
      const assignments = tagIds.map((tagId: string) => ({
        product_id: id,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('product_tag_assignment')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag_assignment')
      .select('tag_id, product_tag(*)')
      .eq('product_id', id);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
