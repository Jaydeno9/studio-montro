# Studio MONTRO database source of truth

This folder versions the PostgreSQL/Supabase business logic used by the FastAPI backend.

Apply files in numeric order in Supabase SQL Editor for a fresh environment.

Important:
- These files mirror the currently running RPC/business logic captured on 2026-08-26.
- Do not put Supabase service-role keys, passwords, JWTs, or other secrets in this folder.
- The scheduled expiry job is defined in `006_auto_expire_unpaid_orders.sql` and requires `pg_cron`.
- A future permissions-hardening migration should only be added after confirming the backend uses a service-role key for database RPC calls.

Main RPCs:
- `checkout_order`
- `transition_order_status`
- `submit_order_payment_proof`
- `verify_order_payment`
- `adjust_product_inventory`
- `cancel_order_and_restore_stock`
- `complete_order_refund`
- `request_order_cancellation`
- `resolve_order_cancellation_request`
- `expire_unpaid_orders`
