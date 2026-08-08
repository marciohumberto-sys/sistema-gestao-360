import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { formatCpf } from '../../utils/formatters';
import { 
    CheckCircle2, AlertTriangle, Search, RefreshCw, 
    Activity, Clock, User, Loader2, FileText, Printer, Download, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './LaboratorioConferencia.css';
import './LaboratorioLaudos.css';
import { laboratorioLaudosService } from '../../services/api/laboratorioLaudos.service';
import { ATTENDANCE_ORIGINS, formatAttendanceOrigin, parseHemoNumber, formatHemoResultValue, formatHemoReferenceText, resolveHemoReference, expandHemogramaMorphologyAbbreviations, formatDateTimeRecife, formatDateOnlyBR, formatTimeOnly } from '../../utils/laboratorioHelpers';

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
  observacoes: ['OBS_ERITROGRAMA', 'OBSERVACOES_ERITROGRAMA', 'SERIE_ERITROCITARIA', 'S_ERITROCITARIA', 'SERIE_LEUCOCITARIA', 'S_LEUCOCITARIA', 'SERIE_PLAQUETARIA', 'S_PLAQUETARIA', 'OBS_MORFOLOGICAS', 'OBSERVACOES_MORFOLOGICAS', 'OBS_MORFOLOGIA', 'MORFOLOGIA']
};

const HEMO_PERCENTUAL_CODES = [
  'MIELOCITOS', 'METAMIELOCITOS', 'BASTONETES', 'SEGMENTADOS', 
  'EOSINOFILOS', 'BASOFILOS', 'LINFOCITOS_TIPICOS', 'LINFOCITOS_ATIPICOS', 
  'MONOCITOS', 'PLASMOCITOS'
];


/**
 * Normaliza a obtenção do código real do exame, 
 * unificando possíveis nomes de campos.
 */
const getExamCode = (exam) => {
    if (!exam) return '';
    const raw = exam.exameCodigo || exam.exam_code || exam.exame_code || exam.code || '';
    return String(raw).trim().toUpperCase();
};

const GraficoHemo = ({ value, min, max, parameterCode, containerMaxWidth = '80px', containerHeight = '12px', markerSize = 6, markHeight = 4, lineWidth = '1px', markWidth = '1px', containerMargin = '0 auto' }) => {
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
        <div style={{ width: '100%', maxWidth: containerMaxWidth, height: containerHeight, position: 'relative', display: 'flex', alignItems: 'center', margin: containerMargin }}>
            <div style={{ position: 'absolute', width: '100%', height: lineWidth, background: '#94a3b8', top: '50%', transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', left: `${GRAPH_NORMAL_START}%`, height: `${markHeight}px`, width: markWidth, background: '#475569', top: '50%', transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', left: `${GRAPH_NORMAL_END}%`, height: `${markHeight}px`, width: markWidth, background: '#475569', top: '50%', transform: 'translateY(-50%)' }}></div>
            <div style={{ 
                position: 'absolute', 
                '--hemo-marker-position': `${markerPosition}%`,
                left: 'var(--hemo-marker-position)',
                width: `${markerSize}px`, 
                height: `${markerSize}px`, 
                borderRadius: '50%', 
                background: '#0f172a',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2
            }}></div>
            {isBelow && <span style={{ position: 'absolute', left: '-10px', fontSize: '9px', fontWeight: 'bold' }}>↓</span>}
            {isAbove && <span style={{ position: 'absolute', right: '-10px', fontSize: '9px', fontWeight: 'bold' }}>↑</span>}
        </div>
    );
};

const HemogramaCompactoCompleto = ({ selectedExam, examDetails, statusReal, patientCode, signatureSignedUrl, isComposed = false }) => {
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
            const pCode = String(param.parameter_code ?? param.parameterCode ?? param.code ?? '').trim().toUpperCase();
            const pName = String(param.parameter_name ?? '').trim().toUpperCase();
            const isHemoglobina = pCode === 'HEMOGLOBINA' || pName === 'HEMOGLOBINA';
            const displayUnit = isHemoglobina ? 'g/dL' : (param.unit ? param.unit.replace(/\/mm3/g, '/mm³') : '');

            return (
                <div key={param.id} className="hemo-eritro-grid">
                    <div className="hemo-col-name">{param.parameter_name || param.parameter_code}</div>
                    <div className={`hemo-col-result ${isAbnormalRel ? 'hemo-abnormal' : ''}`}>{formattedResult}</div>
                    <div className="hemo-col-unit">{displayUnit}</div>
                    <div className="hemo-col-graph">
                        {refObj.valid && !refObj.isFixed && <GraficoHemo value={valNum} min={refObj.relMin} max={refObj.relMax} parameterCode={param.parameter_code} />}
                    </div>
                    <div className="hemo-col-ref-group">
                        <div className="hemo-sex-reference-grid">
                            {singleLine ? (
                                <>
                                    <div className={`hemo-col-ref-male ${sexGroup === 'MALE' ? 'hemo-highlight' : ''}`}>{singleLine.text}</div>
                                    <div className={`hemo-col-ref-female ${sexGroup === 'FEMALE' ? 'hemo-highlight' : ''}`}>{singleLine.text}</div>
                                </>
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
            const code = String(item.parameter_code ?? item.parameterCode ?? item.code ?? '').trim().toUpperCase();
            if (targetCode === 'OBS_ERITROGRAMA' && (code === 'OBSERVACOES_ERITROGRAMA' || code === 'OBS_ERITROGRAMA')) return true;
            if (targetCode === 'SERIE_ERITROCITARIA' && (code === 'SERIE_ERITROCITARIA' || code === 'S_ERITROCITARIA')) return true;
            if (targetCode === 'SERIE_LEUCOCITARIA' && (code === 'SERIE_LEUCOCITARIA' || code === 'S_LEUCOCITARIA')) return true;
            if (targetCode === 'SERIE_PLAQUETARIA' && (code === 'SERIE_PLAQUETARIA' || code === 'S_PLAQUETARIA')) return true;
            if (targetCode === 'OBS_MORFOLOGICAS' && (code === 'OBS_MORFOLOGICAS' || code === 'OBSERVACOES_MORFOLOGICAS' || code === 'OBS_MORFOLOGIA' || code === 'MORFOLOGIA')) return true;
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
        <div className={`hemo-compact-container hemo-compact-hemo${isComposed ? ' laudo-model-composed' : ''}`}>
            <div className="hemo-report-main">
                {/* Cabeçalho Hemo */}
                <div className="hemo-header">
                <div className="hemo-header-logo">
                    <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="hemo-header-center">
                    <h2>
                        LABORATÓRIO MUNICIPAL<br/>
                        LINDOBERG CÂNDIDO DE SOUZA
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
                    <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeRecife(selectedExam?.attendance_created_at || selectedExam?.created_at)}</div>
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
                        const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_date ?? selectedExam?.attendance_exam?.collection_date;
                        const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_time ?? selectedExam?.attendance_exam?.collection_time;
                        const dateBR = formatDateOnlyBR(cDate);
                        const timeBR = formatTimeOnly(cTime);
                        if (dateBR !== '--') {
                            return (
                                <>
                                    <span className="hemo-collection-date">{dateBR}</span>
                                    {timeBR && <span className="hemo-collection-separator">às</span>}
                                    {timeBR && <span className="hemo-collection-time">{timeBR}h</span>}
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
                    const obsMorf = getHemoTextResult('OBS_MORFOLOGICAS');
                    const obsEri = getHemoTextResult('OBS_ERITROGRAMA');
                    const serEri = getHemoTextResult('SERIE_ERITROCITARIA');
                    const serLeu = getHemoTextResult('SERIE_LEUCOCITARIA');
                    const serPlaq = getHemoTextResult('SERIE_PLAQUETARIA');
                    return (
                        <>
                            {isValid(obsMorf) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">OBSERVAÇÕES MORFOLÓGICAS:</div>
                                    <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{expandHemogramaMorphologyAbbreviations(obsMorf)}</div>
                                </div>
                            )}
                            {isValid(obsEri) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">OBSERVAÇÕES DO ERITROGRAMA:</div>
                                    <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{expandHemogramaMorphologyAbbreviations(obsEri)}</div>
                                </div>
                            )}
                            {isValid(serEri) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE ERITROCITÁRIA:</div>
                                    <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{expandHemogramaMorphologyAbbreviations(serEri)}</div>
                                </div>
                            )}
                            {isValid(serLeu) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE LEUCOCITÁRIA:</div>
                                    <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{expandHemogramaMorphologyAbbreviations(serLeu)}</div>
                                </div>
                            )}
                            {isValid(serPlaq) && (
                                <div className="hemo-series-item">
                                    <div className="hemo-series-title">SÉRIE PLAQUETÁRIA:</div>
                                    <div className="hemo-series-text" style={{ whiteSpace: 'pre-line' }}>{expandHemogramaMorphologyAbbreviations(serPlaq)}</div>
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

const cleanValueURI = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    if (str === '') return '';
    if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '';
    
    const lower = str.toLowerCase();
    if (lower === 'não cadastrada' || lower === 'não cadastrado' || lower === 'ausente na amostra analisada') return '';
    
    const internalCodes = ['AS', 'ACL', 'L', 'NO', 'N', 'VAR', 'ALG'];
    if (internalCodes.includes(str.toUpperCase())) return '';
    
    return str;
};

const LaudoURI = ({ selectedExam, examDetails, formatDateTimeH, patientCode, formatAttendanceOrigin, signatureSignedUrl, isComposed = false }) => {
    const getParam = (names) => {
        return examDetails.find(p => {
            const code = (p.parameter_code || p.code || p.parameter_name || '').toUpperCase().trim();
            const name = (p.parameter_name || '').toUpperCase().trim();
            const nCode = code.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const nName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return names.some(n => {
                const nn = n.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return nCode === nn || nName === nn || nCode.includes(nn) || nName.includes(nn);
            });
        });
    };

    const renderRow = (label, names) => {
        const param = getParam(names);
        if (!param) return null;
        
        let res = param.value_numeric !== null && param.value_numeric !== undefined 
            ? param.value_numeric.toString().replace('.', ',') 
            : param.value_text;
            
        res = cleanValueURI(res);
        let unit = cleanValueURI(param.unit);
        
        if (!res) return null;

        return (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', borderBottom: '1px solid #f8fafc', padding: '3px 4px', fontSize: '11px' }}>
                <div style={{ fontWeight: 500, color: '#334155' }}>{label}</div>
                <div style={{ color: '#0f172a' }}>{res}</div>
                <div style={{ color: '#64748b' }}>{unit}</div>
            </div>
        );
    };

    const obsParam = examDetails.find(p => {
        const name = (p.parameter_name || p.parameter_code || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return name === 'OBSERVACAO';
    });
    const obsVal = cleanValueURI(obsParam?.value_text ?? obsParam?.value ?? obsParam?.value_numeric);

    return (
        <div className={`hemo-compact-container${isComposed ? ' laudo-model-composed' : ''}`}>
            <div className="hemo-report-main">
                <div className="hemo-header">
                    <div className="hemo-header-logo">
                        <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="hemo-header-center">
                        <h2>LABORATÓRIO MUNICIPAL<br/>LINDOBERG CÂNDIDO DE SOUZA</h2>
                        <p>Sistema Gestão Pública Inteligente</p>
                    </div>
                    <div className="hemo-header-right">
                        <img src="/logo-bezerros.png" alt="Prefeitura" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                </div>

                <div className="hemo-patient-box">
                    <div className="hemo-patient-col">
                        <div><span className="hemo-lbl">Paciente:</span> {selectedExam?.pacienteNome}</div>
                        <div><span className="hemo-lbl">Médico:</span> {selectedExam?.medico || 'NÃO INFORMADO'}</div>
                        <div><span className="hemo-lbl">Cód. Paciente:</span> {patientCode || selectedExam?.pacienteCode || selectedExam?.patientCode || '---'}</div>
                        <div><span className="hemo-lbl">Data Nasc.:</span> {selectedExam?.pacienteDataNascimento}</div>
                        <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeRecife(selectedExam?.attendance_created_at || selectedExam?.created_at)}</div>
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

                <div className="hemo-exam-title-bar">
                    <h3>URI - Urina Tipo I</h3>
                    <div className="hemo-collection-info">
                        <span className="hemo-collection-label">Data da Coleta:</span>
                        {(() => {
                            const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_date ?? selectedExam?.attendance_exam?.collection_date;
                            const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_time ?? selectedExam?.attendance_exam?.collection_time;
                            const dateBR = formatDateOnlyBR(cDate);
                            const timeBR = formatTimeOnly(cTime);
                            if (dateBR !== '--') {
                                return (
                                    <>
                                        <span className="hemo-collection-date">{dateBR}</span>
                                        {timeBR && <span className="hemo-collection-separator">às</span>}
                                        {timeBR && <span className="hemo-collection-time">{timeBR}h</span>}
                                    </>
                                );
                            }
                            return <span className="hemo-collection-date">---</span>;
                        })()}
                    </div>
                </div>

                <div className="hemo-section">
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '11px', color: '#64748b', marginBottom: '8px', padding: '0 4px' }}>
                        <div><strong>Material:</strong> <span style={{ color: '#0f172a' }}>Urina</span></div>
                        <div><strong>Método:</strong> <span style={{ color: '#0f172a' }}>Químico - Microscópico</span></div>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px' }}>EXAME FÍSICO</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', padding: '2px 4px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                            <div>PARÂMETRO</div><div>RESULTADO</div><div>UNIDADE</div>
                        </div>
                        {renderRow('Volume', ['VOLUME'])}
                        {renderRow('Cor', ['COR'])}
                        {renderRow('Aspecto', ['ASPECTO'])}
                        {renderRow('Densidade', ['DENSIDADE'])}
                        {renderRow('pH', ['PH'])}
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px' }}>EXAME QUÍMICO</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', padding: '2px 4px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                            <div>PARÂMETRO</div><div>RESULTADO</div><div>UNIDADE</div>
                        </div>
                        {renderRow('Proteínas', ['PROTEINA', 'PROTEINAS'])}
                        {renderRow('Corpos Cetônicos', ['CETONICOS', 'CORPOS', 'CETONAS'])}
                        {renderRow('Glicose', ['GLICOSE'])}
                        {renderRow('Urobilinogênio', ['UROBILINOGENIO'])}
                        {renderRow('Bilirrubina', ['BILIRRUBINA', 'BILIRRUBINAS'])}
                        {renderRow('Sangue/Hemoglobina', ['SANGUE', 'HEMOGLOBINA'])}
                        {renderRow('Nitrito', ['NITRITO', 'NITRITOS'])}
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px' }}>SEDIMENTOSCOPIA</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', padding: '2px 4px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                            <div>PARÂMETRO</div><div>RESULTADO</div><div>UNIDADE</div>
                        </div>
                        {renderRow('Células Epiteliais', ['CELULAS', 'EPITELIAIS'])}
                        {renderRow('Filamentos de Muco', ['MUCO', 'FILAMENTOS'])}
                        {renderRow('Leucócitos', ['LEUCOCITO', 'PIOCITO'])}
                        {renderRow('Hemácias', ['HEMACIA', 'ERITROCITO'])}
                        {renderRow('Bactérias', ['BACTERIA'])}
                        {renderRow('Cilindros', ['CILINDRO'])}
                        {renderRow('Cristais', ['CRISTAL', 'CRISTAIS'])}
                        {renderRow('Estruturas Leveduriformes', ['LEVEDUR'])}
                    </div>

                    {obsVal && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px' }}>OBSERVAÇÃO</div>
                            <div style={{ fontSize: '11px', color: '#0f172a', padding: '2px 4px', whiteSpace: 'pre-wrap' }}>{obsVal}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="hemo-report-bottom">
                <div className="hemo-signature-area">
                    {selectedExam?.responsible_name ? (
                        <>
                            {signatureSignedUrl && <img src={signatureSignedUrl} alt="Assinatura" className="lab-report-signature-image" />}
                            <div className="hemo-signature-name" style={{ marginTop: signatureSignedUrl ? '2px' : '20px' }}>
                                {selectedExam.responsible_name.toUpperCase()}
                                {selectedExam.responsible_crbm && <><br /><span style={{ fontWeight: 400, fontSize: '0.78em' }}>Biomédico(a) — CRBM {selectedExam.responsible_crbm}</span></>}
                            </div>
                            {selectedExam.checked_at && (
                                <div className="hemo-signature-date">
                                    Conferido e assinado eletronicamente em {new Date(selectedExam.checked_at).toLocaleString('pt-BR')}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="hemo-signature-line"></div>
                            <div className="hemo-signature-name">Biomédico(a) Responsável</div>
                            {selectedExam?.released_at && <div className="hemo-signature-date">Liberado eletronicamente em {new Date(selectedExam.released_at).toLocaleString('pt-BR')}</div>}
                            <div style={{ fontSize: '0.7em', color: '#94a3b8', marginTop: '2px' }}>Dados profissionais indisponíveis para este laudo anterior.</div>
                        </>
                    )}
                </div>
                <div className="hemo-footer-address">Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros - PE - CEP: 55.660-000</div>
            </div>
        </div>
    );
};

const LaudoPAR = ({ selectedExam, examDetails, formatDateTimeH, patientCode, formatAttendanceOrigin, signatureSignedUrl, isComposed = false }) => {
    const isObs = (name) => {
        const n = (name || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return n === 'OBSERVACAO' || n === 'OBSERVACAO GERAL';
    };

    const obsParam = examDetails.find(p => isObs(p.parameter_name || p.parameter_code || ''));
    const obsVal = cleanValueURI(obsParam?.value_text ?? obsParam?.value ?? obsParam?.value_numeric);

    const renderRow = (param) => {
        let res = param.value_numeric !== null && param.value_numeric !== undefined 
            ? param.value_numeric.toString().replace('.', ',') 
            : param.value_text;
            
        res = cleanValueURI(res);
        if (!res) return null;
        
        return (
            <div key={param.id} style={{ display: 'grid', gridTemplateColumns: '50% 50%', borderBottom: '1px solid #f8fafc', padding: '3px 4px', fontSize: '11px' }}>
                <div style={{ fontWeight: 500, color: '#334155' }}>{param.parameter_name || param.parameter_code}</div>
                <div style={{ color: '#0f172a' }}>{res}</div>
            </div>
        );
    };

    return (
        <div className={`hemo-compact-container${isComposed ? ' laudo-model-composed' : ''}`}>
            <div className="hemo-report-main">
                <div className="hemo-header">
                    <div className="hemo-header-logo">
                        <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="hemo-header-center">
                        <h2>LABORATÓRIO MUNICIPAL<br/>LINDOBERG CÂNDIDO DE SOUZA</h2>
                        <p>Sistema Gestão Pública Inteligente</p>
                    </div>
                    <div className="hemo-header-right">
                        <img src="/logo-bezerros.png" alt="Prefeitura" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                </div>

                <div className="hemo-patient-box">
                    <div className="hemo-patient-col">
                        <div><span className="hemo-lbl">Paciente:</span> {selectedExam?.pacienteNome}</div>
                        <div><span className="hemo-lbl">Médico:</span> {selectedExam?.medico || 'NÃO INFORMADO'}</div>
                        <div><span className="hemo-lbl">Cód. Paciente:</span> {patientCode || selectedExam?.pacienteCode || selectedExam?.patientCode || '---'}</div>
                        <div><span className="hemo-lbl">Data Nasc.:</span> {selectedExam?.pacienteDataNascimento}</div>
                        <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeRecife(selectedExam?.attendance_created_at || selectedExam?.created_at)}</div>
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

                <div className="hemo-exam-title-bar">
                    <h3>PAR - Parasitológico de Fezes</h3>
                    <div className="hemo-collection-info">
                        <span className="hemo-collection-label">Data da Coleta:</span>
                        {(() => {
                            const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_date ?? selectedExam?.attendance_exam?.collection_date;
                            const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_time ?? selectedExam?.attendance_exam?.collection_time;
                            const dateBR = formatDateOnlyBR(cDate);
                            const timeBR = formatTimeOnly(cTime);
                            if (dateBR !== '--') {
                                return (
                                    <>
                                        <span className="hemo-collection-date">{dateBR}</span>
                                        {timeBR && <span className="hemo-collection-separator">às</span>}
                                        {timeBR && <span className="hemo-collection-time">{timeBR}h</span>}
                                    </>
                                );
                            }
                            return <span className="hemo-collection-date">---</span>;
                        })()}
                    </div>
                </div>

                <div className="hemo-section">
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '11px', color: '#64748b', marginBottom: '8px', padding: '0 4px' }}>
                        <div><strong>Material:</strong> <span style={{ color: '#0f172a' }}>Fezes</span></div>
                        <div><strong>Método:</strong> <span style={{ color: '#0f172a' }}>Hoffman</span></div>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', padding: '2px 4px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                            <div>PARÂMETRO</div><div>RESULTADO</div>
                        </div>
                        {examDetails.filter(p => !isObs(p.parameter_name || p.parameter_code || '')).map(renderRow)}
                    </div>

                    {obsVal && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px' }}>OBSERVAÇÃO</div>
                            <div style={{ fontSize: '11px', color: '#0f172a', padding: '2px 4px', whiteSpace: 'pre-wrap' }}>{obsVal}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="hemo-report-bottom">
                <div className="hemo-signature-area">
                    {selectedExam?.responsible_name ? (
                        <>
                            {signatureSignedUrl && <img src={signatureSignedUrl} alt="Assinatura" className="lab-report-signature-image" />}
                            <div className="hemo-signature-name" style={{ marginTop: signatureSignedUrl ? '2px' : '20px' }}>
                                {selectedExam.responsible_name.toUpperCase()}
                                {selectedExam.responsible_crbm && <><br /><span style={{ fontWeight: 400, fontSize: '0.78em' }}>Biomédico(a) — CRBM {selectedExam.responsible_crbm}</span></>}
                            </div>
                            {selectedExam.checked_at && (
                                <div className="hemo-signature-date">
                                    Conferido e assinado eletronicamente em {new Date(selectedExam.checked_at).toLocaleString('pt-BR')}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="hemo-signature-line"></div>
                            <div className="hemo-signature-name">Biomédico(a) Responsável</div>
                            {selectedExam?.released_at && <div className="hemo-signature-date">Liberado eletronicamente em {new Date(selectedExam.released_at).toLocaleString('pt-BR')}</div>}
                            <div style={{ fontSize: '0.7em', color: '#94a3b8', marginTop: '2px' }}>Dados profissionais indisponíveis para este laudo anterior.</div>
                        </>
                    )}
                </div>
                <div className="hemo-footer-address">Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros - PE - CEP: 55.660-000</div>
            </div>
        </div>
    );
};

const resolveGLIReferenceRange = (referenceText, patient) => {
    if (!referenceText) return null;
    const regex = /crian[çc]as\s+e\s+adultos\s*:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i;
    const match = String(referenceText).match(regex);
    if (match) {
        return {
            min: parseFloat(match[1].replace(',', '.')),
            max: parseFloat(match[2].replace(',', '.'))
        };
    }
    return null;
};

const resolveVHSReferenceRange = (referenceText, patientSex, patientAgeDays) => {
    if (!referenceText) return null;
    const text = String(referenceText).toLowerCase();
    const isChild = patientAgeDays !== null && patientAgeDays < (12 * 365.25);

    if (isChild) {
        const match = text.match(/crian[çc]as?\s*:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i);
        if (match) return { min: parseFloat(match[1].replace(',', '.')), max: parseFloat(match[2].replace(',', '.')) };
    }
    
    if (patientSex === 'MALE' || patientSex === 'M') {
        const match = text.match(/(?:homens|masculino).*?:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i);
        if (match) return { min: parseFloat(match[1].replace(',', '.')), max: parseFloat(match[2].replace(',', '.')) };
    } else if (patientSex === 'FEMALE' || patientSex === 'F') {
        const match = text.match(/(?:mulheres|feminino).*?:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i);
        if (match) return { min: parseFloat(match[1].replace(',', '.')), max: parseFloat(match[2].replace(',', '.')) };
    }
    return null;
};

const resolveTGOReferenceRange = (referenceText, patientSex, patientAgeDays) => {
    if (!referenceText) return null;
    const text = String(referenceText).toLowerCase();
    
    if (patientSex === 'MALE' || patientSex === 'M') {
        const match = text.match(/(?:homens|masculino).*?:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i);
        if (match) return { min: parseFloat(match[1].replace(',', '.')), max: parseFloat(match[2].replace(',', '.')) };
    } else if (patientSex === 'FEMALE' || patientSex === 'F') {
        const match = text.match(/(?:mulheres|feminino).*?:\s*([\d.,]+)\s*[-–a]\s*([\d.,]+)/i);
        if (match) return { min: parseFloat(match[1].replace(',', '.')), max: parseFloat(match[2].replace(',', '.')) };
    }
    return null;
};

const parseISODateShort = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('T');
    const d = parts[0].split('-');
    if (d.length !== 3) return '';
    return `${d[2]}/${d[1]}/${d[0].slice(-2)}`;
};

const parseISOTimeShort = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('T');
    if (parts.length < 2) return '';
    const t = parts[1].split(':');
    if (t.length >= 2) return `${t[0]}:${t[1]}`;
    return '';
};

const GraficoHistoricoExame = ({ historico, refMin, refMax, subtitle, examCode }) => {
    if (!historico || historico.length <= 1) {
        return null;
    }

    const width = 440;
    const height = 135;
    
    // As mesmas constantes exatas do GLI (resolvidas para suas coordenadas reais absolutas)
    const plotLeft = 74;
    const rightMargin = 28;
    const plotRight = width - rightMargin; // equivale a 412
    const plotWidth = plotRight - plotLeft; // equivale a 338

    const plotTop = 32;
    const plotBottom = 36;
    
    const innerWidth = plotWidth;
    const innerHeight = height - plotTop - plotBottom;

    const values = historico.map(h => h.value);
    let minValRaw = Math.min(...values);
    let maxValRaw = Math.max(...values);
    
    // Para HDL, forçamos os limites visuais no gráfico
    let finalRefMin = refMin;
    let finalRefMax = refMax;
    if (examCode === 'HDL') {
        finalRefMin = 40;
        finalRefMax = 60;
    }
    
    if (typeof finalRefMin === 'number' && !isNaN(finalRefMin)) minValRaw = Math.min(minValRaw, finalRefMin);
    if (typeof finalRefMax === 'number' && !isNaN(finalRefMax)) maxValRaw = Math.max(maxValRaw, finalRefMax);

    // Add margin
    const margin = (maxValRaw - minValRaw) * 0.2 || 10;
    const minVal = minValRaw - margin;
    const maxVal = maxValRaw + margin;
    const range = maxVal - minVal;

    const getY = (val) => plotTop + innerHeight - ((val - minVal) / range) * innerHeight;

    // Distância extra interna para os pontos não colarem nas bordas da área de plotagem
    const pointMarginX = 16;
    const pointAreaWidth = innerWidth - (pointMarginX * 2);

    const points = historico.map((h, i) => {
        const x = historico.length === 1
            ? plotLeft + pointMarginX + pointAreaWidth / 2
            : plotLeft + pointMarginX + (i / (historico.length - 1)) * pointAreaWidth;
        const y = getY(h.value);
        return { ...h, x, y, isLast: i === historico.length - 1 };
    });

    const dateCounts = {};
    points.forEach(p => {
        dateCounts[p.dateText] = (dateCounts[p.dateText] || 0) + 1;
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

    const hasRefMin = typeof finalRefMin === 'number' && !isNaN(finalRefMin);
    const hasRefMax = typeof finalRefMax === 'number' && !isNaN(finalRefMax);
    const showRef = hasRefMin || hasRefMax;
    const referenceLabelX = plotLeft - 10;

    return (
        <div style={{ marginTop: '20px', maxWidth: `${width}px` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>RESULTADOS ANTERIORES</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{subtitle || 'Evolução'}</span>
            </div>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', background: '#fafaf9', display: 'block', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                {showRef && (
                    <>
                        {/* Bandas de Referência */}
                        {examCode !== 'HDL' && hasRefMin && hasRefMax && (
                            <rect x={plotLeft} y={getY(finalRefMax)} width={plotWidth} height={getY(finalRefMin) - getY(finalRefMax)} fill="#f1f5f9" />
                        )}
                        {examCode === 'HDL' && hasRefMax && (
                            <rect x={plotLeft} y={plotTop} width={plotWidth} height={getY(finalRefMax) - plotTop} fill="#f1f5f9" />
                        )}
                        {examCode !== 'HDL' && hasRefMax && !hasRefMin && (
                            <rect x={plotLeft} y={getY(finalRefMax)} width={plotWidth} height={(plotTop + innerHeight) - getY(finalRefMax)} fill="#f1f5f9" />
                        )}
                        {examCode !== 'HDL' && hasRefMin && !hasRefMax && (
                            <rect x={plotLeft} y={plotTop} width={plotWidth} height={getY(finalRefMin) - plotTop} fill="#f1f5f9" />
                        )}
                        
                        {/* Guias superiores e inferiores */}
                        {hasRefMax && <line x1={plotLeft} y1={getY(finalRefMax)} x2={plotRight} y2={getY(finalRefMax)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />}
                        {hasRefMin && <line x1={plotLeft} y1={getY(finalRefMin)} x2={plotRight} y2={getY(finalRefMin)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />}
                        
                        {/* Labels da Referência */}
                        {hasRefMax && <text x={referenceLabelX} y={getY(finalRefMax) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{String(finalRefMax).replace('.', ',')}</text>}
                        {hasRefMin && <text x={referenceLabelX} y={getY(finalRefMin) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{String(finalRefMin).replace('.', ',')}</text>}
                    </>
                )}
                
                {/* Linha de Evolução */}
                <path d={pathD} fill="none" stroke="#334155" strokeWidth="1.8" />
                
                {/* Pontos e Textos */}
                {points.map((p, i) => {
                    // Detecção de colisão visual (eixo Y) entre o valor do ponto e o rótulo refMin
                    const baseTextY = p.y - 12;
                    const refMinLabelY = getY(refMin) + 3;
                    const isColliding = showRef && Math.abs(baseTextY - refMinLabelY) < 12;

                    const textOffsetX = isColliding ? 5 : 0;
                    const textOffsetY = isColliding ? 7 : 0;

                    return (
                        <g key={i}>
                            {/* Círculo */}
                            <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={p.isLast ? 4 : 3} 
                                fill={p.isLast ? '#0f172a' : '#64748b'} 
                                stroke="#ffffff"
                                strokeWidth="1.5"
                            />
                            
                            {/* Valor acima do ponto */}
                            <text 
                                x={p.x + textOffsetX} 
                                y={baseTextY - textOffsetY} 
                                fontSize={p.isLast ? "12" : "11"} 
                                fill={p.isLast ? '#0f172a' : '#475569'} 
                                textAnchor={isColliding ? "start" : "middle"} 
                                fontWeight={p.isLast ? 'bold' : '500'}
                            >
                                {String(p.value).replace('.', ',')}
                            </text>
                            
                            {/* Data abaixo do ponto (Y fixo na margem inferior para não pular) */}
                            <text 
                                x={p.x} 
                                y={height - 18} 
                                fontSize="10" 
                                fill={p.isLast ? '#334155' : '#64748b'} 
                                textAnchor="middle" 
                                fontWeight={p.isLast ? '600' : 'normal'}
                            >
                                {p.dateText}
                            </text>
                            
                            {/* Hora caso haja mais de 1 no mesmo dia */}
                            {dateCounts[p.dateText] > 1 && p.timeText && (
                                <text x={p.x} y={height - 6} fontSize="9" fill="#94a3b8" textAnchor="middle">
                                    {p.timeText}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const LaudoExameSimples = ({ selectedExam, examDetails, loadingDetails, formatDateTimeH, patientCode, formatAttendanceOrigin, signatureSignedUrl, isComposed = false }) => {
    const [historicoExame, setHistoricoExame] = useState(null);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const examCode = getExamCode(selectedExam);
        
        // Sempre limpa o histórico ao mudar o exame (evita gráfico piscando ou reutilizado)
        setHistoricoExame(null);
        
        const allowedHistoryExams = ['GLI', 'HDL', 'URE', 'CRE', 'TRI', 'AUR', 'LDL', 'VLDL', 'COL', 'BIL'];
        
        if (allowedHistoryExams.includes(examCode) && selectedExam?.patient_id && selectedExam?.id) {
            
            const currCDate = selectedExam.collection_date ?? selectedExam.attendance_date ?? selectedExam.attendance_exam?.collection_date;
            const currCTime = selectedExam.collection_time ?? selectedExam.attendance_time ?? selectedExam.attendance_exam?.collection_time;
            let currentTimestamp = null;
            if (currCDate) {
                currentTimestamp = currCTime ? `${currCDate}T${currCTime}` : `${currCDate}T00:00:00`;
            } else {
                const backupDate = selectedExam.checked_at || selectedExam.released_at || selectedExam.dataAtendimentoRaw;
                if (backupDate) {
                    currentTimestamp = backupDate.includes('T') ? backupDate : `${backupDate}T00:00:00`;
                }
            }

            setLoadingHistorico(true);
            laboratorioLaudosService.buscarHistoricoExame(examCode, selectedExam.patient_id, selectedExam.id, currentTimestamp)
                .then(historico => {
                    if (!isMounted) return;
                    
                    if (historico && historico.length > 0) {
                        let finalHistorico = [...historico];
                        
                        // Encontra o parâmetro numérico atual (pode não ser o primeiro em alguns exames)
                        if (examDetails && examDetails.length > 0) {
                            const param = examCode === 'BIL' 
                                ? examDetails.find(p => (p.parameter_name || p.parameter_code || '').toUpperCase().includes('TOTAL'))
                                : examDetails.find(p => p.value_numeric !== null || !isNaN(parseFloat(String(p.value_text || p.value || p.resultado).replace(',', '.'))));
                            if (param) {
                                let numVal = param.value_numeric;
                                if (numVal === null || numVal === undefined) {
                                    const parsed = parseFloat(String(param.value_text || param.value || param.resultado).replace(',', '.'));
                                    if (!isNaN(parsed)) numVal = parsed;
                                }
                                if (numVal !== null && numVal !== undefined && currentTimestamp) {
                                    finalHistorico.push({
                                        id: selectedExam.id,
                                        value: numVal,
                                        dateText: parseISODateShort(currentTimestamp),
                                        timeText: parseISOTimeShort(currentTimestamp),
                                        rawDate: currentTimestamp,
                                        histTime: new Date(currentTimestamp).getTime()
                                    });
                                }
                            }
                        }
                        
                        // Parse dates for history
                        finalHistorico = finalHistorico.map(h => ({
                            ...h,
                            dateText: h.dateText ? h.dateText : parseISODateShort(h.rawDate),
                            timeText: h.timeText ? h.timeText : parseISOTimeShort(h.rawDate)
                        }));
                        
                        // Ordenar por data/hora real de coleta crescente (mais antigo -> mais recente -> atual)
                        finalHistorico.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

                        setHistoricoExame(finalHistorico.length > 1 ? finalHistorico : []); 
                    } else {
                        setHistoricoExame([]);
                    }
                })
                .catch(err => {
                    console.error('Erro buscar histórico do exame', err);
                    if (isMounted) setHistoricoExame([]);
                })
                .finally(() => {
                    if (isMounted) setLoadingHistorico(false);
                });
        } else {
            setHistoricoExame(null);
        }

        return () => { isMounted = false; };
    }, [selectedExam?.id, selectedExam?.patient_id, examDetails]);

    // Format Collection Date
    const cDate = selectedExam?.collection_date ?? selectedExam?.attendance_date ?? selectedExam?.attendance_exam?.collection_date;
    const cTime = selectedExam?.collection_time ?? selectedExam?.attendance_time ?? selectedExam?.attendance_exam?.collection_time;
    const dateBR = formatDateOnlyBR(cDate);
    const timeBR = formatTimeOnly(cTime);

    // General Observation Filtering
    let generalObs = (selectedExam?.observacaoGeral || '').trim();
    if (generalObs.startsWith('[Devolvido para correção]')) {
        generalObs = '';
    }

    // Pre-processamento para TC, TS e GSRH
    const patientSexGroup = selectedExam?.patient_sex === 'M' ? 'MALE' : selectedExam?.patient_sex === 'F' ? 'FEMALE' : 'UNKNOWN';
    let patientAgeDays = -1;
    if (selectedExam?.birth_date) {
        const bDate = new Date(selectedExam.birth_date);
        const aDate = new Date();
        if (!isNaN(bDate)) {
            patientAgeDays = Math.floor((aDate - bDate) / (1000 * 60 * 60 * 24));
        }
    }

    let finalExamDetails = [...(examDetails || [])].map(p => ({ ...p }));
    const examCode = getExamCode(selectedExam);
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
                const raw = String(p.value_text ?? p.value_numeric ?? p.resultado ?? p.value ?? '').trim().toUpperCase();
                if (raw === '' || raw === 'D FRACO' || raw === 'VARIANTE GENÉTICA' || raw === 'VARIANTE GENETICA' || raw === 'VARIANTE GENÉTICA (D FRACO)' || raw === 'VARIANTE GENETICA (D FRACO)' || raw === 'NULL' || raw === 'UNDEFINED') {
                    return false;
                }
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
        <div className={`hemo-compact-container${isComposed ? ' laudo-model-composed' : ''}`}>
            <div className="hemo-report-main">
                {/* Cabeçalho Hemo */}
                <div className="hemo-header">
                    <div className="hemo-header-logo">
                        <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="hemo-header-center">
                        <h2>
                            LABORATÓRIO MUNICIPAL<br/>
                            LINDOBERG CÂNDIDO DE SOUZA
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
                        <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeRecife(selectedExam?.attendance_created_at || selectedExam?.created_at)}</div>
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
                        {dateBR !== '--' ? (
                            <>
                                <span className="hemo-collection-date">{dateBR}</span>
                                {timeBR && <span className="hemo-collection-separator">às</span>}
                                {timeBR && <span className="hemo-collection-time">{timeBR}h</span>}
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
                            
                            const pType = (param.result_type || selectedExam?.result_type || '').toUpperCase();
                            const isQualitative = pType === 'QUALITATIVO';
                            
                            let displayValue = '';
                            if (pType === 'TEXTO' || (!isNumericValid && textValue !== '')) {
                                displayValue = textValue;
                            } else if (isNumericValid) {
                                displayValue = param.value_numeric.toString().replace('.', ',');
                            } else {
                                displayValue = textValue;
                            }

                            let finalMin = param.min_value !== null && param.min_value !== undefined ? String(param.min_value).replace(',', '.') : null;
                            let finalMax = param.max_value !== null && param.max_value !== undefined ? String(param.max_value).replace(',', '.') : null;

                            if (examCode === 'VHS' && (finalMin === null || finalMax === null) && param.reference_text) {
                                const ref = resolveVHSReferenceRange(param.reference_text, patientSexGroup, patientAgeDays);
                                if (ref) {
                                    finalMin = ref.min;
                                    finalMax = ref.max;
                                }
                            }
                            if (examCode === 'TGO' && (finalMin === null || finalMax === null) && param.reference_text) {
                                const ref = resolveTGOReferenceRange(param.reference_text, patientSexGroup, patientAgeDays);
                                if (ref) {
                                    finalMin = ref.min;
                                    finalMax = ref.max;
                                }
                            }

                            let valForAbnormal = param.value_numeric;
                            if (valForAbnormal === null || valForAbnormal === undefined) {
                                if (param.value_text) {
                                    valForAbnormal = parseFloat(String(param.value_text).replace(',', '.'));
                                    if (isNaN(valForAbnormal)) valForAbnormal = null;
                                }
                            }

                            const abnormalStatus = isQualitative ? 'normal' : isAbnormal(valForAbnormal, finalMin, finalMax);
                            const isObservationParam = (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVACAO' || (param.parameter_name || param.parameter_code || '').toUpperCase() === 'OBSERVAÇÃO';

                            // Ajuste pontual exclusivo para parâmetros do exame TAP (exceto a observação geral)
                            if (examCode === 'TAP' && !isObservationParam && displayValue) {
                                const pName = (param.parameter_name || param.parameter_code || '').toUpperCase();
                                
                                let minimoCasas = 0;
                                if (pName.includes('PROTROMBINA')) {
                                    minimoCasas = 1;
                                } else if (pName.includes('ATIVIDADE')) {
                                    minimoCasas = 1;
                                } else if (pName.includes('INR') || pName.includes('I.N.R')) {
                                    minimoCasas = 2;
                                }
                                
                                const formatarDecimalTap = (valorAtual, minCasas) => {
                                    if (!valorAtual) return valorAtual;
                                    let valStr = String(valorAtual).replace(',', '.').trim();
                                    if (isNaN(Number(valStr)) || valStr === '') return String(valorAtual).replace('.', ',');

                                    let parts = valStr.split('.');
                                    let integerPart = parts[0];
                                    let decimalPart = parts.length > 1 ? parts[1] : '';

                                    if (decimalPart.length < minCasas) {
                                        decimalPart = decimalPart.padEnd(minCasas, '0');
                                    }

                                    return decimalPart.length > 0 ? `${integerPart},${decimalPart}` : integerPart;
                                };
                                
                                displayValue = formatarDecimalTap(isNumericValid ? param.value_numeric : textValue, minimoCasas);
                            }

                            if (isObservationParam) {
                                const finalObsValue = (examCode === 'HEMO')
                                    ? expandHemogramaMorphologyAbbreviations(displayValue)
                                    : displayValue;
                                return (
                                    <div key={param.id} className="hemo-series-block" style={{ borderTop: 'none', marginTop: '2px' }}>
                                        <div className="hemo-series-item">
                                            <div className="hemo-series-title">Observação:</div>
                                            <div className="hemo-series-text" style={{ whiteSpace: 'pre-wrap' }}>{finalObsValue}</div>
                                        </div>
                                    </div>
                                );
                            }

                            let chartMin = param.min_value !== null ? parseFloat(param.min_value) : NaN;
                            let chartMax = param.max_value !== null ? parseFloat(param.max_value) : NaN;
                            let resultValue = param.value_numeric !== null && param.value_numeric !== undefined ? parseFloat(param.value_numeric) : NaN;

                            if ((isNaN(chartMin) || isNaN(chartMax)) && examCode === 'GLI' && param.reference_text) {
                                const gliRef = resolveGLIReferenceRange(param.reference_text, selectedExam);
                                if (gliRef) {
                                    chartMin = gliRef.min;
                                    chartMax = gliRef.max;
                                }
                            }
                            
                            const showChart = examCode === 'GLI' && Number.isFinite(resultValue) && Number.isFinite(chartMin) && Number.isFinite(chartMax) && chartMax > chartMin;

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
                                            <div className="hemo-col-ref-single" style={{ gridColumn: showUnitColumn ? '4' : '3', whiteSpace: 'pre-line', justifyContent: 'flex-start', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                                                <div>
                                                    {param.reference_text || (!isQualitative && (param.min_value !== null || param.max_value !== null) ? `${param.min_value || 0} a ${param.max_value || '∞'}` : (examCode === 'TC' || examCode === 'TS' ? '' : 'Não cadastrada'))}
                                                </div>
                                                {showChart && (
                                                    <div className="gli-reference-chart" style={{ width: '140px', minHeight: '20px', display: 'block', overflow: 'visible', marginTop: '4px' }}>
                                                        <GraficoHemo 
                                                            value={resultValue} 
                                                            min={chartMin} 
                                                            max={chartMax} 
                                                            parameterCode={param.parameter_code || 'GLI'} 
                                                            containerMaxWidth="100%"
                                                            containerHeight="20px"
                                                            markerSize={6}
                                                            markHeight={6}
                                                            lineWidth="1px"
                                                            markWidth="1px"
                                                            containerMargin="0"
                                                        />
                                                    </div>
                                                )}
                                                {examCode === 'GLI' && !showChart && process.env.NODE_ENV === 'development' && (
                                                    <div style={{ fontSize: '10px', color: 'orange', marginTop: '4px' }}>
                                                        Faixa GLI não resolvida
                                                        {console.warn('GLI Ref Error:', { resultValue, chartMin, chartMax, text: param.reference_text })}
                                                    </div>
                                                )}
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

                {(() => {
                    const allowedHistoryExams = ['GLI', 'HDL', 'URE', 'CRE', 'TRI', 'AUR', 'LDL', 'VLDL', 'COL', 'BIL'];
                    if (allowedHistoryExams.includes(examCode) && historicoExame) {
                        let refMin = NaN;
                        let refMax = NaN;
                        let subtitle = 'Evolução';
                        let unit = '';
                        
                        if (examDetails && examDetails.length > 0) {
                            const p = examCode === 'BIL' 
                                ? (examDetails.find(param => (param.parameter_name || param.parameter_code || '').toUpperCase().includes('TOTAL')) || examDetails[0])
                                : (examDetails.find(param => param.value_numeric !== null || !isNaN(parseFloat(String(param.value_text || param.value || param.resultado).replace(',', '.')))) || examDetails[0]);
                            unit = p.unit || '';
                            refMin = p.min_value != null && p.min_value !== '' ? parseFloat(String(p.min_value).replace(',', '.')) : NaN;
                            refMax = p.max_value != null && p.max_value !== '' ? parseFloat(String(p.max_value).replace(',', '.')) : NaN;
                            
                            if (examCode === 'GLI' && (isNaN(refMin) || isNaN(refMax)) && p.reference_text) {
                                const ref = resolveGLIReferenceRange(p.reference_text, selectedExam);
                                if (ref) {
                                    refMin = ref.min;
                                    refMax = ref.max;
                                }
                            }
                            
                            // Regra específica para o COL (evita que max_value null desligue a formatação e impede uso do 310)
                            if (examCode === 'COL') {
                                refMin = NaN;
                                refMax = 190;
                            }

                            // Regra específica para BIL: Referência unilateral (somente máxima)
                            if (examCode === 'BIL') {
                                refMin = NaN;
                                if (isNaN(refMax)) {
                                    refMax = 1.2;
                                }
                            }
                        }
                        
                        if (examCode === 'GLI') subtitle = 'Evolução da glicose';
                        else if (examCode === 'URE') subtitle = 'Evolução da ureia';
                        else if (examCode === 'CRE') subtitle = 'Evolução da creatinina';
                        else if (examCode === 'TRI') subtitle = 'Evolução dos triglicerídeos';
                        else if (examCode === 'AUR') subtitle = 'Evolução do ácido úrico';
                        else if (examCode === 'LDL') subtitle = 'Evolução do colesterol LDL';
                        else if (examCode === 'VLDL') subtitle = 'Evolução do colesterol VLDL';
                        else if (examCode === 'COL') subtitle = 'Evolução do colesterol total';
                        else if (examCode === 'HDL') subtitle = 'Evolução do colesterol HDL';
                        else if (examCode === 'BIL') subtitle = 'Evolução da bilirrubina total';
                        
                        if (unit) subtitle += ` (${unit})`;
                        
                        if (examCode === 'HDL') {
                            // Separar anteriores do atual para validação
                            const resultadosAnterioresValidos = (historicoExame || []).filter(h => h.id !== selectedExam.id);
                            
                            if (resultadosAnterioresValidos.length === 0) {
                                return null;
                            }
                            
                            const historico = historicoExame;
                            const subtitleHDL = "Evolução do colesterol HDL (mg/dL)";
                            const refMinHDL = 40;
                            const refMaxHDL = 60;
                            
                            // ---------------------------------------------------------
                            // CÓPIA LITERAL DA LÓGICA DO GLI (GraficoHistoricoExame)
                            // ---------------------------------------------------------
                            const width = 440;
                            const height = 135;
                            
                            const plotLeft = 74;
                            const rightMargin = 28;
                            const plotRight = width - rightMargin; // 412
                            const plotWidth = plotRight - plotLeft; // 338

                            const plotTop = 32;
                            const plotBottom = 36;
                            
                            const innerWidth = plotWidth;
                            const innerHeight = height - plotTop - plotBottom;

                            const values = historico.map(h => h.value);
                            let minValRaw = Math.min(...values);
                            let maxValRaw = Math.max(...values);
                            
                            minValRaw = Math.min(minValRaw, refMinHDL);
                            maxValRaw = Math.max(maxValRaw, refMaxHDL);

                            const margin = (maxValRaw - minValRaw) * 0.2 || 10;
                            const minVal = minValRaw - margin;
                            const maxVal = maxValRaw + margin;
                            const range = maxVal - minVal;

                            const getY = (val) => plotTop + innerHeight - ((val - minVal) / range) * innerHeight;

                            const pointMarginX = 16;
                            const pointAreaWidth = innerWidth - (pointMarginX * 2);

                            const points = historico.map((h, i) => {
                                // Cálculo horizontal sem offset, distribuindo em toda a área útil
                                const x = historico.length === 1
                                    ? plotLeft + pointMarginX + pointAreaWidth / 2
                                    : plotLeft + pointMarginX + (i / (historico.length - 1)) * pointAreaWidth;
                                const y = getY(h.value);
                                return { ...h, x, y, isLast: i === historico.length - 1 };
                            });

                            const dateCounts = {};
                            points.forEach(p => {
                                dateCounts[p.dateText] = (dateCounts[p.dateText] || 0) + 1;
                            });

                            const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

                            const referenceLabelX = plotLeft - 10;

                            return (
                                <div style={{ marginTop: '20px', maxWidth: `${width}px` }} key="hdl-history">
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>RESULTADOS ANTERIORES</span>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>{subtitleHDL}</span>
                                    </div>
                                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', background: '#fafaf9', display: 'block', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                        
                                        {/* Faixa sombreada acima de 60 */}
                                        <rect x={plotLeft} y={plotTop} width={plotWidth} height={getY(refMaxHDL) - plotTop} fill="#f1f5f9" />
                                        
                                        {/* Guias superiores e inferiores */}
                                        <line x1={plotLeft} y1={getY(refMaxHDL)} x2={plotRight} y2={getY(refMaxHDL)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                                        <line x1={plotLeft} y1={getY(refMinHDL)} x2={plotRight} y2={getY(refMinHDL)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                                        
                                        {/* Labels da Referência */}
                                        <text x={referenceLabelX} y={getY(refMaxHDL) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{refMaxHDL}</text>
                                        <text x={referenceLabelX} y={getY(refMinHDL) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{refMinHDL}</text>
                                        
                                        {/* Linha de Evolução */}
                                        <path d={pathD} fill="none" stroke="#334155" strokeWidth="1.8" />
                                        
                                        {/* Pontos e Textos (cópia literal do GLI) */}
                                        {points.map((p, i) => {
                                            const baseTextY = p.y - 12;
                                            const refMinLabelY = getY(refMinHDL) + 3;
                                            const isColliding = Math.abs(baseTextY - refMinLabelY) < 12;

                                            const textOffsetX = isColliding ? 5 : 0;
                                            const textOffsetY = isColliding ? 7 : 0;

                                            return (
                                                <g key={i}>
                                                    <circle cx={p.x} cy={p.y} r={p.isLast ? 4 : 3} fill={p.isLast ? '#0f172a' : '#64748b'} stroke="#ffffff" strokeWidth="1.5" />
                                                    <text x={p.x + textOffsetX} y={baseTextY - textOffsetY} fontSize={p.isLast ? "12" : "11"} fill={p.isLast ? '#0f172a' : '#475569'} textAnchor={isColliding ? "start" : "middle"} fontWeight={p.isLast ? 'bold' : '500'}>
                                                        {String(p.value).replace('.', ',')}
                                                    </text>
                                                    <text x={p.x} y={height - 18} fontSize="10" fill={p.isLast ? '#334155' : '#64748b'} textAnchor="middle" fontWeight={p.isLast ? '600' : 'normal'}>
                                                        {p.dateText}
                                                    </text>
                                                    {dateCounts[p.dateText] > 1 && p.timeText && (
                                                        <text x={p.x} y={height - 6} fontSize="9" fill="#94a3b8" textAnchor="middle">
                                                            {p.timeText}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            );
                        }
                        
                        return <GraficoHistoricoExame historico={historicoExame} refMin={refMin} refMax={refMax} subtitle={subtitle} examCode={examCode} />;
                    }
                    return null;
                })()}

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

const LaudoExameRender = ({ examData, formatDateTimeH, formatAttendanceOrigin, statusReal, patientCode, isComposed = false }) => {
    if (!examData) return null;
    const { exam, details, signatureSignedUrl, history } = examData;
    const examCode = getExamCode(exam);

    if (examCode === 'HEMO') {
        return <HemogramaCompactoCompleto selectedExam={exam} examDetails={details} statusReal={statusReal} patientCode={patientCode} signatureSignedUrl={signatureSignedUrl} isComposed={isComposed} />;
    } else if (examCode === 'URI') {
        return <LaudoURI selectedExam={exam} examDetails={details} formatDateTimeH={formatDateTimeH} patientCode={patientCode} formatAttendanceOrigin={formatAttendanceOrigin} signatureSignedUrl={signatureSignedUrl} isComposed={isComposed} />;
    } else if (examCode === 'PAR') {
        return <LaudoPAR selectedExam={exam} examDetails={details} formatDateTimeH={formatDateTimeH} patientCode={patientCode} formatAttendanceOrigin={formatAttendanceOrigin} signatureSignedUrl={signatureSignedUrl} isComposed={isComposed} />;
    } else {
        return <LaudoExameSimples selectedExam={exam} examDetails={details} loadingDetails={false} formatDateTimeH={formatDateTimeH} patientCode={patientCode} formatAttendanceOrigin={formatAttendanceOrigin} signatureSignedUrl={signatureSignedUrl} historyProp={history} isComposed={isComposed} />;
    }
};

const LaudoA4Page = ({ pageExamData, pageNumber, patientCode, selectedProtocol, formatDateTimeH, formatAttendanceOrigin, statusReal }) => {
    const firstExamData = pageExamData?.[0] ?? null;

    if (!firstExamData) {
        return null;
    }

    const firstExam = firstExamData.exam;
    const signatureSignedUrl = firstExamData.signatureSignedUrl;

    return (
        <div className="lab-complete-preview-page lab-composed-page" data-composed-page="true" data-composed-page-number={pageNumber}>
            <div className="lab-composed-header hemo-header">
                <div className="hemo-header-logo">
                    <img src="/logo-laboratorio.png" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="hemo-header-center">
                    <h2>LABORATÓRIO MUNICIPAL<br/>LINDOBERG CÂNDIDO DE SOUZA</h2>
                    <p>Sistema Gestão Pública Inteligente</p>
                </div>
                <div className="hemo-header-right">
                    <img src="/logo-bezerros.png" alt="Prefeitura" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
            </div>

            <div className="lab-composed-patient hemo-patient-box">
                <div className="hemo-patient-col">
                    <div><span className="hemo-lbl">Paciente:</span> {firstExam?.pacienteNome}</div>
                    <div><span className="hemo-lbl">Médico:</span> {firstExam?.medico || 'NÃO INFORMADO'}</div>
                    <div><span className="hemo-lbl">Cód. Paciente:</span> {patientCode || firstExam?.pacienteCode || firstExam?.patientCode || '---'}</div>
                    <div><span className="hemo-lbl">Data Nasc.:</span> {firstExam?.pacienteDataNascimento}</div>
                    <div><span className="hemo-lbl">Cadastro:</span> {formatDateTimeRecife(firstExam?.attendance_created_at || firstExam?.created_at)}</div>
                </div>
                <div className="hemo-patient-col right">
                    <div><span className="hemo-lbl">Idade:</span> {firstExam?.pacienteIdade}</div>
                    <div><span className="hemo-lbl">Sexo:</span> {firstExam?.pacienteSexo || 'NÃO INFORMADO'}</div>
                    <div><span className="hemo-lbl">RG:</span> {firstExam?.pacienteRg || '---'}</div>
                    <div><span className="hemo-lbl">CNS:</span> {firstExam?.pacienteCns || '---'}</div>
                    <div><span className="hemo-lbl">Emissão:</span> {formatDateTimeH ? formatDateTimeH(firstExam?.released_at || firstExam?.checked_at) : ''}</div>
                    <div><span className="hemo-lbl">Origem:</span> {formatAttendanceOrigin && firstExam?.attendance_origin ? formatAttendanceOrigin(firstExam?.attendance_origin) : ''}</div>
                </div>
            </div>

            <div className="lab-composed-exams">
                {pageExamData.map((examData, idx) => (
                    <div
                        key={examData.exam.id}
                        className="lab-composed-exam-block"
                        data-composed-exam-id={examData.exam.id}
                        data-composed-exam-code={getExamCode(examData.exam)}
                    >
                        <LaudoExameRender 
                            examData={examData} 
                            formatDateTimeH={formatDateTimeH} 
                            formatAttendanceOrigin={formatAttendanceOrigin} 
                            statusReal={statusReal} 
                            patientCode={patientCode} 
                            isComposed={true} 
                        />
                    </div>
                ))}
            </div>

            <div className="lab-composed-bottom hemo-report-bottom" data-composed-bottom="true">
                <div className="hemo-signature-area">
                    {firstExam?.responsible_name ? (
                        <>
                            {signatureSignedUrl && <img src={signatureSignedUrl} alt="Assinatura" className="lab-report-signature-image" />}
                            <div className="hemo-signature-name" style={{ marginTop: signatureSignedUrl ? '2px' : '20px' }}>
                                {firstExam.responsible_name.toUpperCase()}
                                {firstExam.responsible_crbm && <><br /><span style={{ fontWeight: 400, fontSize: '0.78em' }}>Biomédico(a) — CRBM {firstExam.responsible_crbm}</span></>}
                            </div>
                            {firstExam.checked_at && (
                                <div className="hemo-signature-date">
                                    Conferido e assinado eletronicamente em {new Date(firstExam.checked_at).toLocaleString('pt-BR')}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="hemo-signature-line"></div>
                            <div className="hemo-signature-name">Biomédico(a) Responsável</div>
                            {firstExam?.released_at && <div className="hemo-signature-date">Liberado eletronicamente em {new Date(firstExam.released_at).toLocaleString('pt-BR')}</div>}
                            <div style={{ fontSize: '0.7em', color: '#94a3b8', marginTop: '2px' }}>Dados profissionais indisponíveis para este laudo anterior.</div>
                        </>
                    )}
                </div>
                <div className="hemo-footer-address">Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros - PE - CEP: 55.660-000</div>
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
    const [isPrinting, setIsPrinting] = useState(false);
    const [signatureSignedUrl, setSignatureSignedUrl] = useState(null);
    const [loadingSignature, setLoadingSignature] = useState(false);
    // Conjunto dos result_ids selecionados para impressão
    const [selectedExamIds, setSelectedExamIds] = useState(new Set());
    const [previewMode, setPreviewMode] = useState('individual');
    const [
        isRenderedPaginationValidated,
        setIsRenderedPaginationValidated
    ] = useState(false);
    const [paginationPlan, setPaginationPlan] = useState([]);
    const [paginationStatus, setPaginationStatus] = useState('idle');
    const [paginationMetrics, setPaginationMetrics] = useState(null);
    const completePreviewMeasureRef = useRef(null);
    const paginatedPreviewRef = useRef(null);
    const paginationAdjustmentCountRef = useRef(0);
    const paginationAdjustmentFrameRef = useRef(null);
    const [completeExamDataById, setCompleteExamDataById] = useState({});
    const [loadingCompletePreview, setLoadingCompletePreview] = useState(false);
    const completeExamDataCacheRef = useRef({});
    const completeSignatureCacheRef = useRef({});
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
        const statusFilter = searchFilters.status;

        filteredResults.forEach(ex => {
            if (!groups[ex.protocolo]) {
                groups[ex.protocolo] = {
                    protocolo: ex.protocolo,
                    pacienteCode: ex.pacienteCodigo,
                    dataAtendimento: ex.dataAtendimento,
                    dataAtendimentoRaw: ex.dataAtendimentoRaw,
                    attendance_date: ex.attendance_date,
                    attendance_time: ex.attendance_time,
                    attendance_created_at: ex.attendance_created_at,
                    created_at: ex.created_at,
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
            
            // Definir a data de ordenação pela coleta real (independentemente do status)
            let evDate = 0;
            if (ex.collection_date) {
                // Montar o ISO string para criar o timestamp completo
                const timeStr = ex.collection_time || '00:00:00';
                evDate = new Date(`${ex.collection_date}T${timeStr}`).getTime();
            } else if (ex.dataAtendimentoRaw) {
                evDate = new Date(ex.dataAtendimentoRaw).getTime();
            } else if (ex.attendance_created_at) {
                evDate = new Date(ex.attendance_created_at).getTime();
            } else if (ex.result_created_at) {
                evDate = new Date(ex.result_created_at).getTime();
            }
            
            // Usar a data de coleta mais recente entre os exames válidos deste atendimento
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
            // 1. Mais recente coleta primeiro (decrescente)
            if (a.latestEventDate !== b.latestEventDate) {
                return b.latestEventDate - a.latestEventDate;
            }

            // 2. Data de criação do atendimento como desempate (mais recente primeiro)
            const createdA = a.exams[0]?.attendance_created_at ? new Date(a.exams[0].attendance_created_at).getTime() : 0;
            const createdB = b.exams[0]?.attendance_created_at ? new Date(b.exams[0].attendance_created_at).getTime() : 0;
            
            if (createdA !== createdB) {
                return createdB - createdA;
            }
            
            // 3. Critério de desempate estável (protocolo - ordem inversa para estabilizar novos)
            if (a.protocolo && b.protocolo) {
                return b.protocolo.localeCompare(a.protocolo);
            }
            
            return 0;
        });
        
        return protocolsArray;
    }, [filteredResults, searchFilters.status]);

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
        if (selectedExamIds.size <= 1 && previewMode !== 'individual') {
            setPreviewMode('individual');
        }
    }, [selectedExamIds.size, previewMode]);

    useEffect(() => {
        completeExamDataCacheRef.current = {};
        completeSignatureCacheRef.current = {};
        setCompleteExamDataById({});
        setLoadingCompletePreview(false);
        setPreviewMode('individual');
    }, [selectedProtocol?.protocolo]);

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

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Se estiver em drawer, modal, ou gerando PDF, ignora
            const isModalOpen = document.querySelector('.modal, [role="dialog"], .swal2-container');
            if (drawerOpen || generatingPdf || isModalOpen) return;

            // Ignora se o foco for em um campo de formulário/texto
            const activeElement = document.activeElement;
            if (activeElement) {
                const tagName = activeElement.tagName.toUpperCase();
                const type = activeElement.type?.toLowerCase();
                const isInputOrSelect = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName);
                const isContentEditable = activeElement.isContentEditable;
                // Exceções para inputs de data, busca, etc (todos caem aqui se forem inputs)
                if (isInputOrSelect || isContentEditable) return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (groupedProtocols.length === 0) return;

                let currentIndex = -1;
                if (selectedProtocol) {
                    currentIndex = groupedProtocols.findIndex(g => g.protocolo === selectedProtocol.protocolo);
                }

                let newIndex = 0;
                
                if (e.key === 'ArrowDown') {
                    if (currentIndex === -1) {
                        newIndex = 0; // se não tinha seleção, seleciona o primeiro
                    } else if (currentIndex < groupedProtocols.length - 1) {
                        newIndex = currentIndex + 1;
                    } else {
                        newIndex = currentIndex; // mantém o último
                    }
                } else if (e.key === 'ArrowUp') {
                    if (currentIndex === -1) {
                        newIndex = 0; // se não tinha seleção, seleciona o primeiro
                    } else if (currentIndex > 0) {
                        newIndex = currentIndex - 1;
                    } else {
                        newIndex = currentIndex; // mantém o primeiro
                    }
                }

                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < groupedProtocols.length) {
                    e.preventDefault(); // Impede rolagem da página quando estamos trocando os cards
                    const newProtocol = groupedProtocols[newIndex];
                    setSelectedProtocol(newProtocol);
                    
                    // Define o primeiro exame selecionado (ou o primeiro disponível) como ativo
                    const selectedForNew = newProtocol.exams.filter(ex => newProtocol.exams.some(e => e.id === ex.id) /* fallback logic is handled below properly */);
                    // actually we don't know selectedExamIds for newProtocol yet if it's not loaded, but it's handled by drawer or print_order. Wait, we can just use exams[0].
                    handleSelectExam(newProtocol.exams[0]);

                    // Faz scroll do card selecionado para dentro da view
                    setTimeout(() => {
                        const cardId = `protocol-card-${newProtocol.protocolo}`;
                        const card = document.getElementById(cardId);
                        if (card) {
                            card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                    }, 50);
                } else if (newIndex === currentIndex && currentIndex !== -1) {
                    // Impede rolagem caso já esteja nos limites para não deslocar a tela inteira atoa
                    e.preventDefault();
                }
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (!selectedProtocol || !selectedExam) return;

                // Encontra os exames selecionados, preservando a ordem (que já é baseada em print_order no backend)
                const printableExams = selectedProtocol.exams.filter(ex => selectedExamIds.has(ex.id));
                if (printableExams.length <= 1) return;

                const currentIndex = printableExams.findIndex(ex => ex.id === selectedExam.id);
                let newIndex = currentIndex;

                if (e.key === 'ArrowRight') {
                    if (currentIndex === -1) {
                        newIndex = 0;
                    } else if (currentIndex < printableExams.length - 1) {
                        newIndex = currentIndex + 1;
                    }
                } else if (e.key === 'ArrowLeft') {
                    if (currentIndex === -1) {
                        newIndex = 0;
                    } else if (currentIndex > 0) {
                        newIndex = currentIndex - 1;
                    }
                }

                if (newIndex !== currentIndex && newIndex >= 0 && newIndex < printableExams.length) {
                    e.preventDefault();
                    const newExam = printableExams[newIndex];
                    handleSelectExam(newExam);

                    setTimeout(() => {
                        if (laudoRef.current) {
                            laudoRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        }
                    }, 50);
                } else if (newIndex === currentIndex && currentIndex !== -1) {
                    e.preventDefault();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [groupedProtocols, selectedProtocol, selectedExam, selectedExamIds, drawerOpen, generatingPdf]);

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
        setPreviewMode('individual');
        setPaginationPlan([]);
        setPaginationStatus('idle');
        setIsRenderedPaginationValidated(false);
        setCompleteExamDataById({});

        try {
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
                const updatedExam = { 
                    ...selectedExam, 
                    status: 'LIBERADO',
                    released_at: resultData?.released_at || new Date().toISOString()
                };
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

    const completePreviewExamData = useMemo(() => {
        return selectedExamsForReport
            .map(exam => completeExamDataById[exam.id])
            .filter(Boolean);
    }, [selectedExamsForReport, completeExamDataById]);

    const isCompletePreviewReady =
        previewMode === 'complete' &&
        selectedExamsForReport.length > 0 &&
        completePreviewExamData.length === selectedExamsForReport.length;

    const canPrintCompletePreview =
        previewMode === 'complete' &&
        Boolean(selectedProtocol) &&
        selectedExamsForReport.length > 0 &&
        completePreviewExamData.length === selectedExamsForReport.length &&
        !loadingCompletePreview;

    const canDownloadCompletePreview =
        canPrintCompletePreview &&
        !generatingPdf;

    const paginationSelectionKey =
        completePreviewExamData
            .map(item => String(item.exam.id))
            .join('|');

    useEffect(() => {
        paginationAdjustmentCountRef.current = 0;
        setIsRenderedPaginationValidated(false);
    }, [paginationSelectionKey]);

    useEffect(() => {
        if (
            previewMode === 'complete' &&
            completePreviewExamData.length !== selectedExamsForReport.length
        ) {
            setPreviewMode('individual');
        }
    }, [
        previewMode,
        completePreviewExamData.length,
        selectedExamsForReport.length
    ]);

    useEffect(() => {
        if (
            previewMode !== 'complete' ||
            !isCompletePreviewReady ||
            completePreviewExamData.length === 0
        ) {
            setPaginationPlan([]);
            setPaginationMetrics(null);
            setPaginationStatus('idle');
            setIsRenderedPaginationValidated(false);
            return;
        }

        let cancelled = false;

        const measureAndPlan = async () => {
            try {
                setPaginationStatus('measuring');
                setIsRenderedPaginationValidated(false);

                await new Promise(resolve =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(resolve)
                    )
                );

                const root = completePreviewMeasureRef.current;

                if (!root) {
                    throw new Error(
                        'Área da Prévia completa não localizada.'
                    );
                }

                await waitForStableExamLayout(root);

                await new Promise(resolve =>
                    requestAnimationFrame(resolve)
                );

                if (cancelled) return;

                const composedPage =
                    root.querySelector('[data-composed-page="true"]');

                const bottom =
                    root.querySelector('[data-composed-bottom="true"]');

                const examBlocks = Array.from(
                    root.querySelectorAll('[data-composed-exam-id]')
                );

                if (!composedPage || !bottom || examBlocks.length === 0) {
                    throw new Error(
                        'Elementos necessários para medir a paginação não foram encontrados.'
                    );
                }

                const MM_TO_PX = 96 / 25.4;
                const PAGE_HEIGHT_PX = 297 * MM_TO_PX;
                const PAGE_SAFETY_PX = 10 * MM_TO_PX;
                const EXAM_GAP_PX = 4 * MM_TO_PX;

                const pageRect = composedPage.getBoundingClientRect();
                const firstExamRect = examBlocks[0].getBoundingClientRect();
                const bottomRect = bottom.getBoundingClientRect();

                const pageStyle = window.getComputedStyle(composedPage);
                const bottomStyle = window.getComputedStyle(bottom);

                const paddingBottom =
                    Number.parseFloat(pageStyle.paddingBottom) || 0;

                const bottomMarginTop =
                    Number.parseFloat(bottomStyle.marginTop) || 0;

                const bottomMarginBottom =
                    Number.parseFloat(bottomStyle.marginBottom) || 0;

                const topReservedHeight =
                    firstExamRect.top - pageRect.top;

                const bottomReservedHeight =
                    bottomRect.height +
                    bottomMarginTop +
                    bottomMarginBottom +
                    paddingBottom;

                const availableExamHeight =
                    PAGE_HEIGHT_PX -
                    topReservedHeight -
                    bottomReservedHeight -
                    PAGE_SAFETY_PX;

                if (availableExamHeight <= 0) {
                    throw new Error(
                        'A área útil calculada para os exames é inválida.'
                    );
                }

                const heightById = {};

                examBlocks.forEach(block => {
                    const resultId =
                        block.dataset.composedExamId;

                    const wrapperRect =
                        block.getBoundingClientRect();

                    const visualHeight =
                        getElementVisualHeight(block);

                    heightById[resultId] =
                        visualHeight;

                    console.debug(
                        '[Paginação A4] Altura do exame',
                        {
                            resultId,
                            examCode:
                                block.dataset.composedExamCode,
                            wrapperHeight:
                                Math.ceil(wrapperRect.height),
                            visualHeight,
                            overflowHeight:
                                Math.max(
                                    0,
                                    visualHeight -
                                    Math.ceil(wrapperRect.height)
                                )
                        }
                    );
                });

                const pages = [];
                let currentPage = null;

                const flushPage = () => {
                    if (
                        currentPage &&
                        currentPage.exams.length > 0
                    ) {
                        pages.push(currentPage);
                    }

                    currentPage = null;
                };

                completePreviewExamData.forEach(examData => {
                    const exam = examData.exam;
                    const resultId = String(exam.id);
                    const examCode =
                        getExamCode(exam);

                    const examHeight =
                        heightById[resultId];

                    if (!examHeight) {
                        throw new Error(
                            `Altura não encontrada para o exame ${examCode}.`
                        );
                    }

                    const responsibleKey =
                        getPaginationResponsibleKey(examData);

                    const isHemo =
                        examCode === 'HEMO';

                    const isOversized =
                        examHeight > availableExamHeight;

                    if (isHemo) {
                        flushPage();

                        pages.push({
                            exams: [examData],
                            usedHeight: examHeight,
                            availableHeight: availableExamHeight,
                            responsibleKey,
                            exclusive: true,
                            oversized: isOversized
                        });

                        return;
                    }

                    if (
                        currentPage &&
                        currentPage.responsibleKey !== responsibleKey
                    ) {
                        flushPage();
                    }

                    if (!currentPage) {
                        currentPage = {
                            exams: [],
                            usedHeight: 0,
                            availableHeight: availableExamHeight,
                            responsibleKey,
                            exclusive: false,
                            oversized: false
                        };
                    }

                    const additionalHeight =
                        currentPage.exams.length === 0
                            ? examHeight
                            : EXAM_GAP_PX + examHeight;

                    if (
                        currentPage.exams.length > 0 &&
                        currentPage.usedHeight + additionalHeight >
                            availableExamHeight
                    ) {
                        flushPage();

                        currentPage = {
                            exams: [],
                            usedHeight: 0,
                            availableHeight: availableExamHeight,
                            responsibleKey,
                            exclusive: false,
                            oversized: false
                        };
                    }

                    const pageExamHeight =
                        currentPage.exams.length === 0
                            ? examHeight
                            : EXAM_GAP_PX + examHeight;

                    currentPage.exams.push(examData);
                    currentPage.usedHeight += pageExamHeight;

                    if (isOversized) {
                        currentPage.oversized = true;
                    }
                });

                flushPage();

                const normalizedPages = pages.map(
                    (page, index) => ({
                        ...page,
                        pageNumber: index + 1,
                        resultIds: page.exams.map(
                            item => item.exam.id
                        ),
                        examCodes: page.exams.map(
                            item => getExamCode(item.exam)
                        )
                    })
                );

                const measuredResultIds =
                    normalizedPages.flatMap(
                        page => page.resultIds.map(String)
                    );

                const expectedResultIds =
                    completePreviewExamData.map(
                        item => String(item.exam.id)
                    );

                const hasCompleteMeasurement =
                    expectedResultIds.every(
                        resultId =>
                            measuredResultIds.includes(resultId) &&
                            Number.isFinite(
                                heightById[resultId]
                            ) &&
                            heightById[resultId] > 0
                    );

                if (!hasCompleteMeasurement) {
                    throw new Error(
                        'Nem todos os exames tiveram sua altura visual medida corretamente.'
                    );
                }

                const oversizedCodes = normalizedPages
                    .filter(page => page.oversized)
                    .flatMap(page => page.examCodes);

                if (cancelled) return;

                setPaginationPlan(normalizedPages);

                setPaginationMetrics({
                    pageHeightPx: PAGE_HEIGHT_PX,
                    topReservedHeight,
                    bottomReservedHeight,
                    availableExamHeight,
                    oversizedCodes
                });

                setPaginationStatus(
                    oversizedCodes.length > 0
                        ? 'warning'
                        : 'ready'
                );
                setIsRenderedPaginationValidated(false);
            } catch (error) {
                console.error(
                    'Erro ao calcular a paginação da Prévia completa:',
                    error
                );

                if (!cancelled) {
                    setPaginationPlan([]);
                    setPaginationMetrics(null);
                    setPaginationStatus('error');
                    setIsRenderedPaginationValidated(false);
                }
            }
        };

        measureAndPlan();

        return () => {
            cancelled = true;
        };
    }, [
        previewMode,
        isCompletePreviewReady,
        completePreviewExamData
    ]);

    useLayoutEffect(() => {
        if (
            previewMode !== 'complete' ||
            (paginationStatus !== 'ready' && paginationStatus !== 'warning') ||
            paginationPlan.length === 0
        ) {
            return undefined;
        }

        const root = paginatedPreviewRef.current;

        if (!root) {
            return undefined;
        }

        let cancelled = false;
        let resizeObserver = null;

        const scheduleValidation = () => {
            if (cancelled) {
                return;
            }

            if (paginationAdjustmentFrameRef.current) {
                cancelAnimationFrame(
                    paginationAdjustmentFrameRef.current
                );
            }

            paginationAdjustmentFrameRef.current =
                requestAnimationFrame(() => {
                    paginationAdjustmentFrameRef.current =
                        requestAnimationFrame(() => {
                            validateRenderedPages();
                        });
                });
        };

        const validateRenderedPages = () => {
            if (cancelled) {
                return;
            }

            const pageElements = Array.from(
                root.querySelectorAll(
                    '[data-composed-page="true"]'
                )
            );

            if (
                pageElements.length !==
                paginationPlan.length
            ) {
                scheduleValidation();
                return;
            }

            const BOTTOM_CLEARANCE_PX = 24;

            let collisionPageIndex = -1;

            pageElements.some((pageElement, index) => {
                const bottomElement =
                    pageElement.querySelector(
                        '[data-composed-bottom="true"]'
                    );

                const examElements = Array.from(
                    pageElement.querySelectorAll(
                        '[data-composed-exam-id]'
                    )
                );

                const lastExamElement =
                    examElements.at(-1);

                if (
                    !bottomElement ||
                    !lastExamElement
                ) {
                    return false;
                }

                const bottomRect =
                    bottomElement.getBoundingClientRect();

                const lastExamRect =
                    lastExamElement.getBoundingClientRect();

                const hasCollision =
                    lastExamRect.bottom +
                        BOTTOM_CLEARANCE_PX >
                    bottomRect.top;

                if (hasCollision) {
                    collisionPageIndex = index;
                    return true;
                }

                return false;
            });

            if (collisionPageIndex < 0) {
                setIsRenderedPaginationValidated(true);
                return;
            }

            setIsRenderedPaginationValidated(false);

            if (
                paginationAdjustmentCountRef.current >=
                20
            ) {
                console.error(
                    '[Paginação A4] Limite de ajustes atingido.'
                );

                return;
            }

            paginationAdjustmentCountRef.current += 1;

            setPaginationPlan(previousPlan => {
                const pages = previousPlan.map(page => ({
                    ...page,
                    exams: [...page.exams]
                }));

                const sourcePage =
                    pages[collisionPageIndex];

                if (
                    !sourcePage ||
                    sourcePage.exams.length <= 1
                ) {
                    console.error(
                        '[Paginação A4] Um único exame ultrapassa a área disponível.',
                        {
                            pagina:
                                collisionPageIndex + 1,
                            exames:
                                sourcePage?.examCodes ?? []
                        }
                    );

                    return previousPlan;
                }

                const movedExam =
                    sourcePage.exams.pop();

                const movedExamCode =
                    getExamCode(movedExam.exam);

                if (movedExamCode === 'HEMO') {
                    console.error(
                        '[Paginação A4] O HEMO não pode ser movido para outra página.'
                    );

                    return previousPlan;
                }

                const movedResponsibleKey =
                    getPaginationResponsibleKey(
                        movedExam
                    );

                const nextPage =
                    pages[collisionPageIndex + 1];

                const canUseNextPage =
                    nextPage &&
                    !nextPage.exclusive &&
                    nextPage.responsibleKey ===
                        movedResponsibleKey;

                if (canUseNextPage) {
                    nextPage.exams.unshift(
                        movedExam
                    );
                } else {
                    pages.splice(
                        collisionPageIndex + 1,
                        0,
                        {
                            exams: [movedExam],
                            usedHeight: 0,
                            availableHeight:
                                sourcePage.availableHeight,
                            responsibleKey:
                                movedResponsibleKey,
                            exclusive: false,
                            oversized: false
                        }
                    );
                }

                const normalizedPages =
                    normalizeRenderedPaginationPlan(
                        pages
                    );

                return normalizedPages;
            });
        };

        scheduleValidation();

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver =
                new ResizeObserver(() => {
                    scheduleValidation();
                });

            resizeObserver.observe(root);

            root.querySelectorAll(
                '[data-composed-page="true"], ' +
                '[data-composed-exam-id], ' +
                '[data-composed-exam-id] svg, ' +
                '[data-composed-exam-id] canvas, ' +
                '[data-composed-exam-id] img'
            ).forEach(element => {
                resizeObserver.observe(element);
            });
        }

        return () => {
            cancelled = true;

            if (
                paginationAdjustmentFrameRef.current
            ) {
                cancelAnimationFrame(
                    paginationAdjustmentFrameRef.current
                );

                paginationAdjustmentFrameRef.current =
                    null;
            }

            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [
        previewMode,
        paginationStatus,
        paginationPlan
    ]);

    const prepareCompletePreview = async () => {
        if (selectedExamsForReport.length <= 1 || loadingCompletePreview) {
            return;
        }

        const getResultId = exam =>
            exam?.id ??
            exam?.result_id ??
            exam?.resultId ??
            null;

        const examsWithIds = selectedExamsForReport
            .map(exam => ({
                exam,
                resultId: getResultId(exam)
            }))
            .filter(item => Boolean(item.resultId));

        if (examsWithIds.length !== selectedExamsForReport.length) {
            throw new Error('Existem exames selecionados sem ID ou result_id válido.');
        }

        const missingExams = examsWithIds.filter(
            ({ resultId }) => !completeExamDataCacheRef.current[resultId]
        );

        if (missingExams.length === 0) {
            setPreviewMode('complete');
            return;
        }

        try {
            setLoadingCompletePreview(true);
            setFeedbackMsg(null);

            const loadedEntries = await Promise.all(
                missingExams.map(async ({ exam, resultId }) => {
                    const details =
                        await laboratorioLaudosService.carregarDetalhesLaudo(resultId);

                    let completeSignatureSignedUrl = null;
                    const signaturePath = exam.responsible_signature_path;

                    if (signaturePath) {
                        if (completeSignatureCacheRef.current[signaturePath]) {
                            completeSignatureSignedUrl = completeSignatureCacheRef.current[signaturePath];
                        } else {
                            try {
                                completeSignatureSignedUrl =
                                    await laboratorioLaudosService
                                        .getLaboratorioSignatureSignedUrl(signaturePath);
                                completeSignatureCacheRef.current[signaturePath] = completeSignatureSignedUrl;
                            } catch (signatureError) {
                                console.error(
                                    `Erro ao carregar assinatura do exame ${exam.exameCodigo}:`,
                                    signatureError
                                );
                            }
                        }
                    }

                    return [
                        resultId,
                        {
                            exam,
                            details,
                            signatureSignedUrl: completeSignatureSignedUrl,
                            history: null
                        }
                    ];
                })
            );

            const loadedData = Object.fromEntries(loadedEntries);

            completeExamDataCacheRef.current = {
                ...completeExamDataCacheRef.current,
                ...loadedData
            };

            setCompleteExamDataById({
                ...completeExamDataCacheRef.current
            });

            setPreviewMode('complete');
        } catch (error) {
            console.error(
                'Erro ao preparar os dados da Prévia completa:',
                error
            );

            setFeedbackMsg({
                type: 'error',
                text: 'Não foi possível preparar todos os exames selecionados.'
            });

            setPreviewMode('individual');

            setTimeout(() => {
                setFeedbackMsg(null);
            }, 5000);
        } finally {
            setLoadingCompletePreview(false);
        }
    };

    const normalizeRenderedPaginationPlan = pages =>
        pages
            .filter(page => page.exams.length > 0)
            .map((page, index) => ({
                ...page,
                pageNumber: index + 1,
                resultIds: page.exams.map(
                    item => item.exam.id
                ),
                examCodes: page.exams.map(
                    item => getExamCode(item.exam)
                )
            }));

    const getPaginationResponsibleKey = (examData) => {
        const exam = examData?.exam ?? {};

        return [
            exam.responsible_name ?? '',
            exam.responsible_crbm ?? '',
            exam.responsible_signature_path ?? ''
        ]
            .map(value => String(value).trim().toUpperCase())
            .join('|');
    };

    const waitForPreviewImages = async (root) => {
        if (!root) return;

        const images = Array.from(root.querySelectorAll('img'));

        await Promise.all(
            images.map(image => {
                if (image.complete) {
                    return Promise.resolve();
                }

                return new Promise(resolve => {
                    const finish = () => resolve();

                    image.addEventListener('load', finish, { once: true });
                    image.addEventListener('error', finish, { once: true });
                });
            })
        );
    };

    const getElementVisualHeight = element => {
        if (!element) {
            return 0;
        }

        const elementRect =
            element.getBoundingClientRect();

        let visualBottom = elementRect.bottom;

        const descendants = Array.from(
            element.querySelectorAll('*')
        );

        descendants.forEach(descendant => {
            const style =
                window.getComputedStyle(descendant);

            if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.position === 'fixed'
            ) {
                return;
            }

            const rect =
                descendant.getBoundingClientRect();

            if (
                !Number.isFinite(rect.top) ||
                !Number.isFinite(rect.bottom)
            ) {
                return;
            }

            if (
                rect.width === 0 &&
                rect.height === 0
            ) {
                return;
            }

            visualBottom = Math.max(
                visualBottom,
                rect.bottom
            );
        });

        return Math.max(
            0,
            Math.ceil(
                visualBottom - elementRect.top
            )
        );
    };

    const waitForStableExamLayout = async root => {
        if (!root) {
            return;
        }

        if (document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch {
                // A medição continuará normalmente.
            }
        }

        await waitForPreviewImages(root);

        let previousMeasurement = '';
        let stableFrames = 0;

        for (
            let attempt = 0;
            attempt < 15 && stableFrames < 3;
            attempt += 1
        ) {
            await new Promise(resolve =>
                requestAnimationFrame(resolve)
            );

            const blocks = Array.from(
                root.querySelectorAll(
                    '[data-composed-exam-id]'
                )
            );

            const currentMeasurement = blocks
                .map(block =>
                    getElementVisualHeight(block)
                )
                .join('|');

            if (
                currentMeasurement ===
                previousMeasurement
            ) {
                stableFrames += 1;
            } else {
                previousMeasurement =
                    currentMeasurement;

                stableFrames = 0;
            }
        }
    };

    // Handlers de seleção
    const handleToggleExamSelection = (id) => {
        const next = new Set(selectedExamIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        
        setSelectedExamIds(next);
        setPaginationPlan([]);
        setPaginationStatus('idle');
        setIsRenderedPaginationValidated(false);
        if (next.size <= 1) {
            setPreviewMode('individual');
        }
    };

    const handleSelectAllPrintable = () => {
        if (!selectedProtocol) return;
        const printable = new Set(
            selectedProtocol.exams
                .filter(ex => ex.printsOnReport !== false)
                .map(ex => ex.id)
        );
        setSelectedExamIds(printable);
        
        setPaginationPlan([]);
        setPaginationStatus('idle');
        setIsRenderedPaginationValidated(false);
        if (printable.size <= 1) {
            setPreviewMode('individual');
        }
    };

    const handleClearSelection = () => {
        setSelectedExamIds(new Set());
        setPaginationPlan([]);
        setPaginationStatus('idle');
        setIsRenderedPaginationValidated(false);
        setPreviewMode('individual');
    };

    const formatDateTimeHForReport = (dateStr) => {
        if (!dateStr) return '';

        const date = new Date(dateStr);

        if (Number.isNaN(date.getTime())) return '';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} às ${hour}:${minute}h`;
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString('pt-BR');
    };

    const handleDownloadCompletePreviewPdf =
        async () => {
            if (!canDownloadCompletePreview) {
                setFeedbackMsg({
                    type: 'warning',
                    text: 'Aguarde a preparação dos exames antes de baixar o PDF.'
                });

                return;
            }

            const root =
                paginatedPreviewRef.current ||
                completePreviewMeasureRef.current;

            if (!root) {
                setFeedbackMsg({
                    type: 'error',
                    text: 'Não foi possível localizar as páginas da Prévia completa.'
                });

                return;
            }

            const pageElements = Array.from(
                root.querySelectorAll(
                    '[data-composed-page="true"]'
                )
            );

            if (pageElements.length === 0) {
                setFeedbackMsg({
                    type: 'error',
                    text: 'As páginas do laudo ainda não estão prontas para download.'
                });

                return;
            }

            const waitForPageImages = async pageElement => {
                const images = Array.from(
                    pageElement.querySelectorAll('img')
                );

                await Promise.all(
                    images.map(image => {
                        if (
                            image.complete &&
                            image.naturalWidth > 0
                        ) {
                            return Promise.resolve();
                        }

                        return new Promise(resolve => {
                            const finish = () => resolve();

                            image.addEventListener(
                                'load',
                                finish,
                                { once: true }
                            );

                            image.addEventListener(
                                'error',
                                finish,
                                { once: true }
                            );
                        });
                    })
                );
            };

            try {
                setGeneratingPdf(true);

                if (document.fonts?.ready) {
                    try {
                        await document.fonts.ready;
                    } catch {
                        // continuar normalmente
                    }
                }

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const PDF_WIDTH_MM = 210;
                const PDF_HEIGHT_MM = 297;

                for (
                    let index = 0;
                    index < pageElements.length;
                    index += 1
                ) {
                    const pageElement =
                        pageElements[index];

                    await waitForPageImages(
                        pageElement
                    );

                    await new Promise(resolve =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(resolve)
                        )
                    );

                    const previousBoxShadow =
                        pageElement.style.boxShadow;

                    const previousMargin =
                        pageElement.style.margin;

                    pageElement.style.boxShadow = 'none';
                    pageElement.style.margin = '0';

                    try {
                        const canvas = await html2canvas(
                            pageElement,
                            {
                                scale: 2,
                                useCORS: true,
                                allowTaint: false,
                                backgroundColor: '#ffffff',
                                logging: false,
                                scrollX: 0,
                                scrollY: 0
                            }
                        );

                        const imageData =
                            canvas.toDataURL(
                                'image/jpeg',
                                0.96
                            );

                        const canvasRatio =
                            canvas.width / canvas.height;

                        const pageRatio =
                            PDF_WIDTH_MM / PDF_HEIGHT_MM;

                        let imageWidth;
                        let imageHeight;

                        if (canvasRatio > pageRatio) {
                            imageWidth = PDF_WIDTH_MM;

                            imageHeight =
                                imageWidth / canvasRatio;
                        } else {
                            imageHeight = PDF_HEIGHT_MM;

                            imageWidth =
                                imageHeight * canvasRatio;
                        }

                        const imageX =
                            (PDF_WIDTH_MM - imageWidth) / 2;

                        const imageY =
                            (PDF_HEIGHT_MM - imageHeight) / 2;

                        if (index > 0) {
                            pdf.addPage(
                                'a4',
                                'portrait'
                            );
                        }

                        pdf.addImage(
                            imageData,
                            'JPEG',
                            imageX,
                            imageY,
                            imageWidth,
                            imageHeight,
                            undefined,
                            'FAST'
                        );
                    } finally {
                        pageElement.style.boxShadow =
                            previousBoxShadow;

                        pageElement.style.margin =
                            previousMargin;
                    }
                }

                const firstExamData =
                    paginationPlan?.[0]?.exams?.[0] || completePreviewExamData?.[0];

                const rawPatientCode =
                    selectedProtocol?.pacienteCode || firstExamData?.exam?.pacienteCode || firstExamData?.exam?.patientCode;

                const rawPatientName =
                    selectedProtocol?.pacienteNome || firstExamData?.exam?.pacienteNome;

                const sanitizeFilePart = value =>
                    String(value ?? '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');

                const patientCodeForFile =
                    sanitizeFilePart(rawPatientCode);

                const patientNameForFile =
                    sanitizeFilePart(rawPatientName);

                const fileName =
                    patientCodeForFile
                        ? `Laudo-${patientCodeForFile}-${patientNameForFile || 'PACIENTE'}.pdf`
                        : `Laudo-${patientNameForFile || 'PACIENTE'}.pdf`;

                pdf.save(fileName);
            } catch (error) {
                console.error(
                    'Erro ao gerar PDF da Prévia completa:',
                    error
                );

                setFeedbackMsg({
                    type: 'error',
                    text: 'Não foi possível gerar o PDF da Prévia completa.'
                });
            } finally {
                setGeneratingPdf(false);
            }
        };

    const handleDownloadPdf = async () => {
        if (generatingPdf) return;
        
        if (previewMode === 'complete') {
            await handleDownloadCompletePreviewPdf();
            return;
        }
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
        <div className="lab-laudos-container">
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
                                        id={`protocol-card-${group.protocolo}`}
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
                                        {selectedExamIds.size > 1 && (
                                            <button
                                                type="button"
                                                className="laudos-action-btn laudos-action-btn-secondary"
                                                disabled={loadingCompletePreview}
                                                onClick={() => {
                                                    if (previewMode === 'complete') {
                                                        setPreviewMode('individual');
                                                        return;
                                                    }

                                                    prepareCompletePreview();
                                                }}
                                            >
                                                {loadingCompletePreview ? (
                                                    <Loader2 size={14} className="spin" />
                                                ) : (
                                                    <FileText size={14} />
                                                )}

                                                {loadingCompletePreview
                                                    ? 'Preparando...'
                                                    : previewMode === 'complete'
                                                        ? 'Voltar ao exame'
                                                        : 'Prévia completa'}
                                            </button>
                                        )}

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
                                                    onClick={() => {
                                                        if (isPrinting) return;
                                                        if (
                                                            previewMode === 'complete' &&
                                                            !canPrintCompletePreview
                                                        ) {
                                                            return;
                                                        }
                                                    
                                                        setIsPrinting(true);
                                                        try {
                                                            window.print();
                                                        } finally {
                                                            setTimeout(() => {
                                                                setIsPrinting(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                    disabled={
                                                        previewMode === 'complete'
                                                            ? !canPrintCompletePreview || isPrinting
                                                            : (!selectedExam || loadingDetails || isPrinting)
                                                    }
                                                    aria-label="Imprimir"
                                                    title="Imprimir"
                                                >
                                                    <Printer size={15} strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="laudos-action-btn laudos-action-btn-icon"
                                                    onClick={handleDownloadPdf}
                                                    disabled={
                                                        previewMode === 'complete'
                                                            ? !canDownloadCompletePreview || generatingPdf
                                                            : (!selectedExam || loadingDetails || generatingPdf)
                                                    }
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
                                {isCompletePreviewReady ? (
                                    paginationPlan.length > 0 ? (
                                        <div ref={paginatedPreviewRef} className="lab-complete-preview lab-complete-preview-paginated">
                                            {paginationPlan.map(page => (
                                                <LaudoA4Page
                                                    key={`pagina-${page.pageNumber}`}
                                                    pageNumber={page.pageNumber}
                                                    pageExamData={page.exams}
                                                    patientCode={selectedProtocol?.pacienteCode}
                                                    selectedProtocol={selectedProtocol}
                                                    formatDateTimeH={formatDateTimeHForReport}
                                                    formatAttendanceOrigin={formatAttendanceOrigin}
                                                    statusReal={statusReal}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div ref={completePreviewMeasureRef} className="lab-complete-preview lab-complete-preview-unpaginated">
                                            <LaudoA4Page
                                                pageExamData={completePreviewExamData}
                                                patientCode={selectedProtocol?.pacienteCode}
                                                selectedProtocol={selectedProtocol}
                                                formatDateTimeH={formatDateTimeHForReport}
                                                formatAttendanceOrigin={formatAttendanceOrigin}
                                                statusReal={statusReal}
                                            />
                                        </div>
                                    )
                                ) : getExamCode(selectedExam) === 'HEMO' ? (
                                    <HemogramaCompactoCompleto
                                        selectedExam={selectedExam}
                                        examDetails={examDetails}
                                        statusReal={statusReal}
                                        patientCode={selectedProtocol?.pacienteCode}
                                        signatureSignedUrl={signatureSignedUrl}
                                    />
                                ) : getExamCode(selectedExam) === 'URI' ? (
                                    <LaudoURI
                                        selectedExam={selectedExam}
                                        examDetails={examDetails}
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
                                ) : getExamCode(selectedExam) === 'PAR' ? (
                                    <LaudoPAR
                                        selectedExam={selectedExam}
                                        examDetails={examDetails}
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
