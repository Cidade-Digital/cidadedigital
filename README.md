# Cidade Digital

Plataforma de mapeamento comercial e comunitário interativo — MVP para **Osvaldo Cruz / SP** e **Parapuã / SP**.

Cada lote físico da cidade tem uma representação digital proporcional à área real. Comerciantes gerenciam a própria vitrine (self-service); lotes vagos aparecem como **oportunidade comercial**.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-end | React + Vite, Tailwind CSS v4, Lucide React |
| Mapa | MapLibre GL + `react-map-gl` (estilo vetorial OSM/OpenFreeMap) |
| Back-end | Supabase — PostgreSQL + PostGIS, Auth, RLS, Storage |
| Pagamento (MVP) | Manual/offline — admin ativa a licença após confirmação de PIX |

## Estrutura

```
src/
  components/   MapaLotes, PainelLote, StatusBadge
  pages/        MapaPublico (mapa read-only)
  lib/supabase/ client.js, queries.js
supabase/
  migrations/   0001 schema · 0002 RLS+views+RPC · 0003 seed demo · 0004 ingestão
scripts/
  importar_lotes.mjs   GeoJSON cadastral -> tabela lotes
```

## Setup

```bash
npm install
cp .env.example .env      # preencha URL, ANON_KEY, MAP_STYLE_URL
```

### Banco (Supabase)

Aplique as migrations em ordem no SQL Editor ou via CLI:

```bash
supabase db push          # ou cole cada arquivo de supabase/migrations/ no SQL Editor
```

`0003_seed_demo.sql` cria lotes fictícios para visualizar o mapa. Para dados reais:

```bash
# GeoJSON da cartografia municipal / CAR / IBGE em EPSG:4326
node scripts/importar_lotes.mjs "Osvaldo Cruz" ./data/lotes/osvaldo_cruz.geojson
```

Ajuste o mapeamento de campos em `MAPA_CAMPOS` dentro do script conforme as
`properties` da sua fonte.

### Rodar

```bash
npm run dev
```

## Modelo de dados

`perfis` · `lotes` (geom `MultiPolygon` 4326, `area_m2`, `status_ocupacao`) ·
`licencas` · `estabelecimentos` · `produtos`.

### Regras de visibilidade (RLS)

- **lotes**: leitura pública (o mapa precisa mostrar vagos).
- **estabelecimentos / produtos**: públicos **somente** com `licenca.status = 'ativa'`
  e dentro da vigência — exposto pelas views `estabelecimentos_publicos` /
  `produtos_publicos`.
- Comerciante edita apenas o que pertence às suas licenças (`possui_licenca()`).
- `licencas` são criadas como `pendente`; ativação é ação de **admin**.

### RPC

- `lotes_geojson(cidade, oeste, sul, leste, norte)` → `FeatureCollection` filtrado
  por bounding box (índice GIST) — só trafega a viewport.
- `ingerir_lotes(jsonb)` → upsert em massa da malha cadastral (service_role/admin).

## Próximos passos

- Auth + painel do comerciante (CRUD de estabelecimento e catálogo).
- Fluxo de solicitação de licença + tela admin de ativação.
- Upload de mídias no Supabase Storage.
- Mapa "universo de cidades" equidistantes com vizinhas rotuladas.
