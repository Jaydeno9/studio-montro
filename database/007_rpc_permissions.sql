begin;

revoke execute on function public.checkout_order(
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

revoke execute on function public.submit_order_payment_proof(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke execute on function public.verify_order_payment(
  uuid,
  uuid
) from public, anon, authenticated;

revoke execute on function public.transition_order_status(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

revoke execute on function public.cancel_order_and_restore_stock(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke execute on function public.complete_order_refund(
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

revoke execute on function public.request_order_cancellation(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke execute on function public.resolve_order_cancellation_request(
  uuid,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;

revoke execute on function public.adjust_product_inventory(
  uuid,
  uuid,
  text,
  integer,
  text,
  text
) from public, anon, authenticated;

revoke execute on function public.expire_unpaid_orders()
from public, anon, authenticated;


grant execute on function public.checkout_order(
  uuid,
  uuid,
  text,
  text
) to service_role;

grant execute on function public.submit_order_payment_proof(
  uuid,
  uuid,
  text
) to service_role;

grant execute on function public.verify_order_payment(
  uuid,
  uuid
) to service_role;

grant execute on function public.transition_order_status(
  uuid,
  text,
  uuid
) to service_role;

grant execute on function public.cancel_order_and_restore_stock(
  uuid,
  uuid,
  text
) to service_role;

grant execute on function public.complete_order_refund(
  uuid,
  uuid,
  text,
  text
) to service_role;

grant execute on function public.request_order_cancellation(
  uuid,
  uuid,
  text
) to service_role;

grant execute on function public.resolve_order_cancellation_request(
  uuid,
  uuid,
  text,
  text,
  text
) to service_role;

grant execute on function public.adjust_product_inventory(
  uuid,
  uuid,
  text,
  integer,
  text,
  text
) to service_role;

grant execute on function public.expire_unpaid_orders() 
to service_role;

commit;