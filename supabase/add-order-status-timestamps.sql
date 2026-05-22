alter table public.orders
add column if not exists accepted_at timestamptz,
add column if not exists preparing_at timestamptz,
add column if not exists ready_at timestamptz,
add column if not exists completed_at timestamptz;

update public.orders
set accepted_at = coalesce(accepted_at, created_at)
where status in ('pending', 'accepted', 'preparing', 'ready', 'completed');

update public.orders
set preparing_at = coalesce(preparing_at, updated_at)
where status in ('preparing', 'ready', 'completed');

update public.orders
set ready_at = coalesce(ready_at, updated_at)
where status in ('ready', 'completed');

update public.orders
set completed_at = coalesce(completed_at, updated_at)
where status = 'completed';

alter table public.orders
alter column accepted_at drop default;
