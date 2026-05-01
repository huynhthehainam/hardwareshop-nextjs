import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * Rounds price according to user requirements:
 * (int)(Math.Round(Convert.ToDouble(price) / 1000, MidpointRounding.AwayFromZero) * 1000)
 */
function roundPrice(price: number): number {
  return Math.round(price / 1000) * 1000;
}

export async function POST(request: Request) {
  try {
    const { shopId, systemRole, role } = await requireAuth();
    
    if (role !== 'admin' && systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tagId, massPriceChange } = body;

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Find all products with the selected tag
    let productQuery = supabase
      .from('product')
      .select('*, product_tag_assignment!inner(tag_id)')
      .eq('product_tag_assignment.tag_id', tagId)
      .is('deleted_at', null)
      .not('mass', 'is', null)
      .not('mass_price', 'is', null);

    if (systemRole !== 'system_admin') {
      productQuery = productQuery.eq('shop_id', shopId);
    }

    const { data: products, error: productError } = await productQuery;

    if (productError) throw productError;
    if (!products || products.length === 0) {
      return NextResponse.json({ message: 'No eligible products found', updatedCount: 0 });
    }

    const updates = products.map(product => {
      const newMassPrice = Number(product.mass_price) + Number(massPriceChange);
      const rawDefaultPrice = Number(product.mass) * newMassPrice;
      const defaultPrice = roundPrice(rawDefaultPrice);
      
      const saleOff = Number(product.frequent_customer_sale_off ?? 0);
      const rawFrequentPrice = defaultPrice * (100 - saleOff) / 100;
      const frequentPrice = roundPrice(rawFrequentPrice);

      return {
        id: product.id,
        mass_price: newMassPrice,
        default_price: defaultPrice,
        price_for_frequent_customer: frequentPrice
      };
    });

    // 2. Perform updates one by one (Supabase doesn't support batch update with different values easily)
    // For large datasets, this should be an RPC
    let successCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('product')
        .update({
          mass_price: update.mass_price,
          default_price: update.default_price,
          price_for_frequent_customer: update.price_for_frequent_customer
        })
        .eq('id', update.id);
      
      if (!updateError) successCount++;
    }

    return NextResponse.json({ 
      message: `Updated ${successCount} products`, 
      updatedCount: successCount 
    });

  } catch (error: any) {
    console.error('Mass Price Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
