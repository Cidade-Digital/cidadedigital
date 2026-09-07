import { useCallback, useEffect, useState } from 'react';
import { Store, Search, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../lib/supabase/AuthContext.jsx';
import {
  minhasLicencas,
  buscarLotesParaLicenca,
  solicitarLicenca,
} from '../lib/supabase/gestao.js';
import EditorEstabelecimento from '../components/EditorEstabelecimento.jsx';
import EditorProdutos from '../components/EditorProdutos.jsx';

const ROTULO_STATUS = {
  ativa: { txt: 'Ativa', cls: 'bg-green-100 text-green-700', Icone: CheckCircle2 },
  pendente: { txt: 'Aguardando ativação', cls: 'bg-amber-100 text-amber-700', Icone: Clock },
  expirada: { txt: 'Expirada', cls: 'bg-slate-100 text-slate-500', Icone: XCircle },
};

function Solicitar({ aoSolicitar }) {
  const [cidade, setCidade] = useState('Osvaldo Cruz');
  const [termo, setTermo] = useState('');
  const [lotes, setLotes] = useState([]);
  const [erro, setErro] = useState(null);

  async function procurar(e) {
    e.preventDefault();
    setErro(null);
    try {
      setLotes(await buscarLotesParaLicenca(cidade, termo));
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-medium">Solicitar licença para um lote</h3>
      <form onSubmit={procurar} className="flex flex-wrap gap-2">
        <select
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option>Osvaldo Cruz</option>
          <option>Parapuã</option>
        </select>
        <input
          className="flex-1 rounded border px-3 py-1.5 text-sm"
          placeholder="Buscar por endereço"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <button className="inline-flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-sm text-white">
          <Search size={14} /> Buscar
        </button>
      </form>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <ul className="mt-3 divide-y">
        {lotes.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              {l.endereco}
              {l.numero ? `, ${l.numero}` : ''} · {Number(l.area_m2).toLocaleString('pt-BR')} m²
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                {l.status_ocupacao}
              </span>
            </span>
            <button
              onClick={() => aoSolicitar(l.id)}
              className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
            >
              Solicitar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PainelComerciante() {
  const { perfil, virarComerciante } = useAuth();
  const [licencas, setLicencas] = useState([]);
  const [sel, setSel] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await minhasLicencas();
      setLicencas(dados);
      setSel((s) => dados.find((l) => l.id === s?.id) ?? dados[0] ?? null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function pedir(loteId) {
    setErro(null);
    try {
      if (perfil?.funcao === 'visitante') await virarComerciante();
      await solicitarLicenca(loteId);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <p className="p-6 text-sm text-slate-500">Carregando…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Store size={20} /> Minha vitrine
      </h1>
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Solicitar aoSolicitar={pedir} />

      {licencas.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {licencas.map((l) => {
              const st = ROTULO_STATUS[l.status] ?? ROTULO_STATUS.pendente;
              return (
                <button
                  key={l.id}
                  onClick={() => setSel(l)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    sel?.id === l.id ? 'border-blue-600 ring-1 ring-blue-600' : ''
                  }`}
                >
                  <span className="block font-medium">
                    {l.estabelecimento?.nome_fantasia ?? l.lote?.endereco ?? 'Lote'}
                  </span>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${st.cls}`}
                  >
                    <st.Icone size={12} /> {st.txt}
                  </span>
                </button>
              );
            })}
          </div>

          {sel && (
            <section className="space-y-6">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Lote: {sel.lote?.endereco}
                {sel.lote?.numero ? `, ${sel.lote.numero}` : ''} — {sel.lote?.cidade}
                {sel.status === 'pendente' && (
                  <span className="mt-1 block text-amber-700">
                    Você já pode preencher a vitrine. Ela ficará pública quando o
                    administrador confirmar o pagamento e ativar a licença.
                  </span>
                )}
              </div>

              <div>
                <h2 className="mb-3 font-medium">Dados da vitrine</h2>
                <EditorEstabelecimento
                  licencaId={sel.id}
                  inicial={sel.estabelecimento ?? undefined}
                  aoSalvar={recarregar}
                />
              </div>

              {sel.estabelecimento?.id && (
                <div>
                  <h2 className="mb-3 font-medium">Catálogo de produtos</h2>
                  <EditorProdutos estabelecimentoId={sel.estabelecimento.id} />
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
