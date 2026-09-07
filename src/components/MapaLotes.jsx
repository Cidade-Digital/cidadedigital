import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { buscarLotesGeoJSON } from '../lib/supabase/queries.js';

const STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

const VAZIO = { type: 'FeatureCollection', features: [] };

// Cor do polígono conforme status_vitrine calculado pelo RPC.
const corPorStatus = [
  'match',
  ['get', 'status_vitrine'],
  'oportunidade', '#f59e0b',
  'ocupado', '#2563eb',
  /* residencial / outros */ '#cbd5e1',
];

const camadaPreenchimento = {
  id: 'lotes-fill',
  type: 'fill',
  paint: { 'fill-color': corPorStatus, 'fill-opacity': 0.45 },
};
const camadaContorno = {
  id: 'lotes-line',
  type: 'line',
  paint: { 'line-color': corPorStatus, 'line-width': 1.2 },
};
const camadaSelecionado = {
  id: 'lotes-sel',
  type: 'line',
  paint: { 'line-color': '#0f172a', 'line-width': 3 },
  filter: ['==', ['get', 'lote_id'], '__none__'],
};

export default function MapaLotes({ cidade, viewInicial, loteSelecionado, onSelecionarLote }) {
  const mapRef = useRef(null);
  const timer = useRef(null);
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    const mapa = mapRef.current?.getMap();
    if (!mapa) return;
    const b = mapa.getBounds();
    setCarregando(true);
    try {
      const fc = await buscarLotesGeoJSON({
        cidade,
        oeste: b.getWest(),
        sul: b.getSouth(),
        leste: b.getEast(),
        norte: b.getNorth(),
      });
      setDados(fc);
    } catch (e) {
      console.error('Falha ao carregar lotes:', e.message);
    } finally {
      setCarregando(false);
    }
  }, [cidade]);

  const aoMover = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(recarregar, 350);
  }, [recarregar]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const aoClicar = useCallback(
    (evt) => {
      const f = evt.features?.[0];
      onSelecionarLote?.(f ? f.properties : null);
    },
    [onSelecionarLote]
  );

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      mapStyle={STYLE_URL}
      initialViewState={viewInicial}
      interactiveLayerIds={['lotes-fill']}
      onLoad={recarregar}
      onMoveEnd={aoMover}
      onClick={aoClicar}
      cursor="pointer"
      style={{ position: 'absolute', inset: 0 }}
    >
      <Source id="lotes" type="geojson" data={dados}>
        <Layer {...camadaPreenchimento} />
        <Layer {...camadaContorno} />
        <Layer
          {...camadaSelecionado}
          filter={['==', ['get', 'lote_id'], loteSelecionado ?? '__none__']}
        />
      </Source>
      {carregando && (
        <div className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs shadow">
          Carregando lotes…
        </div>
      )}
    </Map>
  );
}
