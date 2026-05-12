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
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  qr_code_url?: string | null;
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
  default_unit_id: string | null;
  default_price: number;
  price_for_frequent_customer?: number | null;
  image_url?: string | null;
  deleted_at?: string | null;
  mass?: number | null;
  mass_price?: number | null;
  frequent_customer_sale_off?: number | null;
}

export interface ProductTag {
  id: string;
  shop_id: string;
  name: string;
  color?: string | null;
  created_at: string;
}

export interface ProductWithTags extends Product {
  product_tag_assignment: {
    tag_id: string;
    product_tag: ProductTag;
  }[];
}

export interface Customer {
  id: string;
  shop_id: string;
  phone: string;
  name: string;
  debt: number;
}

export interface CustomerDebtHistory {
  id: string;
  customer_id: string;
  change_amount: number;
  reason_key: string;
  reason_params?: Record<string, string | number | boolean | null> | null;
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  deposit: number;
  total_cost: number;
  is_frequent_customer: boolean;
  debt_after_order?: number | null;
  created_by: string;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface OrderWithCustomer extends Order {
  customer: Customer;
}

export interface OrderDetail {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  unit_id: string | null;
  price: number;
  total_cost: number;
  note?: string | null;
  is_free_detail?: boolean | null;
  free_product_name?: string | null;
  free_unit_name?: string | null;
}
