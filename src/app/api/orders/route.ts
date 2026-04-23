import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, items, deposit, totalCost } = body;

    // Get user's shop
    const { data: userShop } = await supabase
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!userShop) {
      return NextResponse.json({ error: 'User has no assigned shop' }, { status: 403 });
    }

    const order = {
      shop_id: userShop.shop_id,
      customer_id: customerId,
      deposit,
      total_cost: totalCost,
      created_by: user.id,
    };

    const details = items.map((item: any) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      unit_id: item.unitId || null, // Optional for now
    }));

    const result = await createOrder(order, details);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
