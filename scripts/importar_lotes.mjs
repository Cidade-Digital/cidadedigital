/**
 * Importa a malha cadastral de lotes (cartografia da prefeitura / CAR / IBGE)
 * a partir de um GeoJSON para a tabela `lotes`.
 *
 * Uso:
 *   node scripts/importar_lotes.mjs "Osvaldo Cruz" ./data/lotes/osvaldo_cruz.geojson
 *
 * O GeoJSON deve ter geometrias Polygon/MultiPolygon em EPSG:4326.
 * Mapeie as properties da sua fonte no objeto MAPA_CAMPOS abaixo.
 *
 * Requer no .env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const MAPA_CAMPOS = {
  endereco: (p) => p.logradouro ?? p.NM_LOGRAD ?? p.rua ?? null,
  numero: (p) => (p.numero ?? p.NUM ?? null)?.toString() ?? null,
  bairro: (p) => p.bairro ?? p.NM_BAIRRO ?? null,
  inscricao_cadastral: (p) => (p.inscricao ?? p.SQL ?? p.id ?? null)?.toString() ?? null,
  status_ocupacao: (p) => {
    const v = (p.uso ?? p.USO ?? '').toString().toLowerCase();
    if (v.includes('com')) return 'comercial';
    if (v.includes('res')) return 'residencial';
    return 'vago';
  },
};

const [, , cidade, arquivo] = process.argv;
if (!cidade || !arquivo) {
  console.error('Uso: node scripts/importar_lotes.mjs "<Cidade>" <arquivo.geojson>');
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const fc = JSON.parse(await readFile(arquivo, 'utf8'));
const feats = fc.type === 'FeatureCollection' ? fc.features : [fc];
console.log(`${feats.length} feições em ${arquivo}`);

const LOTE = 500;
let ok = 0;
for (let i = 0; i < feats.length; i += LOTE) {
  const linhas = feats.slice(i, i + LOTE).map((f) => {
    const p = f.properties ?? {};
    return {
      cidade,
      endereco: MAPA_CAMPOS.endereco(p),
      numero: MAPA_CAMPOS.numero(p),
      bairro: MAPA_CAMPOS.bairro(p),
      inscricao_cadastral: MAPA_CAMPOS.inscricao_cadastral(p),
      status_ocupacao: MAPA_CAMPOS.status_ocupacao(p),
      // st_multi + área calculada no banco pela RPC abaixo
      _geojson: JSON.stringify(f.geometry),
    };
  });

  // Usa a RPC de ingestão (converte GeoJSON -> geometry, calcula area_m2).
  const { error } = await supabase.rpc('ingerir_lotes', { p_linhas: linhas });
  if (error) {
    console.error('Erro no lote', i, error.message);
    process.exit(1);
  }
  ok += linhas.length;
  console.log(`  ${ok}/${feats.length}`);
}
console.log('Concluído.');
