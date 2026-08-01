import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    FileText, Printer, Search, RefreshCw, Eye,
    Filter, Calendar, Map as MapIcon, CheckCircle2, AlertCircle,
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
    const [pendingAutoPrintBatchId, setPendingAutoPrintBatchId] = useState(null);
    
    const [loadingList, setLoadingList] = useState(false);
    const [loadingGen, setLoadingGen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ visible: false, type: '', loteId: null, message: '', batchIds: [] });

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
    const buildConsolidatedBatch = (allBatchIds, dateRef, sectorId, startCodeStr, endCodeStr, lotesData) => {
        const startCode = startCodeStr ? BigInt(startCodeStr) : null;
        const endCode = endCodeStr ? BigInt(endCodeStr) : null;
        
        let consolidatedPatients = new globalThis.Map();
        let participatingPendingIds = new Set();
        let participatingPrintedIds = new Set();
        let commonSectorName = 'Setor';

        for (const bId of allBatchIds) {
            const bData = lotesData.find(l => l.id === bId);
            if (!bData) continue;
            
            const snapInfo = typeof bData.document_snapshot === 'string' ? JSON.parse(bData.document_snapshot) : (bData.document_snapshot || {});
            
            if (snapInfo?.metadata?.reference_date !== dateRef) continue;
            if (snapInfo?.metadata?.sector?.id !== sectorId) continue;
            commonSectorName = snapInfo?.metadata?.sector?.name || commonSectorName;
            
            const pats = snapInfo.patients || [];
            let batchContributed = false;

            for (const pat of pats) {
                const pCode = pat.code ? BigInt(pat.code) : null;
                if (startCode !== null && pCode !== null && pCode < startCode) continue;
                if (endCode !== null && pCode !== null && pCode > endCode) continue;

                batchContributed = true;
                
                const pKey = pat.patient_id || `${currentTenantId}_${pat.code}`;
                if (!consolidatedPatients.has(pKey)) {
                    consolidatedPatients.set(pKey, { ...pat, exams: new globalThis.Map() });
                }
                
                const consPat = consolidatedPatients.get(pKey);
                for (const ex of (pat.exams || [])) {
                    const normalize = (str) => (str || '').toString().trim().toUpperCase();
                    const exKey = ex.exam_id || `${normalize(ex.code)}::${normalize(ex.name)}`;
                    
                    const examToStore = { ...ex, _batch_generated_at: bData.generated_at };
                    
                    if (!consPat.exams.has(exKey)) {
                        consPat.exams.set(exKey, examToStore);
                    } else {
                        const existing = consPat.exams.get(exKey);
                        const existingParams = (existing.parameters || []).length;
                        const newParams = (ex.parameters || []).length;
                        
                        const existingHist = (existing.parameters || []).reduce((acc, p) => acc + (p.history || []).length, 0);
                        const newHist = (ex.parameters || []).reduce((acc, p) => acc + (p.history || []).length, 0);
                        
                        let shouldReplace = false;
                        if (newParams > existingParams) {
                            shouldReplace = true;
                        } else if (newParams === existingParams) {
                            if (newHist > existingHist) {
                                shouldReplace = true;
                            } else if (newHist === existingHist) {
                                const existingDate = new Date(existing._batch_generated_at || 0).getTime();
                                const newDate = new Date(bData.generated_at || 0).getTime();
                                if (newDate > existingDate) {
                                    shouldReplace = true;
                                }
                            }
                        }
                        
                        if (shouldReplace) {
                            consPat.exams.set(exKey, examToStore);
                        }
                    }
                }
            }

            if (batchContributed) {
                if (bData.status === 'PENDING') participatingPendingIds.add(bId);
                else if (bData.status === 'PRINTED') participatingPrintedIds.add(bId);
            }
        }
        
        let finalPatients = [];
        for (const [pKey, pat] of consolidatedPatients.entries()) {
            const examsArray = Array.from(pat.exams.values());
            if (examsArray.length > 0) {
                finalPatients.push({ ...pat, exams: examsArray });
            }
        }
        
        if (finalPatients.length === 0) return null;

        finalPatients.sort((a, b) => {
            const codeA = a.code ? BigInt(a.code) : 0n;
            const codeB = b.code ? BigInt(b.code) : 0n;
            return codeA < codeB ? -1 : codeA > codeB ? 1 : 0;
        });

        return {
            id: 'VIRTUAL',
            isVirtual: true,
            status: participatingPendingIds.size === 0 ? 'PRINTED' : 'PENDING',
            participatingPendingIds: Array.from(participatingPendingIds),
            participatingPrintedIds: Array.from(participatingPrintedIds),
            document_snapshot: {
                metadata: {
                    reference_date: dateRef,
                    sector: { id: sectorId, name: commonSectorName },
                    batch_id: 'CONSOLIDADO',
                    code_range: { start: startCodeStr, end: endCodeStr }
                },
                patients: finalPatients
            }
        };
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
                    setPendingAutoPrintBatchId(batch.id);
                }
                await carregarLotes(batch?.id);
            } else if (['EXISTING_PENDING_BATCHES', 'EXISTING_PRINTED_BATCHES', 'EXISTING_PENDING_AND_PRINTED_BATCHES'].includes(state)) {
                const pIds = pending_batch_ids || [];
                const prIds = printed_batch_ids || [];
                const allIds = [...pIds, ...prIds];
                
                // Carregar para garantir que os lotes existam na lista atual
                const dataLotes = await laboratorioMapasService.listarLotes(currentTenantId);
                setLotes(dataLotes || []);

                const vLote = buildConsolidatedBatch(allIds, filters.data, filters.setor, filters.codigoInicial, filters.codigoFinal, dataLotes || []);
                
                if (vLote) {
                    showToast('Mapa existente localizado e preparado para impressão.', 'success');
                    // Chama impressão direta enviando o lote virtual (só memória)
                    handleImprimirDocumento(vLote);
                } else {
                    showToast('Não foi possível montar a impressão dos lotes encontrados com o recorte solicitado. (Possível divergência de filtros).', 'warning');
                }
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

    const deduplicateExamsForPrint = (exams) => {
        if (!exams || !exams.length) return [];
        const examMap = new Map();
        const normalize = (str) => (str || '').toString().trim().toUpperCase();

        const mergeHistories = (hist1, hist2) => {
            const combined = [...(hist1 || []), ...(hist2 || [])];
            const unique = [];
            const seen = new Set();
            combined.forEach(h => {
                if (!h || (!h.value_numeric && !h.value_text && !h.observation)) return;
                const key = `${h.date}_${h.value_numeric || h.value_text || h.observation}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(h);
                }
            });
            return unique.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2).reverse();
        };

        exams.forEach(ex => {
            const exKey = ex.exam_id || `${normalize(ex.code)}::${normalize(ex.name)}`;
            
            if (!examMap.has(exKey)) {
                const cleanEx = { ...ex };
                if (cleanEx.parameters && cleanEx.parameters.length > 0) {
                    cleanEx.parameters = cleanEx.parameters.map(p => ({ ...p, history: mergeHistories(p.history, []) }));
                } else {
                    cleanEx.history = mergeHistories(cleanEx.history, []);
                }
                examMap.set(exKey, cleanEx);
            } else {
                const existing = examMap.get(exKey);
                const existingParams = existing.parameters || [];
                const newParams = ex.parameters || [];
                
                let base = existing;
                let other = ex;
                
                if (newParams.length > existingParams.length) {
                    base = ex;
                    other = existing;
                }
                
                const merged = { ...base };
                if (merged.parameters && merged.parameters.length > 0) {
                    merged.parameters = merged.parameters.map((p, pIdx) => {
                        const otherP = (other.parameters || [])[pIdx];
                        return { ...p, history: mergeHistories(p.history, otherP?.history) };
                    });
                } else {
                    merged.history = mergeHistories(merged.history, other.history);
                }
                examMap.set(exKey, merged);
            }
        });

        return Array.from(examMap.values());
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
            @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
            html, body { width: 100%; margin: 0; padding: 0; }
            * { box-sizing: border-box; }
            .mapa-print-document {
                width: 100%;
                max-width: none;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: Arial, Helvetica, sans-serif;
                color: #333;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .mapa-print-header-top {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: 16px;
            }
            .mapa-print-laboratorio-container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 2px;
            }
            .mapa-print-laboratorio-l1 {
                font-size: 15px;
                line-height: 1.1;
                font-weight: 700;
                color: #0f172a;
                margin: 0;
                text-transform: uppercase;
            }
            .mapa-print-laboratorio-l2 {
                font-size: 12px;
                line-height: 1.2;
                font-weight: 500;
                color: #475569;
                margin: 0;
            }
            .mapa-print-logos {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 10px;
                flex-shrink: 0;
            }
            .mapa-print-logo-prefeitura {
                width: auto;
                max-width: 105px;
                max-height: 40px;
                object-fit: contain;
            }
            .mapa-print-logo-laboratorio {
                width: auto;
                max-width: 36px;
                max-height: 36px;
                object-fit: contain;
            }
            .mapa-print-title-area {
                text-align: center;
                margin-top: 10px;
                padding-bottom: 8px;
                margin-bottom: 12px;
                border-bottom: 1px solid #e2e8f0;
            }
            .mapa-print-title-area h1 {
                margin: 0;
                font-size: 18px;
                line-height: 1.15;
                font-weight: 700;
                letter-spacing: 0.01em;
                color: #0f172a;
            }
            .mapa-print-reference {
                display: inline-block;
                margin-top: 6px;
                padding: 4px 12px;
                font-size: 10px;
                line-height: 1.2;
                font-weight: 600;
                color: #1e293b;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
            }

            .patient-block {
                margin-top: 14px;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .patient-header {
                padding: 7px 9px;
                font-size: 11px;
                line-height: 1.3;
                border: 1px solid #cbd5e1;
                border-left: 3px solid #64748b;
                font-weight: bold;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                background: #f8fafc;
            }
            
            .lab-patient-exams { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            .lab-patient-exams th { text-align: left; padding: 6px 9px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
            .lab-patient-exams td { padding: 0 4px; border-bottom: 1px dotted #e2e8f0; vertical-align: top; }
            
            .col-ex-main { vertical-align: top; }
            .col-ex-hist1 { width: 35mm; color: #64748b; font-size: 9px; padding-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-top: 8px; }
            .col-ex-hist2 { width: 35mm; color: #64748b; font-size: 9px; padding-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-top: 8px; }
            
            .exam-row {
                display: grid;
                grid-template-columns: 62px minmax(0, 1fr);
                column-gap: 12px;
                padding: 8px 4px;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .exam-code {
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
            }
            .exam-name {
                font-size: 11px;
                line-height: 1.25;
                font-weight: 600;
                margin-bottom: 4px;
            }
            .parameter-row {
                display: grid;
                grid-template-columns: minmax(140px, auto) minmax(100px, 1fr);
                align-items: end;
                column-gap: 8px;
                min-height: 17px;
                font-size: 10px;
            }
            .parameter-line {
                width: 100%;
                min-width: 100px;
                border-bottom: 1px solid #b8c5d3;
            }
            
            .hist-row-container { display: flex; justify-content: flex-start; align-items: baseline; gap: 12px; margin-bottom: 4px; min-height: 14px; }
            .hist-item { display: inline-block; white-space: nowrap; }
            
            .lab-paper-footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 5px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
            
            .lab-urinalise-compact { margin-bottom: 8px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; break-inside: avoid; page-break-inside: avoid; background: transparent; }
            .lab-urinalise-header { display: flex; flex-direction: column; gap: 4px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px 8px; margin: -6px -8px 6px -8px; border-radius: 5px 5px 0 0; box-sizing: border-box; }
            .u-header-main { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 16px; align-items: baseline; }
            .u-patient-identification { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
            .u-patient-demographics { display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-shrink: 0; white-space: nowrap; }
            .u-code { font-weight: 600; font-size: 8.5px; color: #475569; white-space: nowrap; }
            .u-name { font-weight: 700; font-size: 9.5px; color: #111827; white-space: normal; overflow-wrap: anywhere; }
            .u-age, .u-sex { font-weight: 600; font-size: 9.5px; color: #111827; }
            .u-header-sub { font-size: 8.5px; line-height: 1.25; color: #475569; display: flex; flex-wrap: wrap; gap: 8px; font-weight: 400; }
            .u-sep { color: #cbd5e1; }
            .u-exam-title { font-weight: 700; font-size: 10.5px; text-align: center; margin-bottom: 6px; color: #111827; }
            .u-exam-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 12px; row-gap: 4px; }
            .u-param-item { display: flex; align-items: flex-end; font-size: 9px; color: #000; line-height: 1.1; }
            .u-param-obs { grid-column: 1 / -1; margin-top: 2px; }
            .u-param-label { margin-right: 4px; white-space: nowrap; }
            .u-param-line { flex: 1; border-bottom: 1px solid #94a3b8; min-width: 20px; position: relative; top: -3px; }
        `;

        const renderHistItemHTML = (histArray, index) => {
            if (!histArray || histArray.length <= index) return '';
            const h = histArray[index];
            if (!h) return '';
            const val = String(h.value_numeric || h.value_text || h.observation || '').trim();
            let displayVal = val;
            const numericMatch = displayVal.match(/^([<>]?\s*[\d.,]+)\s+[a-zA-Z/%µ].*$/);
            if (numericMatch && numericMatch[1]) {
                displayVal = numericMatch[1];
            }
            return `<span class="hist-item">${formatDate(h.date)} &rarr; ${escapeHtml(displayVal)}</span>`;
        };

        const sectorName = snapshot.metadata?.sector?.name || 'SETOR DESCONHECIDO';
        const isHematologia = sectorName.trim().toUpperCase() === 'HEMATOLOGIA';

        let bodyHtml = '';
        const isUrinalise = sectorName.trim().toUpperCase() === 'URINÁLISE' || sectorName.trim().toUpperCase() === 'URINALISE';

        snapshot.patients.forEach(pat => {
            const examesVisiveis = isHematologia
                ? (pat.exams || []).filter(exam => String(exam.code || '').trim().toUpperCase() !== 'HEMO')
                : (pat.exams || []);

            if (examesVisiveis.length === 0) return;

            const deduplicatedExams = deduplicateExamsForPrint(examesVisiveis);

            if (isUrinalise) {
                const obsText = (pat.observation || pat.obs || pat.observacao || '').trim();
                let examsHtml = '';
                deduplicatedExams.forEach(ex => {
                    let gridHtml = '';
                    if (ex.parameters && ex.parameters.length > 0) {
                        const col1Keys = ['VOLUME', 'DENSIDADE', 'CORPO', 'CETONICO', 'CETÔNICO', 'BILIRRUBINA', 'EPITELIAIS', 'HEMÁCIAS', 'HEMACIAS', 'CRISTAIS'];
                        const col2Keys = ['COR', 'PH', 'GLICOSE', 'SANGUE', 'HEMOGLOBINA', 'FILAMENTO', 'BACTÉRIA', 'BACTERIA', 'LEVEDUR'];
                        const getCol = (name) => {
                            const n = String(name || '').toUpperCase();
                            if (n.includes('OBSERVA')) return 4;
                            if (col1Keys.some(k => n.includes(k))) return 1;
                            if (col2Keys.some(k => n.includes(k))) return 2;
                            return 3;
                        };
                        const col1 = [], col2 = [], col3 = [], obs = [];
                        ex.parameters.forEach(p => {
                            const c = getCol(p.name);
                            if (c === 1) col1.push(p);
                            else if (c === 2) col2.push(p);
                            else if (c === 4) obs.push(p);
                            else col3.push(p);
                        });
                        const maxRows = Math.max(col1.length, col2.length, col3.length);
                        const sortedParams = [];
                        for (let i = 0; i < maxRows; i++) {
                            if (col1[i]) sortedParams.push({ ...col1[i] }); else sortedParams.push({ name: '', _empty: true });
                            if (col2[i]) sortedParams.push({ ...col2[i] }); else sortedParams.push({ name: '', _empty: true });
                            if (col3[i]) sortedParams.push({ ...col3[i] }); else sortedParams.push({ name: '', _empty: true });
                        }
                        sortedParams.push(...obs);

                        sortedParams.forEach((p, pIdx) => {
                            if (p._empty) {
                                gridHtml += `<div style="visibility: hidden"></div>`;
                                return;
                            }
                            const isObs = String(p.name || '').toUpperCase().includes('OBSERVA');
                            gridHtml += `
                                <div class="u-param-item ${isObs ? 'u-param-obs' : ''}">
                                    <span class="u-param-label">${escapeHtml(p.name)}:</span>
                                    <div class="u-param-line"></div>
                                </div>
                            `;
                        });
                    } else {
                        gridHtml += `
                            <div class="u-param-item u-param-obs">
                                <span class="u-param-label">Resultado:</span>
                                <div class="u-param-line"></div>
                            </div>
                        `;
                    }

                    examsHtml += `
                        <div class="lab-urinalise-exam">
                            <div class="u-exam-title">${escapeHtml(ex.name).toUpperCase()}</div>
                            <div class="u-exam-grid">
                                ${gridHtml}
                            </div>
                        </div>
                    `;
                });

                bodyHtml += `
                    <div class="lab-urinalise-compact">
                        <div class="lab-urinalise-header">
                            <div class="u-header-main">
                                <div class="u-patient-identification">
                                    <span class="u-code">CÓD. ${escapeHtml(pat.code)}</span>
                                    <span class="u-name">${escapeHtml(pat.name)}</span>
                                </div>
                                <div class="u-patient-demographics">
                                    <span class="u-age">${escapeHtml(pat.age_at_generation)}</span>
                                    <span class="u-sex">${escapeHtml(pat.sex)}</span>
                                </div>
                            </div>
                            <div class="u-header-sub">
                                <span>Origem: ${escapeHtml(pat.origin)}</span>
                                <span class="u-sep">|</span>
                                <span>Médico: ${escapeHtml(pat.doctor || 'NÃO INFORMADO')}</span>
                                ${obsText ? `<span class="u-sep">|</span><span>Obs: ${escapeHtml(obsText)}</span>` : ''}
                            </div>
                        </div>
                        ${examsHtml}
                    </div>
                `;
            } else {
                let examsRows = '';
                deduplicatedExams.forEach(ex => {
                    let paramsHtml = '';
                    let hist1Html = '';
                    let hist2Html = '';

                    if (ex.parameters && ex.parameters.length > 0) {
                        ex.parameters.forEach(p => {
                            paramsHtml += `
                                <div class="parameter-row">
                                    <span>${escapeHtml(p.name || ':')}</span>
                                    <div class="parameter-line"></div>
                                </div>
                            `;
                            hist1Html += `<div class="hist-row-container">${renderHistItemHTML(p.history, 0)}</div>`;
                            hist2Html += `<div class="hist-row-container">${renderHistItemHTML(p.history, 1)}</div>`;
                        });
                    } else {
                        paramsHtml = `
                            <div class="parameter-row">
                                <span>:</span>
                                <div class="parameter-line"></div>
                            </div>
                        `;
                        hist1Html = `<div class="hist-row-container">${renderHistItemHTML(ex.history, 0)}</div>`;
                        hist2Html = `<div class="hist-row-container">${renderHistItemHTML(ex.history, 1)}</div>`;
                    }

                    examsRows += `
                        <tr>
                            <td class="col-ex-main">
                                <div class="exam-row">
                                    <div class="exam-code">${escapeHtml(ex.code)}</div>
                                    <div>
                                        <div class="exam-name">${escapeHtml(ex.name)}</div>
                                        <div>${paramsHtml}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="col-ex-hist1">${hist1Html}</td>
                            <td class="col-ex-hist2">${hist2Html}</td>
                        </tr>
                    `;
                });

                bodyHtml += `
                    <div class="patient-block">
                        <div class="patient-header">
                            <div style="word-break: break-word; color: #1e293b; width: 100%;">
                                <span style="font-weight: 800;">CÓD. ${escapeHtml(pat.code)}</span> — <span>${escapeHtml(pat.name)}</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: #475569;">
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
            }
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Mapa Coletivo - ${escapeHtml(sectorName)}</title>
                <style>${cssStyles}</style>
            </head>
            <body>
              <div class="mapa-print-document">
                <header class="mapa-print-header">
                    <div class="mapa-print-header-top">
                        <div class="mapa-print-laboratorio-container">
                            <div class="mapa-print-laboratorio-l1">LABORATÓRIO MUNICIPAL</div>
                            <div class="mapa-print-laboratorio-l2">Lindoberg Cândido de Souza</div>
                        </div>
                        <div class="mapa-print-logos">
                            <img src="${new URL('/logo-prefeitura-pb.jpg', window.location.origin).href}" alt="Prefeitura" class="mapa-print-logo-prefeitura">
                            <img src="${new URL('/logo-laboratorio-pb.jpg', window.location.origin).href}" alt="Laboratório" class="mapa-print-logo-laboratorio">
                        </div>
                    </div>
                    <div class="mapa-print-title-area">
                        <h1>MAPA DE TRABALHO COLETIVO</h1>
                        <div class="mapa-print-reference">SETOR: ${escapeHtml(sectorName).toUpperCase()} | DATA REF: ${formatDate(snapshot.metadata?.reference_date)}</div>
                    </div>
                </header>
                ${bodyHtml}
                <div class="lab-paper-footer">
                    <p>Impresso por: ${escapeHtml(displayName)} em ${escapeHtml(dataHoraImpressao)}</p>
                    <p>Gestão 360 - Lote: ${escapeHtml(snapshot.metadata?.batch_id)}</p>
                </div>
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
            if (lote.isVirtual) {
                if (lote.participatingPendingIds && lote.participatingPendingIds.length > 0) {
                    setConfirmModal({
                        visible: true,
                        type: 'PRINT_VIRTUAL',
                        batchIds: lote.participatingPendingIds,
                        loteId: null,
                        message: 'Deseja marcar os lotes pendentes utilizados nesta impressão como impressos?'
                    });
                }
            } else if (!isReimpressao) {
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

    useEffect(() => {
        if (pendingAutoPrintBatchId && selectedLoteId === pendingAutoPrintBatchId) {
            const batchToPrint = lotes.find(l => l.id === pendingAutoPrintBatchId);
            if (batchToPrint && previewRef.current) {
                setPendingAutoPrintBatchId(null);
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            handleImprimirDocumento(batchToPrint);
                        } catch (err) {
                            console.error("[Mapas] Auto print failed:", err);
                            showToast("O lote foi gerado, mas não foi possível abrir a impressão automaticamente. Use o botão Imprimir.", "warning");
                        }
                    }, 50);
                });
            }
        }
    }, [pendingAutoPrintBatchId, selectedLoteId, lotes]);

    const handleConfirmarImpressao = async () => {
        if (!confirmModal.loteId && (!confirmModal.batchIds || confirmModal.batchIds.length === 0)) return;
        setLoadingAction(true);
        try {
            if (confirmModal.type === 'PRINT_VIRTUAL') {
                for (const bId of confirmModal.batchIds) {
                    await laboratorioMapasService.marcarLoteComoImpresso({ tenantId: currentTenantId, batchId: bId });
                }
                showToast('Lotes marcados como impressos.', 'success');
            } else {
                await laboratorioMapasService.marcarLoteComoImpresso({
                    tenantId: currentTenantId,
                    batchId: confirmModal.loteId
                });
                showToast('Lote marcado como impresso.', 'success');
            }
            await carregarLotes();
            setConfirmModal({ visible: false, type: '', loteId: null, message: '', batchIds: [] });
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

            {/* Modal de Confirmação e Escolha */}
            {confirmModal.visible && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal" style={confirmModal.type === 'CHOICE' ? { minWidth: '600px', maxWidth: '800px' } : {}}>
                        <h3 className="lab-modal-title">
                            {confirmModal.type === 'CHOICE' ? 'Lotes encontrados' : 'Confirmação'}
                        </h3>
                        <p className="lab-modal-body">
                            {confirmModal.type === 'CHOICE' 
                                ? 'Os exames desta consulta estão distribuídos em mais de um lote. Selecione o lote que deseja imprimir.' 
                                : confirmModal.message}
                        </p>
                        
                        {confirmModal.type === 'CHOICE' && confirmModal.batchIds && confirmModal.batchIds.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                                {confirmModal.batchIds.map(bId => {
                                    const bData = lotes.find(l => l.id === bId);
                                    if (!bData) return null;
                                    
                                    const snapInfo = typeof bData.document_snapshot === 'string' ? JSON.parse(bData.document_snapshot) : (bData.document_snapshot || {});
                                    const secName = snapInfo?.metadata?.sector?.name || 'Setor';
                                    const patCount = snapInfo?.patients?.length || 0;
                                    const exCount = snapInfo?.patients?.reduce((acc, p) => acc + (p.exams?.length || 0), 0) || 0;
                                    const codeStart = snapInfo?.metadata?.code_range?.start || bData.start_patient_code;
                                    const codeEnd = snapInfo?.metadata?.code_range?.end || bData.end_patient_code;
                                    const statusObj = getStatusInfo(bData.status);

                                    return (
                                        <div key={bId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{secName} <span style={{color: '#94a3b8', margin: '0 4px', fontWeight: 'normal'}}>•</span> {formatDate(bData.reference_date)}</div>
                                                <div style={{ color: '#475569' }}>Cód.: {codeStart} a {codeEnd} <span style={{color: '#94a3b8', margin: '0 4px'}}>•</span> {patCount} pacientes <span style={{color: '#94a3b8', margin: '0 4px'}}>•</span> {exCount} exames</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={`lab-status-tag ${statusObj.cls}`} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>{statusObj.text}</span>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Gerado em: {formatDateTime(bData.generated_at)}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <button 
                                                    className={`lab-btn lab-btn-sm ${bData.status === 'PENDING' ? 'lab-btn-primary' : 'lab-btn-success'}`}
                                                    onClick={() => {
                                                        setSelectedLoteId(bData.id);
                                                        setPendingAutoPrintBatchId(bData.id);
                                                        setConfirmModal({ visible: false, type: '', loteId: null, message: '', batchIds: [] });
                                                    }}
                                                >
                                                    <Printer size={14} /> {bData.status === 'PENDING' ? 'Imprimir' : 'Reimprimir'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="lab-modal-actions" style={confirmModal.type === 'CHOICE' ? { marginTop: '20px' } : {}}>
                            <button className="lab-btn lab-btn-outline" onClick={() => setConfirmModal({ visible: false, type: '', loteId: null, message: '', batchIds: [] })} disabled={loadingAction}>
                                {confirmModal.type === 'CHOICE' ? 'Cancelar' : confirmModal.type === 'PRINT' ? 'Manter como pendente' : 'Manter lote'}
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
                            {loadingGen ? <Loader2 size={16} className="animate-spin" /> : <MapIcon size={16} />} 
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
                        <h3 className="lab-card-title"><MapIcon size={18} /> Lotes Gerados</h3>
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
                                        <div className="mapa-laboratorio-container">
                                            <div className="mapa-laboratorio-l1">LABORATÓRIO MUNICIPAL</div>
                                            <div className="mapa-laboratorio-l2">Lindoberg Cândido de Souza</div>
                                        </div>
                                        <div className="header-logos">
                                            <img src="/logo-prefeitura-pb.jpg" alt="Prefeitura" className="mapa-print-logo-prefeitura" onError={(e) => { e.currentTarget.style.display='none'; }} />
                                            <img src="/logo-laboratorio-pb.jpg" alt="Laboratório" className="mapa-print-logo-laboratorio" onError={(e) => { e.currentTarget.style.display='none'; }} />
                                        </div>
                                    </div>
                                    <div className="header-bottom">
                                        <h2>MAPA DE TRABALHO COLETIVO</h2>
                                        <span className="lab-paper-sector-badge">SETOR: {(previewSnap.metadata?.sector?.name || 'DESCONHECIDO').toUpperCase()} | DATA REF: {formatDate(previewSnap.metadata?.reference_date)}</span>
                                    </div>
                                </div>

                                {(() => {
                                    const renderHistoryItem = (histArray, index) => {
                                        if (!histArray || histArray.length <= index) return null;
                                        const h = histArray[index];
                                        if (!h) return null;
                                        const val = String(h.value_numeric || h.value_text || h.observation || '').trim();
                                        let displayVal = val;
                                        const numericMatch = displayVal.match(/^([<>]?\s*[\d.,]+)\s+[a-zA-Z/%µ].*$/);
                                        if (numericMatch && numericMatch[1]) {
                                            displayVal = numericMatch[1];
                                        }
                                        return (
                                            <span className="hist-item">
                                                {formatDate(h.date)} &rarr; {displayVal}
                                            </span>
                                        );
                                    };

                                    const isHematologia = (previewSnap.metadata?.sector?.name || '').trim().toUpperCase() === 'HEMATOLOGIA';

                                    return previewSnap.patients.map((pat, idx) => {
                                        const examesVisiveis = isHematologia
                                            ? (pat.exams || []).filter(exam => String(exam.code || '').trim().toUpperCase() !== 'HEMO')
                                            : (pat.exams || []);

                                        if (examesVisiveis.length === 0) return null;

                                        const deduplicatedExams = deduplicateExamsForPrint(examesVisiveis);
                                        const isUrinalise = (previewSnap.metadata?.sector?.name || '').trim().toUpperCase() === 'URINÁLISE' || (previewSnap.metadata?.sector?.name || '').trim().toUpperCase() === 'URINALISE';

                                        if (isUrinalise) {
                                            return (
                                                <div key={idx} className="lab-patient-block lab-urinalise-compact">
                                                    <div className="lab-urinalise-header">
                                                        <div className="u-header-main">
                                                            <div className="u-patient-identification">
                                                                <span className="u-code">CÓD. {pat.code}</span>
                                                                <span className="u-name">{pat.name}</span>
                                                            </div>
                                                            <div className="u-patient-demographics">
                                                                <span className="u-age">{pat.age_at_generation}</span>
                                                                <span className="u-sex">{pat.sex}</span>
                                                            </div>
                                                        </div>
                                                        <div className="u-header-sub">
                                                            <span>Origem: {pat.origin}</span>
                                                            <span className="u-sep">|</span>
                                                            <span>Médico: {pat.doctor || 'NÃO INFORMADO'}</span>
                                                            {(pat.observation || pat.obs || pat.observacao) && (
                                                                <>
                                                                    <span className="u-sep">|</span>
                                                                    <span>Obs: {pat.observation || pat.obs || pat.observacao}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {deduplicatedExams.map((ex, eIdx) => (
                                                        <div key={eIdx} className="lab-urinalise-exam">
                                                            <div className="u-exam-title">{ex.name.toUpperCase()}</div>
                                                            <div className="u-exam-grid">
                                                                {ex.parameters && ex.parameters.length > 0 ? (
                                                                    (() => {
                                                                        const col1Keys = ['VOLUME', 'DENSIDADE', 'CORPO', 'CETONICO', 'CETÔNICO', 'BILIRRUBINA', 'EPITELIAIS', 'HEMÁCIAS', 'HEMACIAS', 'CRISTAIS'];
                                                                        const col2Keys = ['COR', 'PH', 'GLICOSE', 'SANGUE', 'HEMOGLOBINA', 'FILAMENTO', 'BACTÉRIA', 'BACTERIA', 'LEVEDUR'];
                                                                        
                                                                        const getCol = (name) => {
                                                                            const n = String(name || '').toUpperCase();
                                                                            if (n.includes('OBSERVA')) return 4;
                                                                            if (col1Keys.some(k => n.includes(k))) return 1;
                                                                            if (col2Keys.some(k => n.includes(k))) return 2;
                                                                            return 3;
                                                                        };

                                                                        const col1 = [];
                                                                        const col2 = [];
                                                                        const col3 = [];
                                                                        const obs = [];
                                                                        
                                                                        ex.parameters.forEach(p => {
                                                                            const c = getCol(p.name);
                                                                            if (c === 1) col1.push(p);
                                                                            else if (c === 2) col2.push(p);
                                                                            else if (c === 4) obs.push(p);
                                                                            else col3.push(p);
                                                                        });
                                                                        
                                                                        const maxRows = Math.max(col1.length, col2.length, col3.length);
                                                                        const sortedParams = [];
                                                                        for (let i = 0; i < maxRows; i++) {
                                                                            if (col1[i]) sortedParams.push({ ...col1[i] });
                                                                            else sortedParams.push({ name: '', _empty: true });
                                                                            
                                                                            if (col2[i]) sortedParams.push({ ...col2[i] });
                                                                            else sortedParams.push({ name: '', _empty: true });
                                                                            
                                                                            if (col3[i]) sortedParams.push({ ...col3[i] });
                                                                            else sortedParams.push({ name: '', _empty: true });
                                                                        }
                                                                        
                                                                        sortedParams.push(...obs);
                                                                        
                                                                        return sortedParams.map((p, pIdx) => {
                                                                            if (p._empty) return <div key={`empty-${pIdx}`} style={{ visibility: 'hidden' }}></div>;
                                                                            const isObs = String(p.name || '').toUpperCase().includes('OBSERVA');
                                                                            return (
                                                                                <div key={pIdx} className={`u-param-item ${isObs ? 'u-param-obs' : ''}`}>
                                                                                    <span className="u-param-label">{p.name}:</span>
                                                                                    <div className="u-param-line"></div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()
                                                                ) : (
                                                                    <div className="u-param-item u-param-obs">
                                                                        <span className="u-param-label">Resultado:</span>
                                                                        <div className="u-param-line"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return (
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
                                                        {deduplicatedExams.map((ex, eIdx) => (
                                                            <tr key={eIdx}>
                                                                <td className="col-ex-main">
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', columnGap: '12px', alignItems: 'start' }}>
                                                                        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{ex.code}</div>
                                                                        <div style={{ minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                                                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{ex.name}</div>
                                                                            <div>
                                                                                {ex.parameters && ex.parameters.length > 0 ? (
                                                                                    ex.parameters.map((p, pIdx) => (
                                                                                        <div key={pIdx} className="param-row">
                                                                                            <span className="param-name">{p.name || ':'}</span>
                                                                                            <div className="param-line"></div>
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <div className="param-row">
                                                                                        <span className="param-name">:</span>
                                                                                        <div className="param-line"></div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="col-ex-hist1">
                                                                    {ex.parameters && ex.parameters.length > 0 ? (
                                                                        ex.parameters.map((p, pIdx) => (
                                                                            <div key={pIdx} className="hist-row-container">
                                                                                {renderHistoryItem(p.history, 0)}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="hist-row-container">
                                                                            {renderHistoryItem(ex.history, 0)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="col-ex-hist2">
                                                                    {ex.parameters && ex.parameters.length > 0 ? (
                                                                        ex.parameters.map((p, pIdx) => (
                                                                            <div key={pIdx} className="hist-row-container">
                                                                                {renderHistoryItem(p.history, 1)}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="hist-row-container">
                                                                            {renderHistoryItem(ex.history, 1)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LaboratorioMapas;
