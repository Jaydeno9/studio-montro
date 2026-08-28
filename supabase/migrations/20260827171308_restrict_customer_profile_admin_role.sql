-- Customers may manage their own editable profile fields, but admin status is
-- server-controlled and must never be writable through the public Data API.
revoke insert, update on table public.customer_profiles from anon, authenticated;

grant insert (user_id, full_name, phone)
on table public.customer_profiles
to authenticated;

grant update (full_name, phone, updated_at)
on table public.customer_profiles
to authenticated;
