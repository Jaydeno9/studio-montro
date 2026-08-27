-- Studio MONTRO — cancellation + manual refund workflow

create table if not exists public.order_refund_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  event text not null,
  amount numeric not null,
  reference text,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists order_refund_history_order_created_idx
  on public.order_refund_history (order_id, created_at);

alter table public.orders
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists refund_status text not null default 'not_required',
  add column if not exists refund_reference text,
  add column if not exists refund_note text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_by uuid;

create or replace function public.cancel_order_and_restore_stock(
  p_order_id uuid,
  p_changed_by uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'cancelled' then
    return p_order_id;
  end if;

  if v_order.status not in ('pending_payment', 'processing', 'ready_to_ship') then
    raise exception 'Order cannot be cancelled from status %', v_order.status;
  end if;

  for v_item in
    select oi.product_id,
           sum(oi.quantity)::integer as quantity_to_restore
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
    group by oi.product_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_item.quantity_to_restore,
        updated_at = now()
    where id = v_item.product_id;

    if not found then
      raise exception 'Unable to restore stock for product %', v_item.product_id;
    end if;
  end loop;

  update public.orders
  set status = 'cancelled',
      cancellation_reason = nullif(trim(p_reason), ''),
      cancelled_at = now(),
      cancelled_by = p_changed_by,
      refund_status = case
        when payment_status = 'verified' then 'required'
        else 'not_required'
      end,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, 'cancelled', p_changed_by);

  if v_order.payment_status = 'verified' then
    insert into public.order_refund_history (
      order_id,
      event,
      amount,
      changed_by
    )
    values (
      p_order_id,
      'required',
      v_order.total,
      p_changed_by
    );
  end if;

  return p_order_id;
end;
$function$;

create or replace function public.complete_order_refund(
  p_order_id uuid,
  p_changed_by uuid,
  p_reference text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status <> 'cancelled' then
    raise exception 'Only cancelled orders can be refunded';
  end if;

  if v_order.payment_status <> 'verified' then
    raise exception 'Order payment was not verified';
  end if;

  if v_order.refund_status = 'completed' then
    return p_order_id;
  end if;

  if v_order.refund_status <> 'required' then
    raise exception 'Refund is not required for this order';
  end if;

  if nullif(trim(p_reference), '') is null then
    raise exception 'Refund reference is required';
  end if;

  update public.orders
  set refund_status = 'completed',
      refund_reference = trim(p_reference),
      refund_note = nullif(trim(p_note), ''),
      refunded_at = now(),
      refunded_by = p_changed_by,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_refund_history (
    order_id,
    event,
    amount,
    reference,
    note,
    changed_by
  )
  values (
    p_order_id,
    'completed',
    v_order.total,
    trim(p_reference),
    nullif(trim(p_note), ''),
    p_changed_by
  );

  return p_order_id;
end;
$function$;
