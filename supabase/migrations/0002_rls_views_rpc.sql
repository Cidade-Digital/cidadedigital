-- =============================================================
-- Cidade Digital — RLS, views públicas e RPC do mapa
-- =============================================================

-- ---------- Helpers ----------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis where id = auth.uid() and funcao = 'admin'
  );
$$;

-- true se o usuário logado é dono da licença informada
create or replace function possui_licenca(p_licenca_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from licencas l
    where l.id = p_licenca_id and l.perfil_id = auth.uid()
  );
$$;

-- =============================================================
-- RLS
-- =============================================================
alter table perfis            enable row level security;
alter table lotes             enable row level security;
alter table licencas          enable row level security;
alter table estabelecimentos  enable row level security;
alter table produtos          enable row level security;

-- ---------- perfis ----------
create policy perfis_sel_self_or_admin on perfis for select
  using (id = auth.uid() or is_admin());
create policy perfis_upd_self on perfis for update
  using (id = auth.uid()) with check (id = auth.uid() and funcao = (select funcao from perfis where id = auth.uid()));
create policy perfis_admin_all on perfis for all
  using (is_admin()) with check (is_admin());

-- ---------- lotes ----------
-- Leitura pública total: o mapa mostra lotes vagos como "oportunidade".
create policy lotes_sel_publico on lotes for select using (true);
create policy lotes_admin_write on lotes for all
  using (is_admin()) with check (is_admin());

-- ---------- licencas ----------
create policy licencas_sel_dono_admin on licencas for select
  using (perfil_id = auth.uid() or is_admin());
-- Comerciante pode solicitar (status forçado a 'pendente'); ativação é manual pelo admin.
create policy licencas_ins_comerciante on licencas for insert
  with check (perfil_id = auth.uid() and status = 'pendente');
create policy licencas_admin_write on licencas for all
  using (is_admin()) with check (is_admin());

-- ---------- estabelecimentos ----------
-- Dono gerencia o próprio (via licença). Admin gerencia tudo.
create policy estab_sel_dono_admin on estabelecimentos for select
  using (possui_licenca(licenca_id) or is_admin());
create policy estab_ins_dono on estabelecimentos for insert
  with check (possui_licenca(licenca_id));
create policy estab_upd_dono on estabelecimentos for update
  using (possui_licenca(licenca_id)) with check (possui_licenca(licenca_id));
create policy estab_del_dono on estabelecimentos for delete
  using (possui_licenca(licenca_id));
create policy estab_admin_all on estabelecimentos for all
  using (is_admin()) with check (is_admin());

-- ---------- produtos ----------
create policy prod_sel_dono_admin on produtos for select
  using (
    is_admin() or exists (
      select 1 from estabelecimentos e
      where e.id = produtos.estabelecimento_id and possui_licenca(e.licenca_id)
    )
  );
create policy prod_write_dono on produtos for all
  using (
    exists (
      select 1 from estabelecimentos e
      where e.id = produtos.estabelecimento_id and possui_licenca(e.licenca_id)
    )
  ) with check (
    exists (
      select 1 from estabelecimentos e
      where e.id = produtos.estabelecimento_id and possui_licenca(e.licenca_id)
    )
  );
create policy prod_admin_all on produtos for all
  using (is_admin()) with check (is_admin());

-- =============================================================
-- Views públicas (SECURITY INVOKER) — só expõem vitrines com licença ativa
-- =============================================================
create or replace view estabelecimentos_publicos
with (security_invoker = true) as
  select e.id, e.nome_fantasia, e.categoria, e.descricao,
         e.telefone_whatsapp, e.instagram_url, e.website_url,
         e.ecommerce_url, e.logo_url, e.horarios,
         l.lote_id
  from estabelecimentos e
  join licencas l on l.id = e.licenca_id
  where l.status = 'ativa'
    and (l.data_fim is null or l.data_fim >= current_date);

create or replace view produtos_publicos
with (security_invoker = true) as
  select p.id, p.estabelecimento_id, p.nome, p.descricao, p.preco, p.imagem_url
  from produtos p
  join estabelecimentos e on e.id = p.estabelecimento_id
  join licencas l on l.id = e.licenca_id
  where p.ativo
    and l.status = 'ativa'
    and (l.data_fim is null or l.data_fim >= current_date);

-- As views precisam ler as tabelas base ignorando o RLS restritivo do dono.
-- Fazemos isso com uma policy pública condicionada à licença ativa:
create policy estab_sel_publico_ativo on estabelecimentos for select
  using (exists (
    select 1 from licencas l
    where l.id = estabelecimentos.licenca_id
      and l.status = 'ativa'
      and (l.data_fim is null or l.data_fim >= current_date)
  ));
create policy prod_sel_publico_ativo on produtos for select
  using (ativo and exists (
    select 1 from estabelecimentos e
    join licencas l on l.id = e.licenca_id
    where e.id = produtos.estabelecimento_id
      and l.status = 'ativa'
      and (l.data_fim is null or l.data_fim >= current_date)
  ));

grant select on estabelecimentos_publicos, produtos_publicos to anon, authenticated;

-- =============================================================
-- RPC: lotes_geojson — alimenta o mapa MapLibre por bounding box
-- =============================================================
create or replace function lotes_geojson(
  p_cidade text,
  p_oeste  double precision,
  p_sul    double precision,
  p_leste  double precision,
  p_norte  double precision
) returns jsonb
language sql stable security invoker set search_path = public as $$
  with janela as (
    select st_makeenvelope(p_oeste, p_sul, p_leste, p_norte, 4326) as bbox
  ),
  base as (
    select
      lo.id,
      lo.endereco, lo.numero, lo.area_m2, lo.status_ocupacao,
      lo.geom,
      ep.nome_fantasia, ep.categoria,
      case
        when ep.id is not null then 'ocupado'
        when lo.status_ocupacao = 'vago' then 'oportunidade'
        when lo.status_ocupacao = 'residencial' then 'residencial'
        else 'ocupado'
      end as status_vitrine
    from lotes lo
    join janela j on lo.geom && j.bbox
    left join estabelecimentos_publicos ep on ep.lote_id = lo.id
    where (p_cidade is null or lo.cidade = p_cidade)
    limit 3000
  )
  select coalesce(
    jsonb_build_object(
      'type', 'FeatureCollection',
      'features', jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'id', b.id,
          'geometry', st_asgeojson(b.geom, 6)::jsonb,
          'properties', jsonb_build_object(
            'lote_id', b.id,
            'endereco', b.endereco,
            'numero', b.numero,
            'area_m2', b.area_m2,
            'status_ocupacao', b.status_ocupacao,
            'status_vitrine', b.status_vitrine,
            'nome_fantasia', b.nome_fantasia,
            'categoria', b.categoria
          )
        )
      )
    ),
    jsonb_build_object('type', 'FeatureCollection', 'features', '[]'::jsonb)
  )
  from base b;
$$;

grant execute on function lotes_geojson(text, double precision, double precision, double precision, double precision)
  to anon, authenticated;
