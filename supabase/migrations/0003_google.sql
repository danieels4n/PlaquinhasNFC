-- PlacaLink — acompanhamento de avaliações no Google e prospecção de clientes
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois do 0002_loja.sql.

-- ---------------------------------------------------------------------------
-- Cliente ↔ empresa no Google
-- ---------------------------------------------------------------------------
alter table public.customers
  add column stage text not null default 'client' check (stage in ('lead', 'client')),
  add column google_place_id text,
  add column google_name text not null default '',
  add column google_address text not null default '',
  add column google_maps_url text not null default '',
  add column google_phone text not null default '',
  add column google_rating numeric(2, 1),
  add column google_reviews int,
  add column google_checked_at timestamptz,
  -- "Antes": valores no dia em que a empresa foi vinculada, para mostrar a evolução
  add column google_baseline_rating numeric(2, 1),
  add column google_baseline_reviews int,
  add column google_baseline_at timestamptz;

create index customers_place_idx on public.customers (google_place_id) where google_place_id is not null;
create unique index customers_owner_place_uniq on public.customers (owner_id, google_place_id) where google_place_id is not null;

-- Histórico de nota e quantidade de avaliações (um registro por atualização)
create table public.customer_google_history (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  rating numeric(2, 1),
  reviews int,
  checked_at timestamptz not null default now()
);
create index customer_google_history_idx on public.customer_google_history (customer_id, checked_at);

alter table public.customer_google_history enable row level security;
create policy "histórico google: dono do cliente lê" on public.customer_google_history
  for select using (exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = auth.uid()));
create policy "histórico google: dono do cliente grava" on public.customer_google_history
  for insert with check (exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = auth.uid()));
revoke update, delete on public.customer_google_history from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Controle de uso da API do Google (limite diário por usuário)
-- ---------------------------------------------------------------------------
create table public.places_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('search', 'details')),
  created_at timestamptz not null default now()
);
create index places_usage_user_idx on public.places_usage (user_id, kind, created_at desc);

alter table public.places_usage enable row level security;
create policy "uso google: ver o próprio" on public.places_usage
  for select using (user_id = auth.uid() or public.is_admin());
create policy "uso google: registrar o próprio" on public.places_usage
  for insert with check (user_id = auth.uid());
revoke update, delete on public.places_usage from anon, authenticated;

-- Resultados de busca guardados por 24h (só o servidor lê/grava, com a chave secreta)
create table public.places_search_cache (
  key text primary key,
  results jsonb not null,
  next_page_token text,
  created_at timestamptz not null default now()
);
alter table public.places_search_cache enable row level security;
revoke all on public.places_search_cache from anon, authenticated;
