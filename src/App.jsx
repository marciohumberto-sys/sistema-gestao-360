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

// Módulo Farmácia — Novas rotas (aditivo)
import FarmaciaLayout from './pages/farmacia/FarmaciaLayout';
import FarmaciaDashboard from './pages/farmacia/FarmaciaDashboard';
import FarmaciaEstoque from './pages/farmacia/FarmaciaEstoque';
import FarmaciaEntradas from './pages/farmacia/FarmaciaEntradas';
import FarmaciaSaidas from './pages/farmacia/FarmaciaSaidas';
import FarmaciaMovimentacoes from './pages/farmacia/FarmaciaMovimentacoes';
import FarmaciaAjustes from './pages/farmacia/FarmaciaAjustes';
import FarmaciaRelatorios from './pages/farmacia/FarmaciaRelatorios';

const AppContent = () => {
  const { loading } = useTenant();

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f8fafc',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 150, 125, 0.1)',
          borderTopColor: '#00967d',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: '#64748b',
          letterSpacing: '0.02em'
        }}>
          Carregando...
        </span>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
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

        {/* Módulo Farmácia — Rotas novas (aditivo, sem alterar o que existe acima) */}
        <Route path="farmacia" element={<FarmaciaLayout />}>
          <Route index element={<FarmaciaDashboard />} />
          <Route path="dashboard" element={<FarmaciaDashboard />} />
          <Route path="estoque" element={<FarmaciaEstoque />} />
          <Route path="entradas" element={<FarmaciaEntradas />} />
          <Route path="saidas" element={<FarmaciaSaidas />} />
          <Route path="movimentacoes" element={<FarmaciaMovimentacoes />} />
          <Route path="ajustes" element={<FarmaciaAjustes />} />
          <Route path="relatorios" element={<FarmaciaRelatorios />} />
        </Route>
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
