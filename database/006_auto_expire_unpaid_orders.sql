-- Studio MONTRO — 24-hour unpaid order expiry
-- Requires pg_cron.

create extension if not exists pg_cron;

create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order record;
  v_cancelled_count integer := 0;
begin
  for v_order in
    select o.id
    from public.orders o
    where o.status = 'pending_payment'
      and o.payment_status = 'pending'
      and o.payment_proof_url is null
      and o.created_at <= now() - interval '24 hours'
    order by o.created_at asc
    for update skip locked
  loop
    begin
      perform public.cancel_order_and_restore_stock(
        v_order.id,
        null,
        'Payment was not received within the 24-hour payment window.'
      );

      update public.order_cancellation_requests
      set status = 'approved',
          resolution_message =
            'The order was automatically cancelled because the 24-hour payment window expired.',
          admin_note = 'Automatically resolved by payment-expiry job.',
          reviewed_by = null,
          reviewed_at = now(),
          updated_at = now()
      where order_id = v_order.id
        and status = 'pending';

      v_cancelled_count := v_cancelled_count + 1;
    exception
      when others then
        raise warning 'Could not expire unpaid order %: %', v_order.id, sqlerrm;
    end;
  end loop;

  return v_cancelled_count;
end;
$function$;

-- Idempotently replace the named job if it already exists.
do $$
declare
  v_job_id bigint;
begin
  select jobid
  into v_job_id
  from cron.job
  where jobname = 'studio-montro-expire-unpaid-orders'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'studio-montro-expire-unpaid-orders',
    '*/5 * * * *',
    'select public.expire_unpaid_orders();'
  );
end;
$$;
