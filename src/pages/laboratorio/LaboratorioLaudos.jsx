import React, { useState } from 'react';
import { 
    Search, RefreshCw, Printer, CheckCircle2, FileText, 
    Download, AlertCircle, FileCheck, Truck, XCircle, User, Activity
} from 'lucide-react';
import './LaboratorioLaudos.css';

const LaboratorioLaudos = () => {
    const [selectedLaudo, setSelectedLaudo] = useState(1);

    const fila = [
        { id: 1, protocolo: '113443', paciente: 'Maria Aparecida da Silva', idade: '58 anos', setores: 'Bioquímica / Hematologia', emissao: '20/06/2026', status: 'Liberado', statusClass: 'lab-badge-success' },
        { id: 2, protocolo: '113444', paciente: 'João Carlos Santos', idade: '42 anos', setores: 'Sorologia', emissao: '20/06/2026', status: 'Impresso', statusClass: 'lab-badge-info' },
        { id: 3, protocolo: '113445', paciente: 'Ana Paula Ferreira', idade: '36 anos', setores: 'Fezes', emissao: '20/06/2026', status: 'Aguardando imp.', statusClass: 'lab-badge-warning' },
        { id: 4, protocolo: '113446', paciente: 'José Bento da Silva', idade: '71 anos', setores: 'Urinálise / Bioquímica', emissao: '19/06/2026', status: 'Entregue', statusClass: 'lab-badge-success' },
    ];

    const resumo = [
        { label: 'Laudos liberados hoje', value: '45', icon: FileCheck, color: '#10b981' },
        { label: 'Aguardando impressão', value: '12', icon: Printer, color: '#3b82f6' },
        { label: 'Pendentes de entrega', value: '28', icon: AlertCircle, color: '#f59e0b' },
        { label: 'Entregues hoje', value: '115', icon: Truck, color: '#10b981' },
        { label: 'Devolvidos', value: '3', icon: XCircle, color: '#ef4444' },
    ];

    return (
        <div className="lab-laudos-container">
            {/* Header */}
            <header className="lab-laudos-header">
                <div>
                    <h1 className="lab-title">Laudos</h1>
                    <p className="lab-subtitle">Visualização, impressão e entrega dos laudos liberados</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><RefreshCw size={16} /> Atualizar lista</button>
                    <button className="lab-btn lab-btn-primary"><Printer size={16} /> Imprimir laudo</button>
                    <button className="lab-btn lab-btn-success"><CheckCircle2 size={16} /> Marcar como entregue</button>
                </div>
            </header>

            {/* Resumo (Mini Cards) */}
            <div className="lab-summary-row">
                {resumo.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-summary-mini-card">
                            <div className="lab-summary-mini-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                                <Icon size={20} />
                            </div>
                            <div className="lab-summary-mini-info">
                                <span className="lab-summary-mini-value">{item.value}</span>
                                <span className="lab-summary-mini-label">{item.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="lab-card lab-filters-card">
                <div className="lab-filters-grid">
                    <div className="lab-filter-item">
                        <label>Data</label>
                        <input type="text" defaultValue="20/06/2026" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Protocolo</label>
                        <input type="text" placeholder="Ex: 113443" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Paciente</label>
                        <input type="text" placeholder="Buscar nome..." />
                    </div>
                    <div className="lab-filter-item">
                        <label>Status</label>
                        <select defaultValue="Todos">
                            <option>Todos</option>
                            <option>Aguardando liberação</option>
                            <option>Liberado</option>
                            <option>Impresso</option>
                            <option>Entregue</option>
                            <option>Devolvido para correção</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor</label>
                        <select defaultValue="Todos">
                            <option>Todos</option>
                            <option>Bioquímica</option>
                            <option>Hematologia</option>
                            <option>Urinálise</option>
                        </select>
                    </div>

                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="lab-laudos-layout">
                
                {/* Coluna Esquerda: Lista de Laudos */}
                <div className="lab-card lab-laudos-list-card">
                    <div className="lab-card-header">
                        <h3 className="lab-card-title"><FileText size={18} /> Laudos Disponíveis</h3>
                        <span className="lab-badge lab-badge-primary">4 registros</span>
                    </div>
                    <div className="lab-laudos-card-list">
                        {fila.map((item) => (
                            <div 
                                key={item.id} 
                                className={`lab-laudo-item-card ${selectedLaudo === item.id ? 'active' : ''}`}
                                onClick={() => setSelectedLaudo(item.id)}
                            >
                                <div className="laudo-item-header">
                                    <span className="font-bold text-gray-900">Prot: {item.protocolo}</span>
                                    <span className={`lab-badge ${item.statusClass}`}>{item.status}</span>
                                </div>
                                <div className="laudo-item-name font-semibold text-primary">{item.paciente}</div>
                                <div className="laudo-item-meta text-gray-500 text-sm">
                                    {item.idade} &bull; Emissão {item.emissao}
                                </div>
                                <div className="laudo-item-sectors mt-2">
                                    {item.setores.split(' / ').map((setor, idx) => (
                                        <span key={idx} className="lab-sector-tag">{setor}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coluna Direita: Painel e Prévia A4 */}
                <div className="lab-laudo-preview-panel">
                    
                    {/* Painel de Status e Ações do Laudo Selecionado */}
                    <div className="lab-card lab-laudo-actions-card">
                        <div className="laudo-actions-header">
                            <div className="laudo-status-bar">
                                <div className="status-item">
                                    <span className="status-label">Status atual:</span>
                                    <span className="status-value text-success font-bold">Liberado</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Liberação:</span>
                                    <span className="status-value">20/06/2026 11:45</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Responsável:</span>
                                    <span className="status-value font-semibold">Jullyão César</span>
                                </div>
                                <div className="status-item">
                                    <span className="status-label">Entrega:</span>
                                    <span className="status-value text-warning font-bold">Pendente</span>
                                </div>
                            </div>
                            <div className="laudo-action-buttons">
                                <button className="lab-btn lab-btn-outline"><Download size={16} /> Baixar PDF</button>
                                <button className="lab-btn lab-btn-primary"><Printer size={16} /> Imprimir laudo selecionado</button>
                                <button className="lab-btn lab-btn-success"><CheckCircle2 size={16} /> Marcar como entregue</button>
                            </div>
                        </div>
                    </div>

                    {/* Prévia Folha A4 */}
                    <div className="lab-paper-wrapper">
                        <div className="lab-paper-a4">
                            
                            {/* Cabeçalho do Documento */}
                            <div className="paper-header">
                                <h2>SECRETARIA MUNICIPAL DE SAÚDE DE BEZERROS</h2>
                                <h1>LABORATÓRIO MUNICIPAL LINDBERG CÂNDIDO DE SOUZA</h1>
                            </div>

                            {/* Informações do Paciente */}
                            <div className="paper-patient-info">
                                <div className="p-row">
                                    <div className="p-col p-col-main"><strong>Paciente:</strong> MARIA APARECIDA DA SILVA</div>
                                    <div className="p-col"><strong>Protocolo:</strong> 113443</div>
                                    <div className="p-col"><strong>Emissão:</strong> 20/06/2026</div>
                                </div>
                                <div className="p-row">
                                    <div className="p-col"><strong>Idade:</strong> 58 anos</div>
                                    <div className="p-col"><strong>Data de Nasc.:</strong> 15/04/1968</div>
                                    <div className="p-col"><strong>Sexo:</strong> Feminino</div>
                                    <div className="p-col"><strong>CNS:</strong> 700.000.000.000.000</div>
                                </div>
                                <div className="p-row">
                                    <div className="p-col"><strong>Convênio:</strong> SUS</div>
                                    <div className="p-col"><strong>Unidade:</strong> CENTRAL</div>
                                    <div className="p-col"><strong>Coleta:</strong> 20/06/2026 07:30</div>
                                </div>
                                <div className="p-row">
                                    <div className="p-col p-col-main"><strong>Médico Solicitante:</strong> Não informado</div>
                                </div>
                            </div>

                            {/* Corpo do Laudo - Setores */}
                            <div className="paper-body">
                                
                                {/* BIOQUÍMICA */}
                                <div className="paper-sector">
                                    <h3 className="sector-title">BIOQUÍMICA</h3>
                                    
                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Glicose Jejum</span>
                                            <span className="exam-meta">Material: Soro | Método: Enzimático</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>87</strong> <span className="res-unit">mg/dL</span></div>
                                            <div className="res-ref">Ref: 70 a 100 mg/dL</div>
                                        </div>
                                    </div>

                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Colesterol Total</span>
                                            <span className="exam-meta">Material: Soro | Método: Enzimático</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>180</strong> <span className="res-unit">mg/dL</span></div>
                                            <div className="res-ref">Ref: Desejável menor que 200 mg/dL</div>
                                        </div>
                                    </div>

                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Colesterol HDL</span>
                                            <span className="exam-meta">Material: Soro | Método: Enzimático</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>45</strong> <span className="res-unit">mg/dL</span></div>
                                            <div className="res-ref">Ref: Desejável maior que 40 mg/dL</div>
                                        </div>
                                    </div>

                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Colesterol LDL</span>
                                            <span className="exam-meta">Material: Soro | Método: Enzimático</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>110</strong> <span className="res-unit">mg/dL</span></div>
                                            <div className="res-ref">Ref: Ótimo menor que 100 mg/dL</div>
                                        </div>
                                    </div>

                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Triglicerídeos</span>
                                            <span className="exam-meta">Material: Soro | Método: Enzimático</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>120</strong> <span className="res-unit">mg/dL</span></div>
                                            <div className="res-ref">Ref: Desejável menor que 150 mg/dL</div>
                                        </div>
                                    </div>
                                </div>

                                {/* HEMATOLOGIA */}
                                <div className="paper-sector">
                                    <h3 className="sector-title">HEMATOLOGIA</h3>
                                    <h4 className="sub-exam-title">Hemograma Completo</h4>
                                    
                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Hemoglobina</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>13,5</strong> <span className="res-unit">g/dL</span></div>
                                            <div className="res-ref">Ref: 12,0 a 16,0 g/dL</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Hematócrito</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>39,2</strong> <span className="res-unit">%</span></div>
                                            <div className="res-ref">Ref: 36,0 a 46,0 %</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Leucócitos</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>7.900</strong> <span className="res-unit">/mm³</span></div>
                                            <div className="res-ref">Ref: 4.000 a 10.000 /mm³</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head">
                                            <span className="exam-name">Plaquetas</span>
                                        </div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>288.000</strong> <span className="res-unit">/mm³</span></div>
                                            <div className="res-ref">Ref: 150.000 a 450.000 /mm³</div>
                                        </div>
                                    </div>
                                </div>

                                {/* URINÁLISE */}
                                <div className="paper-sector">
                                    <h3 className="sector-title">URINÁLISE</h3>
                                    <h4 className="sub-exam-title">Urina Tipo I</h4>
                                    
                                    <div className="paper-exam">
                                        <div className="exam-head"><span className="exam-name">Cor</span></div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>Amarelo citrino</strong></div>
                                            <div className="res-ref">Ref: Amarelo citrino</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head"><span className="exam-name">Aspecto</span></div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>Límpido</strong></div>
                                            <div className="res-ref">Ref: Límpido</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head"><span className="exam-name">Proteínas</span></div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>Ausente</strong></div>
                                            <div className="res-ref">Ref: Ausente</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head"><span className="exam-name">Glicose</span></div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>Ausente</strong></div>
                                            <div className="res-ref">Ref: Ausente</div>
                                        </div>
                                    </div>
                                    <div className="paper-exam">
                                        <div className="exam-head"><span className="exam-name">Leucócitos</span></div>
                                        <div className="exam-result-grid">
                                            <div className="res-value"><strong>Ausente</strong></div>
                                            <div className="res-ref">Ref: Ausente</div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Rodapé do Laudo */}
                            <div className="paper-footer">
                                <div className="paper-signature">
                                    <div className="signature-text">Conferido, liberado e assinado eletronicamente por Dr. Jullyão César - Biomédico - CRBM 5936</div>
                                    <div className="signature-date">Em 20/06/2026 às 11:45</div>
                                </div>
                                <div className="paper-address">
                                    Rua Imperador Dom Pedro II, 76 - Santo Antônio - Bezerros/PE
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LaboratorioLaudos;
