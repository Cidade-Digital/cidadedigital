import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/supabase/AuthContext.jsx';

export default function RotaProtegida({ children, somenteAdmin = false }) {
  const { usuario, ehAdmin, carregando } = useAuth();
  const loc = useLocation();

  if (carregando) return <p className="p-6 text-sm text-slate-500">Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" state={{ de: loc.pathname }} replace />;
  if (somenteAdmin && !ehAdmin) return <Navigate to="/" replace />;
  return children;
}
