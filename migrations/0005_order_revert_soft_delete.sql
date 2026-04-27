alter table public."order"
  add column if not exists deleted_at timestamptz;

alter table public."order"
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

drop policy if exists "Users can update orders for their shops" on public."order";
create policy "Users can update orders for their shops"
on public."order"
for update
to authenticated
using (
  exists (
    select 1
    from public.user_shops
    where public.user_shops.user_id = (select auth.uid())
      and public.user_shops.shop_id = public."order".shop_id
  )
)
with check (
  exists (
    select 1
    from public.user_shops
    where public.user_shops.user_id = (select auth.uid())
      and public.user_shops.shop_id = public."order".shop_id
  )
);
