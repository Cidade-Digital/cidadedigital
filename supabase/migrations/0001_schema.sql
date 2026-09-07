-- =============================================================
-- Cidade Digital — Schema base
-- MVP: Osvaldo Cruz / SP e Parapuã / SP
-- =============================================================

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type funcao_usuario as enum ('admin', 'comerciante', 'visitante');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_ocupacao as enum ('comercial', 'vago', 'residencial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_licenca as enum ('ativa', 'pendente', 'expirada');
exception when duplicate_object then null; end $$;

-- ---------- perfis ----------
-- 1:1 com auth.users. Criado via trigger no signup.
create table if not exists perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nome        text,
  telefone    text,
  funcao      funcao_usuario not null default 'visitante',
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------- lotes ----------
-- Geometria cadastral (cartografia da prefeitura / CAR / IBGE), SRID 4326.
create table if not exists lotes (
  id              uuid primary key default gen_random_uuid(),
  cidade          text not null,
  uf              text not null default 'SP',
  endereco        text,
  numero          text,
  bairro          text,
  inscricao_cadastral text,                       -- id do lote no cadastro municipal
  geom            geometry(MultiPolygon, 4326) not null,
  latitude        double precision generated always as (st_y(st_pointonsurface(geom))) stored,
  longitude       double precision generated always as (st_x(st_pointonsurface(geom))) stored,
  area_m2         numeric(12, 2) not null default 0,
  status_ocupacao status_ocupacao not null default 'vago',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists lotes_geom_gix on lotes using gist (geom);
create index if not exists lotes_cidade_ix on lotes (cidade);
create index if not exists lotes_status_ix on lotes (status_ocupacao);
create unique index if not exists lotes_inscricao_uix
  on lotes (cidade, inscricao_cadastral) where inscricao_cadastral is not null;

-- ---------- licencas ----------
create table if not exists licencas (
  id          uuid primary key default gen_random_uuid(),
  lote_id     uuid not null references lotes (id) on delete restrict,
  perfil_id   uuid not null references perfis (id) on delete restrict,
  status      status_licenca not null default 'pendente',
  data_inicio date,
  data_fim    date,
  observacao  text,                               -- ex.: "PIX confirmado em 06/09, ativação manual"
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Um lote só pode ter UMA licença ativa por vez.
create unique index if not exists licencas_lote_ativa_uix
  on licencas (lote_id) where status = 'ativa';
create index if not exists licencas_perfil_ix on licencas (perfil_id);

-- ---------- estabelecimentos ----------
create table if not exists estabelecimentos (
  id                 uuid primary key default gen_random_uuid(),
  licenca_id         uuid not null unique references licencas (id) on delete cascade,
  nome_fantasia      text not null,
  categoria          text,
  descricao          text,
  telefone_whatsapp  text,
  instagram_url      text,
  website_url        text,
  ecommerce_url      text,
  logo_url           text,
  horarios           jsonb not null default '{}'::jsonb,  -- { "seg": "08:00-18:00", ... }
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

-- ---------- produtos ----------
create table if not exists produtos (
  id                 uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos (id) on delete cascade,
  nome               text not null,
  descricao          text,
  preco              numeric(12, 2),
  imagem_url         text,
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create index if not exists produtos_estab_ix on produtos (estabelecimento_id) where ativo;

-- ---------- trigger: atualizado_em ----------
create or replace function set_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfis','lotes','licencas','estabelecimentos','produtos'] loop
    execute format(
      'drop trigger if exists trg_%1$s_atualizado on %1$s;
       create trigger trg_%1$s_atualizado before update on %1$s
       for each row execute function set_atualizado_em();', t);
  end loop;
end $$;

-- ---------- trigger: novo perfil no signup ----------
create or replace function handle_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, email, nome)
  values (new.id, new.email, new.raw_user_meta_data ->> 'nome')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auth_novo_usuario on auth.users;
create trigger trg_auth_novo_usuario
  after insert on auth.users
  for each row execute function handle_novo_usuario();
