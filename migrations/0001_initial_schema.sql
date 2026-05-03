-- Consolidated Migration Script
-- This script contains the entire schema for the Hardware Shop application.
-- Optimized for performance and portability across Supabase projects.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. TABLES

-- Shops
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Units
CREATE TABLE IF NOT EXISTS public.unit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    is_main BOOLEAN DEFAULT TRUE,
    conversion_rate NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    debt NUMERIC DEFAULT 0,
    is_frequent_customer BOOLEAN DEFAULT FALSE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_unit_id UUID REFERENCES public.unit(id) ON DELETE SET NULL,
    default_price NUMERIC DEFAULT 0,
    image_url TEXT,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    price_for_frequent_customer NUMERIC,
    mass NUMERIC,
    mass_price NUMERIC,
    frequent_customer_sale_off NUMERIC DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- User-Shop Mapping
CREATE TABLE IF NOT EXISTS public.user_shops (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    role TEXT CHECK (role = ANY (ARRAY['admin'::text, 'staff'::text])),
    PRIMARY KEY (user_id, shop_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS public."order" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer(id) ON DELETE CASCADE,
    deposit NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    debt_after_order NUMERIC,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Order Details
CREATE TABLE IF NOT EXISTS public.order_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public."order"(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.product(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    unit_id UUID REFERENCES public.unit(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL,
    note TEXT
);

-- Customer Debt History
CREATE TABLE IF NOT EXISTS public.customer_debt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    change_amount NUMERIC NOT NULL,
    reason_key TEXT NOT NULL,
    reason_params JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Product Tags
CREATE TABLE IF NOT EXISTS public.product_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#64748B',
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, shop_id)
);

-- Product Tag Assignments
CREATE TABLE IF NOT EXISTS public.product_tag_assignment (
    product_id UUID NOT NULL REFERENCES public.product(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.product_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- 3. INDEXES

-- Shop-level filtering (Multi-tenant performance)
CREATE INDEX IF NOT EXISTS idx_customer_shop_id ON public.customer(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_shop_id ON public.product(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_shop_id ON public."order"(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_shops_shop_id ON public.user_shops(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_tag_shop_id ON public.product_tag(shop_id);

-- Soft delete performance (Partial indexes)
CREATE INDEX IF NOT EXISTS idx_customer_active ON public.customer(shop_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_product_active ON public.product(shop_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_order_active ON public."order"(shop_id) WHERE (deleted_at IS NULL);

-- Search performance (Trigram GIN indexes for ILIKE)
CREATE INDEX IF NOT EXISTS idx_customer_name_trgm ON public.customer USING gin (name gin_trgm_ops) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_product_name_trgm ON public.product USING gin (name gin_trgm_ops) WHERE (deleted_at IS NULL);

-- Foreign Keys & Joins
CREATE INDEX IF NOT EXISTS idx_order_customer_id ON public."order"(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_created_by ON public."order"(created_by);
CREATE INDEX IF NOT EXISTS idx_order_detail_order_id ON public.order_detail(order_id);
CREATE INDEX IF NOT EXISTS idx_order_detail_product_id ON public.order_detail(product_id);
CREATE INDEX IF NOT EXISTS idx_order_detail_unit_id ON public.order_detail(unit_id);
CREATE INDEX IF NOT EXISTS idx_product_default_unit_id ON public.product(default_unit_id);
CREATE INDEX IF NOT EXISTS idx_customer_debt_history_customer_id ON public.customer_debt_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_tag_assignment_tag_id ON public.product_tag_assignment(tag_id);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON public.customer(phone) WHERE (deleted_at IS NULL);

-- Sorting & Dashboard
CREATE INDEX IF NOT EXISTS idx_order_created_at_desc ON public."order"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_created_at_desc ON public.customer(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_created_at_desc ON public.product(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_debt_history_created_at_desc ON public.customer_debt_history(created_at DESC);

-- 4. FUNCTIONS

-- System Admin Check (Optimized for RLS performance by prioritizing JWT claims)
CREATE OR REPLACE FUNCTION public.is_system_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT 
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'system_role') = 'system_admin', false)
    OR 
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'system_role') = 'system_admin', false);
$$;

-- Shop Role Check
CREATE OR REPLACE FUNCTION public.has_shop_role(p_shop_id uuid, p_allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_shops
    WHERE user_id = auth.uid()
      AND shop_id = p_shop_id
      AND role = ANY(p_allowed_roles)
  );
$$;

-- Atomic Order Creation
CREATE OR REPLACE FUNCTION public.create_order(
  p_shop_id UUID,
  p_customer_id UUID,
  p_deposit NUMERIC,
  p_total_cost NUMERIC,
  p_created_by UUID,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_debt_after_order NUMERIC;
  v_current_debt NUMERIC;
  v_debt_delta NUMERIC;
  v_item RECORD;
BEGIN
  v_debt_delta := p_total_cost - p_deposit;
  IF p_customer_id IS NOT NULL THEN
    SELECT debt INTO v_current_debt FROM public.customer WHERE id = p_customer_id;
    v_debt_after_order := COALESCE(v_current_debt, 0) + v_debt_delta;
  ELSE
    v_debt_after_order := NULL;
  END IF;

  INSERT INTO public."order" (shop_id, customer_id, deposit, total_cost, created_by, debt_after_order)
  VALUES (p_shop_id, p_customer_id, p_deposit, p_total_cost, p_created_by, v_debt_after_order)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, price NUMERIC, unit_id UUID, note TEXT)
  LOOP
    INSERT INTO public.order_detail (order_id, product_id, quantity, price, unit_id, note)
    VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item.price, v_item.unit_id, v_item.note);
  END LOOP;

  IF p_customer_id IS NOT NULL AND v_debt_delta <> 0 THEN
    UPDATE public.customer SET debt = v_debt_after_order WHERE id = p_customer_id;
    INSERT INTO public.customer_debt_history (customer_id, change_amount, reason_key, reason_params)
    VALUES (p_customer_id, v_debt_delta, 'order_created', jsonb_build_object('orderId', v_order_id));
  END IF;

  RETURN jsonb_build_object('id', v_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table Names Retrieval
CREATE OR REPLACE FUNCTION public.get_table_names()
 RETURNS TABLE(table_schema text, table_name text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT table_schema::text, table_name::text
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND table_schema = 'public';
$$;

-- Dashboard Stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_shop_id uuid)
 RETURNS TABLE(total_revenue numeric, active_orders_count bigint, total_customers_count bigint, total_debt numeric)
 LANGUAGE plpgsql
 STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COALESCE(SUM(o.total_cost), 0) FROM "order" o WHERE o.shop_id = p_shop_id AND o.deleted_at IS NULL) as total_revenue,
    (SELECT COUNT(*) FROM "order" o WHERE o.shop_id = p_shop_id AND o.deleted_at IS NULL) as active_orders_count,
    (SELECT COUNT(*) FROM "customer" c WHERE c.shop_id = p_shop_id AND c.deleted_at IS NULL) as total_customers_count,
    (SELECT COALESCE(SUM(c.debt), 0) FROM "customer" c WHERE c.shop_id = p_shop_id AND c.deleted_at IS NULL) as total_debt;
END;
$$;

-- 5. RLS POLICIES

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_debt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_assignment ENABLE ROW LEVEL SECURITY;

-- Shops
CREATE POLICY "System admin full access" ON public.shops FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "View shops" ON public.shops FOR SELECT TO authenticated USING (is_system_admin() OR has_shop_role(id, ARRAY['admin', 'staff']));
CREATE POLICY "Manage shops" ON public.shops FOR ALL TO authenticated USING (is_system_admin() OR has_shop_role(id, ARRAY['admin']));

-- User Shops
CREATE POLICY "System admin full access" ON public.user_shops FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "View user shops" ON public.user_shops FOR SELECT TO authenticated USING (is_system_admin() OR (user_id = auth.uid()));
CREATE POLICY "Manage user shops" ON public.user_shops FOR ALL TO authenticated USING (is_system_admin());

-- Units
CREATE POLICY "System admin full access" ON public.unit FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "Users can see units" ON public.unit FOR SELECT TO authenticated USING (true);

-- Products
CREATE POLICY "System admin full access" ON public.product FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "Users can see products from their shops" ON public.product FOR SELECT TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Shop staff can manage products" ON public.product FOR ALL TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff'])) WITH CHECK (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));

-- Customers
CREATE POLICY "System admin full access" ON public.customer FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "Users can view customers of their shops" ON public.customer FOR SELECT TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Users can insert customers to their shops" ON public.customer FOR INSERT TO authenticated WITH CHECK (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Users can update customers of their shops" ON public.customer FOR UPDATE TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff'])) WITH CHECK (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Users can delete customers of their shops" ON public.customer FOR DELETE TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));

-- Orders
CREATE POLICY "System admin full access" ON public."order" FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "View orders" ON public."order" FOR SELECT TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Manage orders" ON public."order" FOR ALL TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));

-- Order Details
CREATE POLICY "System admin full access" ON public.order_detail FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "View order details" ON public.order_detail FOR SELECT TO authenticated USING (is_system_admin() OR (EXISTS (SELECT 1 FROM "order" o WHERE o.id = order_detail.order_id AND has_shop_role(o.shop_id, ARRAY['admin', 'staff']))));
CREATE POLICY "Manage order details" ON public.order_detail FOR ALL TO authenticated USING (is_system_admin() OR (EXISTS (SELECT 1 FROM "order" o WHERE o.id = order_detail.order_id AND has_shop_role(o.shop_id, ARRAY['admin', 'staff']))));

-- Debt History
CREATE POLICY "System admin full access" ON public.customer_debt_history FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "customer_debt_history_select_authenticated" ON public.customer_debt_history FOR SELECT TO authenticated USING (is_system_admin() OR (EXISTS (SELECT 1 FROM customer c WHERE c.id = customer_debt_history.customer_id AND has_shop_role(c.shop_id, ARRAY['admin', 'staff']))));
CREATE POLICY "customer_debt_history_insert_authenticated" ON public.customer_debt_history FOR INSERT TO authenticated WITH CHECK (is_system_admin() OR (EXISTS (SELECT 1 FROM customer c WHERE c.id = customer_debt_history.customer_id AND has_shop_role(c.shop_id, ARRAY['admin', 'staff']))));

-- Tags
CREATE POLICY "System admin full access" ON public.product_tag FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "Users can view tags of their shops" ON public.product_tag FOR SELECT TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));
CREATE POLICY "Users can manage tags of their shops" ON public.product_tag FOR ALL TO authenticated USING (is_system_admin() OR has_shop_role(shop_id, ARRAY['admin', 'staff']));

-- Tag Assignments
CREATE POLICY "System admin full access" ON public.product_tag_assignment FOR ALL TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());
CREATE POLICY "Users can view tag assignments of their shops" ON public.product_tag_assignment FOR SELECT TO authenticated USING (is_system_admin() OR (EXISTS (SELECT 1 FROM product p WHERE p.id = product_tag_assignment.product_id AND has_shop_role(p.shop_id, ARRAY['admin', 'staff']))));
CREATE POLICY "Users can manage tag assignments of their shops" ON public.product_tag_assignment FOR ALL TO authenticated USING (is_system_admin() OR (EXISTS (SELECT 1 FROM product p WHERE p.id = product_tag_assignment.product_id AND has_shop_role(p.shop_id, ARRAY['admin', 'staff']))));

-- 6. STORAGE

-- Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-qrs', 'payment-qrs', true) ON CONFLICT (id) DO NOTHING;

-- Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('shop-logos', 'product-images', 'payment-qrs'));
    
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('shop-logos', 'product-images', 'order-attachments', 'payment-qrs'));
    
    DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
    CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('shop-logos', 'product-images', 'order-attachments', 'payment-qrs'));
    
    DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
    CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('shop-logos', 'product-images', 'order-attachments', 'payment-qrs'));
END $$;

-- 7. SEED DATA

-- System Admin User
-- Email: huynhthehainam@gmail.com
-- Password: Admin@123
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmed_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'huynhthehainam@gmail.com',
    extensions.crypt('Admin@123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"system_role":"system_admin"}'::jsonb,
    '{"system_role":"system_admin"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- Identity for the user (important for some Supabase features)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    format('{"sub":"%s","email":"%s"}','00000000-0000-0000-0000-000000000001','huynhthehainam@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- Units
INSERT INTO public.unit (id, name, type, is_main, conversion_rate) VALUES
('db28cdf8-eab9-4008-a51f-514672306b83', 'meter', 'length', true, 1),
('590b54f8-6660-47ba-8735-015180eb4df0', 'kilogram', 'mass', true, 1),
('d11089e2-4e5a-42fe-b05c-87dd0caf9d0f', 'box', 'count', true, 1),
('cec5a701-2a20-4d12-9492-4631653421e7', 'set', 'count', true, 1),
('79b95ac1-4244-4db2-a6dc-9b45c2fe980a', 'piece', 'count', true, 1),
('bc6f0d1f-0b06-49ba-b714-e055af8aa252', 'roll', 'count', true, 1),
('096f781e-8a38-4b48-9dcb-636e67a1919b', 'bag', 'count', true, 1),
('57bda6d7-b382-4a5e-b935-f32ac17a23ec', 'stick', 'count', true, 1),
('aa860d11-39f1-4566-9179-46eabcfede57', 'can', 'count', true, 1),
('e7725bb2-082d-46a9-928b-3046c949d6bf', 'bottle', 'count', true, 1),
('aa3f54d2-aa9c-40bd-b864-7e38f6f78bfb', 'sheet', 'count', true, 1),
('fea4f093-5866-4066-9361-4638ecd5ca30', 'liter', 'volume', true, 1),
('ae1d5a5a-39d7-41fd-887b-787d6c7053dc', 'tael', 'mass', true, 1)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    is_main = EXCLUDED.is_main,
    conversion_rate = EXCLUDED.conversion_rate;
