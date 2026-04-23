export type Role = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
}

export interface UserShop {
  user_id: string;
  shop_id: string;
  role: Role;
}

export interface Unit {
  id: string;
  name: string;
  type: string;
  is_main: boolean;
  conversion_rate: number;
}

export interface Product {
  id: string;
  name: string;
  default_unit_id: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  debt: number;
}

export interface CustomerDebtHistory {
  id: string;
  customer_id: string;
  change_amount: number;
  reason: string;
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  deposit: number;
  total_cost: number;
  created_by: string;
  created_at: string;
}

export interface OrderDetail {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_id: string;
  price: number;
}
