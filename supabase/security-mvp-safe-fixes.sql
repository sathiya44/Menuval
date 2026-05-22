create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    'vendor'
  );
  return new;
end;
$$;

create or replace function public.get_public_order_by_token(p_token text)
returns table (
  token text,
  status public.order_status,
  total_amount numeric,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  shops jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    o.token,
    o.status,
    o.total_amount,
    o.accepted_at,
    o.preparing_at,
    o.ready_at,
    o.completed_at,
    o.created_at,
    jsonb_build_object('name', s.name, 'slug', s.slug) as shops
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.token = upper(p_token)
    and s.is_approved = true
    and s.is_restricted = false
  limit 1;
$$;

create or replace function public.get_public_order_for_append(p_token text)
returns table (
  id uuid,
  token text,
  status public.order_status,
  total_amount numeric,
  shop_id uuid
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.token, o.status, o.total_amount, o.shop_id
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.token = upper(p_token)
    and s.is_approved = true
    and s.is_restricted = false
  limit 1;
$$;

create or replace function public.get_public_discovery_dishes(p_shop_ids uuid[])
returns table (
  id uuid,
  shop_id uuid,
  name text,
  price numeric,
  offer_price numeric,
  rating numeric,
  is_available boolean
)
language sql
security definer
set search_path = public
as $$
  select
    d.id,
    d.shop_id,
    d.name,
    d.price,
    d.offer_price,
    d.rating,
    d.is_available
  from public.dishes d
  join public.shops s on s.id = d.shop_id
  where d.shop_id = any(p_shop_ids)
    and s.is_approved = true
    and s.is_restricted = false;
$$;

create or replace function public.create_public_order(
  p_shop_id uuid,
  p_token text,
  p_customer_name text,
  p_customer_phone text,
  p_note text,
  p_total_amount numeric,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid := gen_random_uuid();
  item jsonb;
  dish public.dishes%rowtype;
  computed_total numeric := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  if not exists (
    select 1
    from public.shops
    where id = p_shop_id
      and is_open = true
      and is_approved = true
      and is_restricted = false
  ) then
    raise exception 'shop_not_available';
  end if;

  insert into public.orders (
    id,
    shop_id,
    token,
    customer_name,
    customer_phone,
    note,
    status,
    total_amount
  )
  values (
    new_order_id,
    p_shop_id,
    upper(p_token),
    nullif(p_customer_name, ''),
    nullif(p_customer_phone, ''),
    nullif(p_note, ''),
    'pending',
    p_total_amount
  );

  for item in select * from jsonb_array_elements(p_items)
  loop
    if (item ->> 'quantity')::int <= 0 then
      raise exception 'invalid_quantity';
    end if;

    select d.*
    into dish
    from public.dishes d
    where d.id = (item ->> 'dish_id')::uuid
      and d.shop_id = p_shop_id
      and d.is_available = true
    limit 1;

    if dish.id is null then
      raise exception 'dish_not_available';
    end if;

    insert into public.order_items (
      order_id,
      dish_id,
      dish_name,
      quantity,
      unit_price
    )
    values (
      new_order_id,
      dish.id,
      dish.name,
      (item ->> 'quantity')::int,
      coalesce(dish.offer_price, dish.price)
    );

    computed_total := computed_total + (coalesce(dish.offer_price, dish.price) * (item ->> 'quantity')::int);
    dish := null;
  end loop;

  update public.orders
  set total_amount = computed_total
  where id = new_order_id;

  return upper(p_token);
end;
$$;

create or replace function public.append_public_order_items(
  p_token text,
  p_note text,
  p_total_amount numeric,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  item jsonb;
  dish public.dishes%rowtype;
  computed_total numeric := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  select o.*
  into target_order
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.token = upper(p_token)
    and o.status not in ('ready', 'completed')
    and s.is_approved = true
    and s.is_restricted = false
  limit 1;

  if target_order.id is null then
    raise exception 'order_not_available';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    if (item ->> 'quantity')::int <= 0 then
      raise exception 'invalid_quantity';
    end if;

    select d.*
    into dish
    from public.dishes d
    where d.id = (item ->> 'dish_id')::uuid
      and d.shop_id = target_order.shop_id
      and d.is_available = true
    limit 1;

    if dish.id is null then
      raise exception 'dish_not_available';
    end if;

    insert into public.order_items (
      order_id,
      dish_id,
      dish_name,
      quantity,
      unit_price
    )
    values (
      target_order.id,
      dish.id,
      dish.name,
      (item ->> 'quantity')::int,
      coalesce(dish.offer_price, dish.price)
    );

    computed_total := computed_total + (coalesce(dish.offer_price, dish.price) * (item ->> 'quantity')::int);
    dish := null;
  end loop;

  update public.orders
  set
    total_amount = total_amount + computed_total,
    note = coalesce(nullif(p_note, ''), note)
  where id = target_order.id;
end;
$$;

create or replace function public.submit_public_rating(
  p_shop_id uuid,
  p_dish_id uuid,
  p_customer_name text,
  p_rating int,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  review_count int;
  review_average numeric;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;

  if not exists (
    select 1
    from public.shops
    where id = p_shop_id
      and is_approved = true
      and is_restricted = false
  ) then
    raise exception 'shop_not_available';
  end if;

  if p_dish_id is not null and not exists (
    select 1
    from public.dishes
    where id = p_dish_id
      and shop_id = p_shop_id
  ) then
    raise exception 'dish_not_available';
  end if;

  insert into public.reviews (shop_id, dish_id, customer_name, rating, comment)
  values (
    p_shop_id,
    p_dish_id,
    nullif(p_customer_name, ''),
    p_rating,
    nullif(p_comment, '')
  );

  if p_dish_id is not null then
    select count(*), avg(rating)
    into review_count, review_average
    from public.reviews
    where dish_id = p_dish_id;

    update public.dishes
    set rating = round(review_average, 1), rating_count = review_count
    where id = p_dish_id;
  end if;
end;
$$;

grant execute on function public.get_public_order_by_token(text) to anon, authenticated;
grant execute on function public.get_public_order_for_append(text) to anon, authenticated;
grant execute on function public.get_public_discovery_dishes(uuid[]) to anon, authenticated;
grant execute on function public.create_public_order(uuid, text, text, text, text, numeric, jsonb) to anon, authenticated;
grant execute on function public.append_public_order_items(text, text, numeric, jsonb) to anon, authenticated;
grant execute on function public.submit_public_rating(uuid, uuid, text, int, text) to anon, authenticated;

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
for insert
with check (id = auth.uid() and role = 'vendor');

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid() and role <> 'admin');
