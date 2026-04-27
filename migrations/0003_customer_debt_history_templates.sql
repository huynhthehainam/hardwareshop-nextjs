alter table public.customer_debt_history
  add column if not exists reason_key text;

alter table public.customer_debt_history
  add column if not exists reason_params jsonb not null default '{}'::jsonb;

update public.customer_debt_history
set
  reason_key = case
    when reason_key is not null then reason_key
    when reason like 'Order % created' then 'order_created'
    else 'legacy_text'
  end,
  reason_params = case
    when reason_key = 'order_created' or reason like 'Order % created' then
      jsonb_build_object(
        'orderId',
        regexp_replace(reason, '^Order (.+) created$', '\1')
      )
    else
      coalesce(reason_params, '{}'::jsonb)
  end
where reason_key is null;

alter table public.customer_debt_history
  alter column reason_key set not null;

alter table public.customer_debt_history
  drop column if exists reason;

alter table public.customer_debt_history
  drop column if exists reason_vi;
