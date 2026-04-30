-- Add is_frequent_customer column to customer table
alter table public.customer add column if not exists is_frequent_customer boolean not null default false;