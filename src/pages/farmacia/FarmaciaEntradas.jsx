import React, { useState, useMemo } from 'react';
import { Search, PackagePlus, Boxes, Clock, Pill, ArrowUpDown, ChevronDown, X, Calendar, ClipboardList, User, Hash, Info } from 'lucide-react';
import { mockEntradas } from '../../mocks/farmaciaMocks';
import { useFarmacia } from './FarmaciaContext';
import FarmaciaUnitBadge from './FarmaciaUnitBadge';
import './FarmaciaPages.css';

const HOJE = '2026-03-14';
const getNDaysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
};

const MOCK_DATA_SIMULADO = [
    { id: 1, data: '2026-03-14T08:30:00Z', medicamento: 'Paracetamol 500mg comprimido', codigo: 'MED001', lote: 'LT-2026-065', validade: '2027-04-30', quantidade: 200, unidadeId: 'upa', unidade: 'UPA', responsavel: 'João Mendes', setor: 'Almoxarifado Central', observacao: 'Carga regular', documento: 'NF-8821' },
    { id: 2, data: '2026-03-14T09:15:00Z', medicamento: 'Metformina 850mg comprimido', codigo: 'MED002', lote: 'LT-2026-112', validade: '2027-10-31', quantidade: 350, unidadeId: 'umsj', unidade: 'UMSJ', responsavel: 'Maria Silva', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8822' },
    { id: 3, data: '2026-03-14T10:00:00Z', medicamento: 'Dipirona 500mg comprimido', codigo: 'MED003', lote: 'LT-2026-210', validade: '2028-01-31', quantidade: 500, unidadeId: 'upa', unidade: 'UPA', responsavel: 'Carlos Souza', setor: 'Almoxarifado Central', observacao: 'Urgente', documento: 'NF-8823' },
    { id: 4, data: '2026-03-14T11:20:00Z', medicamento: 'Amoxicilina 500mg cápsula', codigo: 'MED004', lote: 'LT-2026-005', validade: '2027-06-15', quantidade: 120, unidadeId: 'upa', unidade: 'UPA', responsavel: 'João Mendes', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8824' },
    { id: 5, data: '2026-03-14T13:45:00Z', medicamento: 'Omeprazol 20mg cápsula', code: 'MED005', lote: 'LT-2026-098', validade: '2027-12-20', quantidade: 400, unidadeId: 'umsj', unidade: 'UMSJ', responsavel: 'Maria Silva', setor: 'Almoxarifado Central', observacao: 'Estoque de reserva', documento: 'NF-8825' },
    { id: 6, data: getNDaysAgo(2), medicamento: 'Losartana 50mg comprimido', codigo: 'MED006', lote: 'LT-2026-044', validade: '2028-03-10', quantidade: 600, unidadeId: 'upa', unidade: 'UPA', responsavel: 'Carlos Souza', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8826' },
    { id: 7, data: getNDaysAgo(2), medicamento: 'Sinvastatina 20mg comprimido', codigo: 'MED007', lote: 'LT-2026-033', validade: '2027-08-05', quantidade: 300, unidadeId: 'upa', unidade: 'UPA', responsavel: 'João Mendes', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8827' },
    { id: 8, data: getNDaysAgo(3), medicamento: 'Glibenclamida 5mg comprimido', codigo: 'MED008', lote: 'LT-2026-022', validade: '2027-11-25', quantidade: 250, unidadeId: 'umsj', unidade: 'UMSJ', responsavel: 'Maria Silva', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8828' },
    { id: 9, data: getNDaysAgo(4), medicamento: 'Ibuprofeno 600mg comprimido', codigo: 'MED009', lote: 'LT-2026-011', validade: '2028-02-14', quantidade: 180, unidadeId: 'upa', unidade: 'UPA', responsavel: 'Carlos Souza', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8829' },
    { id: 10, data: getNDaysAgo(14), medicamento: 'Enalapril 10mg comprimido', codigo: 'MED010', lote: 'LT-2026-077', validade: '2027-05-18', quantidade: 450, unidadeId: 'upsj', unidade: 'UPSJ', responsavel: 'João Mendes', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8830' },
    { id: 11, data: getNDaysAgo(15), medicamento: 'Atenolol 50mg comprimido', codigo: 'MED011', lote: 'LT-2026-088', validade: '2027-03-12', quantidade: 320, unidadeId: 'upa', unidade: 'UPA', responsavel: 'Maria Silva', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8831' },
    { id: 12, data: getNDaysAgo(20), medicamento: 'Simeticona 40mg comprimido', codigo: 'MED012', lote: 'LT-2026-099', validade: '2028-06-22', quantidade: 150, unidadeId: 'umsj', unidade: 'UMSJ', responsavel: 'Carlos Souza', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8832' },
    { id: 13, data: getNDaysAgo(25), medicamento: 'Prednisona 20mg comprimido', codigo: 'MED013', lote: 'LT-2026-101', validade: '2027-09-14', quantidade: 280, unidadeId: 'upa', unidade: 'UPA', responsavel: 'João Mendes', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8833' },
    { id: 14, data: getNDaysAgo(30), medicamento: 'Captopril 25mg comprimido', codigo: 'MED014', lote: 'LT-2026-102', validade: '2027-01-10', quantidade: 500, unidadeId: 'umsj', unidade: 'UMSJ', responsavel: 'Maria Silva', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8834' },
    { id: 15, data: getNDaysAgo(35), medicamento: 'Salbutamol 100mcg spray', codigo: 'MED015', lote: 'LT-2026-103', validade: '2028-05-30', quantidade: 100, unidadeId: 'upa', unidade: 'UPA', responsavel: 'Carlos Souza', setor: 'Almoxarifado Central', observacao: '', documento: 'NF-8835' },
];




const FarmaciaEntradas = () => {
    const { setOpenModal, entradasLocal, setEntradasLocal, lastAddedId } = useFarmacia();
    const [busca, setBusca] = useState('');
    const [periodoFiltro, setPeriodoFiltro] = useState('Hoje');
    const [unidadeFiltro, setUnidadeFiltro] = useState('Todas');
    const [responsavelFiltro, setResponsavelFiltro] = useState('Todos');
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Inicializa ou resincroniza o estado local do contexto com o MOCK_DATA_SIMULADO
    React.useEffect(() => {
        if (entradasLocal.length < 10) {
            setEntradasLocal(MOCK_DATA_SIMULADO);
        }
    }, [entradasLocal.length, setEntradasLocal]);

    const entradasHoje_Filtro = entradasLocal.filter(m => m.data.startsWith(HOJE));
    const MES_ATUAL_STR = new Date().toISOString().slice(0, 7);
    const entradasMes_Filtro = entradasLocal.filter(m => m.data.startsWith(MES_ATUAL_STR));

    const METRICAS_REALTIME = {
        entradasHoje: entradasHoje_Filtro.length,
        itensRecebidosHoje: entradasHoje_Filtro.reduce((acc, m) => acc + Math.abs(m.quantidade), 0),
        ultimaEntrada: entradasLocal.length > 0
            ? new Date(entradasLocal[0].data).toLocaleString('pt-BR', { dateStyle: 'short' })
            : '—',
        entradasMes: entradasMes_Filtro.length,
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const itensFiltrados = useMemo(() => {
        let result = [...entradasLocal].filter(m => {
            const matchesBusca = !busca || 
                m.medicamento.toLowerCase().includes(busca.toLowerCase()) ||
                m.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
                m.setor.toLowerCase().includes(busca.toLowerCase()) ||
                (m.lote && m.lote.toLowerCase().includes(busca.toLowerCase())) ||
                (m.documento && m.documento.toLowerCase().includes(busca.toLowerCase()));

            const matchesUnidade = unidadeFiltro === 'Todas' || m.unidade.includes(unidadeFiltro);
            const matchesResponsavel = responsavelFiltro === 'Todos' || m.responsavel === responsavelFiltro;
            
            // Lógica de período robusta para os mocks
            const dataItem = new Date(m.data);
            let matchesPeriodo = true;
            if (periodoFiltro === 'Hoje') {
                matchesPeriodo = m.data.startsWith(HOJE);
            } else if (periodoFiltro === '7d') {
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                matchesPeriodo = dataItem >= seteDiasAtras;
            } else if (periodoFiltro === '30d') {
                const trintaDiasAtras = new Date();
                trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
                matchesPeriodo = dataItem >= trintaDiasAtras;
            }

            return matchesBusca && matchesUnidade && matchesResponsavel && matchesPeriodo;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (sortConfig.key === 'quantidade') {
                    aVal = Math.abs(aVal);
                    bVal = Math.abs(bVal);
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [entradasLocal, busca, periodoFiltro, unidadeFiltro, responsavelFiltro, sortConfig]);

    return (
        <div className="farmacia-page-container" style={{ gap: '1.25rem' }}>
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Entradas de Medicamentos</h1>
                    <p className="farmacia-page-subtitle">Recebimento e registro de notas fiscais.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="farmacia-btn-primary" onClick={() => setOpenModal('entrada')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={16} /> + Nova Entrada
                    </button>
                    <FarmaciaUnitBadge />
                </div>
            </header>

            <div className="farmacia-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS HOJE</span>
                    <span className="premium-card-value text-secondary">{METRICAS_REALTIME.entradasHoje}</span>
                    <span className="premium-card-desc">registros do dia</span>
                    <div className="premium-card-icon-box bg-saida"><PackagePlus size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">UNIDADES RECEBIDAS</span>
                    <span className="premium-card-value">{METRICAS_REALTIME.itensRecebidosHoje.toLocaleString('pt-BR')}</span>
                    <span className="premium-card-desc">unidades hoje</span>
                    <div className="premium-card-icon-box bg-itens"><Boxes size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ÚLTIMA ENTRADA</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span className="premium-card-value color-blue" style={{ fontSize: '1.8rem' }}>{METRICAS_REALTIME.ultimaEntrada}</span>
                        <span className="premium-card-desc">mais recente</span>
                    </div>
                    <div className="premium-card-icon-box bg-top"><Clock size={20} /></div>
                </div>
                <div className="farmacia-mini-card refined-card premium-card">
                    <span className="premium-card-label">ENTRADAS NO MÊS</span>
                    <span className="premium-card-value color-orange">{METRICAS_REALTIME.entradasMes}</span>
                    <span className="premium-card-desc">total de registros</span>
                    <div className="premium-card-icon-box bg-unidade"><PackagePlus size={20} /></div>
                </div>
            </div>

            {/* Modal de Detalhes da Entrada */}
            {selectedEntry && (
                <div className="farmacia-modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="farmacia-modal-content" style={{ maxWidth: '500px', width: '90%', padding: '0', overflow: 'hidden', animation: 'modalFadeIn 0.3s ease-out' }}>
                        <div style={{ padding: '1.5rem', background: 'var(--bg-muted-light)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'var(--color-primary)', color: '#fff', padding: '8px', borderRadius: '10px' }}>
                                    <ClipboardList size={20} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Detalhes da Entrada</h2>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Entrada registrada em {new Date(selectedEntry.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} className="hover-bg-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ background: 'rgba(0, 150, 125, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(0, 150, 125, 0.2)' }}>
                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(0, 150, 125, 0.8)', textTransform: 'uppercase', marginBottom: '8px' }}>Medicamento / Material</span>
                                
                                {(() => {
                                    const medParts = selectedEntry.medicamento.split(' ');
                                    const forma = medParts.pop();
                                    const nomeDosagem = medParts.join(' ');
                                    return (
                                        <>
                                            <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.2' }}>{nomeDosagem}</span>
                                            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'capitalize' }}>{forma}</span>
                                        </>
                                    );
                                })()}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '10px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', background: 'rgba(0, 150, 125, 0.1)', borderRadius: '4px', padding: '0.1rem 0.4rem', color: 'rgba(0, 100, 80, 0.8)' }}>{selectedEntry.codigo}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'rgba(0, 100, 80, 0.7)', fontWeight: 500 }}>• {selectedEntry.unidade}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{new Date(selectedEntry.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lote</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.lote || '—'}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Validade</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.validade ? new Date(selectedEntry.validade).toLocaleDateString('pt-BR') : '—'}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <Boxes size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantidade</span>
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>+{selectedEntry.quantidade.toLocaleString('pt-BR')}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <PackagePlus size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unidade</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.unidade}</span>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Responsável</span>
                                    </div>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedEntry.responsavel}</span>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <Info size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observação</span>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: selectedEntry.observacao ? 'normal' : 'italic', border: '1px solid var(--border)' }}>
                                    {selectedEntry.observacao || 'Nenhuma observação registrada.'}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-muted-light)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="farmacia-btn-primary" onClick={() => setSelectedEntry(null)} style={{ padding: '0.5rem 1.5rem' }}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="farmacia-card" style={{ padding: '1rem 1.25rem', gap: '0' }}>
                <div className="farmacia-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="farmacia-search-box" style={{ maxWidth: '450px' }}>
                        <Search size={16} className="farmacia-search-icon" />
                        <input type="text" className="farmacia-search-input" placeholder="Buscar medicamento, lote ou NF..." value={busca} onChange={e => setBusca(e.target.value)} />
                    </div>
                    
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={periodoFiltro}
                            onChange={e => setPeriodoFiltro(e.target.value)}
                        >
                            <option value="Hoje">Período: Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    <div className="farmacia-select-wrapper" style={{ minWidth: '130px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={unidadeFiltro}
                            onChange={e => setUnidadeFiltro(e.target.value)}
                        >
                            <option value="Todas">Unidade: Todas</option>
                            <option value="UPA">UPA</option>
                            <option value="UMSJ">UMSJ</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    <div className="farmacia-select-wrapper" style={{ minWidth: '140px', position: 'relative' }}>
                        <select 
                            className="farmacia-filter-select" 
                            style={{ width: '100%', paddingRight: '2.5rem', appearance: 'none' }}
                            value={responsavelFiltro}
                            onChange={e => setResponsavelFiltro(e.target.value)}
                        >
                            <option value="Todos">Responsável: Todos</option>
                            <option value="João Mendes">João Mendes</option>
                            <option value="Maria Silva">Maria Silva</option>
                            <option value="Carlos Souza">Carlos Souza</option>
                            <option value="Ana Beatriz">Ana Beatriz</option>
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, background: 'var(--bg-body)', padding: '6px 12px', borderRadius: '8px', minWidth: 'fit-content' }}>
                        <span>{itensFiltrados.length} resultados (de {entradasLocal.length})</span>
                    </div>
                </div>
            </div>

            <div className="farmacia-card" style={{ padding: '0', gap: '0' }}>
                <div style={{ padding: '1.1rem 1.5rem 0.9rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)' }}>
                    <h2 className="farmacia-card-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Histórico de Entradas</h2>
                </div>
                <div className="farmacia-table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                    <table className="farmacia-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('data')} style={{ cursor: 'pointer', width: '95px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Data <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'data' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('medicamento')} style={{ cursor: 'pointer', width: '300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Medicamento / Material <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'medicamento' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '100px' }}>Lote</th>
                                <th style={{ width: '100px' }}>Validade</th>
                                <th onClick={() => handleSort('quantidade')} style={{ cursor: 'pointer', textAlign: 'right', width: '90px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                        Quantidade <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'quantidade' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '70px' }}>Unidade</th>
                                <th onClick={() => handleSort('responsavel')} style={{ cursor: 'pointer', width: '150px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Responsável <ArrowUpDown size={12} style={{ opacity: sortConfig.key === 'responsavel' ? 1 : 0.3 }} />
                                    </div>
                                </th>
                                <th style={{ width: '145px' }}>Observação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensFiltrados.length === 0 ? (
                                <tr><td colSpan={9} className="farmacia-empty">Nenhuma entrada encontrada.</td></tr>
                            ) : (
                                itensFiltrados.map(item => (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => setSelectedEntry(item)}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: lastAddedId === item.id ? 'rgba(0, 150, 125, 0.08)' : 'transparent',
                                            transition: 'background-color 0.5s ease'
                                        }}
                                        className="farmacia-table-row-interactive"
                                    >
                                        <td className="farmacia-td-muted" style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(item.data).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="farmacia-td-primary">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.medicamento}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="farmacia-code-badge" style={{ margin: 0, fontSize: '10px', padding: '1px 4px' }}>{item.codigo}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {item.unidade}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="farmacia-td-muted" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                            {item.lote || <span style={{ opacity: 0.3 }}>—</span>}
                                        </td>
                                        <td className="farmacia-td-muted">
                                            {item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : <span style={{ opacity: 0.3 }}>—</span>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                display: 'inline-block',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: 'rgba(0, 150, 125, 0.08)',
                                                color: 'var(--color-primary)',
                                                fontWeight: 800,
                                                fontSize: '0.9rem'
                                            }}>
                                                +{Math.abs(item.quantidade).toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{item.unidade}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{item.responsavel}</td>
                                        <td className="farmacia-td-muted" style={{ fontSize: '0.8rem', whiteSpace: 'normal', lineHeight: '1.4', fontStyle: item.observacao ? 'normal' : 'italic' }}>
                                            {item.observacao || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaEntradas;

