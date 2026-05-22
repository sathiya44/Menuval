alter type public.order_status add value if not exists 'accepted' after 'pending';

alter table public.orders
alter column status set default 'pending';
