-- Ejecutar en SQL Editor del proyecto kqnfrsnictmpkfzhqvny.
-- Cada usuario autenticado guarda y consulta únicamente su propio espacio.
begin;
create table if not exists public.kairos_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'format' = 'kairos-backup'),
  updated_at timestamptz not null default now()
);
alter table public.kairos_state enable row level security;
revoke all on public.kairos_state from anon, authenticated;
grant select, insert, update on public.kairos_state to authenticated;
drop policy if exists "Leer espacio propio" on public.kairos_state;
create policy "Leer espacio propio" on public.kairos_state
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Crear espacio propio" on public.kairos_state;
create policy "Crear espacio propio" on public.kairos_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Actualizar espacio propio" on public.kairos_state;
create policy "Actualizar espacio propio" on public.kairos_state
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
commit;
