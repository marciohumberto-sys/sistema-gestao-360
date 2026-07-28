export const ATTENDANCE_ORIGINS = [
    { value: 'UPA', label: 'UPA' },
    { value: 'UNIDADE_MISTA', label: 'UNIDADE MISTA' },
    { value: 'SAD', label: 'SAD' },
    { value: 'DOMICILIAR', label: 'DOMICILIAR' },
    { value: 'URGENCIA', label: 'URGÊNCIA' },
    { value: 'CENTRAL', label: 'CENTRAL' },
];

const ATTENDANCE_ORIGIN_LABELS = {
    UPA: 'UPA',
    UNIDADE_MISTA: 'UNIDADE MISTA',
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

export const formatLabValue = (code, resultType, numericValue, textValue) => {
    if (resultType === 'TEXTO' || (numericValue === null && textValue)) return textValue || 'Não informado';
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
