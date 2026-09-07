import { useEffect, useState } from 'react';
import { X, Phone, Instagram, Globe, ExternalLink, MapPin, Ruler } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import {
  buscarEstabelecimentoPorLote,
  buscarProdutos,
  linkWhatsApp,
} from '../lib/supabase/queries.js';

export default function PainelLote({ lote, aoFechar }) {
  const [estab, setEstab] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!lote) return;
    let vivo = true;
    setEstab(null);
    setProdutos([]);
    if (lote.status_vitrine !== 'ocupado') return;
    setCarregando(true);
    (async () => {
      try {
        const e = await buscarEstabelecimentoPorLote(lote.lote_id);
        if (!vivo) return;
        setEstab(e);
        if (e) {
          const { produtos } = await buscarProdutos(e.id, { pagina: 0, tamanho: 12 });
          if (vivo) setProdutos(produtos);
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [lote]);

  if (!lote) return null;

  const status =
    lote.status_vitrine === 'ocupado'
      ? 'ocupado'
      : lote.status_vitrine === 'oportunidade'
        ? 'oportunidade'
        : 'residencial';

  return (
    <aside className="absolute inset-x-0 bottom-0 z-20 flex max-h-[75%] flex-col overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-0 sm:top-0 sm:max-h-none sm:h-full sm:w-full sm:max-w-sm sm:rounded-none">
      <header className="flex items-start justify-between gap-3 border-b p-4">
        <div className="space-y-2">
          <StatusBadge status={status} />
          <h2 className="text-lg font-semibold leading-tight">
            {estab?.nome_fantasia ?? 'Espaço disponível'}
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={14} /> {lote.endereco}
            {lote.numero ? `, ${lote.numero}` : ''}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <Ruler size={14} /> {Number(lote.area_m2).toLocaleString('pt-BR')} m²
          </p>
        </div>
        <button onClick={aoFechar} className="rounded p-1 hover:bg-slate-100" aria-label="Fechar">
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 space-y-4 p-4">
        {carregando && <p className="text-sm text-slate-500">Carregando vitrine…</p>}

        {!carregando && status === 'oportunidade' && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Este lote está livre. Quer transformá-lo em uma vitrine digital?{' '}
            <a className="font-medium underline" href="/cadastro">
              Ativar licença
            </a>
          </div>
        )}

        {estab && (
          <>
            {estab.descricao && <p className="text-sm text-slate-700">{estab.descricao}</p>}
            {estab.categoria && (
              <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {estab.categoria}
              </span>
            )}

            <div className="flex flex-wrap gap-2">
              {estab.telefone_whatsapp && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white"
                  href={linkWhatsApp(estab.telefone_whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone size={15} /> WhatsApp
                </a>
              )}
              {estab.instagram_url && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
                  href={estab.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram size={15} /> Instagram
                </a>
              )}
              {estab.website_url && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
                  href={estab.website_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe size={15} /> Site
                </a>
              )}
              {estab.ecommerce_url && (
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm"
                  href={estab.ecommerce_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} /> Loja online
                </a>
              )}
            </div>

            {produtos.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Catálogo</h3>
                <ul className="grid grid-cols-2 gap-3">
                  {produtos.map((p) => (
                    <li key={p.id} className="rounded-lg border p-2 text-sm">
                      {p.imagem_url && (
                        <img
                          src={p.imagem_url}
                          alt={p.nome}
                          className="mb-1.5 aspect-square w-full rounded object-cover"
                        />
                      )}
                      <p className="font-medium leading-tight">{p.nome}</p>
                      {p.preco != null && (
                        <p className="text-slate-600">
                          {Number(p.preco).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
