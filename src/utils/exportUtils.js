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
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));
        const lastColIndex = columns.length - 1;
        const lastColLetter = String.fromCharCode(65 + lastColIndex);
        
        // Configura a impressão para ajustar à largura de 1 página
        worksheet.pageSetup = {
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            orientation: 'landscape'
        };

        // --- 1. CABEÇALHO COM LOGO ---
        try {
            const response = await fetch(brandConfig.logoPath);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            const logoId = workbook.addImage({
                buffer: arrayBuffer,
                extension: 'png',
            });
            
            // Posiciona a logo dentro da última ou penúltima coluna para não passar da tabela
            const logoColIndex = Math.max(1, columns.length - 1 - 0.5); 
            worksheet.addImage(logoId, {
                tl: { col: logoColIndex, row: 0.2 },
                ext: { width: 220, height: 58 },
                editAs: 'oneCell'
            });
        } catch (e) {
            console.warn("Não foi possível carregar a logo para o Excel:", e);
        }

        let currentRow = 1;

        // Textos do Cabeçalho (Lado Esquerdo)
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const cellPrefeitura = worksheet.getCell(`A${currentRow}`);
        cellPrefeitura.value = `PREFEITURA DE ${brandConfig.cityName.toUpperCase()}`;
        cellPrefeitura.font = { name: 'Arial', size: 14, bold: true };
        currentRow++;
        
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const cellSistema = worksheet.getCell(`A${currentRow}`);
        cellSistema.value = 'Sistema Gestão 360';
        cellSistema.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF444444' } };
        currentRow++;

        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const cellRelatorio = worksheet.getCell(`A${currentRow}`);
        cellRelatorio.value = `Relatório: ${metadata.relatorio || 'Relatório Analítico'}`;
        cellRelatorio.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF444444' } };
        currentRow++;

        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const cellUnidade = worksheet.getCell(`A${currentRow}`);
        cellUnidade.value = `Unidade: ${metadata.unidade || 'Consolidado Geral'}`;
        cellUnidade.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
        currentRow++;

        if (metadata.periodo) {
            worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
            const cellPeriodo = worksheet.getCell(`A${currentRow}`);
            cellPeriodo.value = `Período: ${metadata.periodo}`;
            cellPeriodo.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
            currentRow++;
        }

        if (metadata.totaisAbc) {
            currentRow++; // Linha em branco antes dos cards
            
            // Calculamos as colunas do segundo card de forma que fiquem dentro do limite da tabela
            // Card 1 fica em A-B. Card 2 fica nas duas últimas colunas.
            const card2StartCol = String.fromCharCode(65 + Math.max(2, columns.length - 2)); 
            const card2EndCol = lastColLetter;

            // --- LINHA 1 DO CARD: TÍTULO ---
            worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
            const titleMed = worksheet.getCell(`A${currentRow}`);
            titleMed.value = 'MEDICAMENTOS';
            titleMed.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF333333' } };
            titleMed.alignment = { horizontal: 'center', vertical: 'middle' };
            titleMed.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

            worksheet.mergeCells(`${card2StartCol}${currentRow}:${card2EndCol}${currentRow}`);
            const titleIns = worksheet.getCell(`${card2StartCol}${currentRow}`);
            titleIns.value = 'INSUMOS E MATERIAIS';
            titleIns.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF333333' } };
            titleIns.alignment = { horizontal: 'center', vertical: 'middle' };
            titleIns.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            
            currentRow++;

            // --- LINHA 2 DO CARD: SUBTÍTULO ---
            worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
            const subMed = worksheet.getCell(`A${currentRow}`);
            subMed.value = 'Total movimentado';
            subMed.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
            subMed.alignment = { horizontal: 'center', vertical: 'middle' };
            subMed.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

            worksheet.mergeCells(`${card2StartCol}${currentRow}:${card2EndCol}${currentRow}`);
            const subIns = worksheet.getCell(`${card2StartCol}${currentRow}`);
            subIns.value = 'Total movimentado';
            subIns.font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
            subIns.alignment = { horizontal: 'center', vertical: 'middle' };
            subIns.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

            currentRow++;

            // --- LINHA 3 DO CARD: VALORES ---
            worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
            const valMed = worksheet.getCell(`A${currentRow}`);
            valMed.value = metadata.totaisAbc.medicamentos;
            valMed.numFmt = '#,##0';
            valMed.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF111111' } };
            valMed.alignment = { horizontal: 'center', vertical: 'middle' };
            valMed.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            worksheet.getRow(currentRow).height = 25;

            worksheet.mergeCells(`${card2StartCol}${currentRow}:${card2EndCol}${currentRow}`);
            const valIns = worksheet.getCell(`${card2StartCol}${currentRow}`);
            valIns.value = metadata.totaisAbc.insumosMateriais;
            valIns.numFmt = '#,##0';
            valIns.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF111111' } };
            valIns.alignment = { horizontal: 'center', vertical: 'middle' };
            valIns.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

            // Aplicação de bordas suaves nos cards
            const borderStyle = { style: 'thin', color: { argb: 'FFDDDDDD' } };
            for (let r = currentRow - 2; r <= currentRow; r++) {
                ['A', 'B'].forEach(c => {
                    const cell = worksheet.getCell(`${c}${r}`);
                    cell.border = {
                        top: r === currentRow - 2 ? borderStyle : undefined,
                        bottom: r === currentRow ? borderStyle : undefined,
                        left: c === 'A' ? borderStyle : undefined,
                        right: c === 'B' ? borderStyle : undefined
                    };
                });
                [card2StartCol, card2EndCol].forEach(c => {
                    const cell = worksheet.getCell(`${c}${r}`);
                    cell.border = {
                        top: r === currentRow - 2 ? borderStyle : undefined,
                        bottom: r === currentRow ? borderStyle : undefined,
                        left: c === card2StartCol ? borderStyle : undefined,
                        right: c === card2EndCol ? borderStyle : undefined
                    };
                });
            }

            currentRow++;
            worksheet.getRow(currentRow).height = 15; // Espaçador após os cards
            currentRow++;
        } else {
            // Espaçador
            worksheet.getRow(currentRow).height = 15;
            currentRow++;
        }

        // Atualiza a view congelando até o cabeçalho da tabela
        worksheet.views = [{ state: 'frozen', ySplit: currentRow }];

        // --- 2. CABEÇALHO DA TABELA ---
        const tableStartRow = currentRow;
        const headerRow = worksheet.getRow(currentRow);
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

        // --- 3. DADOS ---
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

        // --- 4. AUTOFILTRO ---
        const lastCol = String.fromCharCode(64 + columns.length);
        worksheet.autoFilter = `A${tableStartRow}:${lastCol}${tableStartRow + data.length}`;

        // --- 5. AJUSTE DE COLUNAS ---
        columns.forEach((col, idx) => {
            let width = 15;
            if (col.key === 'ranking') width = 10;
            if (col.key === 'item') width = 45;
            if (col.key === 'medicamento') width = 42;
            if (col.key === 'tipo') width = 15;
            if (col.key === 'unidade') width = 18;
            if (col.key === 'quantidade' || col.key === 'saldo') width = 25;
            if (col.key === 'consumido') width = 22;
            if (col.key === 'unidade_medida') width = 12;
            if (col.key === 'observacoes' || col.key === 'obs') width = 40;
            if (col.key === 'percentualStr') width = 20;
            if (col.key === 'classificacao') width = 32;
            
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



