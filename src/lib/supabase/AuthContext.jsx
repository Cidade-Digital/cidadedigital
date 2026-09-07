import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './client.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (uid) => {
    if (!uid) return setPerfil(null);
    const { data } = await supabase.from('perfis').select('*').eq('id', uid).maybeSingle();
    setPerfil(data ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await carregarPerfil(data.session?.user?.id);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessao(s);
      carregarPerfil(s?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [carregarPerfil]);

  const valor = {
    sessao,
    usuario: sessao?.user ?? null,
    perfil,
    carregando,
    ehAdmin: perfil?.funcao === 'admin',
    async entrar(email, senha) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    },
    async cadastrar(email, senha, nome) {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      if (error) throw error;
    },
    async sair() {
      await supabase.auth.signOut();
    },
    async virarComerciante() {
      const { error } = await supabase
        .from('perfis')
        .update({ funcao: 'comerciante' })
        .eq('id', sessao.user.id);
      if (error) throw error;
      await carregarPerfil(sessao.user.id);
    },
    recarregarPerfil: () => carregarPerfil(sessao?.user?.id),
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
