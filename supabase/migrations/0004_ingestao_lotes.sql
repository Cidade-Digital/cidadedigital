-- =============================================================
-- Cidade Digital — RPC de ingestão da malha cadastral
-- Consumida por scripts/importar_lotes.mjs (chave service_role)
-- =============================================================

create or replace function ingerir_lotes(p_linhas jsonb)
returns integer
language plpgsql
security definer
set search_path = public as $$
declare
  r jsonb;
  g geometry;
  n int := 0;
begin
  -- Só admin ou service_role pode ingerir.
  if not (is_admin() or auth.role() = 'service_role') then
    raise exception 'permissao negada';
  end if;

  for r in select * from jsonb_array_elements(p_linhas) loop
    g := st_multi(st_setsrid(st_geomfromgeojson(r ->> '_geojson'), 4326));
    if g is null or st_isempty(g) then
      continue;
    end if;

    insert into lotes (
      cidade, endereco, numero, bairro, inscricao_cadastral,
      geom, area_m2, status_ocupacao
    ) values (
      r ->> 'cidade',
      r ->> 'endereco',
      r ->> 'numero',
      r ->> 'bairro',
      r ->> 'inscricao_cadastral',
      g,
      round((st_area(g::geography))::numeric, 2),
      coalesce((r ->> 'status_ocupacao')::status_ocupacao, 'vago')
    )
    on conflict (cidade, inscricao_cadastral) where inscricao_cadastral is not null
    do update set
      geom = excluded.geom,
      area_m2 = excluded.area_m2,
      endereco = excluded.endereco,
      numero = excluded.numero,
      bairro = excluded.bairro,
      status_ocupacao = excluded.status_ocupacao;

    n := n + 1;
  end loop;

  return n;
end $$;

revoke all on function ingerir_lotes(jsonb) from public;
grant execute on function ingerir_lotes(jsonb) to service_role, authenticated;
