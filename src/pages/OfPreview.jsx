import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { ofsService } from '../services/api/ofs.service';
import { Printer } from 'lucide-react';
import logoBezerros from '../assets/logo-bezerros.png';
import './OfPreview.css';

const OfPreview = () => {
    const { id } = useParams();
    const { tenantId } = useTenant();

    const [ofData, setOfData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Set body and html class to isolate from main layout styles
        document.documentElement.classList.add('of-preview-html');
        document.body.classList.add('of-preview-body');
        return () => {
            document.documentElement.classList.remove('of-preview-html');
            document.body.classList.remove('of-preview-body');
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!tenantId || !id) return;
            try {
                setIsLoading(true);
                const data = await ofsService.getById(id);
                // Sort items
                if (data.items) {
                    data.items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                }
                setOfData(data);
            } catch (err) {
                console.error("Erro ao carregar OF:", err);
                setError('Não foi possível carregar os dados da Ordem de Fornecimento.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id, tenantId]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDateExtensive = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('pt-BR', options);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>Carregando visualização da OF...</div>;
    }

    if (error || !ofData) {
        return <div style={{ textAlign: 'center', padding: '50px', color: '#ff8a8a' }}>{error || 'OF não encontrada.'}</div>;
    }

    const { items = [], commitment, contract } = ofData;

    return (
        <div className="of-preview-container">
            {/* Controles apenas na tela */}
            <div className="of-preview-controls">
                <span style={{ fontSize: '14px', color: '#4b5563' }}>
                    Visualização da Reserva de Saldo (OF Nº {ofData.number})
                </span>
                <button onClick={handlePrint} title="Imprimir/Salvar PDF" style={{ minWidth: '160px', justifyContent: 'center' }}>
                    <Printer size={18} /> 
                    {ofData.status === 'ISSUED' ? 'Baixar / Imprimir PDF' : 'Imprimir Rascunho'}
                </button>
            </div>

            {/* Documento A4 (Aparecerá limpo na impressão) */}
            <div className="of-pdf-document">
                <div className="of-pdf-header">
                    <img src={logoBezerros} alt="Prefetura de Bezerros" className="of-pdf-logo" style={{ maxHeight: '80px', marginBottom: '15px' }} />
                    <h2 style={{ fontSize: '14pt', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Prefeitura Municipal de Bezerros</h2>
                    <h2 style={{ fontSize: '11pt', fontWeight: 600, margin: '0 0 4px 0' }}>{ofData.secretariat?.name || 'Secretaria de Administração'}</h2>
                    <h3 style={{ fontSize: '10pt', fontWeight: 500, margin: 0 }}>Central de Compras</h3>
                </div>

                <div className="of-pdf-title">
                    RESERVA DE SALDO / QUANTIDADE (OF Nº {ofData.number})
                </div>

                <div className="of-pdf-section">
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Pregão Eletrônico:</div>
                        <div className="of-pdf-value">{contract?.electronic_auction || '-'}</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Processo Licitatório:</div>
                        <div className="of-pdf-value">{contract?.bidding_process || '-'}</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Contrato:</div>
                        <div className="of-pdf-value">{contract?.number || '-'}</div>
                    </div>
                </div>

                <div className="of-pdf-section">
                    <strong style={{ display: 'block', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>DADOS DA CONTRATADA:</strong>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Empresa:</div>
                        <div className="of-pdf-value" style={{ fontWeight: 600 }}>{contract?.supplier_name || '-'}</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">CNPJ:</div>
                        <div className="of-pdf-value">{contract?.cnpj || '-'}</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Endereço:</div>
                        <div className="of-pdf-value">{contract?.address || '-'}</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Telefone:</div>
                        <div className="of-pdf-value">-</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Email:</div>
                        <div className="of-pdf-value">-</div>
                    </div>
                    <div className="of-pdf-row">
                        <div className="of-pdf-label">Objeto do Contrato:</div>
                        <div className="of-pdf-value" style={{ textAlign: 'justify' }}>{contract?.contract_object || contract?.title || '-'}</div>
                    </div>
                </div>

                <div className="of-pdf-section" style={{ border: '1px solid black', padding: '10px', marginTop: '20px' }}>
                    <p style={{ margin: 0, fontSize: '9pt', textAlign: 'justify' }}>
                        <strong>OBS:</strong> A NOTA FISCAL DEVERÁ SER EMITIDA MENSALMENTE NO ÚLTIMO DIA ÚTIL DO MÊS, CONSTANDO NAS OBSERVAÇÕES O NÚMERO DO CONTRATO E O MÊS DE REFERÊNCIA, BEM COMO OS DADOS BANCÁRIOS. A NOTA FISCAL SÓ DEVERÁ SER EMITIDA APÓS O RECEBIMENTO DEFINITIVO DOS MATERIAIS/SERVIÇOS, ATESTADO PELO SETOR COMPETENTE DESTA PREFEITURA.
                    </p>
                </div>

                {commitment && (
                    <div className="of-pdf-empenho">
                        EMPENHO: {commitment.number}
                    </div>
                )}

                <table className="of-pdf-table">
                    <thead>
                        <tr>
                            <th style={{ width: '8%', textAlign: 'center' }}>Item</th>
                            <th style={{ width: '45%' }}>Discriminação</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Acondicionamento</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Qtd.</th>
                            <th style={{ width: '10%', textAlign: 'right' }}>V. Unit.</th>
                            <th style={{ width: '12%', textAlign: 'right' }}>V. Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ textAlign: 'center' }}>{item.item_number}</td>
                                    <td>{item.description}</td>
                                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Nenhum item lançado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="of-pdf-total">
                    TOTAL GERAL DA RESERVA: {ofData.status === 'DRAFT' ? 'OF em edição' : formatCurrency(ofData.total_amount)}
                </div>

                <div className="of-pdf-date">
                    Bezerros-PE, {formatDateExtensive(ofData.issue_date || new Date().toISOString())}
                </div>

                <div className="of-pdf-signatures">
                    <div className="of-pdf-signature-block">
                        <div className="of-pdf-signature-line">
                            <strong>Setor Requisitante</strong>
                        </div>
                    </div>
                    <div className="of-pdf-signature-block">
                        <div className="of-pdf-signature-line">
                            <strong>Central de Compras</strong>
                        </div>
                    </div>
                </div>

                <div className="of-pdf-footer">
                    Praça Duque de Caxias, s/n - Centro - Bezerros/PE - CEP: 55660-000<br/>
                    CNPJ: 10.091.510/0001-75 - Fone: (81) 3728-6700 - E-mail: compras@bezerros.pe.gov.br
                </div>
            </div>
        </div>
    );
};

export default OfPreview;
