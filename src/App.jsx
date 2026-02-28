import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

import Dashboard from './pages/Dashboard';
import OrdensFornecimento from './pages/OrdensFornecimento';
import NotasFiscais from './pages/NotasFiscais';
import Contratos from './pages/Contratos';
import Empenhos from './pages/Empenhos';
import Aditivos from './pages/Aditivos';
import Relatorios from './pages/Relatorios';
import Alertas from './pages/Alertas';
import Cadastros from './pages/Cadastros';
import Configuracoes from './pages/Configuracoes';
import ContractDetails from './pages/ContractDetails';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="ordens-fornecimento" element={<OrdensFornecimento />} />
          <Route path="notas-fiscais" element={<NotasFiscais />} />
          <Route path="contratos" element={<Contratos />} />
          <Route path="empenhos" element={<Empenhos />} />
          <Route path="aditivos" element={<Aditivos />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="cadastros" element={<Cadastros />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="contratos/:id" element={<ContractDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
