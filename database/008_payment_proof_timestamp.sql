begin;

alter table public.orders
add column if not exists payment_proof_submitted_at timestamptz;

-- Backfill existing orders that already have proof.
-- updated_at is only an approximation for historical records,
-- because the original schema did not store proof submission time.
update public.orders
set payment_proof_submitted_at = updated_at
where payment_proof_url is not null
  and payment_proof_submitted_at is null;

commit;