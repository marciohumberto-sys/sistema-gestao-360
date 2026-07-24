import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    FileText, Printer, Search, RefreshCw, Eye,
    Filter, Calendar, Map, CheckCircle2, AlertCircle,
    User, Activity, LayoutDashboard, Loader2, XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { laboratorioMapasService } from '../../services/api/laboratorioMapas.service';

import './LaboratorioMapas.css';

const LaboratorioMapas = () => {
    const todayDate = new Date().toISOString().split('T')[0];

    const { authUser, tenantLink } = useAuth();
    const currentTenantId = tenantLink?.tenant_id || tenantLink?.id;
    
    const displayName = authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || (authUser?.email ? authUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Usuário não identificado');

    const [sectoresOptions, setSectoresOptions] = useState([]);
    
    const [filters, setFilters] = useState({ 
        data: todayDate, 
        setor: '', 
        codigoInicial: '', 
        codigoFinal: '' 
    });

    const [listFilterState, setListFilterState] = useState('TODOS');

    const [sectorSearchText, setSectorSearchText] = useState('');
    const [showSectorOptions, setShowSectorOptions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [sectorOptionsPosition, setSectorOptionsPosition] = useState({ top: 0, left: 0, width: 0 });

    const [lotes, setLotes] = useState([]);
    const [selectedLoteId, setSelectedLoteId] = useState(null);
    
    const [loadingList, setLoadingList] = useState(false);
    const [loadingGen, setLoadingGen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ visible: false, type: '', loteId: null, message: '' });

    const previewRef = useRef(null);
    const dataRef = useRef(null);
    const codigoInicialRef = useRef(null);
    const codigoFinalRef = useRef(null);
    const gerarBtnRef = useRef(null);
    const setorInputRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 5000);
    };

    useEffect(() => {
        const fetchSectores = async () => {
            if (!currentTenantId) return;
            try {
                const { data } = await supabase.from('lab_exam_sectors').select('id, name').eq('tenant_id', currentTenantId).order('name');
                if (data) setSectoresOptions(data);
            } catch (err) {
                console.error('Erro ao buscar setores', err);
            }
        };
        fetchSectores();
        carregarLotes();
    }, [currentTenantId]);

    const updateSectorOptionsPosition = () => {
        if (setorInputRef.current) {
            const rect = setorInputRef.current.getBoundingClientRect();
            setSectorOptionsPosition({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (showSectorOptions) {
            updateSectorOptionsPosition();
            window.addEventListener('scroll', updateSectorOptionsPosition, true);
            window.addEventListener('resize', updateSectorOptionsPosition);
            return () => {
                window.removeEventListener('scroll', updateSectorOptionsPosition, true);
                window.removeEventListener('resize', updateSectorOptionsPosition);
            };
        }
    }, [showSectorOptions]);

    const normalizeString = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
    };

    const filteredSectors = sectoresOptions.filter(sec => {
        const search = normalizeString(sectorSearchText);
        const name = normalizeString(sec.name);
        const code = normalizeString(sec.code);
        return name.includes(search) || code.includes(search);
    });

    const handleSelectSector = (sec) => {
        setFilters({ ...filters, setor: sec.id });
        setSectorSearchText(sec.code ? `${sec.code} - ${sec.name}` : sec.name);
        setShowSectorOptions(false);
        requestAnimationFrame(() => {
            if (codigoInicialRef.current) codigoInicialRef.current.focus();
        });
    };

    const carregarLotes = async (preservedId = null) => {
        if (!currentTenantId) return;
        setLoadingList(true);
        try {
            const data = await laboratorioMapasService.listarLotes(currentTenantId);
            setLotes(data || []);
            
            const idToSelect = preservedId || selectedLoteId;
            if (idToSelect && data) {
                if (!data.find(l => l.id === idToSelect)) {
                    if (!preservedId) setSelectedLoteId(null);
                } else if (preservedId) {
                    setSelectedLoteId(preservedId);
                }
            }
        } catch (error) {
            showToast('Erro ao listar lotes históricos.', 'error');
        } finally {
            setLoadingList(false);
        }
    };



    const handleGerarLote = async () => {
        if (!currentTenantId) return;

        // Validações locais
        if (!filters.data) return showToast('Informe a data.', 'warning');
        if (!filters.setor) return showToast('Selecione um setor.', 'warning');
        
        const hasStart = !!filters.codigoInicial;
        const hasEnd = !!filters.codigoFinal;

        if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
            return showToast('Preencha os dois códigos ou deixe ambos em branco para gerar todos os pacientes.', 'warning');
        }

        if (hasStart && hasEnd) {
            if (!/^\d+$/.test(filters.codigoInicial) || !/^\d+$/.test(filters.codigoFinal)) {
                return showToast('Os códigos devem conter somente números.', 'warning');
            }
            if (BigInt(filters.codigoInicial) > BigInt(filters.codigoFinal)) {
                return showToast('O código inicial não pode ser maior que o código final.', 'warning');
            }
        }

        setLoadingGen(true);
        try {
            let response;
            if (hasStart && hasEnd) {
                response = await laboratorioMapasService.gerarLoteColetivo({
                    tenantId: currentTenantId,
                    referenceDate: filters.data,
                    sectorId: filters.setor,
                    startCode: filters.codigoInicial,
                    endCode: filters.codigoFinal
                });
            } else {
                response = await laboratorioMapasService.gerarLoteColetivoTodos({
                    tenantId: currentTenantId,
                    referenceDate: filters.data,
                    sectorId: filters.setor
                });
            }

            // Lidar com o retorno mapeado da RPC
            const { state, batch, pending_batch_ids, printed_batch_ids } = response || {};

            if (state === 'NO_RESULTS') {
                showToast('Nenhum exame foi encontrado para a data, o setor e a faixa de códigos informados.', 'warning');
            } else if (state === 'BATCH_CREATED') {
                showToast('Lote coletivo gerado com sucesso.', 'success');
                if (batch && batch.id) {
                    setLotes(listaAtual => {
                        const novaLista = listaAtual.filter(l => l.id !== batch.id);
                        return [batch, ...novaLista];
                    });
                    setSelectedLoteId(batch.id);
                }
                await carregarLotes(batch?.id);
            } else if (state === 'EXISTING_PENDING_BATCHES') {
                showToast('Os exames desta consulta já pertencem a um lote pendente.', 'warning');
                await carregarLotes();
                if (pending_batch_ids && pending_batch_ids.length === 1) {
                    setSelectedLoteId(pending_batch_ids[0]);
                }
            } else if (state === 'EXISTING_PRINTED_BATCHES') {
                showToast('Os exames desta consulta já foram impressos.', 'warning');
                await carregarLotes();
                if (printed_batch_ids && printed_batch_ids.length === 1) {
                    setSelectedLoteId(printed_batch_ids[0]);
                }
            } else if (state === 'EXISTING_PENDING_AND_PRINTED_BATCHES') {
                showToast('Parte dos exames está em lotes pendentes e parte já foi impressa.', 'warning');
                await carregarLotes();
            } else {
                throw new Error("Não foi possível gerar o lote coletivo.");
            }

        } catch (error) {
            console.error('[Mapas] Erro ao gerar lote:', error);
            const msg = error?.message || error?.details || 'Não foi possível gerar o lote coletivo.';
            showToast(msg, 'error');
        } finally {
            setLoadingGen(false);
        }
    };

    const handleImprimirDocumento = (lote) => {
        if (!lote) return;
        if (lote.status === 'CANCELED') {
            return showToast('Não é possível imprimir um lote cancelado.', 'warning');
        }

        const isReimpressao = lote.status === 'PRINTED';
        const snapshot = typeof lote.document_snapshot === 'string' ? JSON.parse(lote.document_snapshot) : lote.document_snapshot;
        
        if (!snapshot || !snapshot.patients) {
            return showToast('Snapshot do documento corrompido ou ausente.', 'error');
        }

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            return showToast('Não foi possível abrir a janela de impressão.', 'error');
        }

        const dataHoraImpressao = `${formatDate(todayDate)} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        
        const cssStyles = `
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #333; margin: 0; padding: 0; font-size: 9pt; }
            .lab-paper-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
            .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
            .header-text-block h3 { margin: 0 0 2px 0; font-size: 10pt; text-transform: uppercase; }
            .header-text-block h4 { margin: 0; font-size: 8pt; color: #64748b; font-weight: normal; }
            .header-logos { display: flex; gap: 10px; }
            .header-logos img { height: 25px; object-fit: contain; }
            .header-bottom { text-align: center; }
            .header-bottom h2 { margin: 0 0 5px 0; font-size: 12pt; }
            .lab-paper-sector-badge { font-size: 8pt; font-weight: bold; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 4px; }
            
            .lab-patient-block { margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; }
            .lab-patient-header { background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 3px 6px; font-weight: bold; display: flex; flex-wrap: wrap; gap: 8px; font-size: 8.5pt; }
            .lab-patient-exams { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
            .lab-patient-exams th { text-align: left; padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
            .lab-patient-exams td { padding: 4px 6px; border-bottom: 1px dotted #e2e8f0; vertical-align: top; }
            .col-ex-cod { width: 8%; }
            .col-ex-name { width: 30%; font-weight: bold; }
            .col-ex-param { width: 42%; }
            .col-ex-hist { width: 20%; color: #64748b; text-align: right; font-size: 7.5pt; }
            
            .param-row { display: flex; justify-content: space-between; margin-bottom: 4px; align-items: baseline; }
            .param-line { border-bottom: 1px solid #cbd5e1; flex-grow: 1; margin: 0 8px; min-height: 10px; }
            .hist-item { margin-left: 6px; white-space: nowrap; }
            
            .lab-paper-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
        `;

        let bodyHtml = '';
        snapshot.patients.forEach(pat => {
            let examsRows = '';
            pat.exams.forEach(ex => {
                let paramsHtml = '';
                let histHtml = '';

                // Se houver parâmetros explícitos
                if (ex.parameters && ex.parameters.length > 0) {
                    ex.parameters.forEach(p => {
                        let pHist = '';
                        if (p.history && p.history.length > 0) {
                            pHist = p.history.map(h => `<span class="hist-item">${formatDate(h.date)}: ${escapeHtml(h.value_numeric || h.value_text || h.observation || '')} ${escapeHtml(p.unit || '')}</span>`).join(' | ');
                        }
                        paramsHtml += `
                            <div class="param-row">
                                <span class="param-name">${escapeHtml(p.name)}</span>
                                <div class="param-line"></div>
                            </div>
                        `;
                        if(pHist) {
                            histHtml += `<div>${pHist}</div>`;
                        }
                    });
                } else {
                    // Sem parâmetros - exame simples, linha única
                    paramsHtml = `<div class="param-row"><div class="param-line"></div></div>`;
                    if (ex.history && ex.history.length > 0) {
                        histHtml = ex.history.map(h => `<span class="hist-item">${formatDate(h.date)}: ${escapeHtml(h.value_numeric || h.value_text || h.observation || '')}</span>`).join(' | ');
                    }
                }

                examsRows += `
                    <tr>
                        <td class="col-ex-cod">${escapeHtml(ex.code)}</td>
                        <td class="col-ex-name">${escapeHtml(ex.name)}</td>
                        <td class="col-ex-param">${paramsHtml}</td>
                        <td class="col-ex-hist">${histHtml}</td>
                    </tr>
                `;
            });

            bodyHtml += `
                <div class="lab-patient-block">
                    <div class="lab-patient-header" style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                        <div style="word-break: break-word; color: #1e293b;">
                            <span style="font-weight: 700;">CÓD. ${escapeHtml(pat.code)}</span> — <span>${escapeHtml(pat.name)}</span>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 8pt; color: #475569;">
                            <span>${escapeHtml(pat.age_at_generation)}</span>
                            <span style="color: #94a3b8;">|</span>
                            <span>${escapeHtml(pat.sex)}</span>
                            <span style="color: #94a3b8;">|</span>
                            <span>Origem: ${escapeHtml(pat.origin)}</span>
                            <span style="color: #94a3b8;">|</span>
                            <span>Médico: ${escapeHtml(pat.doctor)}</span>
                        </div>
                    </div>
                    <table class="lab-patient-exams">
                        ${examsRows}
                    </table>
                </div>
            `;
        });

        const sectorName = snapshot.metadata?.sector?.name || 'SETOR DESCONHECIDO';

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Mapa Coletivo - ${escapeHtml(sectorName)}</title>
                <style>${cssStyles}</style>
            </head>
            <body>
                <div class="lab-paper-header">
                    <div class="header-top">
                        <div class="header-text-block">
                            <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                            <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
                        </div>
                        <div class="header-logos">
                            <img src="${window.location.origin}/logo-prefeitura-pb.jpg" alt="Prefeitura" onerror="this.style.display='none'" />
                            <img src="${window.location.origin}/logo-laboratorio-pb.jpg" alt="Laboratório" onerror="this.style.display='none'" />
                        </div>
                    </div>
                    <div class="header-bottom">
                        <h2>MAPA DE TRABALHO COLETIVO</h2>
                        <span class="lab-paper-sector-badge">SETOR: ${escapeHtml(sectorName).toUpperCase()} | DATA REF: ${formatDate(snapshot.metadata?.reference_date)}</span>
                    </div>
                </div>
                ${bodyHtml}
                <div class="lab-paper-footer">
                    <p>Impresso por: ${escapeHtml(displayName)} em ${escapeHtml(dataHoraImpressao)}</p>
                    <p>Gestão 360 - Lote: ${escapeHtml(snapshot.metadata?.batch_id)}</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        let didPrint = false;
        const finalizePrint = () => {
            if (didPrint) return;
            didPrint = true;
            printWindow.focus();
            printWindow.print();
        };

        printWindow.onafterprint = () => {
            printWindow.close();
            // Apenas solicitar marcação se era pendente
            if (!isReimpressao) {
                setConfirmModal({
                    visible: true,
                    type: 'PRINT',
                    loteId: lote.id,
                    message: 'Deseja marcar este lote como impresso?'
                });
            }
        };

        printWindow.onload = () => finalizePrint();
        setTimeout(() => finalizePrint(), 600);
    };

    const handleConfirmarImpressao = async () => {
        if (!confirmModal.loteId) return;
        setLoadingAction(true);
        try {
            await laboratorioMapasService.marcarLoteComoImpresso({
                tenantId: currentTenantId,
                batchId: confirmModal.loteId
            });
            showToast('Lote marcado como impresso.', 'success');
            await carregarLotes();
            setConfirmModal({ visible: false, type: '', loteId: null, message: '' });
        } catch (error) {
            showToast(error?.message || 'Erro ao marcar lote.', 'error');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleSolicitarCancelamento = (loteId) => {
        setConfirmModal({
            visible: true,
            type: 'CANCEL',
            loteId: loteId,
            message: 'Este lote será cancelado e seus exames ficarão disponíveis para uma nova geração. O histórico do lote será mantido.'
        });
    };

    const handleConfirmarCancelamento = async () => {
        if (!confirmModal.loteId) return;
        setLoadingAction(true);
        try {
            await laboratorioMapasService.cancelarLote({
                tenantId: currentTenantId,
                batchId: confirmModal.loteId
            });
            showToast('Lote cancelado e exames liberados.', 'success');
            await carregarLotes();
            setConfirmModal({ visible: false, type: '', loteId: null, message: '' });
        } catch (error) {
            showToast(error?.message || 'Erro ao cancelar lote.', 'error');
        } finally {
            setLoadingAction(false);
        }
    };

    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return dateStr;
        return `${d}/${m}/${y}`;
    };

    const formatDateTime = (dtStr) => {
        if (!dtStr) return '';
        const d = new Date(dtStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'PENDING': return { text: 'Pronto para imprimir', cls: 'status-pending' };
            case 'PRINTED': return { text: 'Impresso', cls: 'status-printed' };
            case 'CANCELED': return { text: 'Cancelado', cls: 'status-canceled' };
            default: return { text: status, cls: '' };
        }
    };

    // Filtro local na lista
    const filteredLotes = lotes.filter(l => listFilterState === 'TODOS' || l.status === listFilterState);
    const selectedLote = lotes.find(l => l.id === selectedLoteId);
    let previewSnap = null;
    if (selectedLote && selectedLote.document_snapshot) {
        previewSnap = typeof selectedLote.document_snapshot === 'string' ? JSON.parse(selectedLote.document_snapshot) : selectedLote.document_snapshot;
    }

    // Calcula resumo dinâmico
    let totalPacientes = 0;
    let totalExames = 0;
    let pendentes = 0;
    let impressos = 0;

    if (selectedLote && previewSnap) {
        totalPacientes = previewSnap.patients?.length || 0;
        totalExames = previewSnap.patients?.reduce((acc, p) => acc + (p.exams?.length || 0), 0) || 0;
        if (selectedLote.status === 'PENDING') pendentes = 1;
        if (selectedLote.status === 'PRINTED') impressos = 1;
    } else {
        totalPacientes = lotes.reduce((acc, l) => acc + (l.document_snapshot?.patients?.length || 0), 0);
        totalExames = lotes.reduce((acc, l) => acc + (l.document_snapshot?.patients?.reduce((a, p) => a + (p.exams?.length || 0), 0) || 0), 0);
        pendentes = lotes.filter(l => l.status === 'PENDING').length;
        impressos = lotes.filter(l => l.status === 'PRINTED').length;
    }

    return (
        <div className="laboratorio-mapas lab-mapas-container">
            {toast.visible && (
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}

            {/* Modal de Confirmação */}
            {confirmModal.visible && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal">
                        <h3 className="lab-modal-title">Confirmação</h3>
                        <p className="lab-modal-body">{confirmModal.message}</p>
                        <div className="lab-modal-actions">
                            <button className="lab-btn lab-btn-outline" onClick={() => setConfirmModal({ visible: false, type: '', loteId: null, message: '' })} disabled={loadingAction}>
                                {confirmModal.type === 'PRINT' ? 'Manter como pendente' : 'Manter lote'}
                            </button>
                            {confirmModal.type === 'PRINT' && (
                                <button className="lab-btn lab-btn-success" onClick={handleConfirmarImpressao} disabled={loadingAction}>
                                    {loadingAction ? <Loader2 size={16} className="animate-spin" /> : 'Marcar como impresso'}
                                </button>
                            )}
                            {confirmModal.type === 'CANCEL' && (
                                <button className="lab-btn lab-btn-danger" onClick={handleConfirmarCancelamento} disabled={loadingAction}>
                                    {loadingAction ? <Loader2 size={16} className="animate-spin" /> : 'Cancelar lote'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <header className="lab-mapas-header">
                <div>
                    <h1 className="lab-title">Mapas</h1>
                    <p className="lab-subtitle">Geração coletiva de mapas de trabalho por setor e faixa de códigos</p>
                </div>
                <div className="lab-header-actions">
                    {/* Botão Nova Consulta removido conforme solicitação */}
                </div>
            </header>

            <div className="lab-card lab-filters-card">
                <div className="lab-filters-grid">
                    <div className="lab-filter-item">
                        <label>Data</label>
                        <input type="date" value={filters.data} onChange={(e) => setFilters({...filters, data: e.target.value})} ref={dataRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (setorInputRef.current) setorInputRef.current.focus(); } }} />
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor</label>
                        <input 
                            type="text"
                            placeholder="Selecione um setor"
                            value={sectorSearchText}
                            onChange={(e) => {
                                setSectorSearchText(e.target.value);
                                setFilters({ ...filters, setor: '' });
                                setShowSectorOptions(true);
                                setHighlightedIndex(0);
                            }}
                            onFocus={() => {
                                setShowSectorOptions(true);
                                setHighlightedIndex(0);
                            }}
                            onBlur={() => {
                                setTimeout(() => setShowSectorOptions(false), 200);
                            }}
                            ref={setorInputRef}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    if (!showSectorOptions) setShowSectorOptions(true);
                                    setHighlightedIndex(prev => prev < filteredSectors.length - 1 ? prev + 1 : prev);
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                                } else if (e.key === 'Escape') {
                                    setShowSectorOptions(false);
                                    setHighlightedIndex(-1);
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (showSectorOptions && filteredSectors.length > 0) {
                                        const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
                                        const sec = filteredSectors[idx];
                                        if (sec) handleSelectSector(sec);
                                    } else if (!showSectorOptions && filters.setor) {
                                        if (codigoInicialRef.current) codigoInicialRef.current.focus();
                                    } else if (showSectorOptions && filteredSectors.length === 0) {
                                        // do nothing
                                    }
                                }
                            }}
                        />
                        {showSectorOptions && createPortal(
                            <div 
                                className="lab-mapas-sector-options"
                                style={{
                                    position: 'fixed',
                                    top: sectorOptionsPosition.top + 4,
                                    left: sectorOptionsPosition.left,
                                    width: sectorOptionsPosition.width,
                                    backgroundColor: 'white',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 9999
                                }}
                            >
                                {filteredSectors.length > 0 ? filteredSectors.map((sec, idx) => (
                                    <div 
                                        key={sec.id}
                                        className={`lab-mapas-sector-option ${idx === highlightedIndex ? 'lab-mapas-sector-option-active' : ''}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectSector(sec);
                                        }}
                                    >
                                        {sec.code ? `${sec.code} - ${sec.name}` : sec.name}
                                    </div>
                                )) : (
                                    <div className="lab-mapas-sector-option" style={{ color: '#64748b' }}>Nenhum setor encontrado</div>
                                )}
                            </div>,
                            document.body
                        )}
                    </div>
                    <div className="lab-filter-item">
                        <label>Código Inicial</label>
                        <input type="number" placeholder="Opcional" value={filters.codigoInicial} onChange={(e) => setFilters({...filters, codigoInicial: e.target.value})} ref={codigoInicialRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (codigoFinalRef.current) codigoFinalRef.current.focus(); } }} />
                    </div>
                    <div className="lab-filter-item">
                        <label>Código Final</label>
                        <input type="number" placeholder="Opcional" value={filters.codigoFinal} onChange={(e) => setFilters({...filters, codigoFinal: e.target.value})} ref={codigoFinalRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (gerarBtnRef.current) gerarBtnRef.current.focus(); handleGerarLote(); } }} />
                    </div>
                    <div className="lab-filters-actions">
                        <button className="lab-btn lab-btn-primary" onClick={handleGerarLote} disabled={loadingGen} ref={gerarBtnRef}>
                            {loadingGen ? <Loader2 size={16} className="animate-spin" /> : <Map size={16} />} 
                            Gerar mapa
                        </button>
                    </div>
                </div>
            </div>

            <div className="lab-summary-row">
                <div className="lab-summary-mini-card">
                    <div className="lab-summary-mini-icon" style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6' }}><User size={20} /></div>
                    <div className="lab-summary-mini-info">
                        <span className="lab-summary-mini-value">{totalPacientes}</span>
                        <span className="lab-summary-mini-label">Pacientes</span>
                    </div>
                </div>
                <div className="lab-summary-mini-card">
                    <div className="lab-summary-mini-icon" style={{ backgroundColor: '#10b98115', color: '#10b981' }}><Activity size={20} /></div>
                    <div className="lab-summary-mini-info">
                        <span className="lab-summary-mini-value">{totalExames}</span>
                        <span className="lab-summary-mini-label">Exames</span>
                    </div>
                </div>
                <div className="lab-summary-mini-card">
                    <div className="lab-summary-mini-icon" style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}><FileText size={20} /></div>
                    <div className="lab-summary-mini-info">
                        <span className="lab-summary-mini-value">{pendentes}</span>
                        <span className="lab-summary-mini-label">Pendentes</span>
                    </div>
                </div>
                <div className="lab-summary-mini-card">
                    <div className="lab-summary-mini-icon" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}><Printer size={20} /></div>
                    <div className="lab-summary-mini-info">
                        <span className="lab-summary-mini-value">{impressos}</span>
                        <span className="lab-summary-mini-label">Impressos</span>
                    </div>
                </div>
            </div>

            <div className="lab-mapas-layout">
                {/* Lista de Lotes Históricos */}
                <div className="lab-card lab-mapas-list-card">
                    <div className="lab-card-header">
                        <h3 className="lab-card-title"><Map size={18} /> Lotes Gerados</h3>
                    </div>
                    <div className="lab-list-filters">
                        <select value={listFilterState} onChange={(e) => setListFilterState(e.target.value)}>
                            <option value="TODOS">Todos os Status</option>
                            <option value="PENDING">Pendentes</option>
                            <option value="PRINTED">Impressos</option>
                            <option value="CANCELED">Cancelados</option>
                        </select>
                    </div>
                    <div className="lab-list-container">
                        {loadingList ? (
                            <div className="empty-state"><Loader2 size={24} className="animate-spin" /> Carregando lotes...</div>
                        ) : filteredLotes.length === 0 ? (
                            <div className="empty-state">Nenhum lote foi gerado até o momento.</div>
                        ) : (
                            filteredLotes.map(lote => {
                                const snapInfo = typeof lote.document_snapshot === 'string' ? JSON.parse(lote.document_snapshot) : (lote.document_snapshot || {});
                                const secName = snapInfo?.metadata?.sector?.name || 'Setor';
                                const patCount = snapInfo?.patients?.length || 0;
                                const exCount = snapInfo?.patients?.reduce((acc, p) => acc + (p.exams?.length || 0), 0) || 0;
                                const codeStart = snapInfo?.metadata?.code_range?.start || lote.start_patient_code;
                                const codeEnd = snapInfo?.metadata?.code_range?.end || lote.end_patient_code;
                                const statusObj = getStatusInfo(lote.status);

                                return (
                                    <div key={lote.id} className={`lab-list-item ${selectedLoteId === lote.id ? 'selected' : ''}`} onClick={() => setSelectedLoteId(lote.id)}>
                                        <div className="lab-item-header">
                                            <span className="lab-item-sector">{secName}</span>
                                            <span className="lab-item-date">{formatDateTime(lote.generated_at)}</span>
                                        </div>
                                        <div className="lab-item-body">
                                            <div>{formatDate(lote.reference_date)} <span style={{color: '#94a3b8', margin: '0 4px'}}>•</span> Cód.: {codeStart} a {codeEnd}</div>
                                            <div>{patCount} pacientes <span style={{color: '#94a3b8', margin: '0 4px'}}>•</span> {exCount} exames</div>
                                        </div>
                                        <div className="lab-item-footer">
                                            <span className={`lab-status-tag ${statusObj.cls}`}>{statusObj.text}</span>
                                            <div className="lab-item-actions">
                                                <button className="lab-icon-btn lab-text-primary" title="Visualizar" onClick={(e) => { e.stopPropagation(); setSelectedLoteId(lote.id); }}><Eye size={16} /></button>
                                                {lote.status === 'PENDING' && (
                                                    <>
                                                        <button className="lab-icon-btn lab-text-gray" title="Imprimir" onClick={(e) => { e.stopPropagation(); setSelectedLoteId(lote.id); handleImprimirDocumento(lote); }}><Printer size={16} /></button>
                                                        <button className="lab-icon-btn lab-text-gray" title="Cancelar Lote" onClick={(e) => { e.stopPropagation(); handleSolicitarCancelamento(lote.id); }}><XCircle size={16} /></button>
                                                    </>
                                                )}
                                                {lote.status === 'PRINTED' && (
                                                    <button className="lab-icon-btn lab-text-success" title="Reimprimir" onClick={(e) => { e.stopPropagation(); setSelectedLoteId(lote.id); handleImprimirDocumento(lote); }}><Printer size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Prévia */}
                <div className="lab-print-preview-container" ref={previewRef}>
                    <div className="lab-print-actions">
                        <span className="lab-preview-title">Prévia do Lote</span>
                        <div className="lab-preview-btn-group">
                            {selectedLote?.status === 'PENDING' && (
                                <button className="lab-btn lab-btn-sm lab-btn-primary" onClick={() => handleImprimirDocumento(selectedLote)}><Printer size={14} /> Imprimir</button>
                            )}
                            {selectedLote?.status === 'PRINTED' && (
                                <button className="lab-btn lab-btn-sm lab-btn-success" onClick={() => handleImprimirDocumento(selectedLote)}><Printer size={14} /> Reimprimir</button>
                            )}
                        </div>
                    </div>
                    
                    <div className="lab-preview-content">
                        {!selectedLote ? (
                            <div className="empty-state" style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <span>Selecione um lote para visualizar o mapa coletivo.</span>
                                <FileText size={32} style={{ color: '#cbd5e1', strokeWidth: 1.5 }} />
                            </div>
                        ) : !previewSnap || !previewSnap.patients ? (
                            <div className="empty-state">Lote sem snapshot válido.</div>
                        ) : (
                            <div className="lab-paper-mock">
                                <div className="lab-paper-header">
                                    <div className="header-top">
                                        <div className="header-text-block">
                                            <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                                            <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
                                        </div>
                                        <div className="header-logos">
                                            <img src="/logo-prefeitura-pb.jpg" alt="Prefeitura" onerror="this.style.display='none'" />
                                            <img src="/logo-laboratorio-pb.jpg" alt="Laboratório" onerror="this.style.display='none'" />
                                        </div>
                                    </div>
                                    <div className="header-bottom">
                                        <h2>MAPA DE TRABALHO COLETIVO</h2>
                                        <span className="lab-paper-sector-badge">SETOR: {(previewSnap.metadata?.sector?.name || 'DESCONHECIDO').toUpperCase()} | DATA REF: {formatDate(previewSnap.metadata?.reference_date)}</span>
                                    </div>
                                </div>

                                {previewSnap.patients.map((pat, idx) => (
                                    <div key={idx} className="lab-patient-block">
                                        <div className="lab-patient-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                            <div style={{ wordBreak: 'break-word', color: '#1e293b' }}>
                                                <span style={{ fontWeight: 700 }}>CÓD. {pat.code}</span> — <span>{pat.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', fontSize: '0.8rem', color: '#475569' }}>
                                                <span>{pat.age_at_generation}</span>
                                                <span style={{ color: '#94a3b8' }}>|</span>
                                                <span>{pat.sex}</span>
                                                <span style={{ color: '#94a3b8' }}>|</span>
                                                <span>Origem: {pat.origin}</span>
                                                <span style={{ color: '#94a3b8' }}>|</span>
                                                <span>Médico: {pat.doctor}</span>
                                            </div>
                                        </div>
                                        <table className="lab-patient-exams">
                                            <tbody>
                                                {pat.exams?.map((ex, eIdx) => (
                                                    <tr key={eIdx}>
                                                        <td className="col-ex-cod">{ex.code}</td>
                                                        <td className="col-ex-name">{ex.name}</td>
                                                        <td className="col-ex-param">
                                                            {ex.parameters && ex.parameters.length > 0 ? (
                                                                ex.parameters.map((p, pIdx) => (
                                                                    <div key={pIdx} className="param-row">
                                                                        <span className="param-name">{p.name}</span>
                                                                        <div className="param-line"></div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="param-row"><div className="param-line"></div></div>
                                                            )}
                                                        </td>
                                                        <td className="col-ex-hist">
                                                            {ex.parameters && ex.parameters.length > 0 ? (
                                                                ex.parameters.map((p, pIdx) => {
                                                                    if(p.history && p.history.length > 0) {
                                                                       return <div key={pIdx}>{p.history.map((h, hIdx) => <span key={hIdx} className="hist-item">{formatDate(h.date)}: {h.value_numeric || h.value_text || h.observation || ''}</span>)}</div>
                                                                    }
                                                                    return <div key={pIdx}></div>
                                                                })
                                                            ) : (
                                                                ex.history && ex.history.length > 0 ? (
                                                                    ex.history.map((h, hIdx) => <span key={hIdx} className="hist-item">{formatDate(h.date)}: {h.value_numeric || h.value_text || h.observation || ''}</span>)
                                                                ) : null
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaboratorioMapas;
