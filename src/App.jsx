import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { TenantProvider, useTenant } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Login from './pages/auth/Login';
import AcessoNegado from './pages/auth/AcessoNegado';
import Home from './pages/Home';

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
import FarmaciaUsuarios from './pages/farmacia/FarmaciaUsuarios';

// Container nativo do Tenant para rotas base
const AppContent = () => {
  const { loading } = useTenant();

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 150, 125, 0.1)', borderTopColor: '#00967d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Carregando dados globais...</span>
      </div>
    );
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/acesso-negado" element={<AcessoNegado />} />
            
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

            {/* Core de Rotas Protegidas - App Content espera Carregamento do Tenant após Auth */}
            <Route element={<AppContent />}>
                
                {/* TELA PRINCIPAL - Shell (Navbar + Sidebar) comum a todos os módulos permitidos */}
                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  
                  {/* Central Router: Base Vazia deve Ir Para Home Pós-Login */}
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/compras/dashboard" replace />} />
                  <Route path="/ordens-fornecimento" element={<Navigate to="/compras/ordens-fornecimento" replace />} />
                  <Route path="/notas-fiscais" element={<Navigate to="/compras/notas-fiscais" replace />} />
                  <Route path="/contratos" element={<Navigate to="/compras/contratos" replace />} />
                  <Route path="/empenhos" element={<Navigate to="/compras/empenhos" replace />} />
                  <Route path="/aditivos" element={<Navigate to="/compras/aditivos" replace />} />
                  <Route path="/relatorios" element={<Navigate to="/compras/relatorios" replace />} />
                  <Route path="/alertas" element={<Navigate to="/compras/alertas" replace />} />
                  <Route path="/cadastros" element={<Navigate to="/compras/cadastros" replace />} />
                  <Route path="/configuracoes" element={<Navigate to="/compras/configuracoes" replace />} />
                  
                  {/* --- Galho Restrito: COMPRAS --- */}
                  <Route path="compras" element={<ProtectedRoute module="COMPRAS" />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
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

                  {/* --- Galho Restrito: FARMÁCIA --- */}
                  <Route path="farmacia" element={<ProtectedRoute module="FARMACIA" />}>
                    <Route element={<FarmaciaLayout />}>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<FarmaciaDashboard />} />
                      <Route path="estoque" element={<FarmaciaEstoque />} />
                      <Route path="entradas" element={<FarmaciaEntradas />} />
                      <Route path="saidas" element={<FarmaciaSaidas />} />
                      <Route path="movimentacoes" element={<FarmaciaMovimentacoes />} />
                      <Route path="ajustes" element={<FarmaciaAjustes />} />
                      <Route path="relatorios" element={<FarmaciaRelatorios />} />
                      <Route path="usuarios" element={<FarmaciaUsuarios />} />
                    </Route>
                  </Route>

                </Route>

                {/* Print/Preview Solto sem MainLayout */}
                {/* Fallback de preview antigo */}
                <Route path="/of-preview/:id" element={<Navigate to="/compras/of-preview/:id" replace />} />
                <Route path="/compras/of-preview/:id" element={<ProtectedRoute module="COMPRAS"><OfPreview /></ProtectedRoute>} />
                
            </Route>
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
