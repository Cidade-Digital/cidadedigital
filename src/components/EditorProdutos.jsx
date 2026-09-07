import { useEffect, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { listarProdutos, salvarProduto, removerProduto } from '../lib/supabase/gestao.js';

const NOVO = { nome: '', descricao: '', preco: '', imagem_url: '', ativo: true };

export default function EditorProdutos({ estabelecimentoId }) {
  const [itens, setItens] = useState([]);
  const [rascunho, setRascunho] = useState(NOVO);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    listarProdutos(estabelecimentoId).then(setItens).catch((e) => setErro(e.message));
  }, [estabelecimentoId]);

  async function adicionar(e) {
    e.preventDefault();
    setErro(null);
    try {
      const salvo = await salvarProduto({
        estabelecimento_id: estabelecimentoId,
        nome: rascunho.nome,
        descricao: rascunho.descricao || null,
        preco: rascunho.preco === '' ? null : Number(rascunho.preco),
        imagem_url: rascunho.imagem_url || null,
        ativo: true,
      });
      setItens((l) => [...l, salvo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setRascunho(NOVO);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function alternarAtivo(p) {
    const salvo = await salvarProduto({ id: p.id, estabelecimento_id: estabelecimentoId, ativo: !p.ativo });
    setItens((l) => l.map((x) => (x.id === p.id ? { ...x, ativo: salvo.ativo } : x)));
  }

  async function excluir(id) {
    await removerProduto(id);
    setItens((l) => l.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={adicionar} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
        <input
          className="rounded border px-2 py-1.5 text-sm"
          placeholder="Nome *"
          value={rascunho.nome}
          onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
          required
        />
        <input
          className="rounded border px-2 py-1.5 text-sm"
          placeholder="Preço"
          type="number"
          step="0.01"
          value={rascunho.preco}
          onChange={(e) => setRascunho((r) => ({ ...r, preco: e.target.value }))}
        />
        <input
          className="rounded border px-2 py-1.5 text-sm sm:col-span-2"
          placeholder="URL da imagem"
          value={rascunho.imagem_url}
          onChange={(e) => setRascunho((r) => ({ ...r, imagem_url: e.target.value }))}
        />
        <input
          className="rounded border px-2 py-1.5 text-sm sm:col-span-3"
          placeholder="Descrição"
          value={rascunho.descricao}
          onChange={(e) => setRascunho((r) => ({ ...r, descricao: e.target.value }))}
        />
        <button className="inline-flex items-center justify-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          <Plus size={14} /> Adicionar
        </button>
      </form>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <ul className="divide-y rounded-lg border">
        {itens.length === 0 && (
          <li className="p-3 text-sm text-slate-500">Nenhum produto ainda.</li>
        )}
        {itens.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
            {p.imagem_url && (
              <img src={p.imagem_url} alt="" className="h-10 w-10 rounded object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium">{p.nome}</p>
              {p.preco != null && (
                <p className="text-slate-500">
                  {Number(p.preco).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => alternarAtivo(p)}
              className={`rounded px-2 py-1 text-xs ${
                p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {p.ativo ? (
                <span className="inline-flex items-center gap-1">
                  <Check size={12} /> Ativo
                </span>
              ) : (
                'Inativo'
              )}
            </button>
            <button
              onClick={() => excluir(p.id)}
              className="rounded p-1 text-red-600 hover:bg-red-50"
              aria-label="Excluir"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
