import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { ofsService } from '../services/api/ofs.service';
import { Printer, ArrowLeft } from 'lucide-react';
import logoBezerros from '../assets/logo-bezerros.png';
import './OfPreview.css';

const OfPreview = () => {
    const { id } = useParams();
    const { tenantId } = useTenant();
    const [searchParams] = React.useState(new URLSearchParams(window.location.search));

    const [ofData, setOfData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get signatory from URL if provided (for drafts)
    const [selectedSigRole, setSelectedSigRole] = useState(searchParams.get('sigRole') || '');
    const [selectedSigName, setSelectedSigName] = useState(searchParams.get('sigName') || '');
    const [selectedSigReg, setSelectedSigReg] = useState(searchParams.get('sigReg') || '');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const signatoryOptions = [
        { id: 'gestor', label: 'Gestor do Contrato' },
        { id: 'fiscal_tecnico', label: 'Fiscal Técnico' },
        { id: 'fiscal_adm', label: 'Fiscal Administrativo' }
    ];

    useEffect(() => {
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
                console.log('OF preview id:', id);
                const data = await ofsService.getById(id);
                console.log('OF preview data:', data);
                
                if (data.items) {
                    data.items.sort((a, b) => (Number(a.item_number) || 0) - (Number(b.item_number) || 0));
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

    const formatDateExtensive = (dateString, useToday = false) => {
        const date = useToday ? new Date() : (dateString ? new Date(dateString) : new Date());
        if (!useToday && dateString) {
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        }
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('pt-BR', options);
    };

    const getMonthYear = () => {
        const date = new Date();
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${months[date.getMonth()]}/${date.getFullYear()}`;
    };

    const handlePrintRequest = () => {
        setIsModalOpen(true);
    };

    const confirmPrint = () => {
        if (!selectedSigRole) return;
        setIsModalOpen(false);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (isLoading) {
        return <div className="loading-container">Carregando visualização da OF...</div>;
    }

    if (error || !ofData) {
        return <div className="error-container">{error || 'OF não encontrada.'}</div>;
    }

    const { items = [], commitment, contract, secretariat } = ofData;

    return (
        <div className="of-preview-container">
            <div className="of-preview-controls">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => window.history.back()} className="btn-back">
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <span className="of-info-text">
                        OF Nº {ofData.number} - {contract?.supplier_name}
                    </span>
                </div>
                <button onClick={handlePrintRequest} className="btn-print">
                    <Printer size={18} /> Imprimir / Salvar PDF
                </button>
            </div>

            <div className="of-pdf-document">
                {ofData.status === 'DRAFT' && (
                    <div className="draft-watermark" style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-30deg)',
                        fontSize: '80px',
                        color: '#ff0000',
                        opacity: 0.1,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        userSelect: 'none',
                        textTransform: 'uppercase'
                    }}>
                        RASCUNHO - SEM VALOR LEGAL
                    </div>
                )}
                {/* Cabeçalho Institucional - Stack Vertical Garantido */}
                <div className="of-header-institutional-vertical">
                    <div className="logo-container-centered">
                        <img src={logoBezerros} alt="Prefeitura de Bezerros" className="header-logo" />
                    </div>
                    <div className="header-text-vertical">
                        <h1>PREFEITURA MUNICIPAL DE BEZERROS</h1>
                        <h2>SECRETARIA DE ADMINISTRAÇÃO</h2>
                        <h3>CENTRAL DE COMPRAS</h3>
                    </div>
                </div>

                {/* Título da OF */}
                <div className="of-document-title">
                    ORDEM DE FORNECIMENTO Nº {ofData.number || '___/____'}
                </div>

                {/* Blocos de Informação em Grid de 2 colunas para economizar espaço se necessário, mas aqui usaremos blocos empilhados como no modelo */}
                <div className="of-info-blocks">
                    <div className="info-block border-full">
                        <div className="grid-3-col">
                            <div className="info-item">
                                <span className="label">Processo Licitatório nº:</span>
                                <span className="value">{contract?.bidding_process || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Pregão Eletrônico nº:</span>
                                <span className="value">{contract?.electronic_auction || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Contrato nº:</span>
                                <span className="value">{contract?.number || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="info-block border-full">
                        <div className="info-item">
                            <span className="label">CONTRATADA:</span>
                            <span className="value" style={{ fontWeight: 'bold' }}>{contract?.supplier_name || '-'}</span>
                        </div>
                        <div className="grid-2-col">
                            <div className="info-item">
                                <span className="label">CNPJ:</span>
                                <span className="value">{contract?.cnpj || '-'}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">TELEFONE:</span>
                                <span className="value">-</span>
                            </div>
                        </div>
                        <div className="info-item">
                            <span className="label">ENDEREÇO:</span>
                            <span className="value">{contract?.address || '-'}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">E-MAIL:</span>
                            <span className="value">-</span>
                        </div>
                        <div className="info-item">
                            <span className="label">OBJETO:</span>
                            <span className="value" style={{ textAlign: 'justify', fontSize: '8pt' }}>{contract?.contract_object || contract?.title || '-'}</span>
                        </div>
                    </div>

                    <div className="info-block border-full bg-light">
                        <span className="block-title">DADOS PARA EMISSÃO DE NOTA FISCAL</span>
                        <div className="info-item">
                            <span className="label">NOME:</span>
                            <span className="value">PREFEITURA MUNICIPAL DE BEZERROS-PE</span>
                        </div>
                        <div className="info-item">
                            <span className="label">ENDEREÇO:</span>
                            <span className="value">PRAÇA DUQUE DE CAXIAS, S/N - CENTRO</span>
                        </div>
                        <div className="grid-3-col">
                            <div className="info-item">
                                <span className="label">CNPJ:</span>
                                <span className="value">10.091.510/0001-75</span>
                            </div>
                            <div className="info-item">
                                <span className="label">CEP:</span>
                                <span className="value">55660-000</span>
                            </div>
                            <div className="info-item">
                                <span className="label">CIDADE/UF:</span>
                                <span className="value">BEZERROS-PE</span>
                            </div>
                        </div>
                    </div>

                    <div className="info-block border-full">
                        <div className="info-item">
                            <span className="label" style={{ minWidth: '40px' }}>OBS:</span>
                            <span className="value" style={{ textAlign: 'justify', fontSize: '8pt', lineHeight: 1.4 }}>
                                COLOCAR NO CAMPO DE OBSERVAÇÃO DA NOTA FISCAL - CONTA CORRENTE, AGÊNCIA, NOME DO BANCO, DESTINADO À SECRETARIA DE {secretariat?.name?.toUpperCase() || '_____'}, REFERENTE AO CONTRATO Nº {(contract?.number || '_____').toUpperCase()}, {getMonthYear().toUpperCase()}. EMPENHO: {commitment?.number || '_____'}.
                            </span>
                        </div>
                    </div>

                    <div className="solicitation-text">
                        Solicita-se que sejam entregues os itens em anexo.
                    </div>

                    <div className="annex-title">ANEXO I: SECRETARIA DE {secretariat?.name?.toUpperCase() || '_____'}</div>

                    <div className="secretariat-box border-full">
                        {secretariat?.name || 'NÃO INFORMADA'}
                    </div>

                    <table className="items-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>Item</th>
                                <th>Discriminação</th>
                                <th style={{ width: '80px' }}>Acond.</th>
                                <th style={{ width: '60px' }}>Qtd. Total</th>
                                <th style={{ width: '100px' }}>Val. Unit.</th>
                                <th style={{ width: '110px' }}>Val. Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ textAlign: 'center' }}>{item.contract_item?.item_number || item.item_number || '-'}</td>
                                    <td>{item.description}</td>
                                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL GERAL</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(ofData.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="date-location" style={{ textAlign: 'center', marginTop: '40px' }}>
                        Bezerros-PE, {formatDateExtensive(null, true)}
                    </div>

                    <div className="signatures-container">
                        <div className="signature-box">
                            <div className="signature-line"></div>
                            <span className="sig-name">{selectedSigName || ofData.requester_name || 'Assinatura'}</span>
                            <span className="sig-role">{(selectedSigRole || ofData.requester_department || '').toUpperCase()}</span>
                            {(selectedSigReg || ofData.requester_registration) && (
                                <span className="sig-reg" style={{ display: 'block', fontSize: '8pt' }}>
                                    Matrícula: {selectedSigReg || ofData.requester_registration}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="document-footer">
                        <p>Prefeitura Municipal de Bezerros – Central de Compras</p>
                        <p>Praça Duque de Caxias, s/n - Centro - Bezerros/PE - CEP: 55660-000</p>
                        <p>CNPJ: 10.091.510/0001-75 - E-mail: centraldecomprasbezerros@gmail.com</p>
                    </div>
                </div>
            </div>

            {/* Modal de Assinante */}
            {isModalOpen && (
                <div className="sig-modal-overlay">
                    <div className="sig-modal-content">
                        <h2>Definir Assinante da OF</h2>
                        <p>Selecione a função do assinante para o documento:</p>
                        
                        <div className="sig-options-list">
                            {signatoryOptions.map(opt => (
                                <label key={opt.id} className={`sig-option-item ${selectedSigRole === opt.label ? 'active' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="sigRole" 
                                        value={opt.label}
                                        checked={selectedSigRole === opt.label}
                                        onChange={(e) => {
                                            setSelectedSigRole(e.target.value);
                                            // Se for um dos fiscais do contrato, tenta pegar o nome real
                                            if (opt.id === 'gestor') setSelectedSigName(contract?.manager_name || '');
                                            else if (opt.id === 'fiscal_tecnico') setSelectedSigName(contract?.technical_inspector_name || '');
                                            else if (opt.id === 'fiscal_adm') setSelectedSigName(contract?.administrative_inspector_name || '');
                                        }}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        <div className="sig-modal-actions">
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button 
                                className="btn-primary" 
                                onClick={confirmPrint}
                                disabled={!selectedSigRole}
                            >
                                Confirmar e gerar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfPreview;
