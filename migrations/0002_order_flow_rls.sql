alter table public.order_detail enable row level security;
alter table public.customer enable row level security;

drop policy if exists "Users can create order details for their shops" on public.order_detail;
create policy "Users can create order details for their shops"
on public.order_detail
for insert
to authenticated
with check (
  exists (
    select 1
    from public."order"
    join public.user_shops on public.user_shops.shop_id = public."order".shop_id
    where public."order".id = order_detail.order_id
      and public.user_shops.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update customers" on public.customer;
create policy "Users can update customers"
on public.customer
for update
to authenticated
using (true)
with check (true);
