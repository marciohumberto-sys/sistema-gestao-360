export const ATTENDANCE_ORIGINS = [
    { value: 'CENTRAL', label: 'CENTRAL' },
    { value: 'DOMICILIAR', label: 'DOMICILIAR' },
    { value: 'SAD', label: 'SAD' },
    { value: 'UNIDADE_MISTA', label: 'UMSJ' },
    { value: 'UPA', label: 'UPA' },
    { value: 'URGENCIA', label: 'URGÊNCIA' },
];

const ATTENDANCE_ORIGIN_LABELS = {
    UPA: 'UPA',
    UNIDADE_MISTA: 'UMSJ',
    SAD: 'SAD',
    DOMICILIAR: 'DOMICILIAR',
    URGENCIA: 'URGÊNCIA',
    CENTRAL: 'CENTRAL',
};

export function formatAttendanceOrigin(value) {
    if (!value) return '---';
    return ATTENDANCE_ORIGIN_LABELS[value] || value;
}

export const HEMO_INTEGER_COUNT_CODES = new Set([
  'LEUCOCITOS',
  'PLAQUETAS'
]);

export function normalizeIntegerCountInput(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;
    const str = String(rawValue).trim();
    if (str === '') return null;
    
    // Accept only pure digits or valid pt-BR thousand grouping
    if (!/^\d+$|^\d{1,3}(\.\d{3})+$/.test(str)) {
        return null;
    }
    
    // Remove dots and parse as integer
    const numStr = str.replace(/\./g, '');
    const num = parseInt(numStr, 10);
    
    if (isNaN(num) || !isFinite(num)) return null;
    return num;
}

export const HEMO_MORPHOLOGY_MAP = {
    HNN: 'HEMÁCIAS NORMOCÍTICAS E NORMOCRÔMICAS.',
    LMC: 'LEUCÓCITOS MORFOLOGICAMENTE CONSERVADOS.',
    PMN: 'PLAQUETAS MORFOLOGICAMENTE NORMAIS.'
};

export function isHemoExam(examCode) {
    return String(examCode || '').trim().toUpperCase() === 'HEMO';
}

export function isHemoMorphologyParameter(parameterCode, parameterName) {
    const rawCode = String(parameterCode || '').trim().toUpperCase();
    const MORPHOLOGY_CODES = new Set([
        'OBSERVACOES_ERITROGRAMA',
        'OBS_ERITROGRAMA',
        'SERIE_ERITROCITARIA',
        'S_ERITROCITARIA',
        'SERIE_LEUCOCITARIA',
        'S_LEUCOCITARIA',
        'SERIE_PLAQUETARIA',
        'S_PLAQUETARIA',
        'OBS_MORFOLOGICAS',
        'OBSERVACOES_MORFOLOGICAS',
        'OBS_MORFOLOGIA',
        'MORFOLOGIA'
    ]);

    if (MORPHOLOGY_CODES.has(rawCode)) {
        return true;
    }

    if (parameterName) {
        const normalizedName = String(parameterName)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, ' ');

        const MORPHOLOGY_NAMES = new Set([
            'OBSERVACOES MORFOLOGICAS',
            'OBSERVACAO MORFOLOGICA',
            'OBSERVACOES DO ERITROGRAMA',
            'OBSERVACOES ERITROGRAMA',
            'SERIE ERITROCITARIA',
            'SERIE LEUCOCITARIA',
            'SERIE PLAQUETARIA'
        ]);

        if (MORPHOLOGY_NAMES.has(normalizedName)) {
            return true;
        }
    }

    return false;
}

export function expandHemogramaMorphologyAbbreviations(value) {
    if (value === null || value === undefined) return '';
    const rawStr = String(value);
    if (!rawStr.trim()) return rawStr;

    // Se não contém nenhuma das siglas como token inteiro, retorna o texto original intacto
    if (!/\b(HNN|LMC|PMN)\b/i.test(rawStr)) {
        return rawStr;
    }

    // Dividir inicialmente por quebras de linha e/ou ponto-e-vírgula
    const majorChunks = rawStr.split(/[\r\n;]+/);
    const resultLines = [];

    for (const majorChunk of majorChunks) {
        const trimmedMajor = majorChunk.trim();
        if (!trimmedMajor) continue;

        // Se o bloco contém sigla e vírgula, dividimos por vírgula para processar múltiplos itens
        if (/\b(HNN|LMC|PMN)\b/i.test(trimmedMajor) && trimmedMajor.includes(',')) {
            const subParts = trimmedMajor.split(',');
            for (const subPart of subParts) {
                const trimmedSub = subPart.trim();
                if (!trimmedSub) continue;

                const cleanToken = trimmedSub.toUpperCase().replace(/^[.\s:;,-]+|[.\s:;,-]+$/g, '');
                if (HEMO_MORPHOLOGY_MAP[cleanToken]) {
                    resultLines.push(HEMO_MORPHOLOGY_MAP[cleanToken]);
                } else if (/\b(HNN|LMC|PMN)\b/i.test(trimmedSub)) {
                    let expanded = trimmedSub;
                    for (const [abbr, expansion] of Object.entries(HEMO_MORPHOLOGY_MAP)) {
                        const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
                        expanded = expanded.replace(regex, expansion);
                    }
                    resultLines.push(expanded.trim());
                } else {
                    resultLines.push(trimmedSub);
                }
            }
        } else {
            const cleanToken = trimmedMajor.toUpperCase().replace(/^[.\s:;,-]+|[.\s:;,-]+$/g, '');
            if (HEMO_MORPHOLOGY_MAP[cleanToken]) {
                resultLines.push(HEMO_MORPHOLOGY_MAP[cleanToken]);
            } else if (/\b(HNN|LMC|PMN)\b/i.test(trimmedMajor)) {
                let expanded = trimmedMajor;
                for (const [abbr, expansion] of Object.entries(HEMO_MORPHOLOGY_MAP)) {
                    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
                    expanded = expanded.replace(regex, expansion);
                }
                resultLines.push(expanded.trim());
            } else {
                resultLines.push(trimmedMajor);
            }
        }
    }

    return resultLines.join('\n');
}

export const formatLabValue = (code, resultType, numericValue, textValue, examCode = null, parameterName = null) => {
    if (resultType === 'TEXTO' || (numericValue === null && textValue)) {
        if (!textValue) return 'Não informado';
        if (isHemoExam(examCode) && isHemoMorphologyParameter(code, parameterName)) {
            return expandHemogramaMorphologyAbbreviations(textValue);
        }
        return textValue;
    }
    if (numericValue === null || numericValue === undefined) return 'Não informado';
    
    const uppercaseCode = String(code || '').toUpperCase();
    if (HEMO_INTEGER_COUNT_CODES.has(uppercaseCode)) {
        return String(numericValue).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    
    // Convert dot to comma for standard decimal parameters
    return String(numericValue).replace('.', ',');
};

export const isLabValueEmpty = (value) => {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    return false;
};

export function normalizeLabNumericInput(value) {
    if (value === null || value === undefined || value === '') return null;
    let str = String(value).trim().replace(/\s/g, '');
    if (str === '') return null;
    
    // Check if valid format: optional minus, digits, optional single comma or dot, optional digits
    if (!/^-?\d+([.,]\d+)?$/.test(str)) {
        return null;
    }
    
    str = str.replace(',', '.');
    const num = Number(str);
    if (isNaN(num) || !isFinite(num)) return null;
    return num;
}

export function parseHemoNumber(valueStr, parameterCode) {
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

export function formatHemoResultValue(valueStr, parameterCode, parameterName = null) {
    if (valueStr === null || valueStr === undefined || valueStr === '') return '';
    let str = String(valueStr).trim();
    if (str === '') return '';

    if (isHemoMorphologyParameter(parameterCode, parameterName)) {
        return expandHemogramaMorphologyAbbreviations(str);
    }

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

export function formatHemoReferenceText(refStr, parameterCode, stripUnits = true) {
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

export function resolveHemoReference(parameterCode, referenceText, patientAgeDays, patientSexGroup) {
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

/**
 * Formata um valor TIMESTAMPTZ (ex: created_at) no fuso America/Recife.
 * Retorna no padrão 'DD/MM/YYYY às HH:MMh'.
 */
export function formatDateTimeRecife(value) {
    if (!value) return '--';

    try {
        const parts = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Recife',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date(value));

        const getPart = (type) =>
            parts.find((part) => part.type === type)?.value || '';

        const day = getPart('day');
        const month = getPart('month');
        const year = getPart('year');
        const hour = getPart('hour');
        const minute = getPart('minute');

        if (!day || !month || !year || !hour || !minute) {
            return '--';
        }

        return `${day}/${month}/${year} às ${hour}:${minute}h`;
    } catch {
        return '--';
    }
}

/**
 * Formata um campo DATE (YYYY-MM-DD) diretamente para DD/MM/YYYY sem conversão de fuso.
 */
export function formatDateOnlyBR(value) {
    if (!value) return '--';

    const datePart = String(value).slice(0, 10);
    const [year, month, day] = datePart.split('-');

    if (!year || !month || !day) {
        return '--';
    }

    return `${day}/${month}/${year}`;
}

/**
 * Formata um campo TIME (HH:MM:SS) diretamente para HH:MM sem conversão de fuso.
 */
export function formatTimeOnly(value) {
    if (!value) return '';

    const time = String(value).trim();

    if (!time) return '';

    return time.slice(0, 5);
}

