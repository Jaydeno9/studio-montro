-- Studio MONTRO — order core
-- Current production logic captured 2026-08-26.

create or replace function public.checkout_order(
  p_user_id uuid,
  p_address_id uuid,
  p_note text,
  p_payment_proof_url text
)
returns uuid
language plpgsql
as $function$
declare
  v_cart_id uuid;
  v_customer_id uuid;
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_item record;
  v_updated_rows int;
begin
  select id
  into v_customer_id
  from customer_profiles
  where user_id = p_user_id;

  if v_customer_id is null then
    raise exception 'Customer profile not found';
  end if;

  if not exists (
    select 1
    from addresses
    where id = p_address_id
      and customer_id = v_customer_id
  ) then
    raise exception 'Address not found or does not belong to user';
  end if;

  select id
  into v_cart_id
  from carts
  where user_id = p_user_id;

  if v_cart_id is null
     or not exists (
       select 1
       from cart_items
       where cart_id = v_cart_id
     )
  then
    raise exception 'Cart is empty';
  end if;

  perform 1
  from products p
  join cart_items ci on ci.product_id = p.id
  where ci.cart_id = v_cart_id
  for update;

  for v_item in
    select
      ci.id as cart_item_id,
      ci.product_id,
      ci.quantity,
      ci.selected_color_id,
      p.name as product_name,
      p.price,
      p.stock_quantity,
      p.status as product_status,
      pc.color_name
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_colors pc
      on pc.id = ci.selected_color_id
     and pc.product_id = ci.product_id
    where ci.cart_id = v_cart_id
  loop
    if v_item.product_status is distinct from 'active' then
      raise exception 'Product % is no longer available', v_item.product_name;
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Invalid quantity for product %', v_item.product_name;
    end if;

    if v_item.selected_color_id is not null then
      if not exists (
        select 1
        from product_colors pc
        where pc.id = v_item.selected_color_id
          and pc.product_id = v_item.product_id
      ) then
        raise exception 'Selected color is no longer valid for product %', v_item.product_name;
      end if;
    end if;

    if v_item.stock_quantity < v_item.quantity then
      raise exception
        'Insufficient stock for product %. Available: %, Requested: %',
        v_item.product_name,
        v_item.stock_quantity,
        v_item.quantity;
    end if;
  end loop;

  select coalesce(sum(p.price * ci.quantity), 0)
  into v_subtotal
  from cart_items ci
  join products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  insert into orders (
    user_id,
    customer_id,
    address_id,
    note,
    payment_proof_url,
    subtotal,
    total
  )
  values (
    p_user_id,
    v_customer_id,
    p_address_id,
    p_note,
    p_payment_proof_url,
    v_subtotal,
    v_subtotal
  )
  returning id into v_order_id;

  for v_item in
    select
      ci.product_id,
      ci.quantity,
      ci.selected_color_id,
      p.price,
      p.name,
      pc.color_name
    from cart_items ci
    join products p on p.id = ci.product_id
    left join product_colors pc on pc.id = ci.selected_color_id
    where ci.cart_id = v_cart_id
  loop
    insert into order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      selected_color_id,
      color_name
    )
    values (
      v_order_id,
      v_item.product_id,
      v_item.name,
      v_item.price,
      v_item.quantity,
      v_item.selected_color_id,
      v_item.color_name
    );

    update products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_item.product_id
      and stock_quantity >= v_item.quantity;

    get diagnostics v_updated_rows = row_count;

    if v_updated_rows = 0 then
      raise exception 'Insufficient stock for product %', v_item.name;
    end if;
  end loop;

  insert into order_status_history (order_id, status, changed_by)
  values (v_order_id, 'pending_payment', p_user_id);

  delete from cart_items
  where cart_id = v_cart_id;

  return v_order_id;
end;
$function$;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_new_status text,
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

  if p_new_status = v_order.status then
    return p_order_id;
  end if;

  if p_new_status = 'cancelled' then
    raise exception 'Cancellation must use the inventory restore flow';
  end if;

  if not (
    (v_order.status = 'pending_payment' and p_new_status = 'processing')
    or (v_order.status = 'processing' and p_new_status = 'ready_to_ship')
    or (v_order.status = 'ready_to_ship' and p_new_status = 'shipped')
    or (v_order.status = 'shipped' and p_new_status = 'delivered')
  ) then
    raise exception 'Invalid status transition: % -> %', v_order.status, p_new_status;
  end if;

  if p_new_status = 'processing'
     and v_order.payment_status <> 'verified'
  then
    raise exception 'Payment must be verified before processing';
  end if;

  update public.orders
  set status = p_new_status,
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, p_new_status, p_changed_by);

  return p_order_id;
end;
$function$;
