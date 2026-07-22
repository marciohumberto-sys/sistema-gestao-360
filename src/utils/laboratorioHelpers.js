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
