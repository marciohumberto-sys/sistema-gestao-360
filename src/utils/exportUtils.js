import * as XLSX from 'xlsx';

/**
 * Exporta uma lista de dados para arquivo Excel (.xlsx) baseado na definição de colunas.
 * Adiciona também cabeçalhos institucionais e informações do filtro no topo da visualização.
 * 
 * @param {Object} params
 * @param {Array} params.data - O array de objetos de dados.
 * @param {Array} params.columns - Definição das colunas (key, label).
 * @param {string} params.fileName - Nome final do arquivo.
 * @param {Object} params.metadata - Metadados para o topo do excel (relatorio, unidade, periodo).
 */
export const exportToExcel = ({ data, columns, fileName, metadata = {} }) => {
    try {
        if (!data || !data.length || !columns || !columns.length) {
            console.warn("Nenhum dado ou definição de coluna para exportar.");
            return;
        }

        const wsData = [];

        // 1. Cabeçalho Informativo Institucional do Excel
        wsData.push(['Prefeitura de Bezerros']);
        wsData.push(['Sistema Gestão 360']);
        wsData.push([`Relatório: ${metadata.relatorio || 'Relatório Analítico'}`]);
        wsData.push([`Unidade: ${metadata.unidade || 'Consolidado Geral'}`]);
        if (metadata.periodo) {
            wsData.push([`Período: ${metadata.periodo}`]);
        }
        wsData.push([]); // Linha em branco divisora

        // 2. Cabeçalho da Tabela
        const headerRow = columns.map(col => col.label);
        wsData.push(headerRow);

        // 3. Montar Linhas (Dados)
        data.forEach(row => {
            const rowData = columns.map(col => {
                let val = row[col.key];
                if (val === undefined || val === null) val = '';
                
                // Formatação fina solicitada (Tipos de Movimento Capitalizados)
                if (col.key === 'tipo' && typeof val === 'string') {
                    if (val === 'ENTRADA') val = 'Entrada';
                    if (val === 'SAÍDA' || val === 'SAIDA') val = 'Saída';
                    if (val === 'AJUSTE') val = 'Ajuste';
                }
                return val;
            });
            wsData.push(rowData);
        });

        // 4. Conversão para Worksheet usando a montagem customizada (AOA)
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);

        // 5. Ajuste inteligente da largura das colunas
        const colWidths = columns.map(col => {
            let width = 15;
            if (col.key === 'data') width = 18;
            if (col.key === 'tipo') width = 20;
            if (col.key === 'medicamento') width = 45;
            if (col.key === 'unidade') width = 15;
            if (col.key === 'quantidade' || col.key === 'saldo' || col.key === 'consumido') width = 12;
            if (col.key === 'obs') width = 50;
            if (col.key === 'lote') width = 16;
            if (col.key === 'validade') width = 14;
            if (col.key === 'status' || col.key === 'dias' || col.key === 'classificacao') width = 22;
            return { wch: width };
        });
        worksheet['!cols'] = colWidths;

        // 6. Criar Workbook e Apensar Sheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");

        // 7. Salvar e Disparar Download
        const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
        XLSX.writeFile(workbook, finalFileName);
    } catch (e) {
        console.error("Erro ao exportar para Excel:", e);
    }
};
