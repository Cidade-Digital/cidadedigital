import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/supabase/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import MapaPublico from './pages/MapaPublico.jsx';
import Entrar from './pages/Entrar.jsx';
import PainelComerciante from './pages/PainelComerciante.jsx';
import AdminLicencas from './pages/AdminLicencas.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<MapaPublico />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route
              path="/painel"
              element={
                <RotaProtegida>
                  <PainelComerciante />
                </RotaProtegida>
              }
            />
            <Route
              path="/admin/licencas"
              element={
                <RotaProtegida somenteAdmin>
                  <AdminLicencas />
                </RotaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
