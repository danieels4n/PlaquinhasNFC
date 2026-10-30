-- PlacaLink — loja, pedidos e fornecedor
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois do 0001_init.sql.

-- ---------------------------------------------------------------------------
-- Papéis: usuário (revendedor), fornecedor e administrador
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'supplier', 'admin'));

alter table public.profiles add column email text not null default '';
update public.profiles p set email = coalesce(u.email, '') from auth.users u where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), coalesce(new.email, ''));
  return new;
end;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'supplier'));
$$;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio papel';
  end if;
  if p_role not in ('user', 'supplier', 'admin') then
    raise exception 'Papel inválido';
  end if;
  update public.profiles set role = p_role where id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '' check (length(description) <= 4000),
  size_label text not null default '' check (length(size_label) <= 40),
  image_url text,
  price_cents int not null check (price_cents >= 0),
  promo_price_cents int check (promo_price_cents is null or promo_price_cents >= 0),
  badge text not null default '' check (length(badge) <= 30),
  min_qty int not null default 1 check (min_qty >= 1),
  stock int check (stock is null or stock >= 0),          -- vazio = sem controle de estoque
  weight_g int not null default 60 check (weight_g > 0),  -- peso de 1 unidade, para o frete
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;
create policy "produtos: ver ativos" on public.products
  for select to authenticated using (active or public.is_admin());
create policy "produtos: admin gerencia" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.products from anon;

-- Fotos dos produtos (Storage público, só admin envia)
insert into storage.buckets (id, name, public) values ('products', 'products', true)
  on conflict (id) do nothing;
create policy "fotos de produto: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "fotos de produto: admin altera" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "fotos de produto: admin apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.order_number_seq'),
  buyer_id uuid not null references public.profiles (id),
  status text not null default 'awaiting_payment' check (status in
    ('awaiting_payment', 'paid', 'in_production', 'ready', 'shipped', 'delivered', 'canceled')),

  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents int not null default 0,

  shipping_service_id text not null default '',
  shipping_service text not null default '',
  shipping_company text not null default '',
  shipping_days int,

  recipient_name text not null,
  recipient_email text not null default '',
  recipient_phone text not null default '',
  recipient_document text not null default '',
  cep text not null,
  street text not null,
  address_number text not null,
  complement text not null default '',
  district text not null default '',
  city text not null,
  state text not null,

  tracking_code text not null default '',
  carrier text not null default '',

  payment_provider text not null default '',
  payment_id text not null default '',
  pix_qr_code text,
  pix_qr_base64 text,
  pix_ticket_url text,
  pix_expires_at timestamptz,

  batch_id uuid references public.plate_batches (id) on delete set null,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  size_label text not null default '',
  unit_price_cents int not null,
  quantity int not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy "pedidos: comprador ou equipe" on public.orders
  for select using (buyer_id = auth.uid() or public.is_staff());
create policy "itens: comprador ou equipe" on public.order_items
  for select using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.is_staff())));
create policy "histórico: comprador ou equipe" on public.order_events
  for select using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.is_staff())));

-- Pedidos só mudam pelas funções abaixo (ou pelo servidor com a chave secreta).
revoke insert, update, delete on public.orders, public.order_items, public.order_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Plaquinhas geradas por pedido (reservadas para o comprador)
-- ---------------------------------------------------------------------------
alter table public.plate_batches drop constraint plate_batches_quantity_check;
alter table public.plate_batches add constraint plate_batches_quantity_check check (quantity > 0);

alter table public.plates
  add column order_id uuid references public.orders (id) on delete set null,
  add column reserved_for uuid references public.profiles (id) on delete set null;
create index plates_reserved_idx on public.plates (reserved_for) where owner_id is null;
create index plates_order_idx on public.plates (order_id);

drop policy "plaquinhas: ler" on public.plates;
create policy "plaquinhas: ler" on public.plates
  for select using (owner_id = auth.uid() or reserved_for = auth.uid() or public.is_staff());

drop policy "leituras: dono da plaquinha" on public.plate_scans;
create policy "leituras: dono da plaquinha" on public.plate_scans
  for select using (
    exists (select 1 from public.plates p where p.id = plate_id and (p.owner_id = auth.uid() or public.is_staff()))
  );

drop policy "lotes: admin" on public.plate_batches;
create policy "lotes: equipe lê" on public.plate_batches
  for select using (public.is_staff());
create policy "lotes: admin gerencia" on public.plate_batches
  for all using (public.is_admin()) with check (public.is_admin());

drop function public.lookup_plate(text);
create function public.lookup_plate(p_token text)
returns table (code text, product_label text, status text, mine boolean, reserved_other boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.code, p.product_label, p.status,
         (p.owner_id is not null and p.owner_id = auth.uid()),
         (p.owner_id is null and p.reserved_for is not null and p.reserved_for is distinct from auth.uid())
  from public.plates p
  where p.token = upper(trim(p_token));
$$;
grant execute on function public.lookup_plate(text) to anon, authenticated;

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
  if v_plate.reserved_for is not null and v_plate.reserved_for <> auth.uid() then
    raise exception 'Esta plaquinha pertence ao pedido de outra conta';
  end if;

  update public.plates
     set owner_id = auth.uid(), status = 'pending', claimed_at = now()
   where id = v_plate.id;
  return v_plate.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funções de pedido
-- ---------------------------------------------------------------------------

-- Cria o pedido calculando os preços pelo catálogo. Só o servidor (chave secreta) chama.
create or replace function public.create_order(p_buyer uuid, p_items jsonb, p_address jsonb, p_shipping jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products;
  v_qty int;
  v_unit int;
  v_subtotal int := 0;
  v_shipping int := greatest(coalesce((p_shipping ->> 'price_cents')::int, 0), 0);
begin
  if auth.role() <> 'service_role' then
    raise exception 'Não autorizado';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Carrinho vazio';
  end if;

  insert into public.orders (
    id, buyer_id, shipping_cents,
    shipping_service_id, shipping_service, shipping_company, shipping_days,
    recipient_name, recipient_email, recipient_phone, recipient_document,
    cep, street, address_number, complement, district, city, state
  ) values (
    v_order, p_buyer, v_shipping,
    coalesce(p_shipping ->> 'service_id', ''), coalesce(p_shipping ->> 'service', ''),
    coalesce(p_shipping ->> 'company', ''), (p_shipping ->> 'days')::int,
    p_address ->> 'name', coalesce(p_address ->> 'email', ''), coalesce(p_address ->> 'phone', ''),
    coalesce(p_address ->> 'document', ''),
    p_address ->> 'cep', p_address ->> 'street', p_address ->> 'number', coalesce(p_address ->> 'complement', ''),
    coalesce(p_address ->> 'district', ''), p_address ->> 'city', p_address ->> 'state'
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid for update;
    if not found or not v_product.active then
      raise exception 'Um dos produtos não está mais disponível';
    end if;
    if v_qty is null or v_qty < v_product.min_qty then
      raise exception 'Quantidade mínima de % é % un.', v_product.name, v_product.min_qty;
    end if;
    if v_qty > 1000 then
      raise exception 'Quantidade máxima por item é 1000';
    end if;
    if v_product.stock is not null then
      if v_product.stock < v_qty then
        raise exception 'Estoque insuficiente de % (restam %)', v_product.name, v_product.stock;
      end if;
      update public.products set stock = stock - v_qty where id = v_product.id;
    end if;

    v_unit := coalesce(v_product.promo_price_cents, v_product.price_cents);
    insert into public.order_items (order_id, product_id, product_name, size_label, unit_price_cents, quantity)
    values (v_order, v_product.id, v_product.name, v_product.size_label, v_unit, v_qty);
    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  update public.orders
     set subtotal_cents = v_subtotal, total_cents = v_subtotal + v_shipping
   where id = v_order;
  insert into public.order_events (order_id, status, note, created_by)
  values (v_order, 'awaiting_payment', 'Pedido criado', p_buyer);
  return v_order;
end;
$$;

create or replace function public.restore_order_stock(p_order uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products p
     set stock = p.stock + s.qty
    from (select product_id, sum(quantity) as qty from public.order_items
           where order_id = p_order and product_id is not null group by product_id) s
   where p.id = s.product_id and p.stock is not null;
$$;

-- Confirma o pagamento e gera as plaquinhas do pedido, reservadas para o comprador.
-- Chamada pelo servidor (webhook do Mercado Pago) ou por um admin (confirmação manual).
create or replace function public.mark_order_paid(p_order uuid, p_payment_id text default '')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_batch uuid;
  v_total int;
  v_token text;
  i int;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Não autorizado';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_order.status <> 'awaiting_payment' then
    return false;
  end if;

  update public.orders
     set status = 'paid', paid_at = now(),
         payment_id = case when coalesce(p_payment_id, '') <> '' then p_payment_id else payment_id end
   where id = p_order;
  insert into public.order_events (order_id, status, note, created_by)
  values (p_order, 'paid',
          case when auth.role() = 'service_role' then 'Pagamento confirmado' else 'Pagamento confirmado manualmente' end,
          auth.uid());

  select coalesce(sum(quantity), 0) into v_total from public.order_items where order_id = p_order;
  insert into public.plate_batches (name, product_label, quantity, created_by)
  values ('Pedido PED-' || lpad(v_order.number::text, 6, '0'), '', v_total, auth.uid())
  returning id into v_batch;

  for v_item in select * from public.order_items where order_id = p_order order by product_name loop
    i := 0;
    while i < v_item.quantity loop
      v_token := public.gen_plate_token();
      begin
        insert into public.plates (token, code, batch_id, product_label, order_id, reserved_for)
        values (v_token, 'PL-' || lpad(nextval('public.plate_code_seq')::text, 5, '0'), v_batch,
                v_item.product_name, p_order, v_order.buyer_id);
        i := i + 1;
      exception when unique_violation then
        -- token repetido (muito raro): tenta de novo
      end;
    end loop;
  end loop;

  update public.orders set batch_id = v_batch where id = p_order;
  return true;
end;
$$;

-- Fornecedor/admin avança o pedido: pago → em produção → pronto → enviado → entregue.
create or replace function public.update_order_status(
  p_order uuid, p_status text, p_tracking text default '', p_carrier text default '', p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_allowed text[];
begin
  if not public.is_staff() then
    raise exception 'Não autorizado';
  end if;

  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;

  v_allowed := case v_order.status
    when 'awaiting_payment' then array['canceled']
    when 'paid' then array['in_production', 'canceled']
    when 'in_production' then array['ready', 'canceled']
    when 'ready' then array['shipped', 'canceled']
    when 'shipped' then array['delivered']
    else array[]::text[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'Mudança de status não permitida';
  end if;
  if p_status = 'shipped' and coalesce(trim(p_tracking), '') = '' then
    raise exception 'Informe o código de rastreio';
  end if;

  update public.orders
     set status = p_status,
         tracking_code = case when p_status = 'shipped' then upper(trim(p_tracking)) else tracking_code end,
         carrier = case when p_status = 'shipped' then coalesce(nullif(trim(p_carrier), ''), shipping_company) else carrier end,
         shipped_at = case when p_status = 'shipped' then now() else shipped_at end,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
         canceled_at = case when p_status = 'canceled' then now() else canceled_at end
   where id = p_order;

  if p_status = 'canceled' then
    perform public.restore_order_stock(p_order);
    delete from public.plates where order_id = p_order and owner_id is null;
  end if;

  insert into public.order_events (order_id, status, note, created_by)
  values (p_order, p_status, coalesce(p_note, ''), auth.uid());
end;
$$;

-- O comprador pode cancelar enquanto não pagou.
create or replace function public.cancel_my_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order and buyer_id = auth.uid() for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'Só é possível cancelar pedidos aguardando pagamento';
  end if;
  update public.orders set status = 'canceled', canceled_at = now() where id = p_order;
  perform public.restore_order_stock(p_order);
  insert into public.order_events (order_id, status, note, created_by)
  values (p_order, 'canceled', 'Cancelado pelo comprador', auth.uid());
end;
$$;

revoke execute on function public.create_order(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.restore_order_stock(uuid) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text) from public, anon;
revoke execute on function public.update_order_status(uuid, text, text, text, text) from public, anon;
revoke execute on function public.cancel_my_order(uuid) from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.create_order(uuid, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.mark_order_paid(uuid, text) to authenticated, service_role;
grant execute on function public.update_order_status(uuid, text, text, text, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Produtos de exemplo (edite ou apague em Mais → Produtos)
-- ---------------------------------------------------------------------------
insert into public.products (name, description, size_label, price_cents, min_qty, weight_g, sort) values
  ('Placa Google Avaliações NFC + QR — 10 cm', 'Placa de mesa com chip NFC e QR Code para avaliações no Google.', '10 × 10 cm', 1290, 5, 50, 1),
  ('Placa Google Avaliações NFC + QR — 12 cm', 'Placa de mesa com chip NFC e QR Code para avaliações no Google.', '12 × 12 cm', 1490, 5, 70, 2),
  ('Placa Instagram NFC + QR — 10 cm', 'Leva o cliente direto para o perfil do Instagram.', '10 × 10 cm', 1290, 5, 50, 3),
  ('Placa WhatsApp NFC + QR — 10 cm', 'Abre uma conversa no WhatsApp da empresa.', '10 × 10 cm', 1290, 5, 50, 4),
  ('Placa de Cardápio NFC', 'Placa compacta para mesas de restaurantes.', '8 × 6 cm', 860, 5, 30, 5);
