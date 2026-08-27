-- Studio MONTRO — payment proof + verification
-- Current production logic captured 2026-08-26.

create or replace function public.submit_order_payment_proof(
  p_order_id uuid,
  p_user_id uuid,
  p_payment_proof_url text
)
returns uuid
language plpgsql
as $function$
declare
  v_order record;
begin
  if p_payment_proof_url is null or btrim(p_payment_proof_url) = '' then
    raise exception 'Payment proof path cannot be empty';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id <> p_user_id then
    raise exception 'You do not have permission to update this order';
  end if;

  if v_order.status <> 'pending_payment' then
    raise exception 'Payment proof cannot be submitted for this order';
  end if;

  if v_order.payment_status <> 'pending' then
    raise exception 'Payment is no longer pending';
  end if;

  if v_order.payment_proof_url is not null then
    raise exception 'Payment proof has already been submitted';
  end if;

  if now() >= v_order.created_at + interval '24 hours' then
    raise exception 'Payment window has expired';
  end if;

  if p_payment_proof_url not like
       p_user_id::text || '/' || p_order_id::text || '/%'
  then
    raise exception 'Invalid payment proof path';
  end if;

  if not exists (
    select 1
    from storage.objects so
    where so.bucket_id = 'payment-proofs'
      and so.name = p_payment_proof_url
  ) then
    raise exception 'Uploaded payment proof file was not found';
  end if;

  update public.orders
  set
  payment_proof_url = p_payment_proof_url,
  payment_proof_submitted_at = now(),
  updated_at = now()
  where id = p_order_id;

  return p_order_id;
end;
$function$;

create or replace function public.verify_order_payment(
  p_order_id uuid,
  p_changed_by uuid
)
returns uuid
language plpgsql
as $function$
declare
  v_order record;
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
    raise exception 'Cancelled orders cannot be verified';
  end if;

  if v_order.status <> 'pending_payment' then
    raise exception 'Payment cannot be verified from order status %', v_order.status;
  end if;

  if v_order.payment_status = 'verified' then
    raise exception 'Payment is already verified';
  end if;

  if v_order.payment_status <> 'pending' then
    raise exception 'Payment cannot be verified from payment status %', v_order.payment_status;
  end if;

  if v_order.payment_proof_url is null or btrim(v_order.payment_proof_url) = '' then
    raise exception 'Payment proof is required before verification';
  end if;

  if not exists (
    select 1
    from storage.objects so
    where so.bucket_id = 'payment-proofs'
      and so.name = v_order.payment_proof_url
  ) then
    raise exception 'Payment proof file is missing';
  end if;

  update public.orders
  set payment_status = 'verified',
      status = 'processing',
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, 'processing', p_changed_by);

  return p_order_id;
end;
$function$;
