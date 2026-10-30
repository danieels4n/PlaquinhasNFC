-- PlacaLink — esquema inicial
-- Rode este arquivo inteiro no SQL Editor do Supabase (ou com `supabase db push`).

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Clientes (empresas para quem o revendedor instala plaquinhas)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  segment text not null default '' check (length(segment) <= 60),
  phone text not null default '' check (length(phone) <= 30),
  notes text not null default '' check (length(notes) <= 2000),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index customers_owner_idx on public.customers (owner_id);

-- ---------------------------------------------------------------------------
-- Lotes e plaquinhas
-- ---------------------------------------------------------------------------
create table public.plate_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_label text not null default '',
  quantity int not null check (quantity between 1 and 1000),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create sequence public.plate_code_seq start 1001;

create table public.plates (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,                      -- vai na URL gravada no QR/NFC
  code text not null unique,                       -- código legível impresso (PL-01001)
  batch_id uuid references public.plate_batches (id) on delete set null,
  product_label text not null default '',
  owner_id uuid references public.profiles (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  status text not null default 'unclaimed'
    check (status in ('unclaimed', 'pending', 'active', 'disabled')),
  destination_type text not null default 'google_review'
    check (destination_type in ('google_review', 'whatsapp', 'instagram', 'website', 'menu', 'other')),
  destination_url text check (destination_url is null or destination_url ~* '^https?://'),
  nickname text not null default '' check (length(nickname) <= 60),
  notes text not null default '' check (length(notes) <= 2000),
  sale_value numeric(10, 2) check (sale_value is null or sale_value >= 0),
  scans int not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_needs_destination check (status <> 'active' or destination_url is not null),
  constraint owner_matches_status check ((owner_id is null) = (status = 'unclaimed'))
);
create index plates_owner_idx on public.plates (owner_id);
create index plates_customer_idx on public.plates (customer_id);

create table public.plate_scans (
  id bigint generated always as identity primary key,
  plate_id uuid not null references public.plates (id) on delete cascade,
  scanned_at timestamptz not null default now()
);
create index plate_scans_plate_idx on public.plate_scans (plate_id, scanned_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plates_touch before update on public.plates
  for each row execute function public.touch_updated_at();

-- O cliente vinculado precisa ser do mesmo dono da plaquinha.
create or replace function public.check_plate_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null and not exists (
    select 1 from public.customers c where c.id = new.customer_id and c.owner_id = new.owner_id
  ) then
    raise exception 'Cliente inválido para esta plaquinha';
  end if;
  return new;
end;
$$;

create trigger plates_check_customer before insert or update of customer_id, owner_id on public.plates
  for each row execute function public.check_plate_customer();

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.plate_batches enable row level security;
alter table public.plates enable row level security;
alter table public.plate_scans enable row level security;

create policy "perfil: ler o próprio" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "perfil: editar o próprio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Só o nome pode ser alterado pelo usuário; o papel (role) não.
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

create policy "clientes: dono" on public.customers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "lotes: admin" on public.plate_batches
  for all using (public.is_admin()) with check (public.is_admin());

create policy "plaquinhas: ler" on public.plates
  for select using (owner_id = auth.uid() or public.is_admin());
create policy "plaquinhas: editar as próprias" on public.plates
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status <> 'unclaimed');
-- Usuário só altera os campos de configuração (nunca token, código ou dono).
revoke insert, update, delete on public.plates from authenticated, anon;
grant update (customer_id, status, destination_type, destination_url, nickname, notes, sale_value)
  on public.plates to authenticated;

create policy "leituras: dono da plaquinha" on public.plate_scans
  for select using (
    exists (select 1 from public.plates p where p.id = plate_id and (p.owner_id = auth.uid() or public.is_admin()))
  );
revoke insert, update, delete on public.plate_scans from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

-- Token aleatório de 8 caracteres, sem letras/dígitos ambíguos (0/O, 1/I).
create or replace function public.gen_plate_token()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 caracteres
  raw bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  result text := '';
  i int;
begin
  -- usa bytes que não carregam os bits fixos de versão/variante do UUID v4
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    result := result || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Admin: cria um lote de plaquinhas ainda sem dono.
create or replace function public.create_plate_batch(p_name text, p_product_label text, p_quantity int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch uuid;
  v_token text;
  n int := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem criar lotes';
  end if;
  if p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Quantidade deve ser entre 1 e 1000';
  end if;

  insert into public.plate_batches (name, product_label, quantity, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Lote'), coalesce(p_product_label, ''), p_quantity, auth.uid())
  returning id into v_batch;

  while n < p_quantity loop
    v_token := public.gen_plate_token();
    begin
      insert into public.plates (token, code, batch_id, product_label)
      values (v_token, 'PL-' || lpad(nextval('public.plate_code_seq')::text, 5, '0'), v_batch, coalesce(p_product_label, ''));
      n := n + 1;
    exception when unique_violation then
      -- token repetido (muito raro): tenta de novo
    end;
  end loop;

  return v_batch;
end;
$$;

-- Consulta pública de uma plaquinha pelo token (página de ativação).
create or replace function public.lookup_plate(p_token text)
returns table (code text, product_label text, status text, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.product_label, p.status, (p.owner_id is not null and p.owner_id = auth.uid())
  from public.plates p
  where p.token = upper(trim(p_token));
$$;

-- Vincula uma plaquinha sem dono à conta de quem está logado.
create or replace function public.claim_plate(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plate public.plates;
begin
  if auth.uid() is null then
    raise exception 'Faça login para ativar a plaquinha';
  end if;

  select * into v_plate from public.plates where token = upper(trim(p_token)) for update;
  if not found then
    raise exception 'Plaquinha não encontrada';
  end if;
  if v_plate.owner_id = auth.uid() then
    return v_plate.id;
  end if;
  if v_plate.owner_id is not null then
    raise exception 'Esta plaquinha já foi ativada por outra conta';
  end if;

  update public.plates
     set owner_id = auth.uid(), status = 'pending', claimed_at = now()
   where id = v_plate.id;
  return v_plate.id;
end;
$$;

-- Chamada a cada leitura do QR/NFC. Retorna para onde redirecionar.
create or replace function public.register_scan(p_token text)
returns table (status text, destination_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plate public.plates;
begin
  select * into v_plate from public.plates where token = upper(trim(p_token));
  if not found then
    return;
  end if;

  if v_plate.status = 'active' then
    update public.plates set scans = scans + 1 where id = v_plate.id;
    insert into public.plate_scans (plate_id) values (v_plate.id);
  end if;

  return query select v_plate.status, v_plate.destination_url;
end;
$$;

revoke execute on function public.create_plate_batch(text, text, int) from public, anon;
revoke execute on function public.claim_plate(text) from public, anon;
grant execute on function public.create_plate_batch(text, text, int) to authenticated;
grant execute on function public.claim_plate(text) to authenticated;
grant execute on function public.lookup_plate(text) to anon, authenticated;
grant execute on function public.register_scan(text) to anon, authenticated;
