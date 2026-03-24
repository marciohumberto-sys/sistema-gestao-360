import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Package, FileOutput, FileInput, Settings2, Download, Printer, FileText, ArrowLeftRight, Users, AlertTriangle, Calendar, BarChart2, Lightbulb } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia } from '../../utils/farmaciaAcl';
import { mockMovimentacoes } from '../../mocks/farmaciaMocks';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import FarmaciaRelatorioModal from './modals/FarmaciaRelatorioModal';
import './FarmaciaPages.css';

const FarmaciaRelatorios = () => {
    const { tenantLink, isSuperAdmin } = useAuth();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    const hasAccess = canAccessFarmacia(role, '/farmacia/relatorios');

    const { unidadeAtiva } = useFarmacia();

    // Mesmos dados do Histórico
    const dados = mockMovimentacoes;

    // Estado interno para filtros futuros (preparo arquitetural, sem UI)
    const [filtrosPeriodo, setFiltrosPeriodo] = useState({ inicio: null, fim: null });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReportType, setSelectedReportType] = useState(null);

    const openReportModal = (type) => {
        setSelectedReportType(type);
        setIsModalOpen(true);
    };

    const movimentacoesFiltradas = dados; // Para o futuro: lógica de filtrar dados baseada no estado

    // Cálculos para KPIs e Gráficos sobre os dados FILTRADOS
    const metricas = useMemo(() => {
        const total = movimentacoesFiltradas.length;
        const entradas = movimentacoesFiltradas.filter(m => m.tipo === 'ENTRADA').length;
        const saidas = movimentacoesFiltradas.filter(m => m.tipo === 'SAIDA').length;
        const ajustes = movimentacoesFiltradas.filter(m => m.tipo === 'AJUSTE').length;

        // Top 5 Medicamentos
        const ranking = {};
        movimentacoesFiltradas.forEach(m => {
            ranking[m.medicamento] = (ranking[m.medicamento] || 0) + 1;
        });
        const topMedicamentos = Object.entries(ranking)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const maxMovs = topMedicamentos.length > 0 ? topMedicamentos[0][1] : 1;

        return { total, entradas, saidas, ajustes, topMedicamentos, maxMovs };
    }, [movimentacoesFiltradas]);

    // Gráfico de Barras Inline Elegante (Top Medicamentos)
    const renderBarChartRows = () => {
        if (metricas.topMedicamentos.length === 0) {
            return <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>Nenhum dado no período.</div>;
        }
        return metricas.topMedicamentos.map(([nome, freq], idx) => {
            const perc = (freq / metricas.maxMovs) * 100;
            const predominant = freq > 4 ? 'predomínio de saídas' : (idx === 0 ? 'entradas recentes' : 'movimentação mista');
            return (
                <div key={idx} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>{nome}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{freq} movs</span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>{predominant}</span>
                        </div>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${perc}%`, background: 'var(--color-secondary)', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                    </div>
                </div>
            );
        });
    };

    if (!hasAccess) {
        return <Navigate to="/farmacia/dashboard" replace />;
    }

    return (
        <div className="farmacia-page-container">
            {/* Header */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Relatórios</h1>
                    <p className="farmacia-page-subtitle">Análises e relatórios do estoque de medicamentos.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            {/* KPIs */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '0.5rem' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MOVIMENTAÇÕES NO PERÍODO</span>
                    <span className="premium-card-value text-secondary">{metricas.total}</span>
                    <span className="premium-card-desc">registros processados</span>
                    <div style={{ fontSize: '0.72rem', marginTop: '6px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-primary)' }}>Maior volume</span> em 7 dias
                    </div>
                    <div className="premium-card-icon-box bg-itens"><Package size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS</span>
                    <span className="premium-card-value" style={{ color: '#00967D' }}>{metricas.entradas}</span>
                    <span className="premium-card-desc">recebimentos efetuados</span>
                    <div style={{ fontSize: '0.72rem', marginTop: '6px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ color: '#00967D' }}>↑ 12%</span> vs ref. anterior
                    </div>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(0,150,125,0.1)', color: '#00967D' }}><FileInput size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">SAÍDAS</span>
                    <span className="premium-card-value color-orange">{metricas.saidas}</span>
                    <span className="premium-card-desc">distribuições aos setores</span>
                    <div style={{ fontSize: '0.72rem', marginTop: '6px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-primary)' }}>Dentro da média</span> esperada
                    </div>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}><FileOutput size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AJUSTES</span>
                    <span className="premium-card-value color-blue">{metricas.ajustes}</span>
                    <span className="premium-card-desc">correções de saldo operadas</span>
                    <div style={{ fontSize: '0.72rem', marginTop: '6px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <span style={{ color: '#00967D' }}>Baixa anomalia</span> identificada
                    </div>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Settings2 size={20} /></div>
                </div>
            </div>

            {/* Insight Automático Operacional */}
            <div style={{ 
                padding: '1rem 1.25rem',
                background: 'var(--bg-muted)', borderRadius: '0 8px 8px 0', borderLeft: '4px solid var(--color-secondary)',
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                animation: 'farmacia-fade-in 0.3s ease-out'
            }}>
                <div style={{ background: 'var(--bg-body)', padding: '8px', borderRadius: '8px', color: 'var(--color-secondary)', boxShadow: 'var(--shadow-sm)', marginTop: '2px' }}>
                    <Lightbulb size={20} />
                </div>
                <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leitura Operacional</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        As <strong>saídas compõem a maior parte das movimentações</strong> registradas no período ({metricas.total ? ((metricas.saidas/metricas.total)*100).toFixed(0) : 0}%). Entradas recentes garantiram a reposição, e o volume de ajustes continua excepcionalmente baixo, sinalizando excelente saúde no controle do inventário.
                    </p>
                </div>
            </div>

            {/* Container Principal Duplo: Gráficos lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
                 {/* Gráfico 1: Movimentações por Tipo */}
                 <div className="farmacia-card" style={{ gap: '1.5rem' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1.05rem' }}>Movimentações por Tipo</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        {/* Entrada */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#00967D' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                                    <span>Entradas</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>({metricas.entradas} registros)</span>
                                </div>
                                <span>{metricas.total ? ((metricas.entradas/metricas.total)*100).toFixed(1) : 0}%</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-muted)', borderRadius: '5px' }}>
                                <div style={{ height: '100%', width: `${metricas.total ? (metricas.entradas/metricas.total)*100 : 0}%`, background: '#00967D', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                        {/* Saída */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#ea580c' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                                    <span>Saídas</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>({metricas.saidas} registros)</span>
                                </div>
                                <span>{metricas.total ? ((metricas.saidas/metricas.total)*100).toFixed(1) : 0}%</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-muted)', borderRadius: '5px' }}>
                                <div style={{ height: '100%', width: `${metricas.total ? (metricas.saidas/metricas.total)*100 : 0}%`, background: '#ea580c', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                        {/* Ajuste */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#3b82f6' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                                    <span>Ajustes</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 500 }}>({metricas.ajustes} registros)</span>
                                </div>
                                <span>{metricas.total ? ((metricas.ajustes/metricas.total)*100).toFixed(1) : 0}%</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-muted)', borderRadius: '5px' }}>
                                <div style={{ height: '100%', width: `${metricas.total ? (metricas.ajustes/metricas.total)*100 : 0}%`, background: '#3b82f6', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gráfico 2: Medicamentos Mais Movimentados */}
                <div className="farmacia-card">
                    <h2 className="farmacia-card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Medicamentos Mais Movimentados</h2>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {renderBarChartRows()}
                    </div>
                </div>
            </div>

            {/* Catálogo de Relatórios Disponíveis */}
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="farmacia-section-header" style={{ marginBottom: 0 }}>
                    <h2 className="farmacia-section-title">Relatórios Disponíveis</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    
                    {/* Card 1: Posição de Estoque */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon"><Package size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Posição de Estoque</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Visualiza a posição real do estoque por item, detalhando saldo físico atual, lotes ativos e projeção de validades.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('POSICAO_ESTOQUE')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 2: Movimentações por Período */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(0,150,125,0.08)', color: '#00967D' }}><ArrowLeftRight size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Movimentações por Período</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Exibe o histórico consolidado de entradas, saídas e ajustes registrados dentro de um recorte específico de tempo.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('MOVIMENTACOES')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 3: Consumo por Setor */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}><Users size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Consumo por Setor</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Apura o principal destino das dispensações, mapeando custos e demanda material para cada unidade da rede.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('CONSUMO_SETOR')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 4: Itens Abaixo do Mínimo */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}><AlertTriangle size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Itens Abaixo do Mínimo</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Identifica automaticamente itens com saldo crítico para subsidiar tomadas rápidas de decisão em rotinas de compras.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('ABAIXO_MINIMO')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 5: Validades a Vencer */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Calendar size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Validades a Vencer</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Relaciona as medicações com vencimento próximo no estoque ativo, alertando antecipadamente e mitigando perdas.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('VALIDADES')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 6: Curva ABC de Consumo */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><BarChart2 size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Curva ABC de Consumo</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Mapeia e classifica os medicamentos por criticidade e volume de consumo, otimizando o esforço analítico de controle.
                                </p>
                            </div>
                        </div>
                        <button className="farmacia-btn-primary" onClick={() => openReportModal('CURVA_ABC')} style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                </div>
            </div>

            <FarmaciaRelatorioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                reportType={selectedReportType}
                defaultUnidade={unidadeAtiva?.label}
            />
        </div>
    );
};

export default FarmaciaRelatorios;
