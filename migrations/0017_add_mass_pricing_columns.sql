ALTER TABLE public.product 
ADD COLUMN IF NOT EXISTS mass NUMERIC,
ADD COLUMN IF NOT EXISTS mass_price NUMERIC,
ADD COLUMN IF NOT EXISTS frequent_customer_sale_off NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.product.mass IS 'Mass of the product (e.g., in kg)';
COMMENT ON COLUMN public.product.mass_price IS 'Price per unit of mass';
COMMENT ON COLUMN public.product.frequent_customer_sale_off IS 'Sale off percentage for frequent customers';
