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

// ==============================================================
// LÓGICAS EXCLUSIVAS DO HEMOGRAMA COMPACTO
// ==============================================================
const HEMO_GROUPS = {
  eritrograma: ['HEMACIAS', 'HEMOGLOBINA', 'HEMATOCRITO', 'HCM', 'VCM', 'CHCM', 'RDW'],
  leucograma: ['LEUCOCITOS', 'MIELOCITOS', 'METAMIELOCITOS', 'BASTONETES', 'SEGMENTADOS', 'EOSINOFILOS', 'BASOFILOS', 'LINFOCITOS_TIPICOS', 'LINFOCITOS_ATIPICOS', 'MONOCITOS', 'PLASMOCITOS'],
  plaquetas: ['PLAQUETAS'],
  observacoes: ['OBS_ERITROGRAMA', 'SERIE_ERITROCITARIA', 'SERIE_LEUCOCITARIA', 'SERIE_PLAQUETARIA']
};

const HEMO_PERCENTUAL_CODES = [
  'MIELOCITOS', 'METAMIELOCITOS', 'BASTONETES', 'SEGMENTADOS', 
  'EOSINOFILOS', 'BASOFILOS', 'LINFOCITOS_TIPICOS', 'LINFOCITOS_ATIPICOS', 
  'MONOCITOS', 'PLASMOCITOS'
];

const HEMO_INTEGER_COUNT_CODES = new Set([
  'LEUCOCITOS',
  'PLAQUETAS'
]);

function parseHemoNumber(valueStr, parameterCode) {
    if (valueStr === null || valueStr === undefined) return NaN;
    let str = String(valueStr).trim();
    
    str = str.replace(/(?:milhões\/mm³|milhões\/mm3|milhões|unidade\s*real|\/mm³|\/mm3|mm³|mm3|%|pg|fL|g\/dL)/gi, '');
    
    if (/[<>≤≥a-zA-Z]/.test(str)) {
       str = str.replace(/[a-zA-Z<>≤≥\s]/g, ''); 
    } else {
       str = str.replace(/[a-zA-Z\s]/g, ''); 
    }
    if (str === '') return NaN;

    const normalizedCode = String(parameterCode ?? '').trim().toUpperCase();

    if (HEMO_INTEGER_COUNT_CODES.has(normalizedCode)) {
        if (str.includes(',')) return NaN;
        return parseInt(str.replace(/\./g, ''), 10);
    }

    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) return parseFloat(str.replace(/\./g, ''));
    return parseFloat(str);
}

function formatHemoResultValue(valueStr, parameterCode) {
    if (valueStr === null || valueStr === undefined || valueStr === '') return '';
    let str = String(valueStr).trim();
    if (str === '') return '';

    if (HEMO_INTEGER_COUNT_CODES.has(parameterCode)) {
        const num = parseInt(str.replace(/[\.,]/g, ''), 10);
        if (!isNaN(num)) return new Intl.NumberFormat('pt-BR').format(num);
    } else {
        if (!isNaN(parseFloat(str.replace(',', '.')))) {
            return str.replace('.', ',');
        }
    }
    return str;
}

function formatHemoReferenceText(refStr, parameterCode, stripUnits = true) {
    if (!refStr) return '';
    let formatted = refStr;
    formatted = formatted.replace(/\b(\d+(?:[\.,]\d+)?)\b/g, (match) => {
        if (HEMO_INTEGER_COUNT_CODES.has(parameterCode)) {
            const num = parseInt(match.replace(/[\.,]/g, ''), 10);
            if (!isNaN(num)) return new Intl.NumberFormat('pt-BR').format(num);
        } else {
            return match.replace('.', ',');
        }
        return match;
    });
    formatted = formatted.replace(/\s+-\s+/g, ' – ');
    
    if (stripUnits) {
        formatted = formatted.replace(/(?:milhões\/mm³|milhões\/mm3|milhões|unidade\s*real|\/mm³|\/mm3|mm³|mm3|%|pg|fL|g\/dL)/gi, '').trim();
    }
    return formatted;
}

function resolveHemoReference(parameterCode, referenceText, patientAgeDays, patientSexGroup) {
    if (!referenceText) return { text: "Referência não determinada", valid: false };
    if (referenceText.toLowerCase().includes('campo livre')) return { text: "Sem valor de referência numérico", valid: false, isText: true };

    const lines = referenceText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    let relativeVal = null;
    let absoluteVal = null;
    let fixedMatched = false;
    
    if (lines.length >= 2) {
        if (lines[0].toLowerCase().includes('valor relativo') && lines[1].toLowerCase().includes('valor absoluto')) {
            relativeVal = lines[0].substring(lines[0].indexOf(':') + 1).trim();
            absoluteVal = lines[1].substring(lines[1].indexOf(':') + 1).trim();
            fixedMatched = true;
        }
    }
    
    if (fixedMatched) {
        const relNum = parseHemoNumber(relativeVal, parameterCode);
        const absNum = parseHemoNumber(absoluteVal, parameterCode);
        return {
            text: `${lines[0]} | ${lines[1]}`,
            displayLines: [
                { text: `Valor relativo: ${formatHemoReferenceText(relativeVal, parameterCode)}`, highlight: false },
                { text: `Valor absoluto: ${formatHemoReferenceText(absoluteVal, parameterCode)}`, highlight: false }
            ],
            valid: !isNaN(relNum) && !isNaN(absNum),
            relMin: relNum, relMax: relNum,
            absMin: absNum, absMax: absNum,
            isFixed: true,
            isText: false
        };
    }

    let matchedLine = null;
    let ageIdx = -1;

    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        let matches = false;
        
        if (lower.startsWith('recém-nascido') || lower.startsWith('recem-nascido')) {
            if (patientAgeDays <= 89) matches = true; 
        } else if (lower.startsWith('3 meses a 1 ano')) {
            if (patientAgeDays >= 90 && patientAgeDays <= 729) matches = true; 
        } else if (lower.startsWith('2 a 4 anos')) {
            if (patientAgeDays >= 730 && patientAgeDays <= 1824) matches = true; 
        } else if (lower.startsWith('5 a 11 anos')) {
            if (patientAgeDays >= 1825 && patientAgeDays <= 4744) matches = true; 
        } else if (lower.startsWith('13 a 18 anos')) {
            if (patientAgeDays >= 4745 && patientAgeDays <= 6934) matches = true; 
        } else if (lower.startsWith('maiores de 18 anos') || lower.startsWith('adultos')) {
            if (patientAgeDays >= 6935) matches = true;
        }

        if (matches) {
            matchedLine = lines[i];
            ageIdx = i;
            break;
        }
    }

    if (!matchedLine) {
        if (lines.length === 1 && !lines[0].includes('anos') && !lines[0].includes('nascido')) {
            matchedLine = lines[0];
        } else {
            return { text: "Referência não determinada", valid: false, isText: false };
        }
    }

    let finalRefStr = matchedLine.substring(matchedLine.indexOf(':') + 1).trim();
    let displayLines = null;
    
    if (ageIdx !== -1 && finalRefStr === '') {
        let genderMatched = false;
        let maleStr = '';
        let femaleStr = '';
        for (let j = ageIdx + 1; j < lines.length; j++) {
            const gLine = lines[j];
            if (gLine.toLowerCase().startsWith('homens:')) {
                maleStr = gLine.substring(gLine.indexOf(':') + 1).trim();
            } else if (gLine.toLowerCase().startsWith('mulheres:')) {
                femaleStr = gLine.substring(gLine.indexOf(':') + 1).trim();
            } else if (gLine === '' || gLine.toLowerCase().startsWith('homens:') || gLine.toLowerCase().startsWith('mulheres:')) {
                continue;
            } else {
                break;
            }
        }
        
        if (maleStr && femaleStr) {
            displayLines = [
                { text: formatHemoReferenceText(maleStr, parameterCode), highlight: patientSexGroup === 'MALE', isMale: true },
                { text: formatHemoReferenceText(femaleStr, parameterCode), highlight: patientSexGroup === 'FEMALE', isFemale: true }
            ];
        }
        
        if (patientSexGroup === 'MALE' && maleStr) {
            finalRefStr = maleStr;
            genderMatched = true;
        } else if (patientSexGroup === 'FEMALE' && femaleStr) {
            finalRefStr = femaleStr;
            genderMatched = true;
        }
        
        if (!genderMatched) return { text: "Referência não determinada", valid: false, reason: "Sexo ausente", isText: false };
    }

    if (!finalRefStr) return { text: "Referência não determinada", valid: false, isText: false };

    const parts = finalRefStr.split('|');
    const parseRange = (str) => {
        const p = str.split('-');
        if (p.length >= 2) return { min: parseHemoNumber(p[0], parameterCode), max: parseHemoNumber(p[1], parameterCode), str: str.trim() };
        if (p.length === 1) {
            const v = parseHemoNumber(p[0], parameterCode);
            if (!isNaN(v)) return { min: v, max: v, str: str.trim() };
        }
        return null;
    };

    if (parts.length === 2) {
        const relR = parseRange(parts[0]);
        const absR = parseRange(parts[1]);
        if (relR && absR) {
            return {
                text: finalRefStr,
                displayLines: displayLines || [
                    { text: formatHemoReferenceText(parts[0].trim(), parameterCode), highlight: false, isRel: true },
                    { text: formatHemoReferenceText(parts[1].trim(), parameterCode), highlight: false, isAbs: true }
                ],
                valid: true,
                relMin: relR.min, relMax: relR.max,
                absMin: absR.min, absMax: absR.max,
                isFixed: (relR.min === relR.max) || (absR.min === absR.max),
                isText: false
            };
        }
    } else {
        const r = parseRange(finalRefStr);
        if (r) {
            return {
                text: finalRefStr,
                displayLines: displayLines || [
                    { text: formatHemoReferenceText(finalRefStr, parameterCode), highlight: false, isSingle: true }
                ],
                valid: true,
                relMin: r.min, relMax: r.max,
                absMin: null, absMax: null,
                isFixed: r.min === r.max,
                isText: false
            };
        }
    }
    
    return { text: finalRefStr, valid: false, isText: false };
}

const GraficoHemo = ({ value, min, max, parameterCode }) => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        return <div style={{ width: '100%', minWidth: '60px' }}></div>;
    }
    
    const GRAPH_NORMAL_START = 20;
    const GRAPH_NORMAL_END = 80;
    
    const clinicalRatio = (value - min) / (max - min);
    
    let markerPosition = GRAPH_NORMAL_START + clinicalRatio * (GRAPH_NORMAL_END - GRAPH_NORMAL_START);
    
    if (markerPosition < 0) markerPosition = 0;
    if (markerPosition > 100) markerPosition = 100;
    
    const isBelow = value < min;
    const isAbove = value > max;

    return (
        <div style={{ width: '100%', maxWidth: '80px', height: '12px', position: 'relative', display: 'flex', alignItems: 'center', margin: '0 auto' }}>
            <div style={{ position: 'absolute', width: '100%', height: '1px', background: '#94a3b8', top: '50%' }}></div>
            <div style={{ position: 'absolute', left: `${GRAPH_NORMAL_START}%`, height: '4px', width: '1px', background: '#475569', top: 'calc(50% - 2px)' }}></div>
            <div style={{ position: 'absolute', left: `${GRAPH_NORMAL_END}%`, height: '4px', width: '1px', background: '#475569', top: 'calc(50% - 2px)' }}></div>
            <div style={{ 
                position: 'absolute', 
                '--hemo-marker-position': `${markerPosition}%`,
                left: 'var(--hemo-marker-position)',
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#0f172a',
                transform: 'translateX(-50%)',
                zIndex: 2
            }}></div>
            {isBelow && <span style={{ position: 'absolute', left: '-10px', fontSize: '9px', fontWeight: 'bold' }}>↓</span>}
            {isAbove && <span style={{ position: 'absolute', right: '-10px', fontSize: '9px', fontWeight: 'bold' }}>↑</span>}
        </div>
    );
};

const HemogramaCompactoCompleto = ({ selectedExam, examDetails, statusReal, patientCode, signatureSignedUrl }) => {
    const bDate = selectedExam.pacienteDataNascimento ? new Date(selectedExam.pacienteDataNascimento.split('/').reverse().join('-')) : null;
    let aDateStr = selectedExam.dataAtendimentoRaw || selectedExam.dataAtendimento;
    if (aDateStr && aDateStr.includes('/')) aDateStr = aDateStr.split('/').reverse().join('-');
    const aDate = aDateStr ? new Date(aDateStr) : new Date();
    
    const ageDays = bDate && !isNaN(bDate) && !isNaN(aDate) ? Math.floor((aDate - bDate) / (1000 * 60 * 60 * 24)) : -1;
    
    const normalizedSex = String(selectedExam.pacienteSexo || '').trim().toUpperCase();
    const sexGroup = ['M', 'MASCULINO'].includes(normalizedSex) ? 'MALE' : ['F', 'FEMININO'].includes(normalizedSex) ? 'FEMALE' : null;

    const findHemoParameter = (targetCode) => {
        return examDetails.find((item) => {
            const realCode = String(item.parameter_code ?? item.parameterCode ?? item.code ?? item.parametro_codigo ?? '').trim().toUpperCase();
            if (targetCode === 'OBS_ERITROGRAMA' && realCode === 'OBSERVACOES_ERITROGRAMA') return true;
            return realCode === targetCode;
        });
    };
    
    // Leucocitos Totais para Absoluto
    const leucocitosParam = findHemoParameter('LEUCOCITOS');
    const leucocitosTotais = leucocitosParam ? parseHemoNumber(leucocitosParam.value_numeric !== null ? leucocitosParam.value_numeric : leucocitosParam.value_text, 'LEUCOCITOS') : NaN;

    const formatDateTimeH = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const HH = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${HH}:${min}h`;
    };

    const getCollectionDateAndTime = (dateStr) => {
        if (!dateStr) return { date: '', time: '' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: '', time: '' };
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const HH = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return { date: `${dd}/${mm}/${yyyy}`, time: `${HH}:${min}h` };
    };

    const renderRow = (code, mode) => {
        const param = findHemoParameter(code);
        if (!param) return null;

        const rawResult = param.value_numeric !== null ? param.value_numeric : (param.value_text || '');
        const valNum = parseHemoNumber(rawResult, param.parameter_code);
        const formattedResult = formatHemoResultValue(rawResult, param.parameter_code);
        
        const refObj = resolveHemoReference(param.parameter_code, param.reference_text, ageDays, sexGroup);
        
        let absResultStr = '';
        if ((mode === 'leuco' || mode === 'leuco-abs') && !isNaN(valNum) && !isNaN(leucocitosTotais) && rawResult !== '') {
            const absVal = Math.round((leucocitosTotais * valNum) / 100);
            absResultStr = new Intl.NumberFormat('pt-BR').format(absVal);
        }

        const isAbnormalRel = refObj.valid && !refObj.isFixed && !isNaN(valNum) && (valNum < refObj.relMin || valNum > refObj.relMax);

        const maleLine = refObj.displayLines?.find(l => l.isMale);
        const femaleLine = refObj.displayLines?.find(l => l.isFemale);
        const singleLine = refObj.displayLines?.find(l => l.isSingle);
        const relLine = refObj.displayLines?.find(l => l.isRel);
        const absLine = refObj.displayLines?.find(l => l.isAbs);

        if (mode === 'eritro') {
            return (
                <div key={param.id} className="hemo-eritro-grid">
                    <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                    <div className={`hemo-col-result ${isAbnormalRel ? 'hemo-abnormal' : ''}`}>{formattedResult}</div>
                    <div className="hemo-col-unit">{param.unit ? param.unit.replace(/\/mm3/g, '/mm³') : ''}</div>
                    <div className="hemo-col-graph">
                        {refObj.valid && !refObj.isFixed && <GraficoHemo value={valNum} min={refObj.relMin} max={refObj.relMax} parameterCode={param.parameter_code} />}
                    </div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-sex-reference-grid">
                            {singleLine ? (
                                <div className="hemo-col-ref-single">{singleLine.text}</div>
                            ) : (
                                <>
                                    <div className={`hemo-col-ref-male ${maleLine?.highlight ? 'hemo-highlight' : ''}`}>{maleLine?.text || ''}</div>
                                    <div className={`hemo-col-ref-female ${femaleLine?.highlight ? 'hemo-highlight' : ''}`}>{femaleLine?.text || ''}</div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (mode === 'leuco' || mode === 'leuco-abs') {
            const isAbsOnly = mode === 'leuco-abs';
            return (
                <div key={param.id} className="hemo-leuco-grid">
                    <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                    <div className={`hemo-leuco-col-rel ${isAbnormalRel ? 'hemo-abnormal' : ''}`}>{isAbsOnly ? '—' : formattedResult}</div>
                    <div className="hemo-leuco-col-abs">{isAbsOnly ? formattedResult : absResultStr}</div>
                    <div className="hemo-col-graph">
                        {refObj.valid && !refObj.isFixed && <GraficoHemo value={valNum} min={refObj.relMin} max={refObj.relMax} parameterCode={param.parameter_code} />}
                    </div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-leuco-reference-grid">
                            <div className="hemo-col-ref-rel">{isAbsOnly ? '—' : (relLine?.text || singleLine?.text || '')}</div>
                            <div className="hemo-col-ref-abs">{isAbsOnly ? (singleLine?.text || absLine?.text || '') : (absLine?.text || '')}</div>
                        </div>
                    </div>
                </div>
            );
        }

        if (mode === 'plaq') {
            return (
                <div key={param.id} className="hemo-eritro-grid">
                    <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                    <div className={`hemo-col-result ${isAbnormalRel ? 'hemo-abnormal' : ''}`}>{formattedResult}</div>
                    <div className="hemo-col-unit">{param.unit ? param.unit.replace(/\/mm3/g, '/mm³') : ''}</div>
                    <div className="hemo-col-graph">
                        {refObj.valid && !refObj.isFixed && <GraficoHemo value={valNum} min={refObj.relMin} max={refObj.relMax} parameterCode={param.parameter_code} />}
                    </div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-sex-reference-grid">
                            <div className="hemo-col-ref-single" style={{ gridColumn: '1 / -1' }}>{singleLine?.text || refObj.text}</div>
                        </div>
                    </div>
                </div>
            );
        }

        // OTHER
        return (
            <div key={param.id} className="hemo-eritro-grid">
                <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                <div className={`hemo-col-result ${isAbnormalRel ? 'hemo-abnormal' : ''}`}>{formattedResult}</div>
                <div className="hemo-col-unit">{param.unit ? param.unit.replace(/\/mm3/g, '/mm³') : ''}</div>
                <div className="hemo-col-graph">
                    {refObj.valid && !refObj.isFixed && <GraficoHemo value={valNum} min={refObj.relMin} max={refObj.relMax} parameterCode={param.parameter_code} />}
                </div>
                <div className="hemo-col-ref-group">
                    <div className="hemo-ref-sub">
                        <div className="hemo-col-ref-single">{singleLine?.text || refObj.text}</div>
                    </div>
                </div>
            </div>
        );
    };

    const findHemoTextParameter = (targetCode) => {
        return examDetails.find((item) => {
            const code = String(item.parameter_code ?? '').trim().toUpperCase();
            if (targetCode === 'OBS_ERITROGRAMA' && code === 'OBSERVACOES_ERITROGRAMA') return true;
            return code === targetCode;
        });
    };

    const getHemoTextResult = (targetCode) => {
        const parameter = findHemoTextParameter(targetCode);
        const value = parameter?.value_text;
        if (typeof value === 'string') return value.trim();
        if (value == null) return '';
        return String(value).trim();
    };


    
    const others = examDetails.filter(e => 
        !HEMO_GROUPS.eritrograma.includes(e.parameter_code) &&
        !HEMO_GROUPS.leucograma.includes(e.parameter_code) &&
        !HEMO_GROUPS.plaquetas.includes(e.parameter_code) &&
        !HEMO_GROUPS.observacoes.includes(e.parameter_code)
    );

    return (
        <div className="hemo-compact-container">
            <div className="hemo-report-main">
                {/* Cabeçalho Hemo */}
                <div className="hemo-header">
                <div className="hemo-header-logo">
                    <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="hemo-header-center">
                    <h2>
                        LABORATÓRIO MUNICIPAL<br/>
                        LINDBERG CÂNDIDO DE SOUZA
                    </h2>
                    <p>Sistema Gestão Pública Inteligente</p>
                </div>
                <div className="hemo-header-right">
                    <img src="/logo-bezerros.png" alt="Prefeitura" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
            </div>

            {/* Paciente Hemo */}
            <div className="hemo-patient-box">
                <div className="hemo-patient-col">
                    <div><span className="hemo-lbl">Paciente:</span> {selectedExam.pacienteNome}</div>
                    <div><span className="hemo-lbl">Médico:</span> {selectedExam.medico || 'NÃO INFORMADO'}</div>
                    <div><span className="hemo-lbl">Cód. Paciente:</span> {patientCode || selectedExam.pacienteCode || selectedExam.patientCode || '---'}</div>
                    <div><span className="hemo-lbl">Data Nasc.:</span> {selectedExam.pacienteDataNascimento}</div>
                    <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeH(selectedExam.dataAtendimentoRaw)}</div>
                </div>
                <div className="hemo-patient-col right">
                    <div><span className="hemo-lbl">Idade:</span> {selectedExam.pacienteIdade}</div>
                    <div><span className="hemo-lbl">Sexo:</span> {selectedExam.pacienteSexo || 'NÃO INFORMADO'}</div>
                    <div><span className="hemo-lbl">RG:</span> {selectedExam.pacienteRg || '---'}</div>
                    <div><span className="hemo-lbl">CNS:</span> {selectedExam.pacienteCns || '---'}</div>
                    <div><span className="hemo-lbl">Emissão:</span> {formatDateTimeH(selectedExam.released_at || selectedExam.checked_at)}</div>
                    <div><span className="hemo-lbl">Origem:</span> {formatAttendanceOrigin(selectedExam.attendance_origin)}</div>
                </div>
            </div>

            {/* Título Exame */}
            <div className="hemo-exam-title-bar">
                <h3>HEMOGRAMA COMPLETO</h3>
                <div className="hemo-collection-info">
                    <span className="hemo-collection-label">Data da Coleta:</span>
                    {(() => {
                        const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_exam?.collection_date;
                        const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_exam?.collection_time;
                        if (cDate) {
                            return (
                                <>
                                    <span className="hemo-collection-date">{cDate.split('-').reverse().join('/')}</span>
                                    {cTime && <span className="hemo-collection-separator">às</span>}
                                    {cTime && <span className="hemo-collection-time">{cTime.slice(0, 5)}h</span>}
                                </>
                            );
                        }
                        return <span className="hemo-collection-date">---</span>;
                    })()}
                </div>
            </div>

            {/* ERITROGRAMA */}
            <div className="hemo-section">
                <div className="hemo-section-title">ERITROGRAMA</div>
                <div className="hemo-eritro-grid header">
                    <div className="hemo-col-name">Parâmetro</div>
                    <div className="hemo-col-result">Resultado</div>
                    <div className="hemo-col-unit">Unidade</div>
                    <div className="hemo-col-graph"></div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-ref-title">Valores de Referência</div>
                        <div className="hemo-sex-reference-grid">
                            <div className="hemo-col-ref-male">Homens</div>
                            <div className="hemo-col-ref-female">Mulheres</div>
                        </div>
                    </div>
                </div>
                {HEMO_GROUPS.eritrograma.map(c => renderRow(c, 'eritro'))}
            </div>

            {/* LEUCOGRAMA */}
            <div className="hemo-section">
                <div className="hemo-section-title">LEUCOGRAMA</div>
                <div className="hemo-leuco-grid header">
                    <div className="hemo-col-name">Parâmetro</div>
                    <div className="hemo-leuco-col-rel">%</div>
                    <div className="hemo-leuco-col-abs">/mm³</div>
                    <div className="hemo-col-graph"></div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-ref-title">Valores de Referência</div>
                        <div className="hemo-leuco-reference-grid">
                            <div className="hemo-col-ref-rel">Ref. %</div>
                            <div className="hemo-col-ref-abs">Ref. /mm³</div>
                        </div>
                    </div>
                </div>
                {renderRow('LEUCOCITOS', 'leuco-abs')}
                {HEMO_GROUPS.leucograma.filter(c => c !== 'LEUCOCITOS').map(c => renderRow(c, 'leuco'))}
            </div>

            {/* PLAQUETAS */}
            <div className="hemo-section">
                <div className="hemo-section-title">SÉRIE PLAQUETÁRIA</div>
                <div className="hemo-eritro-grid header">
                    <div className="hemo-col-name">Parâmetro</div>
                    <div className="hemo-col-result">Resultado</div>
                    <div className="hemo-col-unit">Unidade</div>
                    <div className="hemo-col-graph"></div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-sex-reference-grid">
                            <div className="hemo-col-ref-single" style={{ gridColumn: '1 / -1' }}>Valores de Referência</div>
                        </div>
                    </div>
                </div>
                {HEMO_GROUPS.plaquetas.map(c => renderRow(c, 'plaq'))}
            </div>
            
            {/* OUTROS PARÂMETROS DESCONHECIDOS SE HOUVER */}
            {others.length > 0 && (
                <div className="hemo-section">
                    <div className="hemo-section-title">OUTROS PARÂMETROS</div>
                    {others.map(e => renderRow(e.parameter_code, 'other'))}
                </div>
            )}
            
            {/* OBSERVAÇÕES E SÉRIES */}
            <div className="hemo-series-block" style={{ fontSize: '11px' }}>
                {(() => {
                    const isValid = (val) => val && val !== '' && !val.includes('Campo livre') && !val.includes('Digite o resultado') && val !== '---';
                    const obsEri = getHemoTextResult('OBS_ERITROGRAMA');
                    const serEri = getHemoTextResult('SERIE_ERITROCITARIA');
                    const serLeu = getHemoTextResult('SERIE_LEUCOCITARIA');
                    const serPlaq = getHemoTextResult('SERIE_PLAQUETARIA');
                    return (
                        <>
                            {isValid(obsEri) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">OBSERVAÇÕES DO ERITROGRAMA:</div>
                                    <div className="hemo-series-text">{obsEri}</div>
                                </div>
                            )}
                            {isValid(serEri) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE ERITROCITÁRIA:</div>
                                    <div className="hemo-series-text">{serEri}</div>
                                </div>
                            )}
                            {isValid(serLeu) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE LEUCOCITÁRIA:</div>
                                    <div className="hemo-series-text">{serLeu}</div>
                                </div>
                            )}
                            {isValid(serPlaq) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE PLAQUETÁRIA:</div>
                                    <div className="hemo-series-text">{serPlaq}</div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
            
            </div> {/* Fim hemo-report-main */}

            <div className="hemo-report-bottom">
                <div className="hemo-signature-area">
                    {selectedExam.responsible_name ? (
                        <>
                            {signatureSignedUrl && (
                                <img
                                    src={signatureSignedUrl}
                                    alt={`Assinatura de ${selectedExam.responsible_name}`}
                                    className="lab-report-signature-image"
                                />
                            )}
                            <div className="hemo-signature-name" style={{ marginTop: signatureSignedUrl ? '2px' : '20px' }}>
                                {selectedExam.responsible_name.toUpperCase()}
                                {selectedExam.responsible_crbm && (
                                    <><br /><span style={{ fontWeight: 400, fontSize: '0.78em' }}>Biomédico(a) — CRBM {selectedExam.responsible_crbm}</span></>
                                )}
                            </div>
                            {selectedExam.checked_at && (
                                <div className="hemo-signature-date">
                                    {(() => {
                                        const d = new Date(selectedExam.checked_at);
                                        const dd = String(d.getDate()).padStart(2,'0');
                                        const mm = String(d.getMonth()+1).padStart(2,'0');
                                        const yyyy = d.getFullYear();
                                        const HH = String(d.getHours()).padStart(2,'0');
                                        const min = String(d.getMinutes()).padStart(2,'0');
                                        return `Conferido e assinado eletronicamente em ${dd}/${mm}/${yyyy} às ${HH}:${min}h`;
                                    })()}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="hemo-signature-line"></div>
                            <div className="hemo-signature-name">Biomédico(a) Responsável</div>
                            {selectedExam.released_at && (
                                <div className="hemo-signature-date">
                                    Liberado eletronicamente em {new Date(selectedExam.released_at).toLocaleString('pt-BR')}
                                </div>
                            )}
                            <div style={{ fontSize: '0.7em', color: '#94a3b8', marginTop: '2px' }}>Dados profissionais indisponíveis para este laudo anterior.</div>
                        </>
                    )}
                </div>
                
                <div className="hemo-footer-address">
                    Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros - PE - CEP: 55.660-000
                </div>
            </div>
        </div>
    );
};

const isAbnormal = (val_num, min, max) => {
    if (val_num === null || val_num === undefined || val_num === '') return false;
    const num = parseFloat(val_num);
    if (isNaN(num)) return false;
    if (min !== null && num < parseFloat(min)) return 'below';
    if (max !== null && num > parseFloat(max)) return 'above';
    return 'normal';
};

const LaudoExameSimples = ({ selectedExam, examDetails, loadingDetails, formatDateTimeH, patientCode, formatAttendanceOrigin, signatureSignedUrl }) => {
    // Format Collection Date
    let collectionFormatted = '';
    const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_exam?.collection_date;
    const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_exam?.collection_time;
    if (cDate) {
        collectionFormatted = cDate.split('-').reverse().join('/');
    }

    // General Observation Filtering
    let generalObs = (selectedExam?.observacaoGeral || '').trim();
    if (generalObs.startsWith('[Devolvido para correção]')) {
        generalObs = '';
    }

    // Pre-processamento para TC, TS e GSRH
    let finalExamDetails = [...(examDetails || [])].map(p => ({ ...p }));
    const examCode = (selectedExam?.exameCodigo || '').toUpperCase();
    const isGsrh = examCode === 'GSRH';

    const normalizeCode = (code) => {
        if (!code) return '';
        return code.toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    if (examCode === 'TC' || examCode === 'TS') {
        const minParam = finalExamDetails.find(p => {
            const code = normalizeCode(p.parameter_code || p.code || p.parameter_name);
            return code === 'MINUTOS' || code.includes('MINUTO');
        });
        const secParam = finalExamDetails.find(p => {
            const code = normalizeCode(p.parameter_code || p.code || p.parameter_name);
            return code === 'SEGUNDOS' || code.includes('SEGUNDO');
        });
        
        if (minParam || secParam) {
            const getRealValue = (param) => {
                if (!param) return 0;
                const val = param.value_numeric ?? param.value_text ?? param.value ?? param.resultado ?? '';
                if (val === '' || val === null || val === undefined) return 0;
                const parsed = Number(val);
                return isNaN(parsed) ? 0 : parsed;
            };

            const minVal = getRealValue(minParam);
            const secVal = getRealValue(secParam);
            
            let combinedStr = '';
            if (minVal > 0) {
                combinedStr += `${minVal} minuto${minVal !== 1 ? 's' : ''}`;
            }
            if (secVal > 0) {
                if (minVal > 0) combinedStr += ' e ';
                combinedStr += `${secVal} segundo${secVal !== 1 ? 's' : ''}`;
            }
            if (minVal === 0 && (secVal === 0 || !secParam)) {
                combinedStr = '0 minutos';
            }
            if (minVal === 0 && secVal > 0) {
                combinedStr = `${secVal} segundo${secVal !== 1 ? 's' : ''}`;
            }
            
            const targetParam = minParam || secParam;
            targetParam.value_text = combinedStr;
            targetParam.value_numeric = null; 
            targetParam.result_type = 'TEXTO';
            targetParam.unit = '';
            targetParam.parameter_name = 'Resultado';
            
            if (minParam && secParam) {
                finalExamDetails = finalExamDetails.filter(p => p.id !== secParam.id);
            }
        }
    }

    if (isGsrh) {
        finalExamDetails = finalExamDetails.filter(p => {
            const pName = (p.parameter_name || p.parameter_code || '').toUpperCase();
            if (pName.includes('VARIANTE') || pName.includes('D FRACO')) {
                const raw = p.value_text ?? p.value_numeric ?? '';
                if (String(raw).trim() === '') return false;
            }
            return true;
        });
    }

    const showUnitColumn = !isGsrh && finalExamDetails.some(param => {
        const pType = (param.result_type || selectedExam?.result_type || '').toUpperCase();
        const hasUnit = (param.unit || '').trim() !== '';
        const isNumeric = param.value_numeric !== null && param.value_numeric !== undefined;
        return hasUnit || pType === 'NUMERICO' || (!pType && isNumeric);
    });

    const showRefColumn = !isGsrh;

    let gridLayout = '1fr 100px 100px 1fr';
    if (isGsrh) {
        gridLayout = '1fr 1fr';
    } else if (!showUnitColumn) {
        gridLayout = '32% 30% 38%';
    }

    return (
        <div className="hemo-compact-container">
            <div className="hemo-report-main">
                {/* Cabeçalho Hemo */}
                <div className="hemo-header">
                    <div className="hemo-header-logo">
                        <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="hemo-header-center">
                        <h2>
                            LABORATÓRIO MUNICIPAL<br/>
                            LINDBERG CÂNDIDO DE SOUZA
                        </h2>
                        <p>Sistema Gestão Pública Inteligente</p>
                    </div>
                    <div className="hemo-header-right">
                        <img src="/logo-bezerros.png" alt="Prefeitura" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                </div>

                {/* Paciente Hemo */}
                <div className="hemo-patient-box">
                    <div className="hemo-patient-col">
                        <div><span className="hemo-lbl">Paciente:</span> {selectedExam?.pacienteNome}</div>
                        <div><span className="hemo-lbl">Médico:</span> {selectedExam?.medico || 'NÃO INFORMADO'}</div>
                        <div><span className="hemo-lbl">Cód. Paciente:</span> {patientCode || selectedExam?.pacienteCode || selectedExam?.patientCode || '---'}</div>
                        <div><span className="hemo-lbl">Data Nasc.:</span> {selectedExam?.pacienteDataNascimento}</div>
                        <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeH ? formatDateTimeH(selectedExam?.dataAtendimentoRaw) : ''}</div>
                    </div>
                    <div className="hemo-patient-col right">
                        <div><span className="hemo-lbl">Idade:</span> {selectedExam?.pacienteIdade}</div>
                        <div><span className="hemo-lbl">Sexo:</span> {selectedExam?.pacienteSexo || 'NÃO INFORMADO'}</div>
                        <div><span className="hemo-lbl">RG:</span> {selectedExam?.pacienteRg || '---'}</div>
                        <div><span className="hemo-lbl">CNS:</span> {selectedExam?.pacienteCns || '---'}</div>
                        <div><span className="hemo-lbl">Emissão:</span> {formatDateTimeH ? formatDateTimeH(selectedExam?.released_at || selectedExam?.checked_at) : ''}</div>
                        <div><span className="hemo-lbl">Origem:</span> {formatAttendanceOrigin && selectedExam?.attendance_origin ? formatAttendanceOrigin(selectedExam?.attendance_origin) : ''}</div>
                    </div>
                </div>

                {/* Título Exame */}
                <div className="hemo-exam-title-bar">
                    <h3>{selectedExam?.exameCodigo} - {selectedExam?.exameNome}</h3>
                    <div className="hemo-collection-info">
                        <span className="hemo-collection-label">Data da Coleta:</span>
                        {cDate ? (
                            <>
                                <span className="hemo-collection-date">{collectionFormatted}</span>
                                {cTime && <span className="hemo-collection-separator">às</span>}
                                {cTime && <span className="hemo-collection-time">{cTime.slice(0, 5)}h</span>}
                            </>
                        ) : (
                            <span className="hemo-collection-date">---</span>
                        )}
                    </div>
                </div>

                {/* Corpo do Exame Simples */}
                <div className="hemo-section">
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '11px', color: '#64748b', marginBottom: '8px', padding: '0 4px' }}>
                        {selectedExam?.exameMaterial && <div><strong>Material:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameMaterial}</span></div>}
                        {selectedExam?.exameMetodo && <div><strong>Método:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameMetodo}</span></div>}
                        {selectedExam?.exameAnalisador && <div><strong>Analisador:</strong> <span style={{ color: '#0f172a' }}>{selectedExam.exameAnalisador}</span></div>}
                    </div>

                    <div className={`hemo-eritro-grid header ${!showUnitColumn && !isGsrh ? 'simple-report-results-grid--qualitative' : ''}`} style={{ gridTemplateColumns: gridLayout }}>
                        <div className="hemo-col-name">Parâmetro</div>
                        <div className="hemo-col-result">Resultado</div>
                        {showUnitColumn && <div className="hemo-col-unit">Unidade</div>}
                        {showRefColumn && (
                            <div className="hemo-col-ref-group">
                                <div className="hemo-ref-title">Valores de Referência</div>
                            </div>
                        )}
                    </div>

                    {loadingDetails ? (
                        <div className="flex justify-center py-4 text-gray-500">
                            <span className="ml-2">Carregando parâmetros...</span>
                        </div>
                    ) : finalExamDetails?.length === 0 ? (
                        <div className="text-center py-4 text-gray-500" style={{ fontSize: '11px' }}>Nenhum parâmetro encontrado para este exame.</div>
                    ) : (
                        finalExamDetails
                        .filter(param => {
                            const isObservationParam = (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVACAO' || (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVAÇÃO';
                            if (isObservationParam) {
                                const rawObservationValue = param.value_text ?? param.observation ?? param.value ?? param.value_numeric ?? '';
                                const isRealObservation = String(rawObservationValue).trim().length > 0;
                                return isRealObservation;
                            }
                            return true;
                        })
                        .map((param, index) => {
                            const isNumericValid = param.value_numeric !== null && param.value_numeric !== undefined;
                            const textValue = (param.value_text || '').trim();
                            const isTextValid = textValue !== '';
                            
                            const pType = (param.result_type || selectedExam?.result_type || '').toUpperCase();
                            const isQualitative = pType === 'QUALITATIVO' || (!pType && !isNumericValid && isTextValid);
                            
                            let displayValue = '';
                            if (isQualitative) {
                                displayValue = textValue;
                            } else {
                                displayValue = isNumericValid ? param.value_numeric.toString().replace('.', ',') : textValue;
                            }

                            const abnormalStatus = isQualitative ? 'normal' : isAbnormal(param.value_numeric, param.min_value, param.max_value);
                            const isObservationParam = (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVACAO' || (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVAÇÃO';

                            if (isObservationParam) {
                                return (
                                    <div key={param.id} className="hemo-series-block" style={{ borderTop: 'none', marginTop: '2px' }}>
                                        <div className="hemo-series-item">
                                            <div className="hemo-series-title">Observação:</div>
                                            <div className="hemo-series-text" style={{ whiteSpace: 'pre-wrap' }}>{displayValue}</div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <React.Fragment key={param.id}>
                                    <div className={`hemo-eritro-grid row ${!showUnitColumn && !isGsrh ? 'simple-report-results-grid--qualitative' : ''}`} style={{ gridTemplateColumns: gridLayout }}>
                                        <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                                        <div className={`hemo-col-result ${abnormalStatus !== 'normal' && abnormalStatus !== false ? 'hemo-abnormal' : ''}`}>
                                            {displayValue}
                                            {abnormalStatus === 'below' && <span style={{ marginLeft: '4px', color: '#ef4444' }}>↓</span>}
                                            {abnormalStatus === 'above' && <span style={{ marginLeft: '4px', color: '#ef4444' }}>↑</span>}
                                        </div>
                                        {showUnitColumn && <div className="hemo-col-unit">{!isQualitative && param.unit ? param.unit : ''}</div>}
                                        {showRefColumn && (
                                            <div className="hemo-col-ref-single" style={{ gridColumn: showUnitColumn ? '4' : '3', whiteSpace: 'pre-line', justifyContent: 'flex-start', textAlign: 'left' }}>
                                                {param.reference_text || (!isQualitative && (param.min_value !== null || param.max_value !== null) ? `${param.min_value || 0} a ${param.max_value || '∞'}` : (examCode === 'TC' || examCode === 'TS' ? '' : 'Não cadastrada'))}
                                            </div>
                                        )}
                                    </div>
                                    {(param.observation || '').trim() && (
                                        <div className="hemo-series-block" style={{ borderTop: 'none', padding: '2px 4px', background: '#f8fafc', marginTop: '2px' }}>
                                            <div className="hemo-series-item">
                                                <div className="hemo-series-title" style={{ color: '#64748b' }}>Nota:</div>
                                                <div className="hemo-series-text" style={{ color: '#64748b' }}>{(param.observation || '').trim()}</div>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </div>

                {/* Observação Geral */}
                {generalObs && (
                    <div className="hemo-series-block" style={{ marginTop: '10px' }}>
                        <div className="hemo-series-item">
                            <div className="hemo-series-title">OBSERVAÇÕES GERAIS:</div>
                            <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{generalObs}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Rodapé e Assinatura Hemo */}
            <div className="hemo-report-bottom">
                <div className="hemo-signature-area">
                    {selectedExam?.responsible_name ? (
                        <>
                            {signatureSignedUrl && (
                                <img
                                    src={signatureSignedUrl}
                                    alt={`Assinatura de ${selectedExam.responsible_name}`}
                                    className="lab-report-signature-image"
                                />
                            )}
                            <div className="hemo-signature-name" style={{ marginTop: signatureSignedUrl ? '2px' : '20px' }}>
                                {selectedExam.responsible_name.toUpperCase()}
                                {selectedExam.responsible_crbm && (
                                    <><br /><span style={{ fontWeight: 400, fontSize: '0.78em' }}>Biomédico(a) — CRBM {selectedExam.responsible_crbm}</span></>
                                )}
                            </div>
                            {selectedExam.checked_at && (
                                <div className="hemo-signature-date">
                                    {(() => {
                                        const d = new Date(selectedExam.checked_at);
                                        const dd = String(d.getDate()).padStart(2,'0');
                                        const mm = String(d.getMonth()+1).padStart(2,'0');
                                        const yyyy = d.getFullYear();
                                        const HH = String(d.getHours()).padStart(2,'0');
                                        const min = String(d.getMinutes()).padStart(2,'0');
                                        return `Conferido e assinado eletronicamente em ${dd}/${mm}/${yyyy} às ${HH}:${min}h`;
                                    })()}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="hemo-signature-line"></div>
                            <div className="hemo-signature-name">Biomédico(a) Responsável</div>
                            {selectedExam?.released_at && (
                                <div className="hemo-signature-date">
                                    Liberado eletronicamente em {new Date(selectedExam.released_at).toLocaleString('pt-BR')}
                                </div>
                            )}
                            <div style={{ fontSize: '0.7em', color: '#94a3b8', marginTop: '2px' }}>Dados profissionais indisponíveis para este laudo anterior.</div>
                        </>
                    )}
                </div>
                
                <div className="hemo-footer-address">
                    Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros - PE - CEP: 55.660-000
                </div>
            </div>
        </div>
    );
};

const LaboratorioLaudos = () => {
    const [searchFilters, setSearchFilters] = useState({
        date: '',
        patient: '',
        patientCode: '',
        status: 'LIBERADO',
        attendance_origin: ''
    });
    
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
    const [signatureSignedUrl, setSignatureSignedUrl] = useState(null);
    const [loadingSignature, setLoadingSignature] = useState(false);
    // Conjunto dos result_ids selecionados para impressão
    const [selectedExamIds, setSelectedExamIds] = useState(new Set());
    // Controle do drawer de seleção de exames
    const [drawerOpen, setDrawerOpen] = useState(false);
    const laudoRef = useRef(null);

    useEffect(() => {
        handleSearch();
    }, []);

    // Carrega a Signed URL da assinatura sempre que o exame selecionado muda
    useEffect(() => {
        setSignatureSignedUrl(null);
        const path = selectedExam?.responsible_signature_path;
        if (!path) return;

        let cancelled = false;
        setLoadingSignature(true);
        laboratorioLaudosService.getLaboratorioSignatureSignedUrl(path).then(url => {
            if (!cancelled) {
                setSignatureSignedUrl(url);
                setLoadingSignature(false);
            }
        }).catch(() => {
            if (!cancelled) setLoadingSignature(false);
        });

        return () => { cancelled = true; };
    }, [selectedExam?.id]);

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
                    pacienteCode: ex.pacienteCodigo,
                    dataAtendimento: ex.dataAtendimento,
                    dataAtendimentoRaw: ex.dataAtendimentoRaw,
                    pacienteNome: ex.pacienteNome,
                    pacienteIdade: ex.pacienteIdade,
                    pacienteSexo: ex.pacienteSexo,
                    pacienteCns: ex.pacienteCns,
                    pacienteCpf: ex.pacienteCpf,
                    convenio: ex.convenio,
                    medico: ex.medico,
                    local_entrega: ex.local_entrega,
                    attendance_origin: ex.attendance_origin,
                    totalExams: ex.totalExams,
                    exams: [],
                    latestEventDate: 0
                };
            }
            
            // Find the most recent event date for this exam
            const evDate = ex.released_at ? new Date(ex.released_at).getTime() 
                         : ex.checked_at ? new Date(ex.checked_at).getTime()
                         : 0;
            
            if (evDate > groups[ex.protocolo].latestEventDate) {
                groups[ex.protocolo].latestEventDate = evDate;
            }

            groups[ex.protocolo].exams.push(ex);
        });
        
        const protocolsArray = Object.values(groups);

        // Ordenar exames dentro de cada protocolo: print_order ASC → código ASC → id ASC
        protocolsArray.forEach(group => {
            group.exams.sort((a, b) => {
                const orderDiff = (a.examePrintOrder ?? 999) - (b.examePrintOrder ?? 999);
                if (orderDiff !== 0) return orderDiff;
                const codeDiff = (a.exameCodigo || '').localeCompare(b.exameCodigo || '');
                if (codeDiff !== 0) return codeDiff;
                return (a.id || '').localeCompare(b.id || '');
            });
        });
        
        protocolsArray.sort((a, b) => {
            // 1. Mais recente liberado/conferido primeiro (decrescente)
            if (a.latestEventDate !== b.latestEventDate) {
                return b.latestEventDate - a.latestEventDate;
            }

            // 2. Data do atendimento (mais recente primeiro)
            const dateA = a.dataAtendimentoRaw ? new Date(a.dataAtendimentoRaw).getTime() : 0;
            const dateB = b.dataAtendimentoRaw ? new Date(b.dataAtendimentoRaw).getTime() : 0;
            
            if (dateA !== dateB) {
                return dateB - dateA;
            }
            
            // 2. Na mesma data, código do paciente — menor para maior
            const codeA = a.pacienteCode ? parseInt(a.pacienteCode, 10) : Infinity;
            const codeB = b.pacienteCode ? parseInt(b.pacienteCode, 10) : Infinity;
            
            if (!isNaN(codeA) && !isNaN(codeB) && codeA !== codeB) {
                return codeA - codeB;
            }
            
            // 3. Critério de desempate estável (protocolo)
            if (a.protocolo && b.protocolo) {
                return a.protocolo.localeCompare(b.protocolo);
            }
            
            return 0;
        });
        
        return protocolsArray;
    }, [filteredResults]);

    // Reinicializar seleção sempre que o atendimento selecionado mudar
    useEffect(() => {
        if (!selectedProtocol) {
            setSelectedExamIds(new Set());
            return;
        }
        // Pré-selecionar exames imprimíveis (printsOnReport = true)
        const printable = new Set(
            selectedProtocol.exams
                .filter(ex => ex.printsOnReport !== false)
                .map(ex => ex.id)
        );
        setSelectedExamIds(printable);
    }, [selectedProtocol?.protocolo]); // depende apenas do protocolo, não de selectedProtocol inteiro

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


    // Array derivado ordenado para o compositor de impressão (etapa futura)
    const selectedExamsForReport = useMemo(() => {
        if (!selectedProtocol) return [];
        return selectedProtocol.exams.filter(
            ex => ex.printsOnReport !== false && selectedExamIds.has(ex.id)
        );
        // já estão ordenados pela ordenação aplicada no groupedProtocols
    }, [selectedProtocol, selectedExamIds]);

    // Handlers de seleção
    const handleToggleExamSelection = (id) => {
        setSelectedExamIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllPrintable = () => {
        if (!selectedProtocol) return;
        const printable = new Set(
            selectedProtocol.exams
                .filter(ex => ex.printsOnReport !== false)
                .map(ex => ex.id)
        );
        setSelectedExamIds(printable);
    };

    const handleClearSelection = () => {
        setSelectedExamIds(new Set());
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
                    <p className="lab-subtitle">Consulta, impressão e download dos laudos liberados</p>
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
                <div className="lab-filters-grid laudos-first-row-flex" style={{ display: 'grid', gridTemplateColumns: '145px minmax(230px, 1fr) 125px 215px 135px 110px', gap: '0.75rem', alignItems: 'end' }}>
                    <div className="lab-filter-item lab-filter-group">
                        <label>Data</label>
                        <input 
                            type="date" 
                            value={searchFilters.date}
                            onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                            onKeyDown={handleFilterKeyDown}
                        />
                    </div>
                    <div className="lab-filter-item lab-filter-group">
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
                    <div className="lab-filter-item lab-filter-group">
                        <label>CÓD. PACIENTE</label>
                        <input 
                            type="text" 
                            placeholder="Ex.: 115003"
                            value={searchFilters.patientCode}
                            onChange={(e) => setSearchFilters({...searchFilters, patientCode: e.target.value})}
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
                        <label>Origem</label>
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
                    <div className="lab-filter-item lab-filter-group lab-filter-actions">
                        <label className="filter-label-spacer" aria-hidden="true">Ação</label>
                        <button className="lab-btn lab-btn-primary" onClick={handleSearch} disabled={loading} style={{ width: '100%', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                            {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                            Buscar
                        </button>
                    </div>
                </div>
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
                            {groupedProtocols.map((group, idx) => {
                                const isSelected = selectedProtocol?.protocolo === group.protocolo;
                                const isKeyboardSelected = keyboardSelectedIndex === idx;
                                return (
                                    <div 
                                        key={group.protocolo} 
                                        className={`lab-queue-item ${isSelected ? 'active' : ''}`}
                                        style={{ 
                                            padding: '10px 12px', 
                                            borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid #e2e8f0',
                                            borderTop: '1px solid #e2e8f0',
                                            borderRight: '1px solid #e2e8f0',
                                            borderBottom: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            background: isSelected ? '#eff6ff' : '#fff',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                                e.currentTarget.style.borderLeftColor = '#cbd5e1';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.borderLeftColor = '#e2e8f0';
                                            }
                                        }}
                                        onClick={() => {
                                            setSelectedProtocol(group);
                                            handleSelectExam(group.exams[0]);
                                        }}
                                    >
                                        <div className="lab-qi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Cód. {group.pacienteCode || 'N/I'}</span>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>Atend.: {group.dataAtendimento}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '5px', gap: '8px' }}>
                                            <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#0f172a', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', minWidth: '0' }}>
                                                {group.pacienteNome}
                                            </div>
                                            <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', paddingTop: '1px' }}>
                                                {group.exams.length} {group.exams.length === 1 ? 'exame' : 'exames'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
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

                            {selectedProtocol && (selectedProtocol.totalExams - selectedProtocol.exams.length) > 0 && (
                                <div className="no-print" style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fcd34d',
                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                    fontWeight: '500', fontSize: '0.85rem', zIndex: 10,
                                    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <AlertTriangle size={16} />
                                    Ainda { (selectedProtocol.totalExams - selectedProtocol.exams.length) === 1 ? 'existe 1 exame pendente' : `existem ${selectedProtocol.totalExams - selectedProtocol.exams.length} exames pendentes` } de conferência neste atendimento.
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
                                
                                {/* Ações de Tela legadas (mantidas para retrocompatibilidade de impressão — ocultas pela barra) */}
                                
                                {/* BARRA DE AÇÕES SUPERIOR — no-print */}
                                <div className="no-print laudos-action-bar">
                                    {/* Esquerda: contador + chips */}
                                    <div className="laudos-action-bar-left">
                                        <span className="laudos-action-counter">
                                            {selectedExamIds.size} de {selectedProtocol?.exams.length ?? 0} exame{(selectedProtocol?.exams.length ?? 0) !== 1 ? 's' : ''} selecionado{selectedExamIds.size !== 1 ? 's' : ''}
                                        </span>
                                        {/* Chips dos exames selecionados — máximo 4 visíveis */}
                                        <div className="laudos-action-chips">
                                            {(() => {
                                                const selected = (selectedProtocol?.exams || []).filter(ex => selectedExamIds.has(ex.id));
                                                const maxChips = 4;
                                                const visible = selected.slice(0, maxChips);
                                                const overflow = selected.length - maxChips;
                                                return (
                                                    <>
                                                        {visible.map(ex => (
                                                            <span key={ex.id} className="laudos-chip" onClick={() => handleSelectExam(ex)} title={ex.exameNome}>
                                                                {ex.exameCodigo}
                                                            </span>
                                                        ))}
                                                        {overflow > 0 && (
                                                            <span className="laudos-chip laudos-chip-overflow">+{overflow}</span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Direita: botões de ação */}
                                    <div className="laudos-action-bar-right">
                                        <button
                                            type="button"
                                            className="laudos-action-btn laudos-action-btn-secondary"
                                            onClick={() => setDrawerOpen(true)}
                                        >
                                            <SlidersHorizontal size={14} />
                                            Selecionar exames
                                        </button>

                                        {selectedExamIds.size > 0 && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="laudos-action-btn laudos-action-btn-icon"
                                                    onClick={() => window.print()}
                                                    aria-label="Imprimir"
                                                    title="Imprimir"
                                                >
                                                    <Printer size={15} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="laudos-action-btn laudos-action-btn-icon"
                                                    onClick={handleDownloadPdf}
                                                    disabled={generatingPdf}
                                                    aria-label="Baixar PDF"
                                                    title="Baixar PDF"
                                                >
                                                    {generatingPdf ? <Loader2 size={15} strokeWidth={2} className="spin" /> : <Download size={15} strokeWidth={2} />}
                                                </button>
                                            </>
                                        )}

                                        {statusReal === 'CONFERIDO' && (
                                            <button
                                                type="button"
                                                className="laudos-action-btn laudos-action-btn-primary"
                                                onClick={handleLiberar}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                                                {saving ? 'Liberando...' : 'Liberar Laudo'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* DRAWER DE SELEÇÃO — no-print */}
                                {drawerOpen && (
                                    <div className="no-print laudos-drawer-overlay" onClick={() => setDrawerOpen(false)}>
                                        <div className="laudos-drawer" onClick={e => e.stopPropagation()}>
                                            {/* Header do drawer — 3 linhas */}
                                            <div className="laudos-drawer-header">
                                                {/* Linha 1: título + fechar */}
                                                <div className="laudos-drawer-header-row laudos-drawer-header-row1">
                                                    <span className="laudos-drawer-title">Exames do atendimento</span>
                                                    <button type="button" className="laudos-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Fechar">×</button>
                                                </div>
                                                {/* Linha 2: contador */}
                                                <div className="laudos-drawer-header-row">
                                                    <span className="laudos-drawer-subtitle">
                                                        {selectedExamIds.size} de {selectedProtocol?.exams.length ?? 0} selecionado{selectedExamIds.size !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                {/* Linha 3: ações */}
                                                <div className="laudos-drawer-header-row laudos-drawer-header-actions">
                                                    <button type="button" className="laudos-sel-btn" onClick={handleSelectAllPrintable}>Selecionar todos</button>
                                                    <button type="button" className="laudos-sel-btn laudos-sel-btn-clear" onClick={handleClearSelection}>Limpar</button>
                                                </div>
                                            </div>

                                            {/* Lista de exames */}
                                            <div className="laudos-drawer-list">
                                                {selectedProtocol?.exams.map(ex => {
                                                    const isActive = selectedExam?.id === ex.id;
                                                    const isChecked = selectedExamIds.has(ex.id);
                                                    const notPrints = ex.printsOnReport === false;
                                                    const orderLabel = ex.examePrintOrder < 999
                                                        ? String(ex.examePrintOrder).padStart(2, '0')
                                                        : '——';
                                                    return (
                                                        <div
                                                            key={ex.id}
                                                            className={`laudos-exam-item${isActive ? ' laudos-exam-item-active' : ''}${notPrints ? ' laudos-exam-item-noprint' : ''}`}
                                                            onClick={() => { handleSelectExam(ex); setDrawerOpen(false); }}
                                                            title={ex.exameNome}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="laudos-exam-checkbox"
                                                                checked={isChecked}
                                                                disabled={notPrints}
                                                                onClick={e => e.stopPropagation()}
                                                                onChange={() => !notPrints && handleToggleExamSelection(ex.id)}
                                                            />
                                                            <span className="laudos-exam-order">{orderLabel}</span>
                                                            <span className="laudos-exam-code">{ex.exameCodigo}</span>
                                                            <span className="laudos-exam-name">{ex.exameNome}</span>
                                                            {notPrints && (
                                                                <span className="laudos-exam-noprint-badge">Não imprime</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Header do Laudo ou HEMO */}
                                {String(selectedExam.exameCodigo || '').trim().toUpperCase() === 'HEMO' ? (
                                    <HemogramaCompactoCompleto
                                        selectedExam={selectedExam}
                                        examDetails={examDetails}
                                        statusReal={statusReal}
                                        patientCode={selectedProtocol?.pacienteCode}
                                        signatureSignedUrl={signatureSignedUrl}
                                    />
                                ) : (
                                    <LaudoExameSimples 
                                        selectedExam={selectedExam}
                                        examDetails={examDetails}
                                        loadingDetails={loadingDetails}
                                        formatDateTimeH={(dateStr) => {
                                            if (!dateStr) return '';
                                            const d = new Date(dateStr);
                                            if (isNaN(d.getTime())) return '';
                                            const dd = String(d.getDate()).padStart(2, '0');
                                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                                            const yyyy = d.getFullYear();
                                            const HH = String(d.getHours()).padStart(2, '0');
                                            const min = String(d.getMinutes()).padStart(2, '0');
                                            return `${dd}/${mm}/${yyyy} às ${HH}:${min}h`;
                                        }}
                                        patientCode={selectedProtocol?.pacienteCode}
                                        formatAttendanceOrigin={formatAttendanceOrigin}
                                        signatureSignedUrl={signatureSignedUrl}
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LaboratorioLaudos;
