import React, { useState, useEffect, useMemo } from 'react';
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
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        periodo: 'todos',
        eixoId: 'todos',
        secretariaId: 'todas'
    });

    useEffect(() => {
        const loadData = async () => {
            if (!tenantLink?.tenant_id) return;
            try {
                setLoading(true);
                const data = await planejamentoService.getRawDashboardData(tenantLink.tenant_id);
                setRawData(data);
            } catch (error) {
                console.error('Erro ao carregar dados do dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tenantLink]);

    const dashboardData = useMemo(() => {
        if (!rawData) return null;
        return planejamentoService.computeDashboardData(rawData, filters);
    }, [rawData, filters]);

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
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <Calendar size={16} />
                        </div>
                        <select 
                            className="filter-button-mock" 
                            style={{ appearance: 'none', paddingLeft: '32px', paddingRight: '28px', cursor: 'pointer', outline: 'none' }}
                            value={filters.periodo}
                            onChange={(e) => setFilters(f => ({ ...f, periodo: e.target.value }))}
                        >
                            <option value="todos">Todos os períodos</option>
                            <option value="este-mes">Este mês</option>
                            <option value="ultimos-30">Últimos 30 dias</option>
                            <option value="ultimos-6">Últimos 6 meses</option>
                            <option value="este-ano">Este ano</option>
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <Filter size={16} />
                        </div>
                        <select 
                            className="filter-button-mock" 
                            style={{ appearance: 'none', paddingLeft: '32px', paddingRight: '28px', cursor: 'pointer', outline: 'none', maxWidth: '200px' }}
                            value={filters.eixoId}
                            onChange={(e) => setFilters(f => ({ ...f, eixoId: e.target.value }))}
                        >
                            <option value="todos">Todos os Eixos</option>
                            {rawData?.axes?.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <MapPin size={16} />
                        </div>
                        <select 
                            className="filter-button-mock" 
                            style={{ appearance: 'none', paddingLeft: '32px', paddingRight: '28px', cursor: 'pointer', outline: 'none', maxWidth: '200px' }}
                            value={filters.secretariaId}
                            onChange={(e) => setFilters(f => ({ ...f, secretariaId: e.target.value }))}
                        >
                            <option value="todas">Todas as Secretarias</option>
                            {rawData?.secretariats?.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.sigla}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>
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
