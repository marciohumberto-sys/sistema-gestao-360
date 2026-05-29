/**
 * Normaliza o input de quantidade convertendo vírgula para ponto e removendo espaços.
 * Não altera a string além disso para manter a validação correta.
 */
export const normalizeQuantityInput = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(',', '.');
};

/**
 * Valida o formato da quantidade baseada na flag allowDecimal.
 * Usado para bloquear inputs inválidos enquanto o usuário digita e para validação final.
 * 
 * @param {string|number} value - O valor a ser validado
 * @param {boolean} allowDecimal - Se permite casas decimais
 * @returns {boolean} - True se for válido, False caso contrário
 */
export const isValidQuantity = (value, allowDecimal) => {
    if (value === null || value === undefined || value === '') return true; // Permite vazio durante a digitação

    const strValue = String(value);
    
    if (allowDecimal) {
        // Permite apenas números de 0 a 9 e no máximo uma vírgula com até 6 casas decimais. Bloqueia ponto, espaços, etc.
        const regex = /^\d+(,\d{0,6})?$/;
        return regex.test(strValue);
    } else {
        // Permite apenas números de 0 a 9. Bloqueia vírgula, ponto, espaços, etc.
        const regex = /^\d+$/;
        return regex.test(strValue);
    }
};

/**
 * Faz o parse da quantidade para Number, garantindo as regras estritas.
 * Não faz arredondamentos. Se inválido, lança erro ou retorna NaN.
 * 
 * @param {string|number} value - O valor a converter
 * @param {boolean} allowDecimal - Se permite casas decimais
 * @returns {number} O valor formatado como Number
 * @throws {Error} Se o valor for inválido de acordo com a regra
 */
export const parseQuantity = (value, allowDecimal) => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return 0;
    }

    const strValue = String(value).trim();

    if (allowDecimal) {
        // Validação estrita antes da conversão: apenas números e vírgula são permitidos, ponto é bloqueado
        const strictRegex = /^\d+(,\d{1,6})?$/;
        if (!strictRegex.test(strValue) && !/^\d+$/.test(strValue)) {
            throw new Error("Quantidade decimal inválida. Use apenas números com até 6 casas decimais e vírgula.");
        }
    } else {
        if (!/^\d+$/.test(strValue)) {
            throw new Error("Apenas quantidades inteiras são permitidas para este item.");
        }
    }

    const normalized = strValue.replace(',', '.');
    const parsed = Number(normalized);

    if (isNaN(parsed) || parsed < 0) {
        throw new Error("Quantidade inválida.");
    }

    return parsed;
};

/**
 * Formata a quantidade para exibição, preservando até 6 casas decimais apenas se necessário.
 * Não exibe decimais desnecessários (ex: 1.00 -> 1).
 */
export const formatQuantityDisplay = (value) => {
    if (value === null || value === undefined) return '0';
    
    const parsed = Number(value);
    if (isNaN(parsed)) return '0';

    // Intl.NumberFormat para remover zeros extras e formatar com vírgula no BR
    return new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 6
    }).format(parsed);
};

/**
 * Retorna o valor numérico de forma segura para uso em cálculos visuais (UI).
 * Se for inválido, retorna 0 (não lança erro).
 */
export const safeParseQuantity = (value, allowDecimal) => {
    try {
        return parseQuantity(value, allowDecimal);
    } catch (e) {
        return 0;
    }
};

/**
 * Normaliza a quantidade ao sair do campo (blur) para o padrão brasileiro.
 * Se for inteiro, preserva como inteiro. Se for decimal, garante exatamente as casas decimais (até 6).
 */
export const normalizeQuantityOnBlur = (value, allowDecimal) => {
    if (value === null || value === undefined || String(value) === '') return '';

    const rawStr = String(value);
    if (allowDecimal) {
        if (!rawStr.includes(',')) {
            return rawStr;
        }
        const [intPart, decPart] = rawStr.split(',');
        // Se já tiver decimais, mantém eles (até 6). Se não, adiciona 2 zeros no mínimo.
        const paddedDec = (decPart || '').padEnd(2, '0').slice(0, 6);
        return `${intPart},${paddedDec}`;
    } else {
        return rawStr;
    }
};

