import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Download, AlertTriangle, Package, Activity, Loader2, ArrowLeft, Printer } from 'lucide-react';
import { useFarmacia } from '../FarmaciaContext';
import { useTenant } from '../../../context/TenantContext';
import * as relatoriosService from '../services/farmaciaRelatoriosService';
import { exportToExcel } from '../../../utils/exportUtils';
import { brandConfig } from '../../../config/brand';

const TITULOS = {
    'POSICAO_ESTOQUE': 'Posição de Estoque',
    'MOVIMENTACOES': 'Movimentações por Período',
    'CONSUMO_SETOR': 'Consumo por Setor',
    'ABAIXO_MINIMO': 'Itens Abaixo do Mínimo',
    'VALIDADES': 'Validades a Vencer',
    'CURVA_ABC': 'Curva ABC de Consumo'
};

const FarmaciaRelatorioModal = ({ isOpen, onClose, reportType, defaultUnidade }) => {
    const { tenantId } = useTenant();
    const [step, setStep] = useState('params'); // 'params' | 'preview'
    
    // Parâmetros (filtros)
    const [periodo, setPeriodo] = useState('30d');
    const [unidade, setUnidade] = useState('Todas');
    const [faixaVencimento, setFaixaVencimento] = useState('60d');

    // Resultados
    const [loading, setLoading] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);
    const [emptyMsg, setEmptyMsg] = useState(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('params');
            setPeriodo('30d');
            setUnidade(defaultUnidade || 'Todas');
            setFaixaVencimento('60d');
            setTableData([]);
            setColumns([]);
            setErrorMsg(null);
            setEmptyMsg(null);
        }
    }, [isOpen, defaultUnidade, reportType]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setStep('preview');
        setLoading(true);
        setErrorMsg(null);
        setEmptyMsg(null);

        let result = {};
        try {
            switch (reportType) {
                case 'POSICAO_ESTOQUE':
                    result = await relatoriosService.generateStockPositionReport(tenantId, unidade);
                    break;
                case 'MOVIMENTACOES':
                    result = await relatoriosService.generateMovementsByPeriodReport(tenantId, periodo, unidade);
                    break;
                case 'CONSUMO_SETOR':
                    result = await relatoriosService.generateConsumptionBySectorReport(tenantId, periodo, unidade);
                    break;
                case 'ABAIXO_MINIMO':
                    result = await relatoriosService.generateBelowMinimumReport(tenantId, unidade);
                    break;
                case 'VALIDADES':
                    result = await relatoriosService.generateExpiringItemsReport(tenantId, faixaVencimento, unidade);
                    break;
                case 'CURVA_ABC':
                    result = await relatoriosService.generateAbcConsumptionReport(tenantId, periodo, unidade);
                    break;
                default:
                    throw new Error('Tipo de relatório desconhecido.');
            }

            if (result.error) {
                setErrorMsg(result.error);
            } else if (result.emptyMessage) {
                setEmptyMsg(result.emptyMessage);
                setColumns(result.columns || []);
            } else {
                setTableData(result.data);
                setColumns(result.columns);
            }
        } catch (e) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const exigePeriodo = ['MOVIMENTACOES', 'CONSUMO_SETOR', 'CURVA_ABC'].includes(reportType);
    const exigeFaixaVencimento = reportType === 'VALIDADES';

    return (
        <div className="farmacia-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 1050, backdropFilter: 'blur(2px)' }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
            
            {/* --- RELATÓRIO DE IMPRESSÃO OFICIAL (Visível apenas no @media print) --- */}
            <div className="farmacia-print-container">
                <table className="farmacia-print-main-table">
                    <thead className="print-main-thead">
                        {/* Espaçador de segurança p/ margem zero (Top) que repetirá em toda página */}
                        <tr><td colSpan={columns ? columns.length : 1} style={{ height: '12mm', border: 'none', background: '#fff' }}></td></tr>
                        
                        <tr>
                            <td colSpan={columns ? columns.length : 1} className="print-no-border">
                                <div className="farmacia-print-header">
                                    <img src={brandConfig.logoPath} alt={`Prefeitura de ${brandConfig.cityName}`} className="farmacia-print-logo" />
                                    <div className="farmacia-print-inst">
                                        <h3>PREFEITURA DE {brandConfig.cityName.toUpperCase()}</h3>                     
                                        <h4>Sistema Gestão 360 • Módulo Farmácia</h4>
                                    </div>
                                </div>
                                
                                <div className="farmacia-print-report-title">
                                    <h2>{TITULOS[reportType] || 'RELATÓRIO GERENCIAL'}</h2>
                                </div>

                                <div className="farmacia-print-meta">
                                    <span><strong>Unidade:</strong> {unidade === 'Todas' ? 'Consolidado Geral' : unidade}</span>
                                    {exigePeriodo && periodo && (
                                        <span><span style={{ margin: '0 8px', color: '#ccc' }}>|</span><strong>Período:</strong> {periodo === 'Hoje' ? 'Hoje' : periodo === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}</span>
                                    )}
                                    <span><span style={{ margin: '0 8px', color: '#ccc' }}>|</span><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</span>
                                </div>
                            </td>
                        </tr>

                        {/* Sub-Header das Colunas - Ficará colado abaixo do Metadado em toda nova página */}
                        <tr className="print-column-headers">
                            {columns && columns.map((col) => (
                                <th key={`print-th-${col.key}`} className="print-th" style={{ textAlign: col.align || 'left' }}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    
                    <tbody className="print-main-tbody">
                        {tableData && tableData.length > 0 ? tableData.map((row, i) => (
                            <tr key={`print-row-${i}`} className="print-data-row">
                                {columns.map(col => {
                                    const val = row[col.key];
                                    return (
                                        <td key={`print-td-${col.key}`} className="print-td" style={{ textAlign: col.align || 'left' }}>
                                            {typeof val === 'number' && (col.key==='saldo' || col.key === 'quantidade' || col.key === 'consumido') ? val.toLocaleString('pt-BR') : val}
                                        </td>
                                    );
                                })}
                            </tr>
                        )) : (
                            <tr><td colSpan={columns ? columns.length : 1} className="print-td" style={{ textAlign: 'center', padding: '20px' }}>Nenhum dado retornado para impressão</td></tr>
                        )}
                    </tbody>

                    <tfoot className="print-main-tfoot">
                        <tr>
                            <td colSpan={columns ? columns.length : 1} className="print-no-border">
                                <div className="farmacia-print-footer">
                                    <span>Sistema Gestão 360 • Prefeitura de {brandConfig.cityName}</span>
                                    <span>Documento Oficial</span>
                                </div>
                            </td>
                        </tr>
                        {/* Espaçador de segurança p/ margem zero (Bottom) que repetirá em toda página */}
                        <tr><td colSpan={columns ? columns.length : 1} style={{ height: '12mm', border: 'none', background: '#fff' }}></td></tr>
                    </tfoot>
                </table>
            </div>

            {/* --- MODAL VISUAL (Oculto no print via CSS 'no-print') --- */}
            <div className="farmacia-modal no-print" style={{ width: step === 'preview' ? '900px' : '450px', maxWidth: '95vw', background: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)', maxHeight: '90vh', overflow: 'hidden' }}>
                
                {/* Cabeçalho */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted-light)', borderRadius: '16px 16px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {step === 'preview' && (
                            <button onClick={() => setStep('params')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }} title="Voltar aos parâmetros">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {TITULOS[reportType] || 'Relatório'}
                            </h2>
                            {step === 'preview' && !loading && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {tableData.length} registros encontrados
                                </p>
                            )}
                        </div>
                    </div>
                    <button className="farmacia-modal-close no-print" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo: Parâmetros */}
                {step === 'params' && (
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            
                            {/* Filtro: Unidade (Sempre visível) */}
                            <div className="farmacia-form-group">
                                <label className="farmacia-form-label">Unidade / Setor</label>
                                <select className="farmacia-form-input" value={unidade} onChange={e => setUnidade(e.target.value)}>
                                    <option value="Todas">Todas (Consolidado)</option>
                                    <option value="UPA">UPA</option>
                                    <option value="UMSJ">UMSJ</option>
                                </select>
                            </div>

                            {/* Filtro: Período */}
                            {exigePeriodo && (
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Período de Análise</label>
                                    <select className="farmacia-form-input" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                                        <option value="Hoje">Hoje</option>
                                        <option value="7d">Últimos 7 dias</option>
                                        <option value="30d">Últimos 30 dias</option>
                                    </select>
                                </div>
                            )}

                            {/* Filtro: Faixa de Vencimento */}
                            {exigeFaixaVencimento && (
                                <div className="farmacia-form-group">
                                    <label className="farmacia-form-label">Faixa de Vencimento</label>
                                    <select className="farmacia-form-input" value={faixaVencimento} onChange={e => setFaixaVencimento(e.target.value)}>
                                        <option value="30d">Próximos 30 dias</option>
                                        <option value="60d">Próximos 60 dias (Padrão)</option>
                                        <option value="90d">Próximos 90 dias</option>
                                    </select>
                                </div>
                            )}

                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <button className="farmacia-modal-btn-cancel-premium" style={{ height: '42px', fontSize: '13px', padding: '0 20px' }} onClick={onClose}>Cancelar / Fechar</button>
                            <button className="farmacia-btn-primary" style={{ height: '42px', padding: '0 24px' }} onClick={handleGenerate}>Gerar Relatório</button>
                        </div>
                    </div>
                )}

                {/* Corpo: Preview */}
                {step === 'preview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '65vh', minHeight: '400px', maxHeight: '600px', overflow: 'hidden' }}>
                        
                        {loading ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                                <Loader2 size={32} className="farmacia-spin" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Processando dados em tempo real...</span>
                            </div>
                        ) : errorMsg ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dc2626', gap: '12px' }}>
                                <AlertTriangle size={36} />
                                <span style={{ fontWeight: 600 }}>Tivemos um problema ao gerar o relatório.</span>
                                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{errorMsg}</span>
                            </div>
                        ) : (emptyMsg || tableData.length === 0) ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px', padding: '2rem', textAlign: 'center' }}>
                                <Package size={40} style={{ opacity: 0.3 }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Nenhum dado encontrado</h3>
                                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: 0, lineHeight: 1.4 }}>
                                    {emptyMsg || `Os filtros aplicados (${unidade}${exigePeriodo ? ' - '+periodo : ''}) não retornaram nenhum registro.`}
                                </p>
                            </div>
                        ) : (
                            // Tabela Flexível
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <table className="farmacia-table" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-muted-light)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                                        <tr>
                                            {columns.map((col, i) => (
                                                <th key={col.key} style={{ textAlign: col.align || 'left' }}>{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.map((row, i) => (
                                            <tr key={i} className="farmacia-table-row-interactive">
                                                {columns.map(col => {
                                                    const val = row[col.key];
                                                    // Estilização condicional baseada na label da coluna (gambiarra elegante)
                                                    let customStyle = { textAlign: col.align || 'left' };
                                                    if (col.key === 'medicamento') customStyle.fontWeight = 600;
                                                    if (col.key === 'consumido' || col.key === 'quantidade' || col.key === 'saldo') {
                                                        customStyle.fontWeight = 700;
                                                        if (val < 0) customStyle.color = '#dc2626';
                                                        else customStyle.color = 'var(--text-primary)';
                                                    }
                                                    if (col.key === 'status' || col.key === 'dias') {
                                                        const isCrit = (val === 'Crítico' || val === 'Zerado' || String(val).includes('Hoje') || String(val).includes('Venceu'));
                                                        const isWarning = String(val).includes('dias');
                                                        if(val !== 'Normal') {
                                                            customStyle.color = isCrit ? '#dc2626' : (isWarning ? '#ea580c' : 'var(--text-primary)');
                                                            customStyle.fontWeight = 600;
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <td key={col.key} style={customStyle}>
                                                            {typeof val === 'number' && (col.key==='saldo' || col.key === 'quantidade' || col.key === 'consumido') ? val.toLocaleString('pt-BR') : val}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Rodapé Preview */}
                        {step === 'preview' && !loading && !errorMsg && tableData.length > 0 && (
                            <div className="no-print" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-muted-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 16px 16px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Dados atualizados em tempo real.</span>
                                
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                        className="farmacia-modal-btn-cancel-premium" 
                                        style={{ height: '38px', fontSize: '13px', padding: '0 16px' }} 
                                        onClick={onClose}
                                    >
                                        Cancelar
                                    </button>

                                    <button 
                                        className="farmacia-modal-btn-cancel-premium" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', fontSize: '13px', padding: '0 16px' }} 
                                        onClick={() => window.print()}
                                    >
                                        <Printer size={16} /> Imprimir
                                    </button>

                                    <button 
                                        className="farmacia-modal-btn-cancel-premium" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', fontSize: '13px', padding: '0 16px' }} 
                                        onClick={() => {
                                            const rName = reportType ? reportType.toLowerCase().replace(/_/g, '_') : 'relatorio';
                                            let suffix = '';
                                            if (unidade && unidade !== 'Todas') suffix += `_${unidade.toLowerCase()}`;
                                            if (exigePeriodo && periodo) {
                                                if (periodo === 'Hoje') suffix += '_hoje';
                                                else if (periodo === '7d') suffix += '_ultimos_7_dias';
                                                else if (periodo === '30d') suffix += '_ultimos_30_dias';
                                            }
                                            exportToExcel({ 
                                                data: tableData, 
                                                columns, 
                                                fileName: `${rName}${suffix}.xlsx`,
                                                metadata: {
                                                    relatorio: TITULOS[reportType] || 'Relatório Gerencial',
                                                    unidade: unidade === 'Todas' ? 'Consolidado Geral' : unidade,
                                                    periodo: exigePeriodo ? (periodo === 'Hoje' ? 'Hoje' : periodo === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias') : null
                                                }
                                            });
                                        }}
                                        title="Baixar resultados em formato Excel (.xlsx)"
                                    >
                                        <Download size={16} /> Exportar Excel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .farmacia-spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }

                /* Print CSS Oficial */
                .farmacia-print-container {
                    display: none;
                }

                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body * { visibility: hidden; }

                    .farmacia-print-container, .farmacia-print-container * {
                        visibility: visible;
                    }
                    .farmacia-print-container {
                        display: block;
                        position: absolute;
                        top: 0; left: 0; width: 100%; min-height: 100vh;
                        background: #fff; padding: 0 15mm; color: #333; box-sizing: border-box;
                    }

                    .no-print { display: none !important; }
                    
                    .farmacia-modal-overlay {
                        position: absolute !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        top: 0 !important; left: 0 !important; right: auto !important; bottom: auto !important;
                        width: 100% !important; height: auto !important; padding: 0 !important; display: block !important;
                    }
                    
                    /* Tabela Mestre Wrapper */
                    .farmacia-print-main-table { width: 100%; border-collapse: collapse; table-layout: auto; }
                    .print-main-thead { display: table-header-group; background: #fff; }
                    .print-main-tfoot { display: table-footer-group; background: #fff; }
                    .print-no-border { border: none !important; padding: 0 !important; background: #fff !important; }

                    /* Estilos Refinados do Componente Impresso */
                    .farmacia-print-header {
                        display: flex; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 25px;
                    }
                    .farmacia-print-logo {
                        max-height: 45px; width: auto; max-width: 120px; margin-right: 20px; object-fit: contain;
                    }
                    .farmacia-print-inst h3 {
                        margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #111; letter-spacing: 0.5px;
                    }
                    .farmacia-print-inst h4 {
                        margin: 2px 0 0 0; font-size: 11px; font-weight: 500; color: #666; letter-spacing: 0.3px; text-transform: uppercase;
                    }
                    
                    .farmacia-print-report-title {
                        margin-bottom: 15px; text-align: left;
                    }
                    .farmacia-print-report-title h2 {
                        margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #000; border-left: 4px solid #333; padding-left: 10px;
                    }

                    .farmacia-print-meta { 
                        display: flex; flex-wrap: wrap; align-items: center; margin-bottom: 25px; font-size: 11px; color: #444; background: #fdfdfd; padding: 10px 12px; border: 1px solid #eee; border-radius: 4px;
                    }
                    .farmacia-print-meta span { display: inline-flex; align-items: center; }
                    .farmacia-print-meta strong { color: #111; margin-right: 4px; }

                    /* Customização de Células de Dados (Interior da Tabela Wrapper) */
                    .print-th, .print-td {
                        border: 1px solid #e5e5e5; padding: 8px 10px; color: #222; font-size: 10px;
                    }
                    .print-th {
                        background: #f4f4f5 !important; font-weight: 700; border-bottom: 2px solid #ccc; text-transform: uppercase; color: #111;
                    }
                    
                    /* Efeito Zebra e Isolamento de Páginas */
                    .print-data-row { page-break-inside: avoid; }
                    .print-main-tbody .print-data-row:nth-child(even) { background-color: #fafafa !important; }
                    
                    .farmacia-print-footer {
                        margin-top: 15px; border-top: 1px solid #eee; padding-top: 12px; font-size: 9px; display: flex; justify-content: space-between; color: #888; text-transform: uppercase; letter-spacing: 0.3px;
                    }
                }
            `}</style>
        </div>
    );
};

export default FarmaciaRelatorioModal;
