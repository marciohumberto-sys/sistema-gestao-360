/**
 * uriHelpers.js
 * Utilitários específicos e isolados para o exame URI (Urina Tipo I / Sumário de Urina).
 */

export function isUriExam(examCode) {
    return String(examCode || '').trim().toUpperCase() === 'URI';
}

/**
 * Normaliza uma string para identificação comparativa:
 * - Remove acentos
 * - Converte para maiúsculas
 * - Substitui caracteres não alfanuméricos por espaço
 * - Colapsa múltiplos espaços em espaço único
 * - Aplica trim
 */
export function normalizeExactIdentifier(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export const URI_PARAM_CANONICAL_KEYS = {
    VOLUME: 'VOLUME',
    COR: 'COR',
    ASPECTO: 'ASPECTO',
    DENSIDADE: 'DENSIDADE',
    PH: 'PH',
    PROTEINAS: 'PROTEINAS',
    CORPOS_CETONICOS: 'CORPOS_CETONICOS',
    GLICOSE: 'GLICOSE',
    UROBILINOGENIO: 'UROBILINOGENIO',
    BILIRRUBINA: 'BILIRRUBINA',
    SANGUE_HEMOGLOBINA: 'SANGUE_HEMOGLOBINA',
    NITRITO: 'NITRITO',
    CELULAS_EPITELIAIS: 'CELULAS_EPITELIAIS',
    FILAMENTOS_MUCO: 'FILAMENTOS_MUCO',
    LEUCOCITOS: 'LEUCOCITOS',
    BACTERIAS: 'BACTERIAS',
    CILINDROS: 'CILINDROS',
    CRISTAIS: 'CRISTAIS',
    ESTRUTURAS_LEVEDURIFORMES: 'ESTRUTURAS_LEVEDURIFORMES',
    HEMACIAS: 'HEMACIAS',
    OBSERVACAO: 'OBSERVACAO'
};

const URI_EXACT_ALIAS_MAP = {
    // Volume
    'VOLUME': URI_PARAM_CANONICAL_KEYS.VOLUME,
    'VOL': URI_PARAM_CANONICAL_KEYS.VOLUME,

    // Cor
    'COR': URI_PARAM_CANONICAL_KEYS.COR,
    'COLORACAO': URI_PARAM_CANONICAL_KEYS.COR,

    // Aspecto
    'ASPECTO': URI_PARAM_CANONICAL_KEYS.ASPECTO,
    'LIMPIDEZ': URI_PARAM_CANONICAL_KEYS.ASPECTO,

    // Densidade
    'DENSIDADE': URI_PARAM_CANONICAL_KEYS.DENSIDADE,
    'DENS': URI_PARAM_CANONICAL_KEYS.DENSIDADE,

    // pH
    'PH': URI_PARAM_CANONICAL_KEYS.PH,
    'REACAO PH': URI_PARAM_CANONICAL_KEYS.PH,
    'REACAO': URI_PARAM_CANONICAL_KEYS.PH,

    // Proteínas
    'PROTEINAS': URI_PARAM_CANONICAL_KEYS.PROTEINAS,
    'PROTEINA': URI_PARAM_CANONICAL_KEYS.PROTEINAS,
    'PROT': URI_PARAM_CANONICAL_KEYS.PROTEINAS,

    // Corpos Cetônicos
    'CORPOS CETONICOS': URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,
    'CORPO CETONICO': URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,
    'CETONICOS': URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,
    'CETONAS': URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,
    'CETONA': URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS,

    // Glicose
    'GLICOSE': URI_PARAM_CANONICAL_KEYS.GLICOSE,
    'GLIC': URI_PARAM_CANONICAL_KEYS.GLICOSE,

    // Urobilinogênio
    'UROBILINOGENIO': URI_PARAM_CANONICAL_KEYS.UROBILINOGENIO,
    'URO': URI_PARAM_CANONICAL_KEYS.UROBILINOGENIO,
    'UROBILINA': URI_PARAM_CANONICAL_KEYS.UROBILINOGENIO,

    // Bilirrubina
    'BILIRRUBINA': URI_PARAM_CANONICAL_KEYS.BILIRRUBINA,
    'BILIRRUBINAS': URI_PARAM_CANONICAL_KEYS.BILIRRUBINA,
    'BIL': URI_PARAM_CANONICAL_KEYS.BILIRRUBINA,

    // Sangue / Hemoglobina
    'SANGUE HEMOGLOBINA': URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA,
    'SANGUE': URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA,
    'HEMOGLOBINA': URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA,
    'SANGUE OCULTO': URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA,

    // Nitrito
    'NITRITO': URI_PARAM_CANONICAL_KEYS.NITRITO,
    'NITRITOS': URI_PARAM_CANONICAL_KEYS.NITRITO,
    'NIT': URI_PARAM_CANONICAL_KEYS.NITRITO,

    // Células Epiteliais
    'CELULAS EPITELIAIS': URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS,
    'CELULA EPITELIAL': URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS,
    'CELULAS': URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS,
    'EPITELIAIS': URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS,

    // Filamentos de Muco
    'FILAMENTOS DE MUCO': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTO DE MUCO': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTOS DE MUCOS': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTO DE MUCOS': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTOS MUCO': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTO MUCO': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'MUCO': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,
    'FILAMENTOS': URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO,

    // Leucócitos
    'LEUCOCITOS': URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,
    'LEUCOCITO': URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,
    'LEUC': URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,
    'PIOCITOS': URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,
    'PIOCITO': URI_PARAM_CANONICAL_KEYS.LEUCOCITOS,

    // Bactérias
    'BACTERIAS': URI_PARAM_CANONICAL_KEYS.BACTERIAS,
    'BACTERIA': URI_PARAM_CANONICAL_KEYS.BACTERIAS,
    'FLORA BACTERIANA': URI_PARAM_CANONICAL_KEYS.BACTERIAS,

    // Cilindros
    'CILINDROS': URI_PARAM_CANONICAL_KEYS.CILINDROS,
    'CILINDRO': URI_PARAM_CANONICAL_KEYS.CILINDROS,

    // Cristais
    'CRISTAIS': URI_PARAM_CANONICAL_KEYS.CRISTAIS,
    'CRISTAL': URI_PARAM_CANONICAL_KEYS.CRISTAIS,
    'CRIATAIS': URI_PARAM_CANONICAL_KEYS.CRISTAIS, // alias para erro de digitação

    // Estruturas Leveduriformes
    'ESTRUTURAS LEVEDURIFORMES': URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES,
    'ESTRUTURA LEVEDURIFORMES': URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES,
    'LEVEDURAS': URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES,
    'LEVEDURA': URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES,
    'LEVEDURIFORMES': URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES,

    // Hemácias
    'HEMACIAS': URI_PARAM_CANONICAL_KEYS.HEMACIAS,
    'HEMACIA': URI_PARAM_CANONICAL_KEYS.HEMACIAS,
    'ERITROCITOS': URI_PARAM_CANONICAL_KEYS.HEMACIAS,
    'ERITROCITO': URI_PARAM_CANONICAL_KEYS.HEMACIAS,

    // Observação
    'OBSERVACAO': URI_PARAM_CANONICAL_KEYS.OBSERVACAO,
    'OBSERVACOES': URI_PARAM_CANONICAL_KEYS.OBSERVACAO,
    'OBS': URI_PARAM_CANONICAL_KEYS.OBSERVACAO
};

/**
 * Identifica a chave canônica do parâmetro URI por correspondência exata.
 */
export function getUriParameterKey(param) {
    if (!param) return null;

    // 1. Tentar por código exato
    const rawCode = param.parameter_code || param.code;
    if (rawCode) {
        const normCode = normalizeExactIdentifier(rawCode);
        if (URI_EXACT_ALIAS_MAP[normCode]) {
            return URI_EXACT_ALIAS_MAP[normCode];
        }
    }

    // 2. Tentar por nome exato
    const rawName = param.name || param.parameter_name;
    if (rawName) {
        const normName = normalizeExactIdentifier(rawName);
        if (URI_EXACT_ALIAS_MAP[normName]) {
            return URI_EXACT_ALIAS_MAP[normName];
        }
    }

    return null;
}

/**
 * Retorna o nome visualmente corrigido para apresentação no URI.
 */
export function getUriParameterDisplayName(param) {
    if (!param) return '';
    const key = getUriParameterKey(param);
    if (key === URI_PARAM_CANONICAL_KEYS.CRISTAIS) return 'Cristais';
    if (key === URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES) return 'Estruturas Leveduriformes';
    if (key === URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO) return 'Filamentos de Muco';
    if (key === URI_PARAM_CANONICAL_KEYS.PH) return 'pH';
    return param.name || param.parameter_name || 'Parâmetro';
}

const URI_SECTION_START_HEADERS = {
    [URI_PARAM_CANONICAL_KEYS.VOLUME]: 'EXAME FÍSICO',
    [URI_PARAM_CANONICAL_KEYS.PROTEINAS]: 'EXAME QUÍMICO',
    [URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS]: 'SEDIMENTOSCOPIA'
};

/**
 * Retorna o título da seção para o início de bloco no exame URI (função pura).
 */
export function getUriSectionHeader(param) {
    const parameterKey = getUriParameterKey(param);
    return (parameterKey && URI_SECTION_START_HEADERS[parameterKey]) || null;
}

/**
 * Verifica se um resultado de exame URI possui ao menos um valor efetivamente persistido/digitado.
 */
export function hasPersistedUriResults(result) {
    if (!result || !Array.isArray(result.structuredValues) || result.structuredValues.length === 0) {
        return false;
    }
    return result.structuredValues.some(v => {
        const hasNumeric = v.value_numeric !== null && v.value_numeric !== undefined && String(v.value_numeric).trim() !== '';
        const hasText = v.value_text !== null && v.value_text !== undefined && String(v.value_text).trim() !== '';
        return hasNumeric || hasText;
    });
}

/**
 * Valores padrão para novos resultados de exame URI.
 * Volume, Densidade e pH permanecem vazios.
 */
export const URI_INITIAL_VALUES = {
    [URI_PARAM_CANONICAL_KEYS.COR]: 'AMARELO CLARO',
    [URI_PARAM_CANONICAL_KEYS.ASPECTO]: 'LÍMPIDO',
    [URI_PARAM_CANONICAL_KEYS.PROTEINAS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.CORPOS_CETONICOS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.GLICOSE]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.UROBILINOGENIO]: 'NORMAL',
    [URI_PARAM_CANONICAL_KEYS.BILIRRUBINA]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.SANGUE_HEMOGLOBINA]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.NITRITO]: 'NEGATIVO',
    [URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.HEMACIAS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.LEUCOCITOS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.BACTERIAS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.CILINDROS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.CRISTAIS]: 'AUSENTES',
    [URI_PARAM_CANONICAL_KEYS.ESTRUTURAS_LEVEDURIFORMES]: 'AUSENTES'
};

/**
 * Aplica os valores padrão no estado do formulário apenas se o exame for novo e o campo estiver vazio.
 */
export function applyUriInitialValues(currentForm, structuredValues) {
    if (!currentForm || !Array.isArray(structuredValues)) return currentForm;
    const updatedForm = { ...currentForm };

    structuredValues.forEach(param => {
        const paramId = param.id || param.parameter_id;
        if (!paramId) return;

        const key = getUriParameterKey(param);
        if (key && URI_INITIAL_VALUES[key] !== undefined) {
            const defaultText = URI_INITIAL_VALUES[key];
            const existingState = updatedForm[paramId] || { ...param };

            const isEmptyText = !existingState.value_text || String(existingState.value_text).trim() === '';
            const isEmptyNum = existingState.value_numeric === null || existingState.value_numeric === undefined || String(existingState.value_numeric).trim() === '';

            if (isEmptyText && isEmptyNum) {
                updatedForm[paramId] = {
                    ...existingState,
                    value_text: defaultText,
                    value_numeric: null
                };
            }
        }
    });

    return updatedForm;
}

/**
 * Mapa de siglas autorizadas para parâmetros do URI.
 */
export const URI_SIGLA_MAPS = {
    [URI_PARAM_CANONICAL_KEYS.COR]: {
        'ACL': 'AMARELO CLARO',
        'AC': 'AMARELO CITRINO',
        'AVE': 'AVERMELHADA',
        'AE': 'AMARELO ESCURO'
    },
    [URI_PARAM_CANONICAL_KEYS.ASPECTO]: {
        'T': 'TURVO',
        'L': 'LÍMPIDO',
        'LT': 'LIGEIRAMENTE TURVO'
    },
    [URI_PARAM_CANONICAL_KEYS.NITRITO]: {
        'N': 'NEGATIVO',
        'P': 'POSITIVO'
    },
    [URI_PARAM_CANONICAL_KEYS.CELULAS_EPITELIAIS]: {
        'AL': 'ALGUMAS',
        'VAR': 'VÁRIAS',
        'NUM': 'NUMEROSAS',
        'RAR': 'RARAS',
        'AS': 'AUSENTES'
    },
    [URI_PARAM_CANONICAL_KEYS.FILAMENTOS_MUCO]: {
        'ALG': 'ALGUNS',
        'VO': 'VÁRIOS',
        'NU': 'NUMEROSOS',
        'RO': 'RAROS',
        'AS': 'AUSENTES'
    }
};

/**
 * Expande a sigla para o parâmetro URI caso haja correspondência exata (case-insensitive + trim).
 * Se não houver correspondência exata, preserva o valor bruto integralmente.
 */
export function expandUriSigla(paramKey, rawValue) {
    if (rawValue === null || rawValue === undefined) return rawValue;
    const str = String(rawValue).trim();
    if (str === '') return rawValue;

    const siglaMap = URI_SIGLA_MAPS[paramKey];
    if (!siglaMap) return rawValue;

    const upper = str.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(siglaMap, upper)) {
        return siglaMap[upper];
    }

    return rawValue;
}

/**
 * Expande o valor de um campo de parâmetro URI.
 */
export function expandUriFieldValue(param, rawValue) {
    const key = getUriParameterKey(param);
    if (!key) return rawValue;
    return expandUriSigla(key, rawValue);
}

/**
 * Normaliza o formulário do URI antes de salvar, garantindo que qualquer sigla
 * ainda não expandida seja convertida para o texto completo antes da montagem do payload.
 */
export function normalizeUriFormValuesBeforeSave(formValues, structuredValues) {
    if (!formValues) return formValues;
    const normalized = { ...formValues };

    if (Array.isArray(structuredValues)) {
        structuredValues.forEach(param => {
            const paramId = param.id || param.parameter_id;
            if (!paramId || !normalized[paramId]) return;

            const fieldState = normalized[paramId];
            const rawVal = fieldState.value_text;
            if (typeof rawVal === 'string' && rawVal.trim() !== '') {
                const expanded = expandUriFieldValue(param, rawVal);
                if (expanded !== rawVal) {
                    normalized[paramId] = {
                        ...fieldState,
                        value_text: expanded
                    };
                }
            }
        });
    }

    return normalized;
}
