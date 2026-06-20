import React, { useState } from 'react';
import { 
    BarChart2, FileText, Download, Clock, 
    CheckCircle, AlertCircle, PieChart, Users, 
    Activity, ArrowUpRight, Filter, Search, Calendar
} from 'lucide-react';
import './LaboratorioRelatorios.css';

const LaboratorioRelatorios = () => {
    const [activeReport, setActiveReport] = useState('producao');

    const kpis = [
        { label: 'Pacientes no período', value: '1.284', icon: Users, color: '#3b82f6' },
        { label: 'Exames realizados', value: '8.742', icon: Activity, color: '#8b5cf6' },
        { label: 'Laudos liberados', value: '7.960', icon: CheckCircle, color: '#10b981' },
        { label: 'Tempo médio', value: '02h 45m', icon: Clock, color: '#f59e0b' },
        { label: 'Exames pendentes', value: '312', icon: AlertCircle, color: '#ef4444' },
    ];

    const reportTypes = [
        { id: 'producao', label: 'Produção por setor' },
        { id: 'paciente', label: 'Exames por paciente' },
        { id: 'laudos', label: 'Laudos por período' },
        { id: 'pendencias', label: 'Pendências de conferência' },
        { id: 'tempo', label: 'Tempo de liberação' },
        { id: 'solicitados', label: 'Exames mais solicitados' },
    ];

    const chartData = [
        { label: 'Bioquímica', value: 3420, percent: 85, color: '#3b82f6' },
        { label: 'Hematologia', value: 2180, percent: 55, color: '#8b5cf6' },
        { label: 'Urinálise', value: 1240, percent: 30, color: '#10b981' },
        { label: 'Sorologia', value: 980, percent: 25, color: '#f59e0b' },
        { label: 'Fezes', value: 522, percent: 15, color: '#64748b' },
        { label: 'Diversos', value: 400, percent: 10, color: '#94a3b8' },
    ];

    const tableData = [
        { setor: 'Bioquímica', exames: '3420', liberados: '3180', pendentes: '240', tempo: '02h 30m', status: 'Normal', statusClass: 'lab-badge-success' },
        { setor: 'Hematologia', exames: '2180', liberados: '2010', pendentes: '170', tempo: '03h 05m', status: 'Atenção', statusClass: 'lab-badge-warning' },
        { setor: 'Urinálise', exames: '1240', liberados: '1190', pendentes: '50', tempo: '01h 40m', status: 'Normal', statusClass: 'lab-badge-success' },
        { setor: 'Sorologia', exames: '980', liberados: '870', pendentes: '110', tempo: '04h 10m', status: 'Atenção', statusClass: 'lab-badge-warning' },
        { setor: 'Fezes', exames: '522', liberados: '500', pendentes: '22', tempo: '02h 00m', status: 'Normal', statusClass: 'lab-badge-success' },
    ];

    return (
        <div className="lab-rel-container">
            
            {/* Header */}
            <header className="lab-rel-header">
                <div>
                    <h1 className="lab-title">Relatórios</h1>
                    <p className="lab-subtitle">Análises, indicadores e relatórios operacionais do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><Activity size={16} /> Atualizar dados</button>
                    <button className="lab-btn lab-btn-outline"><FileText size={16} /> Exportar PDF</button>
                    <button className="lab-btn lab-btn-success"><Download size={16} /> Exportar Excel</button>
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpis-grid" style={{ marginBottom: '1.5rem' }}>
                {kpis.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-kpi-card">
                            <div className="lab-kpi-header">
                                <span className="lab-kpi-label">{item.label}</span>
                                <div className="lab-kpi-icon-wrapper" style={{ backgroundColor: `${item.color}15`, color: item.color, width: '36px', height: '36px', borderRadius: '8px' }}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="lab-kpi-value" style={{ fontSize: '1.6rem' }}>{item.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="lab-rel-filters-card">
                <div className="lab-rel-filters-grid">
                    <div className="lab-filter-item">
                        <label>Período inicial</label>
                        <input type="date" defaultValue="2026-06-01" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Período final</label>
                        <input type="date" defaultValue="2026-06-20" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor</label>
                        <select>
                            <option>Todos</option>
                            <option>Bioquímica</option>
                            <option>Hematologia</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Status</label>
                        <select>
                            <option>Todos</option>
                            <option>Liberados</option>
                            <option>Pendentes</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Convênio</label>
                        <select>
                            <option>Todos</option>
                            <option>SUS</option>
                            <option>Particular</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Local</label>
                        <select>
                            <option>Matriz</option>
                            <option>Posto 1</option>
                        </select>
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Tipos de Relatório */}
            <div className="lab-rel-types">
                {reportTypes.map(type => (
                    <button 
                        key={type.id}
                        className={`lab-rel-type-btn ${activeReport === type.id ? 'active' : ''}`}
                        onClick={() => setActiveReport(type.id)}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Layout Principal do Relatório Atual */}
            {activeReport === 'producao' && (
                <>
                    <div className="lab-rel-layout">
                        {/* Gráfico Principal */}
                        <div className="lab-rel-main-panel">
                            <h2 className="lab-rel-panel-title">Produção por Setor</h2>
                            <p className="lab-rel-panel-subtitle">Quantidade de exames processados por setor no período selecionado</p>
                            
                            <div className="lab-rel-chart">
                                {chartData.map((bar, idx) => (
                                    <div key={idx} className="lab-chart-bar-container">
                                        <div className="lab-chart-label-row">
                                            <span>{bar.label}</span>
                                            <span>{bar.value.toLocaleString('pt-BR')} exames</span>
                                        </div>
                                        <div className="lab-chart-track">
                                            <div 
                                                className="lab-chart-fill" 
                                                style={{ width: `${bar.percent}%`, backgroundColor: bar.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Painel Lateral de Resumo */}
                        <div className="lab-rel-side-panel">
                            <h3 className="lab-rel-side-title"><PieChart size={20} color="#3b82f6" /> Resumo do Período</h3>
                            
                            <div className="lab-rel-stat-item">
                                <span className="lab-rel-stat-label">Setor de maior produção</span>
                                <span className="lab-rel-stat-value highlight">Bioquímica</span>
                            </div>
                            <div className="lab-rel-stat-item">
                                <span className="lab-rel-stat-label">Pico de atendimento</span>
                                <span className="lab-rel-stat-value">08h às 10h</span>
                            </div>
                            <div className="lab-rel-stat-item">
                                <span className="lab-rel-stat-label">Média diária</span>
                                <span className="lab-rel-stat-value">437 exames/dia</span>
                            </div>
                            <div className="lab-rel-stat-item">
                                <span className="lab-rel-stat-label">Pendências críticas</span>
                                <span className="lab-rel-stat-value" style={{ color: '#ef4444' }}>18</span>
                            </div>
                            <div className="lab-rel-stat-item">
                                <span className="lab-rel-stat-label">Taxa de liberação</span>
                                <span className="lab-rel-stat-value" style={{ color: '#10b981' }}>91%</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Detalhamento */}
                    <div className="lab-rel-table-card">
                        <div className="lab-rel-table-wrapper">
                            <table className="lab-rel-table">
                                <thead>
                                    <tr>
                                        <th>Setor</th>
                                        <th>Exames</th>
                                        <th>Liberados</th>
                                        <th>Pendentes</th>
                                        <th>Tempo Médio</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="font-bold text-gray-800">{row.setor}</td>
                                            <td className="font-semibold text-primary">{row.exames}</td>
                                            <td style={{ color: '#10b981', fontWeight: '600' }}>{row.liberados}</td>
                                            <td style={{ color: '#ef4444', fontWeight: '600' }}>{row.pendentes}</td>
                                            <td>{row.tempo}</td>
                                            <td><span className={`lab-badge ${row.statusClass}`}>{row.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeReport !== 'producao' && (
                <div className="lab-rel-main-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <BarChart2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} color="#64748b" />
                    <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Relatório em construção</h3>
                    <p style={{ color: '#64748b' }}>A estrutura visual seguirá o mesmo padrão premium do relatório de "Produção por setor".</p>
                </div>
            )}

        </div>
    );
};

export default LaboratorioRelatorios;
