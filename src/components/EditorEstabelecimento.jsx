import { useState } from 'react';
import { Save } from 'lucide-react';
import { salvarEstabelecimento } from '../lib/supabase/gestao.js';

const CAMPOS = [
  ['nome_fantasia', 'Nome fantasia', 'text', true],
  ['categoria', 'Categoria', 'text'],
  ['telefone_whatsapp', 'WhatsApp (só números, com DDD)', 'text'],
  ['instagram_url', 'Instagram (URL)', 'url'],
  ['website_url', 'Site (URL)', 'url'],
  ['ecommerce_url', 'Loja online / e-commerce (URL)', 'url'],
  ['logo_url', 'Logo (URL da imagem)', 'url'],
];

export default function EditorEstabelecimento({ licencaId, inicial, aoSalvar }) {
  const [form, setForm] = useState(() => ({
    nome_fantasia: '',
    categoria: '',
    descricao: '',
    telefone_whatsapp: '',
    instagram_url: '',
    website_url: '',
    ecommerce_url: '',
    logo_url: '',
    ...inicial,
  }));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const limpo = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      );
      const salvo = await salvarEstabelecimento(licencaId, limpo);
      aoSalvar?.(salvo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      {CAMPOS.map(([k, rotulo, tipo, req]) => (
        <label key={k} className="text-sm">
          <span className="mb-1 block text-slate-600">{rotulo}</span>
          <input
            type={tipo}
            required={req}
            value={form[k] ?? ''}
            onChange={set(k)}
            className="w-full rounded border px-3 py-2"
          />
        </label>
      ))}
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-slate-600">Descrição</span>
        <textarea
          value={form.descricao ?? ''}
          onChange={set('descricao')}
          rows={3}
          className="w-full rounded border px-3 py-2"
        />
      </label>
      {erro && <p className="text-sm text-red-600 sm:col-span-2">{erro}</p>}
      <div className="sm:col-span-2">
        <button
          disabled={ocupado}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          <Save size={15} /> Salvar vitrine
        </button>
      </div>
    </form>
  );
}
