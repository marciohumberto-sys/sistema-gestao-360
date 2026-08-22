import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    FileText, Download, Search, Printer, AlertCircle
} from 'lucide-react';
import './LaboratorioRelatorios.css';
import { laboratorioResultadosService } from '../../services/api/laboratorioResultados.service';
import { laboratorioConfiguracoesService } from '../../services/api/laboratorioConfiguracoes.service';
import { supabase } from '../../lib/supabase';
import { TODAS_ORIGENS, normalizeString } from '../../utils/laboratorioHelpers';
import ExcelJS from 'exceljs';

const BPA_CODES = {
  AUR: '0202010120',
  BIL: '0202010201',
  HDL: '0202010279',
  LDL: '0202010287',
  COL: '0202010295',
  CRE: '0202010317',
  GLI: '0202010473',
  GPP: '0202010473',
  TGO: '0202010643',
  TGP: '0202010651',
  TRI: '0202010678',
  URE: '0202010694',
  B12: '0202010708',
  TC: '0202020070',
  TS: '0202020096',
  TPI: '0202031209',
  BHCG: '0202060217',
  TAP: '0202020142',
  VHS: '0202020150',
  HEMO: '0202020380',
  LATEX: '0202030075',
  PCR: '0202030202',
  HIV: '0202030300',
  ASO: '0202030474',
  ASLO: '0202030474',
  HCV: '0202030679',
  HBSAG: '0202030970',
  TROPONINA: '0202031209',
  PAR: '0202040127',
  URI: '0202050017',
  TSH: '0202060250',
  T4: '0202060373',
  T4L: '0202060381'
};

const getBpaCode = (code) => {
    if (!code) return '-';
    const normalized = code.trim().toUpperCase();
    return BPA_CODES[normalized] || '-';
};

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
    const [activeTab, setActiveTab] = useState('periodo'); // 'periodo', 'exame', 'origem'

    const [formFilters, setFormFilters] = useState({
        dataInicial: getTodayFormat(),
        dataFinal: getTodayFormat(),
        codigo: '',
        origem: 'Todas',
        exame: '' // codigo do exame
    });

    const [loading, setLoading] = useState(false);
    
    const [periodResults, setPeriodResults] = useState([]);
    const [examResults, setExamResults] = useState([]);
    const [originResults, setOriginResults] = useState([]);
    
    const attendances = activeTab === 'exames' ? examResults : periodResults;
    
    const attendancesToRender = useMemo(() => {
        if (activeTab !== 'exames') return attendances;
        const flatList = [];
        attendances.forEach(att => {
            const exames = att.examesList || [];
            exames.forEach(ex => {
                if (formFilters.exame && ex.id !== formFilters.exame) return;
                flatList.push({ ...att, exameUnico: ex.code, exameUnicoName: ex.name });
            });
        });
        return flatList;
    }, [attendances, activeTab, formFilters.exame]);
    
    const distinctPatientsCount = useMemo(() => {
        return new Set(attendancesToRender.map(a => a.pacienteCodigo)).size;
    }, [attendancesToRender]);

    const originReportData = useMemo(() => {
        if (activeTab !== 'origem') return [];
        const examCounts = {};
        originResults.forEach(att => {
            const exames = att.examesList || [];
            exames.forEach(ex => {
                if (!examCounts[ex.code]) {
                    examCounts[ex.code] = {
                        codigo_bpa: getBpaCode(ex.code),
                        exame: ex.code,
                        descricao: ex.name,
                        quantidade: 0,
                        distinctPatients: new Set(),
                        sortOrder: ex.print_order || 999
                    };
                }
                examCounts[ex.code].quantidade += 1;
                if (att.pacienteCodigo) {
                    examCounts[ex.code].distinctPatients.add(att.pacienteCodigo);
                }
            });
        });
        const result = Object.values(examCounts).map(item => ({
            ...item,
            pacientes: item.distinctPatients.size
        })).sort((a, b) => a.sortOrder - b.sortOrder);
        return result;
    }, [originResults, activeTab]);

    const totalExamesOrigem = useMemo(() => {
        return originReportData.reduce((acc, curr) => acc + curr.quantidade, 0);
    }, [originReportData]);

    const distinctPatientsOrigem = useMemo(() => {
        if (activeTab !== 'origem') return 0;
        const globalSet = new Set();
        originResults.forEach(att => {
            if (att.pacienteCodigo && att.examesList && att.examesList.length > 0) {
                globalSet.add(att.pacienteCodigo);
            }
        });
        return globalSet.size;
    }, [originResults, activeTab]);

    const [hasSearchedPeriod, setHasSearchedPeriod] = useState(false);
    const [hasSearchedExam, setHasSearchedExam] = useState(false);
    const [hasSearchedOrigin, setHasSearchedOrigin] = useState(false);
    
    const hasSearched = activeTab === 'exames' ? hasSearchedExam : (activeTab === 'origem' ? hasSearchedOrigin : hasSearchedPeriod);
    
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
        if (activeTab === 'exames' && !formFilters.exame) {
            alert('Selecione um exame para gerar o relatório.');
            return;
        }

        setLoading(true);
        if (activeTab === 'exames') setHasSearchedExam(true);
        else if (activeTab === 'origem') setHasSearchedOrigin(true);
        else setHasSearchedPeriod(true);

        try {
            let allItems = [];
            let cursor = 0;
            let hasMore = true;

            const filtrosAPI = {
                dataInicial: formFilters.dataInicial, 
                dataFinal: formFilters.dataFinal,
                patient_code: activeTab !== 'origem' ? formFilters.codigo : ''
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
                const CHUNK_SIZE = 50;
                let examesPorAtendimento = {};
                
                for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
                    const chunk = allItems.slice(i, i + CHUNK_SIZE).map(a => a.id);
                    const { data: attendanceExams, error: errExams } = await supabase
                        .from('lab_attendance_exams')
                        .select('attendance_id, lab_exams(id, code, name, print_order)')
                        .in('attendance_id', chunk);

                    if (!errExams && attendanceExams) {
                        attendanceExams.forEach(ae => {
                            if (!ae.lab_exams) return;
                            if (!examesPorAtendimento[ae.attendance_id]) {
                                examesPorAtendimento[ae.attendance_id] = [];
                            }
                            examesPorAtendimento[ae.attendance_id].push({
                                id: ae.lab_exams.id,
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
                            globalExamsMap.set(ex.code, { id: ex.id, code: ex.code, name: ex.name });
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
            if (formFilters.exame && activeTab !== 'origem') {
                allItems = allItems.filter(att => 
                    (att.examesList || []).some(e => e.id === formFilters.exame)
                );
            }

            // Sorting: Data -> Código Paciente
            allItems.sort((a, b) => {
                const dateA = a.attendance_date || '';
                const dateB = b.attendance_date || '';
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                const codeA = a.pacienteCodigo || '';
                const codeB = b.pacienteCodigo || '';
                return codeA.localeCompare(codeB);
            });

            if (activeTab === 'exames') {
                setExamResults(allItems);
            } else if (activeTab === 'origem') {
                setOriginResults(allItems);
            } else {
                setPeriodResults(allItems);
                
                // Recalculate exams total after filtering
                let distinctTotal = 0;
                allItems.forEach(a => distinctTotal += (a.examesList?.length || 0));
                setTotalExames(distinctTotal);
            }
        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if ((activeTab === 'origem' && originReportData.length === 0) || (activeTab !== 'origem' && attendancesToRender.length === 0)) return;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatorio', {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });

        // Colunas
        if (activeTab === 'origem') {
            worksheet.columns = [
                { key: 'codigo', width: 15 },
                { key: 'exame', width: 20 },
                { key: 'descricao', width: 70 },
                { key: 'pacientes', width: 15 },
                { key: 'quantidade', width: 15 }
            ];
        } else {
            worksheet.columns = [
                { key: 'data', width: 14 },
                { key: 'codigo', width: 15 },
                { key: 'paciente', width: 40 },
                { key: 'origem', width: 22 },
                { key: 'exame', width: activeTab === 'exames' ? 20 : 70 }
            ];
        }

        // Títulos e Logo (Excel)
        worksheet.getRow(1).height = 20;
        worksheet.getRow(2).height = 20;
        worksheet.getRow(3).height = 20;
        
        const lastCol = activeTab === 'origem' ? 'D' : 'E';
        worksheet.mergeCells(`A1:${lastCol}1`);
        const title1 = worksheet.getCell('A1');
        title1.value = 'PREFEITURA DE BEZERROS';
        title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF333333' } };
        title1.alignment = { horizontal: 'center', vertical: 'bottom' };

        worksheet.mergeCells(`A2:${lastCol}2`);
        const title2 = worksheet.getCell('A2');
        title2.value = 'LABORATÓRIO';
        title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF333333' } };
        title2.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells(`A3:${lastCol}3`);
        const title3 = worksheet.getCell('A3');
        title3.value = activeTab === 'origem' ? 'RELATÓRIO TOTAL DE EXAMES POR ORIGEM' : 'RELATÓRIO DE ATENDIMENTOS';
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
        worksheet.mergeCells(`A4:${lastCol}4`);
        const filterCell = worksheet.getCell('A4');
        const filterText = activeTab === 'origem' 
            ? `Período: ${formatDataToBR(formFilters.dataInicial)} a ${formatDataToBR(formFilters.dataFinal)} | Origem: ${formFilters.origem}`
            : `Data Incial: ${formatDataToBR(formFilters.dataInicial)} | Data Final: ${formatDataToBR(formFilters.dataFinal)} | Código: ${formFilters.codigo || 'Todos'} | Origem: ${formFilters.origem} | Exame: ${formFilters.exame ? baseExamsList.find(e=>e.id===formFilters.exame)?.code : 'Todos'}`;
        filterCell.value = filterText;
        filterCell.font = { name: 'Arial', size: 10, italic: true };
        
        // Resumo
        worksheet.mergeCells(`A5:${lastCol}5`);
        const summaryCell = worksheet.getCell('A5');
        summaryCell.value = activeTab === 'origem' 
            ? `${totalExamesOrigem} exames encontrados | ${originReportData.length} tipos de exame | ${distinctPatientsOrigem} pacientes distintos` 
            : `${attendancesToRender.length} registros | ${activeTab === 'exames' ? distinctPatientsCount + ' pacientes' : totalExames + ' exames vinculados'}`;
        summaryCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
        
        worksheet.addRow([]); // Espaço

        // Cabeçalho da tabela
        const headers = activeTab === 'origem' 
            ? ['CÓDIGO', 'EXAME', 'DESCRIÇÃO', 'PACIENTES', 'QUANTIDADE']
            : ['DATA', 'CÓD. PACIENTE', 'PACIENTE', 'ORIGEM', activeTab === 'exames' ? 'EXAME' : 'EXAMES'];
            
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: activeTab === 'origem' && (cell.col === 4 || cell.col === 5) ? 'right' : 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
        });

        // Congelar cabeçalho
        worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

        // Dados
        if (activeTab === 'origem') {
            originReportData.forEach((item, idx) => {
                const row = worksheet.addRow([
                    item.codigo_bpa,
                    item.exame,
                    item.descricao,
                    item.pacientes,
                    item.quantidade
                ]);
                const isEven = idx % 2 === 1; // 1-indexed visual zebra
                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.alignment = { vertical: 'middle', horizontal: (colNumber === 4 || colNumber === 5) ? 'right' : 'left' };
                    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
                    if (colNumber === 1) {
                        cell.numFmt = '@';
                    }
                    if (isEven) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                });
            });
            const totalRow = worksheet.addRow(['', '', '', 'TOTAL DE EXAMES', totalExamesOrigem]);
            totalRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
                cell.alignment = { vertical: 'middle', horizontal: colNumber === 5 ? 'right' : 'left' };
                cell.border = { top: { style: 'medium', color: { argb: 'FFCBD5E1' } } };
            });
        } else {
            attendancesToRender.forEach((att, idx) => {
                const examesStr = activeTab === 'exames' ? att.exameUnico : (att.examesList || []).map(e => e.code).join(', ');
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
                    cell.alignment = { vertical: 'middle', wrapText: colNumber === 5 };
                    cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
                    if (isEven) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                });
            });
        }

        // Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `relatorio_${activeTab}_${getTodayFormat()}.xlsx`;
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
                        <h4 style={{ textAlign: 'center', margin: 0 }}>
                            {activeTab === 'origem' ? 'RELATÓRIO TOTAL DE EXAMES POR ORIGEM' : 'RELATÓRIO DE ATENDIMENTOS'}
                        </h4>
                    </div>
                    <div></div> {/* Espaço vazio para manter os títulos perfeitamente centralizados na página */}
                </div>
                
                {activeTab === 'origem' ? (
                    <div className="print-filters" style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                        <p><strong>Período:</strong> {formatDataToBR(formFilters.dataInicial)} a {formatDataToBR(formFilters.dataFinal)}</p>
                        <p><strong>Origem:</strong> {formFilters.origem}</p>
                    </div>
                ) : (
                    <div className="print-filters" style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
                        <p><strong>De:</strong> {formatDataToBR(formFilters.dataInicial)}</p>
                        <p><strong>Até:</strong> {formatDataToBR(formFilters.dataFinal)}</p>
                        {formFilters.codigo && <p><strong>Código:</strong> {formFilters.codigo}</p>}
                        {formFilters.origem !== 'Todas' && <p><strong>Origem:</strong> {formFilters.origem}</p>}
                        {formFilters.exame && <p><strong>Exame:</strong> {baseExamsList.find(e=>e.id===formFilters.exame)?.code || formFilters.exame}</p>}
                    </div>
                )}

                <div className="print-summary" style={{ textAlign: 'left' }}>
                    {activeTab === 'origem' ? (
                        <><strong>{totalExamesOrigem}</strong> exames encontrados | <strong>{originReportData.length}</strong> tipos de exame | <strong>{distinctPatientsOrigem}</strong> pacientes distintos</>
                    ) : (
                        <><strong>{attendancesToRender.length}</strong> registros encontrados | <strong>{activeTab === 'exames' ? distinctPatientsCount + ' pacientes distintos' : totalExames + ' exames vinculados'}</strong></>
                    )}
                </div>

                <table className="print-table">
                    <thead>
                        {activeTab === 'origem' ? (
                            <tr>
                                <th>CÓDIGO</th>
                                <th>EXAME</th>
                                <th>DESCRIÇÃO</th>
                                <th style={{ textAlign: 'right' }}>PACIENTES</th>
                                <th style={{ textAlign: 'right' }}>QUANTIDADE</th>
                            </tr>
                        ) : (
                            <tr>
                                <th>DATA</th>
                                <th>CÓD. PACIENTE</th>
                                <th>PACIENTE</th>
                                <th>ORIGEM</th>
                                {activeTab === 'exames' ? <th>EXAME</th> : <th>EXAMES</th>}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {activeTab === 'origem' ? (
                            <>
                                {originReportData.map((item, idx) => (
                                    <tr key={item.exame}>
                                        <td>{item.codigo_bpa}</td>
                                        <td>{item.exame}</td>
                                        <td>{item.descricao}</td>
                                        <td style={{ textAlign: 'right' }}>{item.pacientes}</td>
                                        <td style={{ textAlign: 'right' }}>{item.quantidade}</td>
                                    </tr>
                                ))}
                                <tr style={{ fontWeight: 'bold' }}>
                                    <td colSpan={4} style={{ borderTop: '2px solid #333' }}>TOTAL DE EXAMES</td>
                                    <td style={{ textAlign: 'right', borderTop: '2px solid #333' }}>{totalExamesOrigem.toLocaleString('pt-BR')}</td>
                                </tr>
                            </>
                        ) : (
                            attendancesToRender.map((att, idx) => {
                                const dataFormatada = formatDataToBR(att.attendance_date);
                                const examesStr = (att.examesList || []).map(ex => ex.code).join(', ');
                                return (
                                    <tr key={att.id + (activeTab === 'exames' ? att.exameUnico : '')}>
                                        <td>{dataFormatada}</td>
                                        <td>{att.pacienteCodigo || '-'}</td>
                                        <td>{att.pacienteNome || '-'}</td>
                                        <td>{formatAttendanceOrigin(att.attendance_origin)}</td>
                                        {activeTab === 'exames' ? <td>{att.exameUnico}</td> : <td>{examesStr || '-'}</td>}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                <div className="print-footer">
                    Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>

            {/* Header Tela */}
            <header className="lab-rel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                        <h1 className="lab-title">Relatórios</h1>
                        <p className="lab-subtitle">Consultas e exportação dos atendimentos realizados pelo laboratório</p>
                    </div>
                    <div className="lab-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="lab-btn lab-btn-outline" onClick={handlePrint} disabled={activeTab === 'origem' ? originReportData.length === 0 : attendances.length === 0}>
                            <Printer size={16} /> Imprimir
                        </button>
                        <button className="lab-btn lab-btn-success" onClick={handleExportExcel} disabled={activeTab === 'origem' ? originReportData.length === 0 : attendances.length === 0}>
                            <Download size={16} /> Excel
                        </button>
                    </div>
                </div>

                <div className="lab-rel-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0', width: '100%' }}>
                    <button 
                        type="button"
                        className={`lab-rel-tab ${activeTab === 'periodo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('periodo')}
                        style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', borderBottom: activeTab === 'periodo' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'periodo' ? '#2563eb' : '#64748b', fontWeight: activeTab === 'periodo' ? '600' : '500', cursor: 'pointer', fontSize: '0.95rem' }}
                    >
                        Pacientes por Período
                    </button>
                    <button 
                        type="button"
                        className={`lab-rel-tab ${activeTab === 'exames' ? 'active' : ''}`}
                        onClick={() => setActiveTab('exames')}
                        style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', borderBottom: activeTab === 'exames' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'exames' ? '#2563eb' : '#64748b', fontWeight: activeTab === 'exames' ? '600' : '500', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Pacientes por Exame
                    </button>
                    <button 
                        type="button"
                        className={`lab-rel-tab ${activeTab === 'origem' ? 'active' : ''}`}
                        onClick={() => setActiveTab('origem')}
                        style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', borderBottom: activeTab === 'origem' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'origem' ? '#2563eb' : '#64748b', fontWeight: activeTab === 'origem' ? '600' : '500', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Total Exames por Origem
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className="lab-rel-filters-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#475569' }}>
                    <Search size={18} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Filtros do relatório</h3>
                </div>
                <div className="lab-rel-filters-grid" style={{ gridTemplateColumns: activeTab === 'origem' ? 'minmax(180px, 1.2fr) minmax(180px, 1.2fr) minmax(220px, 2fr) 150px' : 'minmax(140px, 1.2fr) minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(180px, 1.5fr) minmax(180px, 1.5fr) 130px', alignItems: 'end' }}>
                    <div className="lab-filter-item">
                        <label>Data inicial</label>
                        <input 
                            type="date" 
                            value={formFilters.dataInicial}
                            onChange={(e) => setFormFilters({...formFilters, dataInicial: e.target.value})}
                        />
                    </div>
                    <div className="lab-filter-item">
                        <label>Data final</label>
                        <input 
                            type="date" 
                            value={formFilters.dataFinal}
                            onChange={(e) => setFormFilters({...formFilters, dataFinal: e.target.value})}
                        />
                    </div>

                    {activeTab !== 'origem' && (
                        <div className="lab-filter-item">
                            <label>Cód. Paciente</label>
                            <input 
                                type="text" 
                                placeholder="Apenas números..." 
                                value={formFilters.codigo}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormFilters({...formFilters, codigo: val});
                                }}
                            />
                        </div>
                    )}
                    
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
                    {activeTab !== 'origem' && (
                        <div className="lab-filter-item" ref={examRef}>
                            <label>Exame</label>
                            <div className="lab-custom-select" onClick={() => setIsExamOpen(!isExamOpen)}>
                                <span>{formFilters.exame ? baseExamsList.find(e => e.id === formFilters.exame)?.name || 'Desconhecido' : 'Opcional (Todos)'}</span>
                                <span className={`lab-select-arrow ${isExamOpen ? 'open' : ''}`}>▼</span>
                            </div>
                            
                            {isExamOpen && (
                                <div className="lab-dropdown-menu">
                                    <div className="lab-dropdown-search">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar exame..." 
                                            value={examSearch}
                                            onChange={(e) => setExamSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="lab-dropdown-options">
                                        <div 
                                            className={`lab-dropdown-option ${!formFilters.exame ? 'selected' : ''}`}
                                            onClick={() => {
                                                setFormFilters({...formFilters, exame: ''});
                                                setIsExamOpen(false);
                                                setExamSearch('');
                                            }}
                                        >
                                            Todos
                                        </div>
                                        {filteredExams.map(ex => (
                                            <div 
                                                key={ex.id}
                                                className={`lab-dropdown-option ${formFilters.exame === ex.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setFormFilters({...formFilters, exame: ex.id});
                                                    setIsExamOpen(false);
                                                    setExamSearch('');
                                                }}
                                            >
                                                {ex.code} — {ex.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                    {activeTab === 'origem' ? (
                        <>
                            <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                                {totalExamesOrigem.toLocaleString('pt-BR')} exame{totalExamesOrigem !== 1 ? 's' : ''} encontrado{totalExamesOrigem !== 1 ? 's' : ''}
                            </div>
                            <div style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                                {originReportData.length} tipo{originReportData.length !== 1 ? 's' : ''} de exame{originReportData.length !== 1 ? 's' : ''}
                            </div>
                            <div style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                                {distinctPatientsOrigem.toLocaleString('pt-BR')} paciente{distinctPatientsOrigem !== 1 ? 's' : ''} distinto{distinctPatientsOrigem !== 1 ? 's' : ''}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                                {attendancesToRender.length} registro{attendancesToRender.length !== 1 ? 's' : ''} encontrado{attendancesToRender.length !== 1 ? 's' : ''}
                            </div>
                            <div style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600' }}>
                                {activeTab === 'exames' ? `${distinctPatientsCount} paciente${distinctPatientsCount !== 1 ? 's' : ''} distinto${distinctPatientsCount !== 1 ? 's' : ''}` : `${totalExames} exame${totalExames !== 1 ? 's' : ''} vinculado${totalExames !== 1 ? 's' : ''}`}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Layout Principal do Relatório Atual */}
            <div className="lab-rel-layout">
                <div className="lab-rel-main-panel" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="lab-rel-panel-title">
                                {activeTab === 'origem' ? 'Total de Exames por Origem' : 'Relatório de Atendimentos'}
                            </h2>
                            <p className="lab-rel-panel-subtitle">
                                {activeTab === 'origem' 
                                    ? 'Quantidade de exames realizados por tipo de procedimento.' 
                                    : 'Pacientes atendidos e exames vinculados aos filtros selecionados.'}
                            </p>
                        </div>
                        {hasSearched && !loading && activeTab !== 'origem' && (
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                {attendancesToRender.length} registros
                            </span>
                        )}
                    </div>
                    <div className="lab-rel-table-card" style={{ marginTop: '1rem' }}>
                        <div className="lab-rel-table-wrapper" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                            <table className="lab-rel-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                    {activeTab === 'origem' ? (
                                        <>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>CÓDIGO</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>EXAME</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc', width: '100%' }}>DESCRIÇÃO</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>PACIENTES</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>QUANTIDADE</th>
                                        </>
                                    ) : (
                                        <>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>DATA</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>CÓD. PACIENTE</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc', width: '40%' }}>PACIENTE</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>DT. NASC.</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>MÉDICO</th>
                                            <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>ORIGEM</th>
                                            {activeTab === 'exames' && <th style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>EXAME</th>}
                                        </>
                                    )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={activeTab === 'origem' ? 5 : (activeTab === 'exames' ? 7 : 6)} style={{ textAlign: 'center', padding: '3rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                    <span className="lab-spinner" style={{width: 24, height: 24, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></span>
                                                    <span>Carregando dados...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : hasSearched && ((activeTab === 'origem' && originReportData.length === 0) || (activeTab !== 'origem' && attendancesToRender.length === 0)) ? (
                                        <tr>
                                            <td colSpan={activeTab === 'origem' ? 5 : (activeTab === 'exames' ? 7 : 6)} style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                    <AlertCircle size={32} color="#94a3b8" />
                                                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>Nenhum resultado encontrado.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : hasSearched ? (
                                        activeTab === 'origem' ? (
                                            <>
                                                {originReportData.map((item, idx) => (
                                                    <tr key={item.exame} className={idx % 2 === 0 ? 'lab-row-even' : 'lab-row-odd'}>
                                                        <td>{item.codigo_bpa}</td>
                                                        <td style={{ fontWeight: '500' }}>{item.exame}</td>
                                                        <td>{item.descricao}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{item.pacientes}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{item.quantidade}</td>
                                                    </tr>
                                                ))}
                                                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                                    <td colSpan={4} style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', paddingBottom: '12px' }}>TOTAL DE EXAMES</td>
                                                    <td style={{ textAlign: 'right', borderTop: '2px solid #e2e8f0', paddingTop: '12px', paddingBottom: '12px' }}>{totalExamesOrigem.toLocaleString('pt-BR')}</td>
                                                </tr>
                                            </>
                                        ) : (
                                            attendancesToRender.map((att, index) => {
                                                const isEven = index % 2 === 0;
                                                const examesList = att.examesList || [];
                                                return (
                                                    <React.Fragment key={att.id + (activeTab === 'exames' ? att.exameUnico : '')}>
                                                        <tr className={isEven ? 'lab-row-even' : 'lab-row-odd'} style={{ borderBottom: activeTab === 'periodo' ? 'none' : undefined }}>
                                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDataToBR(att.attendance_date)}</td>
                                                            <td style={{ fontWeight: '600', color: '#2563eb' }}>{att.pacienteCodigo || '-'}</td>
                                                            <td style={{ fontWeight: '700', color: '#1e293b' }}>{att.pacienteNome || '-'}</td>
                                                            <td>{formatDataToBR(att.pacienteNascimento)}</td>
                                                            <td style={{ maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.medico || '-'}>{att.medico || '-'}</td>
                                                            <td style={{ fontSize: '0.85rem' }}>
                                                                <span className="lab-badge-origin">{formatAttendanceOrigin(att.attendance_origin)}</span>
                                                            </td>
                                                            {activeTab === 'exames' && <td style={{ fontWeight: 'bold' }}>{att.exameUnico}</td>}
                                                        </tr>
                                                        {activeTab === 'periodo' && (
                                                            <tr className={isEven ? 'lab-row-even' : 'lab-row-odd'}>
                                                                <td colSpan="6" style={{ padding: '4px 12px 12px 12px', fontSize: '0.8rem', color: '#475569', borderTop: 'none' }}>
                                                                    {examesList.length > 0 ? (
                                                                        <>
                                                                            <span style={{ fontWeight: '600' }}>Exames:</span>{' '}
                                                                            {examesList.map((ex, i) => (
                                                                                <React.Fragment key={ex.code}>
                                                                                    <span>{ex.code}</span>
                                                                                    {i < examesList.length - 1 && <span style={{ margin: '0 4px', color: '#9ca3af' }}>|</span>}
                                                                                </React.Fragment>
                                                                            ))}
                                                                        </>
                                                                    ) : (
                                                                        <span style={{ color: '#94a3b8' }}>Nenhum exame vinculado</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )
                                    ) : (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Search size={32} color="#94a3b8" />
                                                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>
                                                        {activeTab === 'origem' 
                                                            ? 'Preencha os filtros e clique em Buscar para exibir os exames.'
                                                            : 'Preencha os filtros e clique em Buscar para exibir os atendimentos.'}
                                                    </span>
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
