alter table public."order"
  add column if not exists debt_after_order numeric(12, 2);

with order_history as (
  select
    cdh.customer_id,
    cdh.change_amount,
    cdh.created_at,
    cdh.id,
    cdh.reason_params ->> 'orderId' as order_id,
    c.debt as current_customer_debt,
    coalesce(
      sum(cdh.change_amount) over (
        partition by cdh.customer_id
        order by cdh.created_at desc, cdh.id desc
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as later_change_total
  from public.customer_debt_history cdh
  join public.customer c on c.id = cdh.customer_id
  where cdh.reason_key = 'order_created'
)
update public."order" o
set debt_after_order = order_history.current_customer_debt - order_history.later_change_total
from order_history
where o.id::text = order_history.order_id
  and o.debt_after_order is null;
