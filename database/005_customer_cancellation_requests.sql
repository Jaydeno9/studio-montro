-- Studio MONTRO — customer cancellation request workflow

create table if not exists public.order_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  user_id uuid not null,
  status text not null default 'pending',
  reason text not null,
  resolution_message text,
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists order_cancellation_requests_one_pending_idx
  on public.order_cancellation_requests (order_id)
  where status = 'pending';

create index if not exists order_cancellation_requests_order_created_idx
  on public.order_cancellation_requests (order_id, created_at desc);

create index if not exists order_cancellation_requests_user_created_idx
  on public.order_cancellation_requests (user_id, created_at desc);

create or replace function public.request_order_cancellation(
  p_order_id uuid,
  p_user_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_request_id uuid;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Cancellation reason is required';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status not in ('pending_payment', 'processing', 'ready_to_ship') then
    raise exception 'Cancellation can no longer be requested for this order';
  end if;

  if exists (
    select 1
    from public.order_cancellation_requests
    where order_id = p_order_id
      and status = 'pending'
  ) then
    raise exception 'A cancellation request is already pending';
  end if;

  insert into public.order_cancellation_requests (
    order_id,
    user_id,
    status,
    reason
  )
  values (
    p_order_id,
    p_user_id,
    'pending',
    trim(p_reason)
  )
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

create or replace function public.resolve_order_cancellation_request(
  p_request_id uuid,
  p_changed_by uuid,
  p_action text,
  p_resolution_message text default null,
  p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request public.order_cancellation_requests%rowtype;
  v_cancel_reason text;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid cancellation request action';
  end if;

  select *
  into v_request
  from public.order_cancellation_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Cancellation request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Cancellation request has already been resolved';
  end if;

  if p_action = 'approve' then
    v_cancel_reason := coalesce(
      nullif(trim(p_resolution_message), ''),
      'Cancelled at customer request'
    );

    perform public.cancel_order_and_restore_stock(
      v_request.order_id,
      p_changed_by,
      v_cancel_reason
    );

    update public.order_cancellation_requests
    set status = 'approved',
        resolution_message = v_cancel_reason,
        admin_note = nullif(trim(p_admin_note), ''),
        reviewed_by = p_changed_by,
        reviewed_at = now(),
        updated_at = now()
    where id = p_request_id;
  else
    update public.order_cancellation_requests
    set status = 'rejected',
        resolution_message = coalesce(
          nullif(trim(p_resolution_message), ''),
          'Your cancellation request could not be approved.'
        ),
        admin_note = nullif(trim(p_admin_note), ''),
        reviewed_by = p_changed_by,
        reviewed_at = now(),
        updated_at = now()
    where id = p_request_id;
  end if;

  return v_request.order_id;
end;
$function$;
