-- Run this in Supabase SQL Editor.
-- It creates tables, RLS policies, auto-profile trigger, and seed data.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  balance numeric(14,2) not null default 10000,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transaction_type text not null check (transaction_type in ('credit', 'debit')),
  balance_after_transaction numeric(14,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_sender_created_at
  on public.transactions(sender_id, created_at desc);

create index if not exists idx_transactions_receiver_created_at
  on public.transactions(receiver_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
  on public.transactions for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
  on public.transactions for insert
  to authenticated
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    10000
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- Backfill profile rows for already existing auth users.
insert into public.profiles (id, full_name, email, balance)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  10000
from auth.users u
on conflict (id) do nothing;

-- Fake transfer data seed.
-- Replace emails with two users already registered in your app.
do $$
declare
  sender_email text := 'firstuser@example.com';
  receiver_email text := 'seconduser@example.com';
  sender_uuid uuid;
  receiver_uuid uuid;
  sender_balance numeric(14,2);
  receiver_balance numeric(14,2);
begin
  select id into sender_uuid from public.profiles where email = sender_email;
  select id into receiver_uuid from public.profiles where email = receiver_email;

  if sender_uuid is null or receiver_uuid is null then
    raise exception 'Seed failed: ensure sender_email and receiver_email exist in public.profiles';
  end if;

  if sender_uuid = receiver_uuid then
    raise exception 'Seed failed: sender and receiver must be different users';
  end if;

  update public.profiles set balance = 10000 where id = sender_uuid;
  update public.profiles set balance = 10000 where id = receiver_uuid;

  update public.profiles
    set balance = balance - 500
    where id = sender_uuid
    returning balance into sender_balance;

  update public.profiles
    set balance = balance + 500
    where id = receiver_uuid
    returning balance into receiver_balance;

  insert into public.transactions (
    sender_id,
    receiver_id,
    amount,
    transaction_type,
    balance_after_transaction,
    created_at
  )
  values
    (sender_uuid, receiver_uuid, 500, 'debit', sender_balance, now() - interval '2 days'),
    (sender_uuid, receiver_uuid, 500, 'credit', receiver_balance, now() - interval '2 days');

  update public.profiles
    set balance = balance - 350
    where id = receiver_uuid
    returning balance into receiver_balance;

  update public.profiles
    set balance = balance + 350
    where id = sender_uuid
    returning balance into sender_balance;

  insert into public.transactions (
    sender_id,
    receiver_id,
    amount,
    transaction_type,
    balance_after_transaction,
    created_at
  )
  values
    (receiver_uuid, sender_uuid, 350, 'debit', receiver_balance, now() - interval '1 day'),
    (receiver_uuid, sender_uuid, 350, 'credit', sender_balance, now() - interval '1 day');
end;
$$;