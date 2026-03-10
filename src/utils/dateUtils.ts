/**
 * Utilitários para tratamento de datas no frontend, 
 * evitando problemas de fuso horário (timezone offset) 
 * que causam a exibição de "menos 1 dia".
 */

/**
 * Converte uma string de data (ISO ou YYYY-MM-DD) para um objeto Date local.
 * Se for apenas YYYY-MM-DD, trata como data local pura.
 */
export const parseLocalDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;

    // Detect Patterns like YYYY-MM-DD or YYYY-MM-DD T00:00:00...
    // We treat midnight (UTC or unspecified) as local business dates
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})/;
    const match = dateString.match(datePattern);

    if (match) {
        const [, year, month, day] = match.map(Number);
        const hasTime = dateString.includes('T') || dateString.includes(' ');

        // If it's only the date OR it's specifically midnight (T00:00:00 or space 00:00:00)
        // we force local interpretation to avoid the -1 day shift.
        const isMidnight = dateString.includes('00:00:00');

        if (!hasTime || isMidnight) {
            return new Date(year, month - 1, day);
        }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
};

/**
 * Formata uma string de data (ou objeto Date) para o padrão pt-BR (DD/MM/YYYY).
 * Garante que a data seja interpretada localmente.
 */
export const formatLocalDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '-';

    let date: Date | null;

    if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        date = parseLocalDate(dateInput);
    }

    if (!date) return '-';

    return new Intl.DateTimeFormat('pt-BR').format(date);
};

/**
 * Calcula a diferença em dias entre uma data futura e hoje,
 * tratando ambas como datas locais (meia-noite).
 */
export const getDaysDiffFromToday = (futureDateString: string | null | undefined): number | null => {
    const futureDate = parseLocalDate(futureDateString);
    if (!futureDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    futureDate.setHours(0, 0, 0, 0);

    const diffTime = futureDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Retorna a data de hoje formatada como YYYY-MM-DD no fuso horário local.
 * Ideal para ser usada como valor padrão em inputs do tipo "date".
 */
export const getTodayLocalDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
