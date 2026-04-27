import { createClient } from '@/lib/supabase/server';
import { Shop, Product, Customer, Order, OrderDetail, Unit } from '@/types';

export async function getShops() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('shops').select('*');
  if (error) throw error;
  return data as Shop[];
}

export async function getProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('product').select('*');
  if (error) throw error;
  return data as Product[];
}

export async function getCustomers() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('customer').select('*');
  if (error) throw error;
  return data as Customer[];
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

export async function getOrders(shopId?: string) {
  const supabase = await createClient();
  let query = supabase.from('order').select('*, customer:customer_id(*)');
  if (shopId) {
    query = query.eq('shop_id', shopId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createOrder(order: Partial<Order>, details: Partial<OrderDetail>[]) {
  const supabase = await createClient();
  
  // Start a transaction-like process (Supabase doesn't have multi-table transactions in JS client easily without RPC)
  // Ideally use a Postgres function (RPC) for this to ensure atomicity.
  const debtDelta = Number(order.total_cost ?? 0) - Number(order.deposit ?? 0);
  let nextDebt: number | null = null;

  if (order.customer_id && debtDelta !== 0) {
    const { data: customerData, error: customerError } = await supabase
      .from('customer')
      .select('debt')
      .eq('id', order.customer_id)
      .single();

    if (customerError) throw customerError;

    nextDebt = Number(customerData?.debt ?? 0) + debtDelta;
  }
  
  const { data: orderData, error: orderError } = await supabase
    .from('order')
    .insert({
      ...order,
      debt_after_order: nextDebt,
    })
    .select()
    .single();
    
  if (orderError) throw orderError;
  
  const orderDetailsWithId = details.map(d => ({ ...d, order_id: orderData.id }));
  
  const { error: detailsError } = await supabase
    .from('order_detail')
    .insert(orderDetailsWithId);
    
  if (detailsError) throw detailsError;

  if (order.customer_id && debtDelta !== 0) {
    const { error: updateCustomerError } = await supabase
      .from('customer')
      .update({ debt: nextDebt })
      .eq('id', order.customer_id);

    if (updateCustomerError) throw updateCustomerError;

    const { error: historyError } = await supabase
      .from('customer_debt_history')
      .insert({
        customer_id: order.customer_id,
        change_amount: debtDelta,
        reason_key: 'order_created',
        reason_params: { orderId: orderData.id },
      });

    if (historyError) throw historyError;
  }
  
  return orderData;
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
