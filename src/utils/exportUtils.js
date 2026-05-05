import ExcelJS from 'exceljs';
import { brandConfig } from '../config/brand';

/**
 * Exporta uma lista de dados para arquivo Excel (.xlsx) com estilização PREMIUM usando ExcelJS.
 * Suporta imagens (logo), destaques de ranking, zebra e formatação profissional.
 */
export const exportToExcel = async ({ data, columns, fileName, metadata = {}, sheetName = "Relatório Geral" }) => {
    try {
        if (!data || !data.length || !columns || !columns.length) {
            console.warn("Nenhum dado ou definição de coluna para exportar.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31), {
            views: [{ state: 'frozen', ySplit: 7 }] // Congela as 7 primeiras linhas (Header + Info + Espaçador + Table Header)
        });

        // --- 1. CABEÇALHO COM LOGO ---
        
        // Tenta buscar a logo para inserir no Excel
        try {
            const response = await fetch(brandConfig.logoPath);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            const logoId = workbook.addImage({
                buffer: arrayBuffer,
                extension: 'png',
            });
            
            // Posiciona a logo no topo DIREITO da área da tabela (Iniciando em D/E para terminar em F)
            // Dimensões: 269px x 71px. A tabela vai de A até F. 
            // Para alinhar a direita com o fim da col F, iniciamos aproximadamente na col 3.6 (D)
            worksheet.addImage(logoId, {
                tl: { col: 3.6, row: 0.1 },
                ext: { width: 269, height: 71 },
                editAs: 'oneCell'
            });
        } catch (e) {
            console.warn("Não foi possível carregar a logo para o Excel:", e);
        }

        // Textos do Cabeçalho (Lado Esquerdo)
        worksheet.mergeCells('A1:E1');
        const cellPrefeitura = worksheet.getCell('A1');
        cellPrefeitura.value = `PREFEITURA DE ${brandConfig.cityName.toUpperCase()}`;
        cellPrefeitura.font = { name: 'Arial', size: 14, bold: true };
        
        worksheet.mergeCells('A2:E2');
        const cellSistema = worksheet.getCell('A2');
        cellSistema.value = 'Sistema Gestão 360';
        cellSistema.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF444444' } };

        worksheet.mergeCells('A3:E3');
        const cellRelatorio = worksheet.getCell('A3');
        cellRelatorio.value = `Relatório: ${metadata.relatorio || 'Relatório Analítico'}`;
        cellRelatorio.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF444444' } };

        worksheet.mergeCells('A4:E4');
        const cellUnidade = worksheet.getCell('A4');
        cellUnidade.value = `Unidade: ${metadata.unidade || 'Consolidado Geral'}`;
        cellUnidade.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };

        if (metadata.periodo) {
            worksheet.mergeCells('A5:E5');
            const cellPeriodo = worksheet.getCell('A5');
            cellPeriodo.value = `Período: ${metadata.periodo}`;
            cellPeriodo.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
        }

        // Espaçador (Linha 6 vazia)
        worksheet.getRow(6).height = 15;

        // --- 2. CABEÇALHO DA TABELA (Linha 7) ---
        const headerRow = worksheet.getRow(7);
        headerRow.values = columns.map(col => col.label);
        headerRow.height = 25;
        
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF444444' } // Cinza escuro profissional
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // --- 3. DADOS (A partir da Linha 8) ---
        data.forEach((rowData, index) => {
            const row = worksheet.addRow(columns.map(col => rowData[col.key]));
            const isZebra = index % 2 !== 0;

            row.height = 20;
            row.eachCell((cell, colIndex) => {
                const columnDef = columns[colIndex - 1];
                
                // Estilo base
                cell.font = { name: 'Arial', size: 10 };
                cell.alignment = { 
                    vertical: 'middle', 
                    horizontal: columnDef.align || (typeof cell.value === 'number' ? 'right' : 'left')
                };
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };

                // Estilo Zebra (Cinza Claro)
                if (isZebra) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                }
            });
        });


        // --- 4. AJUSTE DE COLUNAS ---
        columns.forEach((col, idx) => {
            let width = 15;
            if (col.key === 'ranking') width = 10;
            if (col.key === 'item' || col.key === 'medicamento') width = 45;
            if (col.key === 'tipo') width = 15;
            if (col.key === 'unidade') width = 15;
            if (col.key === 'quantidade' || col.key === 'saldo' || col.key === 'consumido') width = 18;
            if (col.key === 'unidade_medida') width = 12;
            
            worksheet.getColumn(idx + 1).width = width;
        });

        // --- 5. DOWNLOAD NO BROWSER ---
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Erro ao exportar para Excel (ExcelJS Premium):", e);
    }
};



