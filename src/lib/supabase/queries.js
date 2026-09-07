import { supabase } from './client.js';

/**
 * Lotes dentro de um bounding box, como GeoJSON FeatureCollection.
 * Cada feature traz: lote_id, status_ocupacao, status_vitrine
 * ('disponivel' | 'ocupado' | 'oportunidade'), endereco, numero, area_m2,
 * e (quando houver vitrine pública ativa) nome_fantasia / categoria.
 *
 * A filtragem por bbox é feita no PostGIS (índice GIST) — só trafega o que
 * está na viewport atual.
 */
export async function buscarLotesGeoJSON({ cidade, oeste, sul, leste, norte }) {
  const { data, error } = await supabase.rpc('lotes_geojson', {
    p_cidade: cidade ?? null,
    p_oeste: oeste,
    p_sul: sul,
    p_leste: leste,
    p_norte: norte,
  });
  if (error) throw error;
  return data ?? { type: 'FeatureCollection', features: [] };
}

/** Detalhe da vitrine pública de um lote (apenas licença ativa). */
export async function buscarEstabelecimentoPorLote(loteId) {
  const { data, error } = await supabase
    .from('estabelecimentos_publicos')
    .select(
      'id, nome_fantasia, categoria, descricao, telefone_whatsapp, instagram_url, website_url, logo_url, lote_id'
    )
    .eq('lote_id', loteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Catálogo público (paginado) de um estabelecimento. */
export async function buscarProdutos(estabelecimentoId, { pagina = 0, tamanho = 24 } = {}) {
  const de = pagina * tamanho;
  const ate = de + tamanho - 1;
  const { data, error, count } = await supabase
    .from('produtos_publicos')
    .select('id, nome, descricao, preco, imagem_url', { count: 'exact' })
    .eq('estabelecimento_id', estabelecimentoId)
    .order('nome')
    .range(de, ate);
  if (error) throw error;
  return { produtos: data ?? [], total: count ?? 0 };
}

export function linkWhatsApp(telefone, mensagem) {
  const num = String(telefone ?? '').replace(/\D/g, '');
  const texto = encodeURIComponent(mensagem ?? 'Olá! Vi sua vitrine na Cidade Digital.');
  return `https://wa.me/${num}?text=${texto}`;
}
