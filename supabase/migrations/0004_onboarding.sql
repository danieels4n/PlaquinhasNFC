-- PlacaLink — primeiro acesso
-- Guarda quais avisos de orientação cada pessoa já viu (boas-vindas, checklist, guia do fornecedor).
-- Rode no SQL Editor do Supabase, depois do 0003_google.sql.

alter table public.profiles
  add column onboarding jsonb not null default '{}'::jsonb;

-- O próprio usuário pode marcar seus avisos como vistos (o papel continua protegido).
grant update (onboarding) on public.profiles to authenticated;
