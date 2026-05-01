import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { tagIds } = body; // Array of tag IDs

    const supabase = await createClient();

    // First, verify the product belongs to the shop
    const { data: product } = await supabase
      .from('product')
      .select('id')
      .eq('id', params.id)
      .eq('shop_id', shopId)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete existing assignments
    await supabase
      .from('product_tag_assignment')
      .delete()
      .eq('product_id', params.id);

    // Insert new assignments if any
    if (tagIds && tagIds.length > 0) {
      const assignments = tagIds.map((tagId: string) => ({
        product_id: params.id,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('product_tag_assignment')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { shopId } = await requireAuth();
    if (!shopId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_tag_assignment')
      .select('tag_id, product_tag(*)')
      .eq('product_id', params.id);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
