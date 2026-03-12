import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { TenantProvider, useTenant } from './context/TenantContext';

import Dashboard from './pages/Dashboard';
import OrdensFornecimento from './pages/OrdensFornecimento';
import OfDetails from './pages/OfDetails';
import OfPreview from './pages/OfPreview';
import NotasFiscais from './pages/NotasFiscais';
import Contratos from './pages/Contratos';
import Empenhos from './pages/Empenhos';
import EmpenhoDetails from './pages/EmpenhoDetails';
import Aditivos from './pages/Aditivos';
import Relatorios from './pages/Relatorios';
import Alertas from './pages/Alertas';
import Cadastros from './pages/Cadastros';
import Configuracoes from './pages/Configuracoes';
import ContractDetails from './pages/ContractDetails';

const AppContent = () => {
  const { loading } = useTenant();

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="ordens-fornecimento" element={<OrdensFornecimento />} />
        <Route path="ordens-fornecimento/:id" element={<OfDetails />} />
        <Route path="notas-fiscais" element={<NotasFiscais />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="empenhos" element={<Empenhos />} />
        <Route path="aditivos" element={<Aditivos />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="cadastros" element={<Cadastros />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="contratos/:id" element={<ContractDetails />} />
        <Route path="empenhos/:id" element={<EmpenhoDetails />} />
      </Route>
      {/* Route without MainLayout */}
      <Route path="/of-preview/:id" element={<OfPreview />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AppContent />
      </TenantProvider>
    </BrowserRouter>
  );
}

export default App;
