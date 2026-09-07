import { useState } from 'react';
import { MapPinned } from 'lucide-react';
import MapaLotes from '../components/MapaLotes.jsx';
import PainelLote from '../components/PainelLote.jsx';
import { STATUS_MAPA } from '../components/StatusBadge.jsx';

const CIDADES = {
  'Osvaldo Cruz': { longitude: -50.8778, latitude: -21.7969, zoom: 15 },
  'Parapuã': { longitude: -50.7953, latitude: -21.7797, zoom: 15 },
};

export default function MapaPublico() {
  const [cidade, setCidade] = useState('Osvaldo Cruz');
  const [lote, setLote] = useState(null);

  return (
    <div className="relative h-full w-full">
      <MapaLotes
        key={cidade}
        cidade={cidade}
        viewInicial={CIDADES[cidade]}
        loteSelecionado={lote?.lote_id ?? null}
        onSelecionarLote={setLote}
      />

      <header className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/95 px-4 py-2 shadow">
        <MapPinned size={18} className="text-blue-600" />
        <select
          value={cidade}
          onChange={(e) => {
            setCidade(e.target.value);
            setLote(null);
          }}
          className="rounded border px-2 py-1 text-sm"
        >
          {Object.keys(CIDADES).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </header>

      <div className="absolute left-3 top-16 z-10 space-y-1 rounded-lg bg-white/95 p-2.5 text-xs shadow sm:bottom-3 sm:top-auto">
        {Object.entries(STATUS_MAPA).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: v.cor }} />
            {v.rotulo}
          </div>
        ))}
      </div>

      <PainelLote lote={lote} aoFechar={() => setLote(null)} />
    </div>
  );
}
