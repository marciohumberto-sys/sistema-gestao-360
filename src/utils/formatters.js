export const formatCpf = (cpf) => {
    if (!cpf) return '---';
    const num = String(cpf).replace(/\D/g, '');
    if (num.length !== 11) return cpf;
    return num.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCns = (cns) => {
    if (!cns) return '---';
    const num = String(cns).replace(/\D/g, '');
    return num || '---';
};
