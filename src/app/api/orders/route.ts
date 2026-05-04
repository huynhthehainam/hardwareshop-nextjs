import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface OrderRequestItem {
  productId: string;
  quantity: number;
  unitId?: string;
  price: number;
  note?: string;
}

interface OrderRequestBody {
  customerId: string;
  items: OrderRequestItem[];
  deposit: number;
  totalCost: number;
  isFrequentCustomer?: boolean;
}

export async function GET(request: Request) {
  try {
    const { shopId, systemRole } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const supabase = await createClient();
    
    let query = supabase
      .from('order')
      .select('*, customer:customer_id(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by shop_id unless system_admin
    if (systemRole !== 'system_admin') {
      if (!shopId) return NextResponse.json({ data: [], count: 0 }, { status: 200 });
      query = query.eq('shop_id', shopId);
    }

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (search) {
      // Searching by Order ID or Customer Name
      query = query.or(`id.ilike.%${search}%,customer.name.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      // Add 23:59:59 to include the whole end date if only date is provided
      const endDateTime = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
      query = query.lte('created_at', endDateTime);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('API Orders GET Error:', error);
      throw error;
    }
    return NextResponse.json({ data, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as OrderRequestBody;
    const { customerId, items, deposit, totalCost, isFrequentCustomer } = body;

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
      is_frequent_customer: isFrequentCustomer ?? false,
    };

    const details = items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      unit_id: (item.unitId && item.unitId.trim() !== '') ? item.unitId : null,
      note: item.note,
    }));

    const result = await createOrder(order, details);
    const orderId = result.id;

    // Fetch full order with details to return for immediate printing/viewing
    const { data: fullOrder } = await supabase
      .from('order')
      .select('*, customer:customer_id(*)')
      .eq('id', orderId)
      .single();

    const { data: fullDetails } = await supabase
      .from('order_detail')
      .select('*')
      .eq('order_id', orderId);

    return NextResponse.json({ 
      order: fullOrder, 
      details: fullDetails 
    });
  } catch (error) {
    console.error('API Order Error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
