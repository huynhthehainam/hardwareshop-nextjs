import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, shopId, systemRole } = await requireAuth();
    const { id } = await params;
    
    if (role !== 'admin' && systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, default_unit_id, default_price, price_for_frequent_customer, image_url, tagIds, mass, mass_price, frequent_customer_sale_off } = body;

    const supabase = await createClient();

    // Update product tags if provided
    if (tagIds !== undefined) {
      // Verify product belongs to shop first (already done by the update query's WHERE clause, 
      // but tags are separate table so we need to be careful)
      
      // Delete existing
      await supabase
        .from('product_tag_assignment')
        .delete()
        .eq('product_id', id);

      // Insert new
      if (tagIds && tagIds.length > 0) {
        const assignments = tagIds.map((tagId: string) => ({
          product_id: id,
          tag_id: tagId
        }));
        await supabase.from('product_tag_assignment').insert(assignments);
      }
    }
    
    let query = supabase
      .from('product')
      .update({
        name,
        default_unit_id,
        default_price,
        price_for_frequent_customer,
        image_url,
        mass,
        mass_price,
        frequent_customer_sale_off: frequent_customer_sale_off ?? 0
      })
      .eq('id', id);

    if (systemRole !== 'system_admin') {
      if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, role, shopId, systemRole } = await requireAuth();
    const { id } = await params;

    if (role !== 'admin' && systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    let query = supabase
      .from('product')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (systemRole !== 'system_admin') {
      if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
      query = query.eq('shop_id', shopId);
    }

    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
