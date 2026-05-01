-- Add shop_id to customer table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer' AND column_name = 'shop_id') THEN
        ALTER TABLE public.customer ADD COLUMN shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure shop_id is not nullable
ALTER TABLE public.customer ALTER COLUMN shop_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customer_shop_id ON public.customer(shop_id);

-- Update RLS policies to be shop-aware
DROP POLICY IF EXISTS "authenticated_manage_customer" ON public.customer;

CREATE POLICY "Users can view customers of their shops"
ON public.customer FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.customer.shop_id
  )
);

CREATE POLICY "Users can insert customers to their shops"
ON public.customer FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.customer.shop_id
  )
);

CREATE POLICY "Users can update customers of their shops"
ON public.customer FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.customer.shop_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.customer.shop_id
  )
);

CREATE POLICY "Users can delete customers of their shops"
ON public.customer FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.customer.shop_id
  )
);
