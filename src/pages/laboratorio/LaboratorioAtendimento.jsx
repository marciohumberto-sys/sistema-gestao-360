import React, { useState } from 'react';
import { 
    Search, UserPlus, Save, Printer, User, 
    Calendar, Clock, Stethoscope, Building2, MapPin, 
    FileText, Plus, X, Edit, Beaker, Map, Send, AlertCircle,
    CheckCircle2, CreditCard, Activity, ArrowRight, FlaskConical
} from 'lucide-react';
import './LaboratorioAtendimento.css';

const LaboratorioAtendimento = () => {
    const [selectedSetor, setSelectedSetor] = useState('Todos');

    const examesSolicitados = [
        { codigo: 'HEMO', exame: 'Hemograma completo', setor: 'Hematologia', material: 'Sangue Total (EDTA)', status: 'Coletado' },
        { codigo: 'GLI', exame: 'Glicose Jejum', setor: 'Bioquímica', material: 'Soro', status: 'Coleta pendente' },
        { codigo: 'COL', exame: 'Colesterol Total', setor: 'Bioquímica', material: 'Soro', status: 'Coleta pendente' },
        { codigo: 'URI', exame: 'Urina Tipo I', setor: 'Urinálise', material: 'Urina', status: 'Solicitado' },
    ];

    return (
        <div className="lab-atend-container">
            <header className="lab-atend-header">
                <div>
                    <h1 className="lab-title">
                        Atendimento / Coleta
                        <span className="lab-badge lab-badge-primary" style={{ marginLeft: '0.85rem', fontSize: '0.85rem', verticalAlign: 'middle', transform: 'translateY(-2px)' }}>
                            Protocolo: 113443
                        </span>
                    </h1>
                    <p className="lab-subtitle">Cadastro do paciente, abertura do atendimento e solicitação de exames</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><Plus size={16} /> Novo Atendimento</button>
                    <button className="lab-btn lab-btn-outline"><Printer size={16} /> Imprimir Mapas</button>
                    <button className="lab-btn lab-btn-primary"><Save size={16} /> Salvar Atendimento</button>
                </div>
            </header>

            <div className="lab-atend-layout">
                {/* Coluna Principal */}
                <div className="lab-atend-main">
                    
                    {/* Busca de Paciente */}
                    <div className="lab-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Search size={18} /> Localizar Paciente</h3>
                        </div>
                        <div className="lab-search-row">
                            <div className="lab-search-input-group">
                                <Search size={16} className="lab-search-icon" />
                                <input type="text" placeholder="Buscar por nome, CNS ou protocolo..." defaultValue="Maria Aparecida" />
                            </div>
                            <button className="lab-btn lab-btn-primary">Buscar</button>
                            <button className="lab-btn lab-btn-outline"><UserPlus size={16} /> Novo paciente</button>
                        </div>
                    </div>

                    {/* Dados do Paciente e Atendimento */}
                    <div className="lab-info-grid">
                        
                        {/* Paciente */}
                        <div className="lab-card">
                            <div className="lab-card-header">
                                <h3 className="lab-card-title"><User size={18} /> Dados do Paciente</h3>
                                <span className="lab-badge lab-badge-success">Ativo</span>
                            </div>
                            <div className="lab-data-grid">
                                <div className="lab-data-item full-width">
                                    <label>Nome do paciente</label>
                                    <div className="lab-data-value highlighted">Maria Aparecida da Silva</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>CNS / Cartão SUS</label>
                                    <div className="lab-data-value">702.1234.5678.9012</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>RG</label>
                                    <div className="lab-data-value">1.234.567 SDS/PE</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Nascimento / Idade</label>
                                    <div className="lab-data-value">15/04/1965 (58 anos)</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Sexo</label>
                                    <div className="lab-data-value">Feminino</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Telefone / Celular</label>
                                    <div className="lab-data-value">(81) 99999-9999</div>
                                </div>
                                <div className="lab-data-item full-width">
                                    <label>Endereço</label>
                                    <div className="lab-data-value">Rua Imperador Dom Pedro II, 76</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Bairro</label>
                                    <div className="lab-data-value">Santo Antônio</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Cidade</label>
                                    <div className="lab-data-value">Bezerros/PE</div>
                                </div>
                            </div>
                        </div>

                        {/* Atendimento */}
                        <div className="lab-card">
                            <div className="lab-card-header">
                                <h3 className="lab-card-title"><FileText size={18} /> Dados do Atendimento</h3>
                                <span className="lab-badge lab-badge-warning">Em aberto</span>
                            </div>
                            <div className="lab-data-grid">
                                <div className="lab-data-item">
                                    <label>Data / Hora</label>
                                    <div className="lab-data-value">20/06/2026 - 08:30</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Médico solicitante</label>
                                    <div className="lab-data-value">Não informado</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Convênio</label>
                                    <div className="lab-data-value">SUS</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Local de entrega</label>
                                    <div className="lab-data-value">CENTRAL</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Previsão de entrega</label>
                                    <div className="lab-data-value">22/06/2026 - 17:00</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>Jejum declarado</label>
                                    <div className="lab-data-value">12 horas</div>
                                </div>
                                <div className="lab-data-item">
                                    <label>DUM</label>
                                    <div className="lab-data-value">10/05/2026</div>
                                </div>
                                <div className="lab-data-item full-width">
                                    <label>Diagnóstico</label>
                                    <div className="lab-data-value">Astenia, Investigação de anemia</div>
                                </div>
                                <div className="lab-data-item full-width">
                                    <label>Medicamentos</label>
                                    <div className="lab-data-value">Losartana 50mg</div>
                                </div>
                                <div className="lab-data-item full-width">
                                    <label>Observações clínicas</label>
                                    <div className="lab-data-value">Paciente relata fraqueza intensa nos últimos dias.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seleção de Exames */}
                    <div className="lab-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Beaker size={18} /> Adicionar Exames</h3>
                        </div>
                        <div className="lab-exam-search-area">
                            <div className="lab-search-input-group">
                                <Search size={16} className="lab-search-icon" />
                                <input type="text" placeholder="Pesquisar exame por nome ou código..." />
                            </div>
                            <select className="lab-select" value={selectedSetor} onChange={(e) => setSelectedSetor(e.target.value)}>
                                {['Todos', 'Bioquímica', 'Hematologia', 'Urinálise', 'Sorologia', 'Fezes', 'Diversos'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <button className="lab-btn lab-btn-secondary"><Plus size={16} /> Adicionar</button>
                        </div>

                        {/* Tabela de Exames Solicitados */}
                        <div className="lab-table-container">
                            <table className="lab-table">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Exame</th>
                                        <th>Setor</th>
                                        <th>Material</th>
                                        <th>Status</th>
                                        <th className="text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examesSolicitados.map((exame, idx) => (
                                        <tr key={idx}>
                                            <td className="font-semibold">{exame.codigo}</td>
                                            <td>{exame.exame}</td>
                                            <td><span className="lab-sector-tag">{exame.setor}</span></td>
                                            <td>{exame.material}</td>
                                            <td>
                                                <span className={`lab-status-tag ${
                                                    exame.status === 'Coletado' ? 'status-success' : 
                                                    exame.status === 'Coleta pendente' ? 'status-warning' : 'status-default'
                                                }`}>
                                                    {exame.status}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button className="lab-icon-btn lab-text-blue"><Edit size={16} /></button>
                                                <button className="lab-icon-btn lab-text-red"><X size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Coluna Lateral (Resumo) */}
                <div className="lab-atend-sidebar">
                    <div className="lab-card lab-summary-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Activity size={18} /> Resumo do Atendimento</h3>
                        </div>
                        
                        <div className="lab-summary-stats">
                            <div className="lab-summary-item">
                                <div className="lab-summary-icon"><FlaskConical size={20} /></div>
                                <div className="lab-summary-info">
                                    <span className="lab-summary-label">Total de Exames</span>
                                    <span className="lab-summary-value">4</span>
                                </div>
                            </div>
                            <div className="lab-summary-item">
                                <div className="lab-summary-icon"><Beaker size={20} /></div>
                                <div className="lab-summary-info">
                                    <span className="lab-summary-label">Setores Envolvidos</span>
                                    <span className="lab-summary-value">3</span>
                                </div>
                            </div>
                            <div className="lab-summary-item alert-item">
                                <div className="lab-summary-icon"><Clock size={20} /></div>
                                <div className="lab-summary-info">
                                    <span className="lab-summary-label">Coletas Pendentes</span>
                                    <span className="lab-summary-value">2</span>
                                </div>
                            </div>
                            <div className="lab-summary-item">
                                <div className="lab-summary-icon"><Map size={20} /></div>
                                <div className="lab-summary-info">
                                    <span className="lab-summary-label">Mapas a Imprimir</span>
                                    <span className="lab-summary-value">1</span>
                                </div>
                            </div>
                            <div className="lab-summary-item">
                                <div className="lab-summary-icon"><FileText size={20} /></div>
                                <div className="lab-summary-info">
                                    <span className="lab-summary-label">Status do Atendimento</span>
                                    <span className="lab-summary-value" style={{ color: '#b45309', fontSize: '1.1rem' }}>Em Aberto</span>
                                </div>
                            </div>
                        </div>

                        <div className="lab-summary-actions">
                            <button className="lab-btn lab-btn-success lab-btn-block">
                                <CheckCircle2 size={18} /> Finalizar Atendimento
                            </button>
                            <button className="lab-btn lab-btn-primary lab-btn-block">
                                <Printer size={18} /> Salvar e Imprimir Mapas
                            </button>
                            <button className="lab-btn lab-btn-outline lab-btn-block">
                                <Save size={18} /> Salvar Atendimento
                            </button>
                            <button className="lab-btn lab-btn-danger lab-btn-block">
                                <X size={18} /> Cancelar
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LaboratorioAtendimento;
