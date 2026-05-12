import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface OrderRequestItem {
  productId: string;
  quantity: number;
  unitId?: string;
  price: number;
  totalCost: number;
  note?: string;
  isFreeDetail?: boolean;
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
      const trimmedSearch = search.trim();

      // Step 1: find matching customers (limit smaller for safety)
      const { data: matchingCustomers } = await supabase
        .from('customer')
        .select('id')
        .is('deleted_at', null)
        .or(`name.ilike.%${trimmedSearch}%,phone.ilike.%${trimmedSearch}%`)
        .limit(100); // reduce from 5000

      const customerIds = (matchingCustomers ?? [])
        .map((row) => row.id)
        .filter(Boolean);

      console.log('Matching customer IDs for search:', customerIds);
      // Step 2: apply OR conditions
      const filters: string[] = [];

      if (customerIds.length > 0) {
        const inList = customerIds.map((id) => `"${id}"`).join(',');
        filters.push(`customer_id.in.(${inList})`);
      }

      // If nothing matched → force empty result
      if (filters.length === 0) {
        return NextResponse.json({ data: [], count: 0 });
      }

      query = query.or(filters.join(','));
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
    console.log('data', data);  
    if (error) {
      console.error('API Orders GET Error:', error);
      return NextResponse.json({ error }, { status: 400 });
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
      total_cost: item.totalCost,
      unit_id: (item.unitId && item.unitId.trim() !== '') ? item.unitId : null,
      note: item.note,
      is_free_detail: item.isFreeDetail ?? false,
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
