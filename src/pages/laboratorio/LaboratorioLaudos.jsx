import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCpf } from '../../utils/formatters';
import { 
    CheckCircle2, AlertTriangle, Search, RefreshCw, 
    Activity, Clock, User, Loader2, FileText, Printer, Download, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import './LaboratorioConferencia.css';
import './LaboratorioLaudos.css';
import { laboratorioLaudosService } from '../../services/api/laboratorioLaudos.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin } from '../../utils/laboratorioHelpers';

const getLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LaboratorioLaudos = () => {
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        protocol: location.state?.protocolNumber || '',
        patient: '',
        exam: '',
        status: 'AGUARDANDO',
        attendance_origin: ''
    });
    
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    
    const activeFiltersCount = (searchFilters.exam ? 1 : 0) + 
                               (searchFilters.status !== 'AGUARDANDO' ? 1 : 0) + 
                               (searchFilters.attendance_origin ? 1 : 0);

    const handleClearAdvancedFilters = () => {
        setSearchFilters(prev => ({
            ...prev,
            exam: '',
            status: 'AGUARDANDO',
            attendance_origin: ''
        }));
    };
    
    const [localSearch, setLocalSearch] = useState('');
    const [selectedProtocol, setSelectedProtocol] = useState(null);
    const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1);
    const listRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    
    const [selectedExam, setSelectedExam] = useState(null);
    const [examDetails, setExamDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    const [saving, setSaving] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const laudoRef = useRef(null);

    useEffect(() => {
        handleSearch();
    }, []);

    const handleFilterKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    };

    const filteredResults = useMemo(() => {
        if (!localSearch) return searchResults;
        const lower = localSearch.toLowerCase().trim();
        const removeAccents = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const term = removeAccents(lower);

        return searchResults.filter(item => {
            const p = removeAccents((item.protocolo || '').toLowerCase());
            const n = removeAccents((item.pacienteNome || '').toLowerCase());
            const ec = removeAccents((item.exameCodigo || '').toLowerCase());
            const en = removeAccents((item.exameNome || '').toLowerCase());
            const cns = removeAccents((item.pacienteCns || '').toLowerCase());
            const cpf = removeAccents((item.pacienteCpf || '').toLowerCase());

            return p.includes(term) || n.includes(term) || ec.includes(term) || en.includes(term) || cns.includes(term) || cpf.includes(term);
        });
    }, [searchResults, localSearch]);

    const groupedProtocols = useMemo(() => {
        const groups = {};
        filteredResults.forEach(ex => {
            if (!groups[ex.protocolo]) {
                groups[ex.protocolo] = {
                    protocolo: ex.protocolo,
                    dataAtendimento: ex.dataAtendimento,
                    pacienteNome: ex.pacienteNome,
                    pacienteIdade: ex.pacienteIdade,
                    pacienteSexo: ex.pacienteSexo,
                    pacienteCns: ex.pacienteCns,
                    pacienteCpf: ex.pacienteCpf,
                    convenio: ex.convenio,
                    medico: ex.medico,
                    local_entrega: ex.local_entrega,
                    exams: []
                };
            }
            groups[ex.protocolo].exams.push(ex);
        });
        return Object.values(groups);
    }, [filteredResults]);

    useEffect(() => {
        if (groupedProtocols.length > 0 && selectedProtocol === null) {
            setSelectedProtocol(groupedProtocols[0]);
        } else if (groupedProtocols.length === 0) {
            setSelectedProtocol(null);
            setSelectedExam(null);
            setExamDetails([]);
        } else if (selectedProtocol) {
            const found = groupedProtocols.find(g => g.protocolo === selectedProtocol.protocolo);
            if (found) {
                setSelectedProtocol(found);
                if (selectedExam && !found.exams.find(e => e.id === selectedExam.id)) {
                    if (found.exams.length > 0) {
                        handleSelectExam(found.exams[0]);
                    } else {
                        setSelectedExam(null);
                        setExamDetails([]);
                    }
                }
            } else {
                setSelectedProtocol(groupedProtocols[0]);
                setSelectedExam(null);
                setExamDetails([]);
            }
        }
    }, [groupedProtocols, selectedProtocol, searchResults]); // depend on searchResults to force update

    useEffect(() => {
        if (selectedProtocol && selectedProtocol.exams.length > 0 && !selectedExam) {
            handleSelectExam(selectedProtocol.exams[0]);
        }
    }, [selectedProtocol]);

    const handleLocalSearchKeyDown = (e) => {
        if (groupedProtocols.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setKeyboardSelectedIndex(prev => Math.min(prev + 1, groupedProtocols.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setKeyboardSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (keyboardSelectedIndex >= 0 && keyboardSelectedIndex < groupedProtocols.length) {
                setSelectedProtocol(groupedProtocols[keyboardSelectedIndex]);
            } else if (groupedProtocols.length === 1) {
                setSelectedProtocol(groupedProtocols[0]);
            }
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const data = await laboratorioLaudosService.buscarLaudos({
                ...searchFilters
            });
            setSearchResults(data);
            setSelectedExam(null);
            setExamDetails([]);
            setFeedbackMsg(null);
        } catch (error) {
            console.error('Erro na busca', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao buscar laudos. Verifique os filtros e tente novamente.' });
            setTimeout(() => setFeedbackMsg(null), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectExam = async (exam) => {
        try {
            console.log('LAUDO SELECIONADO:', exam);
            setSelectedExam(exam);
            setLoadingDetails(true);
            const detalhes = await laboratorioLaudosService.carregarDetalhesLaudo(exam.id);
            setExamDetails(detalhes);
            setFeedbackMsg(null);
        } catch (error) {
            console.error('Erro ao carregar detalhes', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao carregar os parâmetros do laudo.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleLiberar = async () => {
        if (!selectedExam) return;
        
        try {
            setSaving(true);
            const resultData = await laboratorioLaudosService.liberarLaudo(selectedExam.id);
            
            const messageText = resultData.allLiberated 
                ? 'Todos os laudos deste atendimento foram liberados. Atendimento finalizado.'
                : 'Laudo liberado. Ainda existem exames pendentes de liberação neste atendimento.';
            
            setFeedbackMsg({ type: 'success', text: messageText });
            
            if (searchFilters.status === 'CONFERIDO') {
                setSearchResults(prev => prev.filter(ex => ex.id !== selectedExam.id));
                setSelectedExam(null);
                setExamDetails([]);
            } else {
                const updatedExam = { ...selectedExam, status: 'LIBERADO' };
                setSelectedExam(updatedExam);
                setSearchResults(prev => prev.map(ex => ex.id === updatedExam.id ? updatedExam : ex));
            }

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 3000);

        } catch (error) {
            console.error('Erro ao liberar laudo', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao liberar laudo. Tente novamente.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const isAbnormal = (val_num, min, max) => {
        if (val_num === null || val_num === undefined || val_num === '') return false;
        const num = parseFloat(val_num);
        if (isNaN(num)) return false;
        
        if (min !== null && num < parseFloat(min)) return 'below';
        if (max !== null && num > parseFloat(max)) return 'above';
        return 'normal';
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString('pt-BR');
    };

    const handleDownloadPdf = async () => {
        if (!laudoRef.current || !selectedExam) return;
        
        try {
            setGeneratingPdf(true);
            const element = laudoRef.current;
            element.classList.add('pdf-export-mode');

            const protocolo = selectedExam.protocolo || 'sem_protocolo';
            const exame = selectedExam.exameCodigo || 'exame';

            const opt = {
                margin:       [26, 10, 10, 10], // Aumentado top para 26mm para caber o cabeçalho de continuação + logo
                filename:     `laudo_${protocolo}_${exame}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 2; i <= totalPages; i++) {
                    pdf.setPage(i);
                    
                    // Fundo da faixa do título do exame
                    pdf.setFillColor(248, 250, 252); // #f8fafc
                    pdf.rect(10, 10, 190, 9, 'F');
                    
                    // Detalhe azul à esquerda
                    pdf.setFillColor(59, 130, 246); // #3b82f6
                    pdf.rect(10, 10, 1.5, 9, 'F');

                    // Texto do título
                    pdf.setFontSize(8);
                    pdf.setTextColor(30, 41, 59); // #1e293b
                    pdf.setFont("helvetica", "bold");
                    const titulo = `${selectedExam.exameCodigo} - ${selectedExam.exameNome} (Continuação)`;
                    pdf.text(titulo, 14, 14.2);

                    // Linha do paciente
                    pdf.setFontSize(7);
                    pdf.setTextColor(100, 116, 139); // #64748b
                    pdf.setFont("helvetica", "normal");
                    const pacienteInfo = `Paciente: ${selectedExam.pacienteNome || ''} | RG: ${selectedExam.pacienteRg || '---'} | Protocolo: ${selectedExam.protocolo || ''} | Data: ${selectedExam.dataAtendimento || ''}`;
                    pdf.text(pacienteInfo, 14, 17.5);

                    // Cabeçalho da tabela de parâmetros
                    pdf.setFontSize(7);
                    pdf.setTextColor(51, 65, 85); // #334155
                    pdf.setFont("helvetica", "bold");
                    pdf.text("PARÂMETRO", 14, 23);
                    pdf.text("RESULTADO", 86, 23);
                    pdf.text("VALOR DE REFERÊNCIA", 124, 23);
                    
                    // Linha divisória inferior
                    pdf.setDrawColor(203, 213, 225); // #cbd5e1
                    pdf.setLineWidth(0.3);
                    pdf.line(10, 24.5, 200, 24.5);
                    
                    // Logo do Laboratório na continuação
                    try {
                        const logoElement = laudoRef.current.querySelector('.print-logo-img');
                        if (logoElement) {
                            // Dimensions: we want it small, say max height 6mm
                            const aspect = logoElement.naturalWidth / logoElement.naturalHeight;
                            const h = 6;
                            const w = h * aspect;
                            pdf.addImage(logoElement, 'PNG', 10, 3, w, h);
                        }
                    } catch (e) {
                        console.warn('Could not add logo to continuation page', e);
                    }
                    
                    // handled above
                }
            }).save();
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            setFeedbackMsg({ type: 'error', text: 'Erro ao gerar PDF. Tente novamente.' });
            setTimeout(() => setFeedbackMsg(null), 3000);
        } finally {
            laudoRef.current?.classList.remove('pdf-export-mode');
            setGeneratingPdf(false);
        }
    };

    const statusReal = selectedExam ? String(selectedExam.status || '').trim().toUpperCase() : '';

    return (
        <div className="lab-conf-container">
            <style>{`
                .result-value-long {
                    font-size: 10px;
                    line-height: 1.15;
                    font-weight: 700;
                    white-space: normal;
                }
                
                .result-unit-inline,
                .result-complement {
                    font-size: 8.5px !important;
                    line-height: 1.1 !important;
                    color: #64748b !important;
                }
            `}</style>
            {/* Header */}
            <header className="lab-conf-header">
                <div>
                    <h1 className="lab-title">Laudos</h1>
                    <p className="lab-subtitle">Visualização e liberação final de resultados para o paciente</p>
                </div>
                <div className="lab-header-actions" style={{ position: 'relative' }}>
                    {feedbackMsg && !selectedExam && (
                        <div style={{
                            position: 'absolute', top: '50%', right: '100%', 
                            transform: 'translateY(-50%)', marginRight: '1rem',
                            background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                            border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {feedbackMsg.text}
                        </div>
                    )}
                    <button className="lab-btn lab-btn-outline" onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                        Atualizar lista
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className={`lab-card lab-filters-card ${selectedExam ? 'compact' : ''}`}>
                <div className="lab-filters-grid laudos-first-row-flex">
                    <div className="lab-filter-item lab-filter-group laudos-flex-data">
                        <label>Data</label>
                        <input 
                            type="date" 
                            value={searchFilters.date}
                            onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group laudos-flex-protocolo">
                        <label>Protocolo</label>
                        <input 
                            type="text" 
                            placeholder="Buscar por protocolo..."
                            value={searchFilters.protocol}
                            onChange={(e) => setSearchFilters({...searchFilters, protocol: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group laudos-flex-paciente">
                        <label>Paciente</label>
                        <input 
                            type="text" 
                            placeholder="Nome do paciente..."
                            value={searchFilters.patient}
                            onChange={(e) => setSearchFilters({...searchFilters, patient: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                            className="laudos-paciente-input"
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group lab-filter-actions laudos-flex-buscar">
                        <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                        <button className="lab-btn lab-btn-primary" onClick={handleSearch} disabled={loading} style={{ width: '100%', boxSizing: 'border-box' }}>
                            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                    <div className="lab-filter-item lab-filter-group lab-filter-actions laudos-flex-filtros">
                        <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                        <button 
                            className="lab-btn lab-btn-outline" 
                            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)} 
                            style={{ width: '100%', boxSizing: 'border-box', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            title="Filtros avançados"
                        >
                            <SlidersHorizontal size={16} />
                            <span className="hide-on-mobile">Filtros</span>
                            {isAdvancedFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            
                            {activeFiltersCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-6px', right: '-6px',
                                    background: '#3b82f6', color: '#fff', fontSize: '0.7rem',
                                    fontWeight: 'bold', width: '18px', height: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '50%'
                                }}>
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Painel de Filtros Avançados */}
                {isAdvancedFiltersOpen && (
                    <div style={{
                        marginTop: '0.5rem', padding: '0.75rem 1rem', background: '#fff',
                        border: '1px solid #e2e8f0', borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        animation: 'slideDown 200ms ease-out forwards',
                        transformOrigin: 'top center'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <div className="lab-filter-item lab-filter-group" style={{ margin: 0 }}>
                                <label>Código do Exame</label>
                                <input 
                                    type="text" 
                                    placeholder="Código ou nome..."
                                    value={searchFilters.exam}
                                    onChange={(e) => setSearchFilters({...searchFilters, exam: e.target.value})}
                                    onKeyDown={handleFilterKeyDown}
                                />
                            </div>
                            <div className="lab-filter-item lab-filter-group" style={{ margin: 0 }}>
                                <label>Status</label>
                                <select 
                                    value={searchFilters.status}
                                    onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}
                                >
                                    <option value="AGUARDANDO">Aguardando liberação</option>
                                    <option value="LIBERADO">Liberados</option>
                                    <option value="TODOS">Todos</option>
                                </select>
                            </div>
                            <div className="lab-filter-item lab-filter-group" style={{ margin: 0 }}>
                                <label>Origem do Atendimento</label>
                                <select 
                                    value={searchFilters.attendance_origin}
                                    onChange={(e) => setSearchFilters({...searchFilters, attendance_origin: e.target.value})}
                                >
                                    <option value="">Todos</option>
                                    {ATTENDANCE_ORIGINS.map(origin => (
                                        <option key={origin.value} value={origin.value}>{origin.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {activeFiltersCount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button 
                                    onClick={handleClearAdvancedFilters}
                                    style={{ 
                                        background: 'transparent', border: 'none', color: '#64748b',
                                        fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Layout Principal */}
            <div className="lab-conf-layout">
                
                {/* Coluna Esquerda: Fila */}
                <div className="lab-conf-sidebar">
                    <div className="lab-card lab-queue-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Clock size={18} /> Laudos Encontrados</h3>
                            <span className="lab-badge lab-badge-primary">{groupedProtocols.length} atendimentos / {filteredResults.length} exames</span>
                        </div>
                        <div className="lab-queue-list">
                            {searchResults.length === 0 && !loading && (
                                <div className="text-center p-6 text-gray-500" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                                    <Search size={32} className="text-gray-300" />
                                    <h4 style={{ fontWeight: 600, color: '#475569', fontSize: '1rem', margin: 0 }}>Nenhum laudo encontrado para os filtros informados.</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '250px', lineHeight: '1.4' }}>Ajuste os filtros e clique em Buscar para localizar laudos.</p>
                                </div>
                            )}
                            {searchResults.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`lab-queue-item ${selectedExam?.id === item.id ? 'active' : ''}`}
                                    onClick={() => handleSelectExam(item)}
                                >
                                    <div className="lab-qi-header">
                                        <span className="font-bold text-gray-900">{item.protocolo}</span>
                                        <span className="text-gray-500 text-sm">{item.dataAtendimento}</span>
                                    </div>
                                    <div className="lab-qi-name font-semibold text-primary">{item.pacienteNome}</div>
                                    <div className="lab-qi-meta mt-1">
                                        <span className="font-medium text-gray-800 text-sm">{item.exameCodigo} — {item.exameNome}</span>
                                    </div>
                                    <div className="lab-qi-meta mt-1">
                                        <span className="text-gray-500 text-xs">{item.parametros} parâmetros</span>
                                    </div>
                                    <div className="lab-qi-status mt-2">
                                        <span className={`lab-badge ${item.status === 'LIBERADO' ? 'lab-badge-success' : 'lab-badge-warning'}`}>{item.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Painel de Visualização */}
                <div className="lab-conf-main">
                    
                    {!selectedExam && (
                        <div className="lab-card flex flex-col items-center justify-center p-8 text-center h-full" style={{ minHeight: '400px' }}>
                            <FileText size={48} className="text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700">Selecione um laudo</h3>
                            <p className="text-gray-500 max-w-md mt-2">
                                Selecione um laudo na lista lateral para visualizar os detalhes.
                            </p>
                        </div>
                    )}

                    {selectedExam && (
                        <>
                            {feedbackMsg && (
                                <div className="no-print" style={{
                                    background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                    color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                                    border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    fontWeight: '600', fontSize: '0.85rem', zIndex: 10,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    marginBottom: '1rem', display: 'inline-block'
                                }}>
                                    {feedbackMsg.text}
                                </div>
                            )}

                            {/* Laudo Final View */}
                            <div ref={laudoRef} className="lab-card lab-final-report laudo-print-area" style={{ 
                                background: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px', 
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                position: 'relative'
                            }}>
                                
                                {/* Ações de Tela */}
                                <div className="laudo-view-actions no-print">
                                    {statusReal === 'LIBERADO' && (
                                        <>
                                            <button 
                                                type="button"
                                                className="laudo-view-action-button modern-tooltip"
                                                onClick={() => window.print()}
                                                aria-label="Imprimir"
                                            >
                                                <Printer size={18} strokeWidth={2} />
                                            </button>
                                            <button 
                                                type="button"
                                                className="laudo-view-action-button modern-tooltip"
                                                onClick={handleDownloadPdf}
                                                disabled={generatingPdf}
                                                aria-label="Baixar PDF"
                                            >
                                                {generatingPdf ? <Loader2 size={18} strokeWidth={2} className="spin" /> : <Download size={18} strokeWidth={2} />}
                                            </button>
                                        </>
                                    )}
                                    
                                    {statusReal === 'CONFERIDO' && (
                                        <button 
                                            className="lab-btn-primary" 
                                            onClick={handleLiberar} 
                                            disabled={saving}
                                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                        >
                                            {saving ? <Loader2 size={14} className="spin" style={{ marginRight: '4px' }}/> : <CheckCircle2 size={14} style={{ marginRight: '4px' }} />}
                                            {saving ? 'Liberando...' : 'Liberar Laudo'}
                                        </button>
                                    )}
                                </div>

                                {/* Header do Laudo */}
                                <div className="print-header laudo-screen-header" style={{ padding: '1.5rem 2rem 1rem 2rem', display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(360px, 2.2fr) minmax(150px, 1fr)', alignItems: 'center', gap: '1rem', pageBreakInside: 'avoid', breakInside: 'avoid', borderBottom: '1px solid #cbd5e1', marginBottom: '1.25rem' }}>
                                    
                                    {/* Esquerda: Logo do Laboratório */}
                                    <div className="print-logo-container laudo-screen-header-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                        <img 
                                            src="/logo-laboratorio.png" 
                                            alt="Laboratório Municipal" 
                                            className="laudo-screen-logo-lab"
                                            style={{ width: 'auto', objectFit: 'contain', maxHeight: '80px' }} 
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = '/logo-laboratorio.jpg';
                                            }}
                                        />
                                    </div>

                                    {/* Centro: Título e Status */}
                                    <div className="print-title-box laudo-screen-header-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                        <h2 className="print-title-pref" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>LABORATÓRIO MUNICIPAL</h2>
                                        <p className="print-title-sub" style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.2rem 0 0 0', fontWeight: 500 }}>Sistema Gestão Pública Inteligente</p>
                                        
                                        {/* Status único centralizado */}
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div className={`lab-status-tag ${statusReal === 'LIBERADO' ? 'status-success' : 'status-warning'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>
                                                {statusReal}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Direita: Identidade da Prefeitura */}
                                    <div className="laudo-screen-header-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img 
                                            src="/logo-bezerros.png" 
                                            alt="Prefeitura de Bezerros"
                                            className="laudo-screen-logo-prefeitura"
                                            style={{ width: 'auto', objectFit: 'contain', maxHeight: '44px' }} 
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>

                                {/* Corpo do Laudo */}
                                <div className="print-body" style={{ padding: '0 2rem 1.5rem 2rem' }}>
                                    
                                    {/* Paciente e Atendimento - Bloco Único Compacto */}
                                    <div className="print-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderBottom: '1px solid #cbd5e1', padding: '0.75rem 0.5rem', marginBottom: '1.5rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Paciente:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.pacienteNome}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Médico:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.medico || 'Não informado'}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Origem:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatAttendanceOrigin(selectedExam.attendance_origin)}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Protocolo:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.protocolo}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Data Nasc.:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.pacienteDataNascimento} ({selectedExam.pacienteIdade}) - {selectedExam.pacienteSexo}</span></div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>CNS:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.pacienteCns || '---'}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>CPF:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCpf(selectedExam.pacienteCpf)}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>RG:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.pacienteRg || '---'}</span></div>
                                            <div style={{ fontSize: '0.85rem' }}><strong style={{ color: '#64748b', display: 'inline-block', width: '80px' }}>Emissão:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExam.dataAtendimento}</span></div>
                                        </div>
                                    </div>

                                    {/* Faixa do Exame */}
                                    <div className="print-section" style={{ marginBottom: '0.75rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                        <div style={{ background: '#f8fafc', padding: '0.4rem 1rem', borderLeft: '4px solid #3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                                            <h3 className="print-title-main" style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {selectedExam.exameCodigo} - {selectedExam.exameNome}
                                            </h3>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.75rem', color: '#64748b', paddingLeft: '1rem' }}>
                                            <div><strong>Material:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameMaterial || 'Não inf.'}</span></div>
                                            <div><strong>Método:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameMetodo || 'Não inf.'}</span></div>
                                            <div><strong>Analisador:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameAnalisador || 'Não inf.'}</span></div>
                                        </div>
                                    </div>

                                    {/* Resultados */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        {loadingDetails ? (
                                            <div className="flex justify-center py-8 text-gray-500">
                                                <Loader2 size={24} className="spin" />
                                                <span className="ml-2">Carregando parâmetros...</span>
                                            </div>
                                        ) : examDetails.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">Nenhum parâmetro encontrado para este exame.</div>
                                        ) : (
                                            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8' }}>
                                                <thead style={{ display: 'table-header-group' }}>
                                                    <tr className="print-table-header" style={{ borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'left' }}>
                                                        <th style={{ padding: '0.6rem 1rem', width: '40%' }}>Parâmetro</th>
                                                        <th style={{ padding: '0.6rem 1rem', width: '20%' }}>Resultado</th>
                                                        <th style={{ padding: '0.6rem 1rem', width: '40%' }}>Valor de Referência</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {examDetails.map((param, index) => {
                                                        const displayValue = param.value_numeric !== null ? param.value_numeric : (param.value_text || 'Não informado');
                                                        const abnormalStatus = isAbnormal(param.value_numeric, param.min_value, param.max_value);
                                                        
                                                        const strValue = displayValue.toString();
                                                        const isLongText = (strValue.length > 15 && isNaN(parseFloat(strValue))) || 
                                                            strValue.includes('por campo') || 
                                                            strValue.includes('Ausentes') || 
                                                            strValue.includes('Raras') || 
                                                            strValue.includes('Alguns') ||
                                                            (param.unit && param.unit.includes('por campo'));
                                                        
                                                        return (
                                                            <React.Fragment key={param.id}>
                                                                <tr className="print-table-row" style={{ borderBottom: index < examDetails.length - 1 && !param.observation ? '1px solid #f1f5f9' : 'none', background: index % 2 === 0 ? '#fff' : '#fdfdfd', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                                    <td style={{ padding: '0.4rem 1rem', color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', verticalAlign: 'middle' }}>
                                                                        {param.parameter_name || param.parameter_code}
                                                                    </td>
                                                                    <td style={{ padding: '0.4rem 1rem', verticalAlign: 'middle' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap', lineHeight: '1.2' }}>
                                                                            <span className={`font-bold print-table-result ${isLongText ? 'result-value-long' : ''} ${abnormalStatus !== 'normal' && abnormalStatus !== false ? 'text-danger' : ''}`} style={!isLongText ? { fontSize: '1.05rem', color: abnormalStatus !== 'normal' && abnormalStatus !== false ? '#ef4444' : '#0f172a', wordBreak: 'break-word' } : { color: abnormalStatus !== 'normal' && abnormalStatus !== false ? '#ef4444' : '#0f172a' }}>
                                                                                {displayValue}
                                                                            </span>
                                                                            {param.unit && <span className={isLongText ? 'result-unit-inline' : ''} style={!isLongText ? { color: '#64748b', fontSize: '0.75rem', fontWeight: '500', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' }}>{param.unit}</span>}
                                                                            {abnormalStatus === 'below' && <AlertTriangle size={14} className="text-danger no-print" style={{ marginLeft: '2px' }} title="Abaixo da referência"/>}
                                                                            {abnormalStatus === 'above' && <AlertTriangle size={14} className="text-danger no-print" style={{ marginLeft: '2px' }} title="Acima da referência"/>}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.4rem 1rem', color: '#475569', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.3', verticalAlign: 'middle' }}>
                                                                        {param.reference_text || (param.min_value !== null || param.max_value !== null ? `${param.min_value || 0} a ${param.max_value || '∞'}` : 'Não cadastrada')}
                                                                    </td>
                                                                </tr>
                                                                {/* Observação Específica do Parâmetro */}
                                                                {param.observation && (
                                                                    <tr style={{ borderBottom: index < examDetails.length - 1 ? '1px solid #f1f5f9' : 'none', background: index % 2 === 0 ? '#fff' : '#fdfdfd', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                                        <td colSpan="3" style={{ padding: '0 1rem 0.5rem 1rem' }}>
                                                                            <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid #cbd5e1' }}>
                                                                                <strong>Nota:</strong> {param.observation}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>

                                    {/* Observação Geral */}
                                    {selectedExam.observacaoGeral && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>Observações Gerais</h3>
                                            <div style={{ fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                {selectedExam.observacaoGeral}
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Rodapé do Laudo */}
                                <div className="print-footer" style={{ padding: '1rem 2rem 0.5rem 2rem', borderTop: '2px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                    
                                    <div className="print-footer-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                                        {/* Assinatura */}
                                        <div className="print-signature" style={{ textAlign: 'center', width: '250px' }}>
                                            <div style={{ borderBottom: '1px solid #1e293b', marginBottom: '0.2rem', height: '30px' }}></div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>Biomédico(a)</div>
                                        </div>

                                        {/* Datas técnicas */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>
                                            {selectedExam.typed_at && <div><strong style={{ fontWeight: 600 }}>Digitado em:</strong> {formatDateTime(selectedExam.typed_at)}</div>}
                                            {selectedExam.checked_at && <div><strong style={{ fontWeight: 600 }}>Conferido em:</strong> {formatDateTime(selectedExam.checked_at)}</div>}
                                            {statusReal === 'LIBERADO' && selectedExam.released_at && <div><strong style={{ fontWeight: 600 }}>Liberado em:</strong> {formatDateTime(selectedExam.released_at)}</div>}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.5rem' }}>
                                        Documento gerado pelo Sistema Gestão Pública Inteligente
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LaboratorioLaudos;
