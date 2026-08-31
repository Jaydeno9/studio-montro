alter function public.checkout_order(uuid, uuid, text, text)
set search_path = public;

alter function public.submit_order_payment_proof(uuid, uuid, text)
set search_path = '';

alter function public.verify_order_payment(uuid, uuid)
set search_path = '';

alter function public.transition_order_status(uuid, text, uuid)
set search_path = '';
