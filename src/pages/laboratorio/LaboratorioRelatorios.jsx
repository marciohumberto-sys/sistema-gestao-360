import React, { useState, useEffect, useRef } from 'react';
import { 
    FileText, Download, Search, Printer, AlertCircle
} from 'lucide-react';
import './LaboratorioRelatorios.css';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { laboratorioConfiguracoesService } from '../../services/api/laboratorioConfiguracoes.service';
import { supabase } from '../../lib/supabase';
import { TODAS_ORIGENS, normalizeString } from '../../utils/laboratorioHelpers';
import ExcelJS from 'exceljs';

const formatDataToBR = (dateString) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
};

const formatAttendanceOrigin = (originValue) => {
    if (!originValue) return '-';
    const origin = TODAS_ORIGENS.find(o => o.value === originValue);
    return origin ? origin.label : originValue;
};

const getTodayFormat = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const LaboratorioRelatorios = () => {
    const [formFilters, setFormFilters] = useState({
        data: getTodayFormat(),
        codigo: '',
        nome: '',
        origem: 'Todas',
        exame: '' // codigo do exame
    });

    const [loading, setLoading] = useState(false);
    const [attendances, setAttendances] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Exams for dropdown
    const [baseExamsList, setBaseExamsList] = useState([]); // dynamic from fetched attendances
    
    // Custom Dropdown State for Origem
    const [isOriginOpen, setIsOriginOpen] = useState(false);
    const [originSearch, setOriginSearch] = useState('');
    const originRef = useRef(null);
    
    // Custom Dropdown State for Exame
    const [isExamOpen, setIsExamOpen] = useState(false);
    const [examSearch, setExamSearch] = useState('');
    const examRef = useRef(null);

    // Totals
    const [totalExames, setTotalExames] = useState(0);

    useEffect(() => {
        // Isolar a regra de impressão (paisagem) exclusivamente para o ciclo de vida desta tela
        const printStyle = document.createElement('style');
        printStyle.id = 'lab-relatorio-print-style';
        printStyle.innerHTML = `@media print { @page { size: A4 landscape; margin: 10mm; } }`;
        document.head.appendChild(printStyle);

        // Click outside to close dropdowns
        const handleClickOutside = (e) => {
            if (originRef.current && !originRef.current.contains(e.target)) {
                setIsOriginOpen(false);
                setOriginSearch('');
            }
            if (examRef.current && !examRef.current.contains(e.target)) {
                setIsExamOpen(false);
                setExamSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            const injected = document.getElementById('lab-relatorio-print-style');
            if (injected) injected.remove(); // Remove ao sair da tela, protegendo Laudos
        };
    }, []);

    const handleBuscar = async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            let allItems = [];
            let cursor = 0;
            let hasMore = true;

            const filtrosAPI = {
                dataInicial: formFilters.data, 
                patient_code: formFilters.codigo, 
                paciente: formFilters.nome
            };
            if (formFilters.origem !== 'Todas') {
                filtrosAPI.attendance_origin = formFilters.origem;
            }

            // Paginação progressiva
            while (hasMore) {
                const res = await laboratorioResultadosService.buscarAtendimentosProgressivos({
                    filtros: filtrosAPI,
                    cursor,
                    limit: 50
                });
                
                if (res.items && res.items.length > 0) {
                    allItems.push(...res.items);
                }
                
                cursor = res.nextCursor;
                hasMore = res.hasMore;
                
                if (allItems.length > 5000) break; // limite seguro
            }

            // DEDUPLICAÇÃO por attendance_id para garantir única linha caso a query progressiva traga itens duplicados na borda da paginação
            const uniqueAttendancesMap = new Map();
            allItems.forEach(a => {
                if (!uniqueAttendancesMap.has(a.id)) {
                    uniqueAttendancesMap.set(a.id, a);
                }
            });
            allItems = Array.from(uniqueAttendancesMap.values());

            let baseExamsForDropdown = [];

            // Fetch Exams for these attendances
            if (allItems.length > 0) {
                const CHUNK_SIZE = 200;
                let examesPorAtendimento = {};
                
                for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
                    const chunk = allItems.slice(i, i + CHUNK_SIZE).map(a => a.id);
                    const { data: attendanceExams, error: errExams } = await supabase
                        .from('lab_attendance_exams')
                        .select('attendance_id, lab_exams(code, name, print_order)')
                        .in('attendance_id', chunk);

                    if (!errExams && attendanceExams) {
                        attendanceExams.forEach(ae => {
                            if (!ae.lab_exams) return;
                            if (!examesPorAtendimento[ae.attendance_id]) {
                                examesPorAtendimento[ae.attendance_id] = [];
                            }
                            examesPorAtendimento[ae.attendance_id].push({
                                code: ae.lab_exams.code,
                                name: ae.lab_exams.name,
                                print_order: ae.lab_exams.print_order || 999
                            });
                        });
                    }
                }

                // Attach exams to attendances and build the global list of exams present TODAY
                const globalExamsMap = new Map();

                allItems.forEach(att => {
                    const examesBrutos = examesPorAtendimento[att.id] || [];
                    const uniqueExamsMap = new Map();
                    
                    examesBrutos.forEach(ex => {
                        // For the attendance list
                        if (!uniqueExamsMap.has(ex.code)) {
                            // HEMO always goes first by tricking print_order
                            const isHemo = ex.code.toUpperCase() === 'HEMO';
                            const sortOrder = isHemo ? -999 : ex.print_order;
                            uniqueExamsMap.set(ex.code, { ...ex, sortOrder });
                        }
                        
                        // For the Global Filter Dropdown
                        if (!globalExamsMap.has(ex.code)) {
                            globalExamsMap.set(ex.code, { code: ex.code, name: ex.name });
                        }
                    });
                    
                    att.examesList = Array.from(uniqueExamsMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
                });
                
                // Store global exams available BEFORE filtering
                baseExamsForDropdown = Array.from(globalExamsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
                setBaseExamsList(baseExamsForDropdown);
            } else {
                setBaseExamsList([]);
            }

            // Local filter by exam if selected
            if (formFilters.exame) {
                allItems = allItems.filter(att => 
                    (att.examesList || []).some(e => e.code === formFilters.exame)
                );
            }

            // Recalculate exams total after filtering
            let distinctTotal = 0;
            allItems.forEach(a => distinctTotal += (a.examesList?.length || 0));
            setTotalExames(distinctTotal);

            // Sorting: Data -> Código Paciente
            allItems.sort((a, b) => {
                const dateA = a.attendance_date || '';
                const dateB = b.attendance_date || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const codeA = a.pacienteCodigo || '';
                const codeB = b.pacienteCodigo || '';
                return codeA.localeCompare(codeB);
            });

            setAttendances(allItems);
        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (attendances.length === 0) return;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Atendimentos', {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });

        // Colunas
        worksheet.columns = [
            { key: 'data', width: 14 },
            { key: 'codigo', width: 15 },
            { key: 'paciente', width: 40 },
            { key: 'origem', width: 22 },
            { key: 'exames', width: 70 }
        ];

        // Títulos e Logo (Excel)
        worksheet.getRow(1).height = 20;
        worksheet.getRow(2).height = 20;
        worksheet.getRow(3).height = 20;
        
        worksheet.mergeCells('A1:E1');
        const title1 = worksheet.getCell('A1');
        title1.value = 'PREFEITURA DE BEZERROS';
        title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF333333' } };
        title1.alignment = { horizontal: 'center', vertical: 'bottom' };

        worksheet.mergeCells('A2:E2');
        const title2 = worksheet.getCell('A2');
        title2.value = 'LABORATÓRIO';
        title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF333333' } };
        title2.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('A3:E3');
        const title3 = worksheet.getCell('A3');
        title3.value = 'RELATÓRIO DE ATENDIMENTOS';
        title3.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF666666' } };
        title3.alignment = { horizontal: 'center', vertical: 'top' };

        try {
            const response = await fetch('/logo-bezerros.png');
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            // Calcula as dimensões reais para manter o aspect ratio original da imagem
            const imgForSize = new Image();
            const objectUrl = URL.createObjectURL(blob);
            await new Promise(resolve => {
                imgForSize.onload = resolve;
                imgForSize.src = objectUrl;
            });
            const aspectRatio = imgForSize.naturalWidth / (imgForSize.naturalHeight || 1);
            URL.revokeObjectURL(objectUrl);

            const targetHeight = 45;
            const targetWidth = targetHeight * aspectRatio;
            
            const logoId = workbook.addImage({
                buffer: arrayBuffer,
                extension: 'png',
            });
            
            worksheet.addImage(logoId, {
                tl: { col: 0.1, row: 0.2 },
                ext: { width: targetWidth, height: targetHeight },
            });
        } catch (e) {
            console.warn('Erro ao inserir logo no Excel', e);
        }

        worksheet.addRow([]); // Espaço

        // Filtros
        worksheet.mergeCells('A4:E4');
        const filterCell = worksheet.getCell('A4');
        filterCell.value = `Data: ${formatDataToBR(formFilters.data)} | Código: ${formFilters.codigo || 'Todos'} | Paciente: ${formFilters.nome || 'Todos'} | Origem: ${formFilters.origem} | Exame: ${formFilters.exame || 'Todos'}`;
        filterCell.font = { name: 'Arial', size: 10, italic: true };
        
        // Resumo
        worksheet.mergeCells('A5:E5');
        const summaryCell = worksheet.getCell('A5');
        summaryCell.value = `${attendances.length} atendimentos | ${totalExames} exames vinculados`;
        summaryCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
        
        worksheet.addRow([]); // Espaço

        // Cabeçalho da tabela
        const headerRow = worksheet.addRow(['DATA', 'CÓD. PACIENTE', 'PACIENTE', 'ORIGEM', 'EXAMES']);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
        });

        // Congelar cabeçalho
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

        // Dados
        attendances.forEach((att, idx) => {
            const examesStr = (att.examesList || []).map(e => e.code).join(', ');
            const row = worksheet.addRow([
                formatDataToBR(att.attendance_date),
                att.pacienteCodigo || '-',
                att.pacienteNome || '-',
                formatAttendanceOrigin(att.attendance_origin),
                examesStr || '-'
            ]);

            const isEven = idx % 2 === 1; // 1-indexed visual zebra
            
            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                cell.alignment = { vertical: 'middle', wrapText: colNumber === 5 }; // wrap text na Exames
                cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
                if (isEven) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            });
        });

        // Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `relatorio_atendimentos_${getTodayFormat()}.xlsx`;
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter Logic for Custom Dropdowns
    const originOptions = [{ value: 'Todas', label: 'Todas' }, ...TODAS_ORIGENS];
    const filteredOrigins = originOptions.filter(o => 
        normalizeString(o.label).includes(normalizeString(originSearch))
    );

    const examOptions = [{ code: '', name: 'Todos' }, ...baseExamsList];
    const filteredExams = examOptions.filter(e => 
        e.code === '' || 
        normalizeString(e.code).includes(normalizeString(examSearch)) || 
        normalizeString(e.name).includes(normalizeString(examSearch))
    );

    return (
        <div className="lab-rel-container">
            {/* Área exclusiva e independente para impressão */}
            <div className="lab-report-print">
                <div className="print-header-modern" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <img 
                            src="/logo-bezerros.png" 
                            alt="Prefeitura" 
                            style={{ width: '110px', height: 'auto', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ textAlign: 'center', margin: '0 0 4px 0' }}>PREFEITURA DE BEZERROS</h2>
                        <h3 style={{ textAlign: 'center', margin: '0 0 4px 0' }}>LABORATÓRIO</h3>
                        <h4 style={{ textAlign: 'center', margin: 0 }}>RELATÓRIO DE ATENDIMENTOS</h4>
                    </div>
                    <div></div> {/* Espaço vazio para manter os títulos perfeitamente centralizados na página */}
                </div>
                
                <div className="print-filters" style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                    <p><strong>Data:</strong> {formatDataToBR(formFilters.data)}</p>
                    {formFilters.codigo && <p><strong>Código:</strong> {formFilters.codigo}</p>}
                    {formFilters.nome && <p><strong>Paciente:</strong> {formFilters.nome}</p>}
                    {formFilters.origem !== 'Todas' && <p><strong>Origem:</strong> {formFilters.origem}</p>}
                    {formFilters.exame && <p><strong>Exame:</strong> {formFilters.exame}</p>}
                </div>

                <div className="print-summary" style={{ textAlign: 'left' }}>
                    <strong>{attendances.length}</strong> atendimentos | <strong>{totalExames}</strong> exames vinculados
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th>DATA</th>
                            <th>CÓD. PACIENTE</th>
                            <th>PACIENTE</th>
                            <th>ORIGEM</th>
                            <th>EXAMES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendances.map((att, idx) => {
                            const dataFormatada = formatDataToBR(att.attendance_date);
                            const examesStr = (att.examesList || []).map(ex => ex.code).join(', ');
                            return (
                                <tr key={att.id || idx}>
                                    <td>{dataFormatada}</td>
                                    <td>{att.pacienteCodigo || '-'}</td>
                                    <td>{att.pacienteNome || '-'}</td>
                                    <td>{formatAttendanceOrigin(att.attendance_origin)}</td>
                                    <td>{examesStr || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="print-footer">
                    Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>

            {/* Header Tela */}
            <header className="lab-rel-header">
                <div>
                    <h1 className="lab-title">Relatórios</h1>
                    <p className="lab-subtitle">Consultas e exportação dos atendimentos realizados pelo laboratório</p>
                </div>
                <div className="lab-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="lab-btn lab-btn-outline" onClick={handlePrint} disabled={attendances.length === 0}>
                        <Printer size={16} /> Imprimir
                    </button>
                    <button className="lab-btn lab-btn-success" onClick={handleExportExcel} disabled={attendances.length === 0}>
                        <Download size={16} /> Excel
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className="lab-rel-filters-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#475569' }}>
                    <Search size={18} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Filtros do relatório</h3>
                </div>
                <div className="lab-rel-filters-grid" style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(120px, 1fr) minmax(200px, 2.5fr) minmax(180px, 2fr) minmax(180px, 2fr) 130px' }}>
                    <div className="lab-filter-item">
                        <label>Data</label>
                        <input 
                            type="date" 
                            value={formFilters.data}
                            onChange={(e) => setFormFilters({...formFilters, data: e.target.value})}
                        />
                    </div>
                    <div className="lab-filter-item">
                        <label>Cód. Paciente</label>
                        <input 
                            type="text" 
                            placeholder="Ex: 115560" 
                            value={formFilters.codigo}
                            onChange={(e) => setFormFilters({...formFilters, codigo: e.target.value})}
                        />
                    </div>
                    <div className="lab-filter-item">
                        <label>Nome do Paciente</label>
                        <input 
                            type="text" 
                            placeholder="Busca parcial"
                            value={formFilters.nome}
                            onChange={(e) => setFormFilters({...formFilters, nome: e.target.value})}
                        />
                    </div>
                    
                    {/* Filtro Origem */}
                    <div className="lab-filter-item" ref={originRef}>
                        <label>Origem</label>
                        <div className="lab-custom-dropdown">
                            <input
                                type="text"
                                placeholder="Todas"
                                value={isOriginOpen ? originSearch : (originOptions.find(o => o.value === formFilters.origem)?.label || 'Todas')}
                                onChange={(e) => {
                                    setOriginSearch(e.target.value);
                                    setIsOriginOpen(true);
                                }}
                                onClick={() => {
                                    setIsOriginOpen(true);
                                    setOriginSearch('');
                                }}
                            />
                            {isOriginOpen && (
                                <div className="lab-custom-dropdown-list">
                                    {filteredOrigins.length > 0 ? filteredOrigins.map(o => (
                                        <div 
                                            key={o.value} 
                                            className={`lab-custom-dropdown-item ${formFilters.origem === o.value ? 'highlighted' : ''}`}
                                            onClick={() => {
                                                setFormFilters({...formFilters, origem: o.value});
                                                setIsOriginOpen(false);
                                            }}
                                        >
                                            {o.label}
                                        </div>
                                    )) : <div className="lab-custom-dropdown-item" style={{color:'#94a3b8'}}>Nenhuma origem encontrada</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filtro Exame */}
                    <div className="lab-filter-item" ref={examRef}>
                        <label>Exame</label>
                        <div className="lab-custom-dropdown">
                            <input
                                type="text"
                                placeholder="Todos"
                                value={isExamOpen ? examSearch : (formFilters.exame ? (baseExamsList.find(e => e.code === formFilters.exame)?.code + ' — ' + baseExamsList.find(e => e.code === formFilters.exame)?.name) : 'Todos')}
                                onChange={(e) => {
                                    setExamSearch(e.target.value);
                                    setIsExamOpen(true);
                                }}
                                onClick={() => {
                                    setIsExamOpen(true);
                                    setExamSearch('');
                                }}
                            />
                            {isExamOpen && (
                                <div className="lab-custom-dropdown-list">
                                    {filteredExams.length > 0 ? filteredExams.map(ex => (
                                        <div 
                                            key={ex.code || 'todos'} 
                                            className={`lab-custom-dropdown-item ${formFilters.exame === ex.code ? 'highlighted' : ''}`}
                                            onClick={() => {
                                                setFormFilters({...formFilters, exame: ex.code});
                                                setIsExamOpen(false);
                                            }}
                                        >
                                            {ex.code === '' ? 'Todos' : `${ex.code} — ${ex.name}`}
                                        </div>
                                    )) : <div className="lab-custom-dropdown-item" style={{color:'#94a3b8'}}>Nenhum exame encontrado</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lab-filter-actions">
                        <button 
                            className="lab-btn lab-btn-primary" 
                            onClick={handleBuscar}
                            disabled={loading}
                        >
                            {loading ? <span className="lab-spinner" style={{width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 6}}></span> : <Search size={16} />}
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Resumo Real */}
            {hasSearched && !loading && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {attendances.length} atendimento{attendances.length !== 1 ? 's' : ''} encontrado{attendances.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {totalExames} exame{totalExames !== 1 ? 's' : ''} vinculado{totalExames !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            {/* Layout Principal do Relatório Atual */}
            <div className="lab-rel-layout">
                <div className="lab-rel-main-panel" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="lab-rel-panel-title">Relatório de Atendimentos</h2>
                            <p className="lab-rel-panel-subtitle">Pacientes atendidos e exames cadastrados na data selecionada</p>
                        </div>
                        {hasSearched && !loading && (
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>{attendances.length} registros</span>
                        )}
                    </div>
                    
                    <div className="lab-rel-table-card" style={{ marginTop: '1rem' }}>
                        <div className="lab-rel-table-wrapper" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                            <table className="lab-rel-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>Data</th>
                                        <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>Cód. Paciente</th>
                                        <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>Paciente</th>
                                        <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>Origem</th>
                                        <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>Exames</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                    <span className="lab-spinner" style={{width: 24, height: 24, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></span>
                                                    <span>Carregando dados reais do banco...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : attendances.length > 0 ? (
                                        attendances.map((att, idx) => {
                                            const dataFormatada = formatDataToBR(att.attendance_date);
                                            const codPaciente = att.pacienteCodigo || '-';
                                            const nomePaciente = att.pacienteNome || '-';
                                            const origemAtendimento = formatAttendanceOrigin(att.attendance_origin);
                                            const examesList = att.examesList || [];

                                            return (
                                                <tr key={att.id || idx}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{dataFormatada}</td>
                                                    <td className="font-semibold text-primary" style={{ fontWeight: '600' }}>{codPaciente}</td>
                                                    <td className="font-bold text-gray-800" style={{ fontWeight: '700' }}>{nomePaciente}</td>
                                                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>{origemAtendimento}</td>
                                                    <td style={{ maxWidth: '350px', lineHeight: '1.8' }}>
                                                        {examesList.length > 0 ? examesList.map(ex => (
                                                            <span 
                                                                key={ex.code} 
                                                                className="lab-exam-badge-compact" 
                                                                title={ex.name}
                                                            >
                                                                {ex.code}
                                                            </span>
                                                        )) : <span style={{ color: '#94a3b8' }}>-</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : hasSearched ? (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                    <AlertCircle size={32} color="#94a3b8" />
                                                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Nenhum atendimento encontrado para os filtros informados.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Search size={32} color="#94a3b8" />
                                                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Preencha os filtros e clique em Buscar para exibir os atendimentos.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default LaboratorioRelatorios;
