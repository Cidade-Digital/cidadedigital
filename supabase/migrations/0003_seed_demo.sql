-- =============================================================
-- Cidade Digital — Seed de demonstração (lotes fictícios)
-- Substitua pelos polígonos reais via scripts/importar_lotes.mjs
-- =============================================================

-- Gera uma grade N x M de lotes ~15m x 30m a partir de um canto (lng0, lat0).
create or replace function _seed_grade_lotes(
  p_cidade text, p_lng0 double precision, p_lat0 double precision,
  p_cols int, p_rows int
) returns void
language plpgsql as $$
declare
  dx double precision := 0.00017;  -- ~15 m em longitude
  dy double precision := 0.00027;  -- ~30 m em latitude
  i int; k int;
  x double precision; y double precision;
  g geometry;
begin
  for i in 0 .. p_cols - 1 loop
    for k in 0 .. p_rows - 1 loop
      x := p_lng0 + i * dx;
      y := p_lat0 + k * dy;
      g := st_multi(st_makepolygon(st_makeline(array[
        st_point(x, y), st_point(x + dx * 0.9, y),
        st_point(x + dx * 0.9, y + dy * 0.9), st_point(x, y + dy * 0.9),
        st_point(x, y)
      ])));
      g := st_setsrid(g, 4326);
      insert into lotes (cidade, endereco, numero, geom, area_m2, status_ocupacao, inscricao_cadastral)
      values (
        p_cidade,
        'Quadra ' || (i + 1) || ' — Rua ' || (k + 1),
        ((k + 1) * 100)::text,
        g,
        round((st_area(g::geography))::numeric, 2),
        (array['comercial','vago','residencial'])[1 + floor(random() * 3)]::status_ocupacao,
        p_cidade || '-' || i || '-' || k
      )
      on conflict do nothing;
    end loop;
  end loop;
end $$;

select _seed_grade_lotes('Osvaldo Cruz', -50.8802, -21.7990, 8, 8);
select _seed_grade_lotes('Parapuã',      -50.7975, -21.7815, 6, 6);

drop function _seed_grade_lotes(text, double precision, double precision, int, int);
