create extension if not exists pgcrypto;

create table if not exists public.palas_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Bizim hikayemiz',
  board_state jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.palas_boards enable row level security;

create policy "Owners can read their boards"
  on public.palas_boards for select
  using (auth.uid() = owner_id);

create policy "Owners can create boards"
  on public.palas_boards for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their boards"
  on public.palas_boards for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their boards"
  on public.palas_boards for delete
  using (auth.uid() = owner_id);

create index if not exists palas_boards_owner_updated_idx
  on public.palas_boards (owner_id, updated_at desc);