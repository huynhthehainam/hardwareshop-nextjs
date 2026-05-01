-- Fix customer cascade
ALTER TABLE public.customer
DROP CONSTRAINT IF EXISTS customer_shop_id_fkey,
ADD CONSTRAINT customer_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES public.shops(id)
  ON DELETE CASCADE;

-- Fix product cascade
ALTER TABLE public.product
DROP CONSTRAINT IF EXISTS product_shop_id_fkey,
ADD CONSTRAINT product_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES public.shops(id)
  ON DELETE CASCADE;

-- Fix order cascade (shop_id)
ALTER TABLE public.order
DROP CONSTRAINT IF EXISTS order_shop_id_fkey,
ADD CONSTRAINT order_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES public.shops(id)
  ON DELETE CASCADE;

-- Fix order cascade (customer_id)
ALTER TABLE public.order
DROP CONSTRAINT IF EXISTS order_customer_id_fkey,
ADD CONSTRAINT order_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES public.customer(id)
  ON DELETE CASCADE;

-- Fix order_detail cascade (product_id)
ALTER TABLE public.order_detail
DROP CONSTRAINT IF EXISTS order_detail_product_id_fkey,
ADD CONSTRAINT order_detail_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.product(id)
  ON DELETE CASCADE;
