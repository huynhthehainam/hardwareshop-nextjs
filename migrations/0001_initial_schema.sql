create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.customer (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text not null,
  debt numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.unit (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_vi text,
  type text,
  is_main boolean default false,
  conversion_rate numeric(12, 4) default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit_id uuid references public.unit(id) on delete set null,
  default_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_shops (
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, shop_id)
);

create table if not exists public."order" (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid references public.customer(id) on delete set null,
  deposit numeric(12, 2) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  debt_after_order numeric(12, 2),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_detail (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public."order"(id) on delete cascade,
  product_id uuid references public.product(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_id uuid references public.unit(id) on delete set null,
  price numeric(12, 2) not null default 0
);

create table if not exists public.customer_debt_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer(id) on delete cascade,
  change_amount numeric(12, 2) not null,
  reason_key text not null,
  reason_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_customer_phone on public.customer(phone);
create index if not exists idx_product_default_unit_id on public.product(default_unit_id);
create index if not exists idx_user_shops_shop_id on public.user_shops(shop_id);
create index if not exists idx_order_shop_id on public."order"(shop_id);
create index if not exists idx_order_customer_id on public."order"(customer_id);
create index if not exists idx_order_created_by on public."order"(created_by);
create index if not exists idx_order_detail_order_id on public.order_detail(order_id);
create index if not exists idx_order_detail_product_id on public.order_detail(product_id);
create index if not exists idx_customer_debt_history_customer_id on public.customer_debt_history(customer_id);
create index if not exists idx_customer_debt_history_created_at on public.customer_debt_history(created_at desc);

alter table public.shops enable row level security;
alter table public.customer enable row level security;
alter table public.unit enable row level security;
alter table public.product enable row level security;
alter table public.user_shops enable row level security;
alter table public."order" enable row level security;
alter table public.order_detail enable row level security;
alter table public.customer_debt_history enable row level security;

drop policy if exists "authenticated_manage_shops" on public.shops;
drop policy if exists "authenticated_manage_customer" on public.customer;
drop policy if exists "authenticated_manage_unit" on public.unit;
drop policy if exists "authenticated_manage_product" on public.product;
drop policy if exists "authenticated_manage_user_shops" on public.user_shops;
drop policy if exists "authenticated_manage_order" on public."order";
drop policy if exists "authenticated_manage_order_detail" on public.order_detail;
drop policy if exists "authenticated_manage_customer_debt_history" on public.customer_debt_history;

create policy "authenticated_manage_shops"
on public.shops
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_customer"
on public.customer
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_unit"
on public.unit
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_product"
on public.product
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_user_shops"
on public.user_shops
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_order"
on public."order"
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_order_detail"
on public.order_detail
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_manage_customer_debt_history"
on public.customer_debt_history
for all
to authenticated
using (true)
with check (true);
