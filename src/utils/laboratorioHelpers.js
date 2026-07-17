export const ATTENDANCE_ORIGINS = [
    { value: 'UPA', label: 'UPA' },
    { value: 'UNIDADE_MISTA', label: 'Unidade Mista' },
    { value: 'SAD', label: 'SAD' },
    { value: 'DOMICILIAR', label: 'Domiciliar' },
    { value: 'URGENCIA', label: 'Urgência' },
    { value: 'CENTRAL', label: 'Central' },
];

const ATTENDANCE_ORIGIN_LABELS = {
    UPA: 'UPA',
    UNIDADE_MISTA: 'Unidade Mista',
    SAD: 'SAD',
    DOMICILIAR: 'Domiciliar',
    URGENCIA: 'Urgência',
    CENTRAL: 'Central',
};

export function formatAttendanceOrigin(value) {
    if (!value) return '---';
    return ATTENDANCE_ORIGIN_LABELS[value] || value;
}
