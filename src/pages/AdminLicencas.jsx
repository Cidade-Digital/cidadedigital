import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Check, Ban } from 'lucide-react';
import { licencasPorStatus, ativarLicenca, definirLicenca } from '../lib/supabase/gestao.js';

const ABAS = ['pendente', 'ativa', 'expirada'];

export default function AdminLicencas() {
  const [aba, setAba] = useState('pendente');
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setItens(await licencasPorStatus(aba));
    } catch (e) {
      setErro(e.message);
    }
  }, [aba]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function ativar(l) {
    setOcupado(l.id);
    try {
      await ativarLicenca(l.id, l.lote.id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function expirar(l) {
    setOcupado(l.id);
    try {
      await definirLicenca(l.id, { status: 'expirada' });
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ShieldCheck size={20} /> Licenças digitais
      </h1>

      <div className="flex gap-1">
        {ABAS.map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded px-3 py-1.5 text-sm capitalize ${
              aba === a ? 'bg-blue-600 text-white' : 'border'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <ul className="divide-y rounded-lg border">
        {itens.length === 0 && (
          <li className="p-4 text-sm text-slate-500">Nada em “{aba}”.</li>
        )}
        {itens.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <div className="flex-1">
              <p className="font-medium">
                {l.lote?.endereco}
                {l.lote?.numero ? `, ${l.lote.numero}` : ''} — {l.lote?.cidade}
              </p>
              <p className="text-slate-500">
                {l.perfil?.nome ?? '—'} · {l.perfil?.email} · {l.perfil?.telefone ?? 'sem telefone'}
              </p>
              {l.data_fim && (
                <p className="text-slate-400">Vigência até {l.data_fim}</p>
              )}
            </div>
            {aba === 'pendente' && (
              <button
                disabled={ocupado === l.id}
                onClick={() => ativar(l)}
                className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-white disabled:opacity-50"
              >
                <Check size={14} /> Ativar (12 meses)
              </button>
            )}
            {aba === 'ativa' && (
              <button
                disabled={ocupado === l.id}
                onClick={() => expirar(l)}
                className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-red-600 disabled:opacity-50"
              >
                <Ban size={14} /> Expirar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
