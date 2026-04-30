import { createClient } from '@/lib/supabase/server';
import { Shop, Product, Customer, Order, OrderDetail, Unit } from '@/types';

export async function getShops() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('shops').select('*');
  if (error) throw error;
  return data as Shop[];
}

export async function getProducts(shopId?: string) {
  const supabase = await createClient();
  let query = supabase.from('product').select('*').is('deleted_at', null);
  if (shopId) {
    query = query.eq('shop_id', shopId);
  }
  const { data, error } = await query.order('name', { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function getCustomers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Customer[];
}

export async function getCustomer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function getCustomerDebtHistory(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_debt_history')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CustomerDebtHistory[];
}

export async function getCustomerOrders(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('order')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Order[];
}

export async function getUnits() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('unit')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Unit[];
}

export async function getShop(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('shops').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Shop;
}

export async function getOrders(shopId?: string, searchTerm?: string) {
  const supabase = await createClient();
  console.log('[DB] getOrders called:', { shopId, searchTerm });
  
  if (searchTerm) {
    // If searching, we use !inner to allow filtering on the joined customer table.
    // However, this excludes walk-in customers. 
    // We'll perform two queries or a more complex one if possible.
    // For simplicity and correctness with Supabase JS:
    
    // Query 1: Search by customer name (requires !inner)
    let q1 = supabase
      .from('order')
      .select('*, customer:customer_id!inner(*)')
      .ilike('customer.name', `%${searchTerm}%`);
    if (shopId) q1 = q1.eq('shop_id', shopId);
    const { data: customerMatch, error: error1 } = await q1;

    // Query 2: Search by order ID (works for all orders including walk-ins)
    let q2 = supabase
      .from('order')
      .select('*, customer:customer_id(*)')
      .ilike('id', `%${searchTerm}%`);
    if (shopId) q2 = q2.eq('shop_id', shopId);
    const { data: idMatch, error: error2 } = await q2;

    if (error1 && error2) {
      console.error('[DB] getOrders search error:', { error1, error2 });
      throw error1;
    }

    // Combine and deduplicate
    const combined = [...(customerMatch || []), ...(idMatch || [])];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    return unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // No search term: regular fetch
  let query = supabase.from('order').select('*, customer:customer_id(*)');
  if (shopId) query = query.eq('shop_id', shopId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('[DB] getOrders fetch error:', error);
    throw error;
  }
  console.log('[DB] getOrders result count:', data?.length);
  return data;
}

export async function createOrder(order: Partial<Order>, details: Partial<OrderDetail>[]) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('create_order', {
    p_shop_id: order.shop_id,
    p_customer_id: order.customer_id,
    p_deposit: order.deposit,
    p_total_cost: order.total_cost,
    p_created_by: order.created_by,
    p_items: details.map(d => ({
      product_id: d.product_id,
      quantity: d.quantity,
      price: d.price,
      unit_id: d.unit_id,
      note: d.note
    }))
  });
    
  if (error) throw error;
  return data;
}

export async function revertOrder(orderId: string, deletedBy: string) {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('id, customer_id, total_cost, deposit, deleted_at')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw orderError ?? new Error('Order not found');
  if (order.deleted_at) throw new Error('ORDER_ALREADY_REVERTED');

  const debtDelta = Number(order.total_cost ?? 0) - Number(order.deposit ?? 0);

  if (order.customer_id && debtDelta !== 0) {
    const { data: customerData, error: customerError } = await supabase
      .from('customer')
      .select('debt')
      .eq('id', order.customer_id)
      .single();

    if (customerError) throw customerError;

    const nextDebt = Number(customerData?.debt ?? 0) - debtDelta;

    const { error: updateCustomerError } = await supabase
      .from('customer')
      .update({ debt: nextDebt })
      .eq('id', order.customer_id);

    if (updateCustomerError) throw updateCustomerError;

    const { error: historyError } = await supabase
      .from('customer_debt_history')
      .insert({
        customer_id: order.customer_id,
        change_amount: -debtDelta,
        reason_key: 'order_reverted',
        reason_params: { orderId: order.id },
      });

    if (historyError) throw historyError;
  }

  const { data: updatedOrder, error: updateOrderError } = await supabase
    .from('order')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (updateOrderError) throw updateOrderError;

  return updatedOrder;
}
