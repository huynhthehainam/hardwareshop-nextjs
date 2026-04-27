import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';

interface OrderRequestItem {
  productId: string;
  quantity: number;
  unitId?: string;
  price: number;
}

interface OrderRequestBody {
  customerId: string;
  items: OrderRequestItem[];
  deposit: number;
  totalCost: number;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as OrderRequestBody;
    const { customerId, items, deposit, totalCost } = body;

    // Validate product IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const item of items) {
      if (!item.productId || !uuidRegex.test(item.productId)) {
        return NextResponse.json({ error: `Invalid product ID: ${item.productId || 'empty'}` }, { status: 400 });
      }
    }

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

    const details = items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      unit_id: (item.unitId && item.unitId.trim() !== '') ? item.unitId : null,
    }));

    const result = await createOrder(order, details);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Order Error:', error);
    
    // Extract more meaningful error message if available from Supabase/Postgres
    const message = error.message || error.details || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
