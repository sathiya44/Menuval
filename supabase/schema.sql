create extension if not exists "pgcrypto";

create type public.app_role as enum ('customer', 'vendor', 'admin');
create type public.plan_type as enum ('free', 'premium');
create type public.order_status as enum ('pending', 'accepted', 'preparing', 'ready', 'completed');
create type public.subscription_status as enum ('active', 'expired', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'vendor',
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  address text,
  location text,
  opening_hours text,
  is_open boolean not null default true,
  is_approved boolean not null default false,
  is_restricted boolean not null default false,
  is_featured boolean not null default false,
  image_url text,
  logo_url text,
  active_plan public.plan_type not null default 'free',
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price numeric(10, 2) not null check (price >= 0),
  offer_price numeric(10, 2) check (offer_price is null or offer_price >= 0),
  rating numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  is_available boolean not null default true,
  is_offer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  token text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  customer_name text,
  customer_phone text,
  note text,
  status public.order_status not null default 'pending',
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id uuid not null references public.dishes(id) on delete restrict,
  dish_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  customer_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  plan public.plan_type not null,
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  razorpay_subscription_id text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create table public.shop_public_links (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  slug text not null unique,
  qr_image_url text,
  created_at timestamptz not null default now()
);

create index shops_vendor_id_idx on public.shops(vendor_id);
create index shops_slug_idx on public.shops(slug);
create index dishes_shop_id_idx on public.dishes(shop_id);
create index orders_shop_created_idx on public.orders(shop_id, created_at desc);
create index reviews_shop_created_idx on public.reviews(shop_id, created_at desc);

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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shops_updated_at before update on public.shops
for each row execute function public.set_updated_at();

create trigger dishes_updated_at before update on public.dishes
for each row execute function public.set_updated_at();

create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.owns_shop(shop_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.shops
    where id = shop_uuid and vendor_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.shop_public_links enable row level security;

create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid() and role = 'vendor');
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role <> 'admin');

create policy "approved public shops read" on public.shops for select using ((is_approved and not is_restricted) or vendor_id = auth.uid() or public.is_admin());
create policy "vendors insert shops" on public.shops for insert with check (vendor_id = auth.uid());
create policy "vendors update own shops" on public.shops for update using (vendor_id = auth.uid() or public.is_admin()) with check (vendor_id = auth.uid() or public.is_admin());

create policy "public categories read" on public.categories for select using (exists (select 1 from public.shops s where s.id = shop_id and (s.is_approved and not s.is_restricted or s.vendor_id = auth.uid() or public.is_admin())));
create policy "vendors manage categories" on public.categories for all using (public.owns_shop(shop_id) or public.is_admin()) with check (public.owns_shop(shop_id) or public.is_admin());

create policy "public dishes read" on public.dishes for select using (exists (select 1 from public.shops s where s.id = shop_id and (s.is_approved and not s.is_restricted or s.vendor_id = auth.uid() or public.is_admin())));
create policy "vendors manage dishes" on public.dishes for all using (public.owns_shop(shop_id) or public.is_admin()) with check (public.owns_shop(shop_id) or public.is_admin());

create policy "public create orders" on public.orders for insert with check (exists (select 1 from public.shops s where s.id = shop_id and s.is_approved and not s.is_restricted and s.is_open));
create policy "vendors read orders" on public.orders for select using (public.owns_shop(shop_id) or public.is_admin());
create policy "vendors update orders" on public.orders for update using (public.owns_shop(shop_id) or public.is_admin()) with check (public.owns_shop(shop_id) or public.is_admin());

create policy "public create order items" on public.order_items for insert with check (exists (select 1 from public.orders o join public.shops s on s.id = o.shop_id where o.id = order_id and s.is_approved and not s.is_restricted));
create policy "vendors read order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and (public.owns_shop(o.shop_id) or public.is_admin())));

create policy "public create reviews" on public.reviews for insert with check (exists (select 1 from public.shops s where s.id = shop_id and s.is_approved and not s.is_restricted));
create policy "public reviews read" on public.reviews for select using (true);
create policy "admin reviews manage" on public.reviews for delete using (public.is_admin());

create policy "vendors read subscriptions" on public.subscriptions for select using (vendor_id = auth.uid() or public.is_admin());
create policy "service manages subscriptions" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

create policy "vendors read payments" on public.payments for select using (vendor_id = auth.uid() or public.is_admin());

create policy "public link read" on public.shop_public_links for select using (true);
create policy "vendors manage public link" on public.shop_public_links for all using (public.owns_shop(shop_id) or public.is_admin()) with check (public.owns_shop(shop_id) or public.is_admin());

insert into storage.buckets (id, name, public)
values ('shop-assets', 'shop-assets', true), ('dish-assets', 'dish-assets', true)
on conflict (id) do nothing;

create policy "public shop asset read" on storage.objects for select using (bucket_id in ('shop-assets', 'dish-assets'));
create policy "authenticated upload shop assets" on storage.objects for insert to authenticated with check (bucket_id in ('shop-assets', 'dish-assets'));
create policy "authenticated update own asset folders" on storage.objects for update to authenticated using (bucket_id in ('shop-assets', 'dish-assets') and owner = auth.uid());
create policy "authenticated delete own asset folders" on storage.objects for delete to authenticated using (bucket_id in ('shop-assets', 'dish-assets') and owner = auth.uid());

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
