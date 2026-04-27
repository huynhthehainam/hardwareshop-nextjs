-- Drop the overly permissive policy
DROP POLICY IF EXISTS "authenticated_manage_shops" ON public.shops;

-- Create more restrictive policies for shops
CREATE POLICY "Anyone can view shops"
ON public.shops FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update their own shop"
ON public.shops FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.shops.id
    AND user_shops.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_shops
    WHERE user_shops.user_id = auth.uid()
    AND user_shops.shop_id = public.shops.id
    AND user_shops.role = 'admin'
  )
);
