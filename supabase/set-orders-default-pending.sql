alter table public.orders
alter column status set default 'pending';

alter table public.orders
alter column accepted_at drop default;
