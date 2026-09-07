import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/supabase/AuthContext.jsx';

export default function Entrar() {
  const { entrar, cadastrar } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const destino = loc.state?.de ?? '/painel';

  const [modo, setModo] = useState('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setMsg(null);
    setOcupado(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
        nav(destino, { replace: true });
      } else {
        await cadastrar(email, senha, nome);
        setMsg('Conta criada. Se a confirmação de e-mail estiver ativa, verifique sua caixa.');
        setModo('entrar');
      }
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-xl font-semibold">
        {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
      </h1>
      <form onSubmit={enviar} className="space-y-3">
        {modo === 'cadastrar' && (
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button
          disabled={ocupado}
          className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {modo === 'entrar' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
      <button
        onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}
        className="mt-3 text-sm text-blue-600 underline"
      >
        {modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Já tenho conta'}
      </button>
      <p className="mt-4 text-sm">
        <Link to="/" className="text-slate-500 underline">
          Voltar ao mapa
        </Link>
      </p>
    </div>
  );
}
