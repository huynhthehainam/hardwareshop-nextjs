-- Add a nullable frequent-customer-specific price to product
alter table public.product add column if not exists price_for_frequent_customer numeric(12,2) null;
