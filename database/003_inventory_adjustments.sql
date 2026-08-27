-- Studio MONTRO — inventory adjustment RPC
-- Table/index definitions are included defensively for reproducibility.

create table if not exists public.product_inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  previous_quantity integer not null,
  adjustment integer not null,
  new_quantity integer not null,
  mode text not null,
  reason text not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists product_inventory_adjustments_product_created_idx
  on public.product_inventory_adjustments (product_id, created_at desc);

create or replace function public.adjust_product_inventory(
  p_product_id uuid,
  p_changed_by uuid,
  p_mode text,
  p_quantity integer,
  p_reason text,
  p_note text default null
)
returns public.product_inventory_adjustments
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_product public.products%rowtype;
  v_previous integer;
  v_new integer;
  v_adjustment integer;
  v_record public.product_inventory_adjustments%rowtype;
begin
  if p_mode not in ('add', 'remove', 'set') then
    raise exception 'Invalid inventory adjustment mode';
  end if;

  if p_reason not in ('restock', 'manual_correction', 'damaged', 'return', 'other') then
    raise exception 'Invalid inventory adjustment reason';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantity must be zero or greater';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_previous := v_product.stock_quantity;

  if p_mode = 'add' then
    v_new := v_previous + p_quantity;
  elsif p_mode = 'remove' then
    v_new := v_previous - p_quantity;
  else
    v_new := p_quantity;
  end if;

  if v_new < 0 then
    raise exception 'Inventory cannot go below zero';
  end if;

  v_adjustment := v_new - v_previous;

  update public.products
  set stock_quantity = v_new,
      updated_at = now()
  where id = p_product_id;

  insert into public.product_inventory_adjustments (
    product_id,
    previous_quantity,
    adjustment,
    new_quantity,
    mode,
    reason,
    note,
    changed_by
  )
  values (
    p_product_id,
    v_previous,
    v_adjustment,
    v_new,
    p_mode,
    p_reason,
    nullif(trim(p_note), ''),
    p_changed_by
  )
  returning * into v_record;

  return v_record;
end;
$function$;
