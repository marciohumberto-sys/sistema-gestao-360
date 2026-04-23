import React, { useState, useEffect } from 'react';
import { Calendar, Filter, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { planejamentoService } from '../../services/api/planejamento.service';
import './PlanejamentoDashboard.css';

import DashboardKpis from './components/DashboardKpis';
import ExecucaoChart from './components/ExecucaoChart';
import EixoChart from './components/EixoChart';
import ProblemasTable from './components/ProblemasTable';
import RankingSetores from './components/RankingSetores';
import AcoesSemUpdate from './components/AcoesSemUpdate';
import AcoesEmRisco from './components/AcoesEmRisco';
import AcoesMapa from './components/AcoesMapa';

const PlanejamentoDashboard = () => {
    const { tenantLink } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!tenantLink?.tenant_id) return;
            try {
                setLoading(true);
                const data = await planejamentoService.getDashboardData(tenantLink.tenant_id);
                setDashboardData(data);
            } catch (error) {
                console.error('Erro ao carregar dados do dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tenantLink]);

    if (loading) {
        return (
            <div className="planejamento-dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ fontWeight: 600 }}>Carregando dados do painel estratégico...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="planejamento-dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p style={{ color: '#ef4444', fontWeight: 600 }}>Não foi possível carregar os dados.</p>
            </div>
        );
    }

    return (
        <div className="planejamento-dashboard-container">
            {/* 1. Cabeçalho da Página */}
            <header className="planejamento-header">
                <div className="planejamento-title-group">
                    <h1>Painel de Monitoramento e Planejamento</h1>
                    <p>Visão executiva do monitoramento das ações</p>
                </div>
                <div className="planejamento-filters">
                    <button className="filter-button-mock">
                        <Calendar size={16} /> Período
                    </button>
                    <button className="filter-button-mock">
                        <Filter size={16} /> Eixo Estratégico
                    </button>
                    <button className="filter-button-mock">
                        <MapPin size={16} /> Secretaria
                    </button>
                </div>
            </header>

            {/* Linha 1: KPIs Principais */}
            <DashboardKpis data={dashboardData.kpis} />

            {/* Linha 1: Gráficos Principais */}
            <div className="dashboard-row">
                <div className="col-span-8">
                    <ExecucaoChart data={dashboardData.execucao} />
                </div>
                <div className="col-span-4">
                    <EixoChart data={dashboardData.distribuicaoEixos} />
                </div>
            </div>

            {/* Linha 2: Mapa e Atualizações */}
            <div className="dashboard-row">
                <div className="col-span-6">
                    <AcoesMapa data={dashboardData.mapaAgregado} />
                </div>
                <div className="col-span-6">
                    <AcoesSemUpdate data={dashboardData.acoesSemUpdate} />
                </div>
            </div>

            {/* Linha 3: Gestão de Crises */}
            <div className="dashboard-row">
                <div className="col-span-6">
                    <ProblemasTable data={dashboardData.problemasCriticos} />
                </div>
                <div className="col-span-6">
                    <AcoesEmRisco data={dashboardData.acoesEmRisco} />
                </div>
            </div>
        </div>
    );
};

export default PlanejamentoDashboard;
