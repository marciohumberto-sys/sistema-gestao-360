import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Package, FileOutput, FileInput, Settings2, Download, Printer, FileText, ArrowLeftRight, Users, AlertTriangle, Calendar, BarChart2 } from 'lucide-react';
import { mockMovimentacoes } from '../../mocks/farmaciaMocks';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

const FarmaciaRelatorios = () => {
    // Mesmos dados do Histórico
    const dados = mockMovimentacoes;

    const movimentacoesFiltradas = dados;

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
            return (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{nome}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{freq} movs</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${perc}%`, background: 'var(--color-secondary)', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                    </div>
                </div>
            );
        });
    };

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

            {/* KPIs (Mesmo CSS mini-cards do Dashboard e Estoque) */}
            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">MOVIMENTAÇÕES NO PERÍODO</span>
                    <span className="premium-card-value text-secondary">{metricas.total}</span>
                    <span className="premium-card-desc">registros processados</span>
                    <div className="premium-card-icon-box bg-itens"><Package size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS</span>
                    <span className="premium-card-value" style={{ color: '#00967D' }}>{metricas.entradas}</span>
                    <span className="premium-card-desc">recebimentos efetuados</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(0,150,125,0.1)', color: '#00967D' }}><FileInput size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">SAÍDAS</span>
                    <span className="premium-card-value color-orange">{metricas.saidas}</span>
                    <span className="premium-card-desc">distribuições aos setores</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}><FileOutput size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">AJUSTES</span>
                    <span className="premium-card-value color-blue">{metricas.ajustes}</span>
                    <span className="premium-card-desc">correções de saldo operadas</span>
                    <div className="premium-card-icon-box" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Settings2 size={20} /></div>
                </div>
            </div>

            {/* Container Principal Duplo: Gráficos lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
                 {/* Gráfico 1: Movimentações por Tipo (Elegante Barras ou Donut Fake) */}
                 <div className="farmacia-card" style={{ gap: '1.5rem' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1.05rem' }}>Movimentações por Tipo</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        {/* Entrada */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#00967D' }}>
                                <span>Entradas</span>
                                <span>{metricas.total ? ((metricas.entradas/metricas.total)*100).toFixed(1) : 0}%</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-muted)', borderRadius: '5px' }}>
                                <div style={{ height: '100%', width: `${metricas.total ? (metricas.entradas/metricas.total)*100 : 0}%`, background: '#00967D', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                        {/* Saída */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#ea580c' }}>
                                <span>Saídas</span>
                                <span>{metricas.total ? ((metricas.saidas/metricas.total)*100).toFixed(1) : 0}%</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-muted)', borderRadius: '5px' }}>
                                <div style={{ height: '100%', width: `${metricas.total ? (metricas.saidas/metricas.total)*100 : 0}%`, background: '#ea580c', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                        {/* Ajuste */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#3b82f6' }}>
                                <span>Ajustes</span>
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

            {/* Espaço removido a pedido do user (Histórico Detalhado) */}

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
                                    Relatório completo da posição atual do estoque com quantidades, lotes e validades.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 2: Movimentações por Período */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(0,150,125,0.08)', color: '#00967D' }}><ArrowLeftRight size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Movimentações por Período</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Histórico de entradas, saídas e ajustes em um intervalo de datas.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 3: Consumo por Setor */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}><Users size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Consumo por Setor</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Análise do consumo de medicamentos por unidade ou setor.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 4: Itens Abaixo do Mínimo */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}><AlertTriangle size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Itens Abaixo do Mínimo</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Lista de medicamentos cujo estoque está abaixo do nível mínimo configurado.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 5: Validades a Vencer */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Calendar size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Validades a Vencer</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Medicamentos com validade próxima ao vencimento.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                    {/* Card 6: Curva ABC de Consumo */}
                    <div className="farmacia-card farmacia-relatorio-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="farmacia-relatorio-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}><BarChart2 size={22} /></div>
                            <div className="farmacia-relatorio-body">
                                <h3 className="farmacia-relatorio-title">Curva ABC de Consumo</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                    Classificação dos medicamentos por criticidade e volume de consumo.
                                </p>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Gerar Relatório</button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FarmaciaRelatorios;
