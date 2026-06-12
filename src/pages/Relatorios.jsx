import React from 'react';
import { FileSignature, Truck, Receipt, FileText, Download, BarChart2, TrendingUp, AlertTriangle } from 'lucide-react';

const Relatorios = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                    Relatórios Gerenciais
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
                    Módulo de Compras: Acompanhamento de empenhos, contratos, ordens de fornecimento e notas fiscais.
                </p>
            </header>

            {/* KPIs Rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: '10px' }}>
                        <FileSignature size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONTRATOS ATIVOS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>--</div>
                    </div>
                </div>
                
                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '10px' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMPENHOS EMITIDOS</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>--</div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '10px' }}>
                        <Truck size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>OFs PENDENTES</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>--</div>
                    </div>
                </div>
            </div>

            {/* Catálogo de Relatórios */}
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    Catálogo de Relatórios
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    
                    {/* Relatório de Contratos */}
                    <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileSignature size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Saldos de Contratos</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                    Acompanhe o saldo financeiro restante, itens consumidos e a vigência de todos os contratos ativos.
                                </p>
                            </div>
                        </div>
                        <button style={{ marginTop: 'auto', background: 'var(--bg-muted)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            onClick={() => alert("Módulo de extração de relatórios de compras em desenvolvimento.")}
                        >
                            <Download size={18} />
                            Extrair Relatório
                        </button>
                    </div>

                    {/* Relatório de Empenhos */}
                    <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Execução de Empenhos</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                    Relatório analítico de empenhos emitidos, anulados e saldo disponível por rubrica orçamentária.
                                </p>
                            </div>
                        </div>
                        <button style={{ marginTop: 'auto', background: 'var(--bg-muted)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            onClick={() => alert("Módulo de extração de relatórios de compras em desenvolvimento.")}
                        >
                            <Download size={18} />
                            Extrair Relatório
                        </button>
                    </div>

                    {/* Relatório de OFs */}
                    <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Ordens de Fornecimento (OF)</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                    Rastreamento de OFs emitidas, prazos de entrega e fornecedores pendentes.
                                </p>
                            </div>
                        </div>
                        <button style={{ marginTop: 'auto', background: 'var(--bg-muted)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            onClick={() => alert("Módulo de extração de relatórios de compras em desenvolvimento.")}
                        >
                            <Download size={18} />
                            Extrair Relatório
                        </button>
                    </div>

                    {/* Relatório de Notas Fiscais */}
                    <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Receipt size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>Conferência de NFs</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                    Lista de notas fiscais atestadas, aguardando pagamento ou com divergências em relação ao empenho.
                                </p>
                            </div>
                        </div>
                        <button style={{ marginTop: 'auto', background: 'var(--bg-muted)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            onClick={() => alert("Módulo de extração de relatórios de compras em desenvolvimento.")}
                        >
                            <Download size={18} />
                            Extrair Relatório
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
export default Relatorios;
