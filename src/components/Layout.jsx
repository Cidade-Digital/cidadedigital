import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MapPinned, LogOut, Store, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/supabase/AuthContext.jsx';

const linkCls = ({ isActive }) =>
  `px-3 py-1.5 rounded text-sm ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`;

export default function Layout() {
  const { usuario, perfil, ehAdmin, sair } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-white px-3 py-2 sm:px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <MapPinned size={18} className="text-blue-600" />
          <span className="hidden sm:inline">Cidade Digital</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto sm:ml-4">
          <NavLink to="/" className={linkCls} end>
            Mapa
          </NavLink>
          {usuario && (
            <NavLink to="/painel" className={linkCls}>
              <span className="inline-flex items-center gap-1">
                <Store size={14} /> Minha vitrine
              </span>
            </NavLink>
          )}
          {ehAdmin && (
            <NavLink to="/admin/licencas" className={linkCls}>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={14} /> Licenças
              </span>
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
          {usuario ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-slate-500 sm:inline">
                {perfil?.nome ?? usuario.email}
              </span>
              <button
                onClick={async () => {
                  await sair();
                  nav('/');
                }}
                className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:bg-slate-100"
              >
                <LogOut size={14} /> Sair
              </button>
            </>
          ) : (
            <Link to="/entrar" className="rounded bg-blue-600 px-3 py-1.5 text-white">
              Entrar
            </Link>
          )}
        </div>
      </header>
      <main className="relative flex-1">
        <Outlet />
      </main>
    </div>
  );
}
