import { createClient } from '@/lib/supabase/server';
import { Shop, Product, Customer, Order, OrderDetail } from '@/types';

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
  
  const { data: orderData, error: orderError } = await supabase
    .from('order')
    .insert(order)
    .select()
    .single();
    
  if (orderError) throw orderError;
  
  const orderDetailsWithId = details.map(d => ({ ...d, order_id: orderData.id }));
  
  const { error: detailsError } = await supabase
    .from('order_detail')
    .insert(orderDetailsWithId);
    
  if (detailsError) throw detailsError;
  
  return orderData;
}
