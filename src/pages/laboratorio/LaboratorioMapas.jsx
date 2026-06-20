import React, { useState } from 'react';
import { 
    FileText, Printer, Search, RefreshCw, Eye,
    Filter, Calendar, Map, CheckCircle2, AlertCircle,
    User, Activity, LayoutDashboard, FileArchive
} from 'lucide-react';
import './LaboratorioMapas.css';

const LaboratorioMapas = () => {
    const [selectedMap, setSelectedMap] = useState(1);

    const resumo = [
        { label: 'Mapas gerados', value: '6', icon: FileText, color: '#3b82f6' },
        { label: 'Pacientes', value: '4', icon: User, color: '#8b5cf6' },
        { label: 'Exames', value: '18', icon: Activity, color: '#10b981' },
        { label: 'Setores envolvidos', value: '5', icon: LayoutDashboard, color: '#f59e0b' },
        { label: 'Pendentes de imp.', value: '2', icon: Printer, color: '#ef4444' },
    ];

    const mapas = [
        { id: 1, protocolo: '113443', paciente: 'Maria Aparecida da Silva', setor: 'Bioquímica', exames: 5, status: 'Pronto p/ imprimir', statusFull: 'Pronto para imprimir' },
        { id: 2, protocolo: '113443', paciente: 'Maria Aparecida da Silva', setor: 'Hematologia', exames: 1, status: 'Pronto p/ imprimir', statusFull: 'Pronto para imprimir' },
        { id: 3, protocolo: '113443', paciente: 'Maria Aparecida da Silva', setor: 'Urinálise', exames: 1, status: 'Pendente', statusFull: 'Pendente' },
        { id: 4, protocolo: '113444', paciente: 'João Carlos Santos', setor: 'Sorologia', exames: 4, status: 'Pronto p/ imprimir', statusFull: 'Pronto para imprimir' },
        { id: 5, protocolo: '113445', paciente: 'Ana Paula Ferreira', setor: 'Fezes', exames: 1, status: 'Pendente', statusFull: 'Pendente' },
    ];

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pronto p/ imprimir': return 'status-success';
            case 'Pendente': return 'status-warning';
            case 'Impresso': return 'status-default';
            case 'Regerado': return 'status-info';
            default: return 'status-default';
        }
    };

    return (
        <div className="lab-mapas-container">
            {/* Header */}
            <header className="lab-mapas-header">
                <div>
                    <h1 className="lab-title">Mapas</h1>
                    <p className="lab-subtitle">Geração e impressão de mapas de trabalho por paciente e setor</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><Filter size={16} /> Nova Consulta</button>
                    <button className="lab-btn lab-btn-primary"><FileText size={16} /> Gerar Mapas</button>
                    <button className="lab-btn lab-btn-success"><Printer size={16} /> Imprimir Mapas</button>
                </div>
            </header>

            {/* Filtros */}
            <div className="lab-card lab-filters-card">
                <div className="lab-filters-grid">
                    <div className="lab-filter-item">
                        <label>Data</label>
                        <div className="lab-input-with-icon">
                            <Calendar size={16} />
                            <input type="text" defaultValue="20/06/2026" />
                        </div>
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor / Seção</label>
                        <select defaultValue="Todos">
                            <option>Todos</option>
                            <option>Bioquímica</option>
                            <option>Hematologia</option>
                            <option>Urinálise</option>
                            <option>Sorologia</option>
                            <option>Fezes</option>
                            <option>Diversos</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Protocolo</label>
                        <input type="text" placeholder="Ex: 113443" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Paciente</label>
                        <input type="text" placeholder="Nome ou Cartão SUS" />
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Resumo */}
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

            {/* Layout Principal: Lista e Preview */}
            <div className="lab-mapas-layout">
                
                {/* Lista de Mapas */}
                <div className="lab-card lab-mapas-list-card">
                    <div className="lab-card-header">
                        <h3 className="lab-card-title"><Map size={18} /> Mapas Gerados</h3>
                    </div>
                    <div className="lab-table-container">
                        <table className="lab-table">
                            <thead>
                                <tr>
                                    <th>Protocolo</th>
                                    <th className="col-paciente">Paciente</th>
                                    <th>Setor</th>
                                    <th className="text-center">Exames</th>
                                    <th>Status</th>
                                    <th className="text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mapas.map((mapa) => (
                                    <tr key={mapa.id} className={selectedMap === mapa.id ? 'selected-row' : ''}>
                                        <td className="font-semibold">{mapa.protocolo}</td>
                                        <td>{mapa.paciente}</td>
                                        <td><span className="lab-sector-tag">{mapa.setor}</span></td>
                                        <td className="text-center font-semibold">{mapa.exames}</td>
                                        <td>
                                            <span className={`lab-status-tag ${getStatusClass(mapa.status)}`} title={mapa.statusFull}>
                                                {mapa.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="lab-action-group">
                                                <button 
                                                    className={`lab-icon-btn ${selectedMap === mapa.id ? 'lab-text-primary' : 'lab-text-gray'}`}
                                                    onClick={() => setSelectedMap(mapa.id)}
                                                    title="Visualizar"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button className="lab-icon-btn lab-text-gray" title="Imprimir">
                                                    <Printer size={16} />
                                                </button>
                                                <button className="lab-icon-btn lab-text-gray" title="Regerar">
                                                    <RefreshCw size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Prévia de Impressão */}
                <div className="lab-print-preview-container">
                    <div className="lab-print-actions">
                        <span className="lab-preview-title">Prévia de Impressão</span>
                        <div className="lab-preview-btn-group">
                            <button className="lab-btn lab-btn-sm lab-btn-primary"><Printer size={14} /> Imprimir mapa selecionado</button>
                            <button className="lab-btn lab-btn-sm lab-btn-outline"><RefreshCw size={14} /> Regerar mapa</button>
                        </div>
                    </div>
                    
                    <div className="lab-paper-mock">
                        <div className="lab-paper-header">
                            <div className="lab-paper-org">
                                <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                                <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
                            </div>
                            <div className="lab-paper-doc-title">
                                <h2>MAPA DE TRABALHO</h2>
                                <span className="lab-paper-sector">SETOR: BIOQUÍMICA</span>
                            </div>
                        </div>

                        <div className="lab-paper-info-grid">
                            <div className="lab-paper-info-item">
                                <label>Protocolo:</label>
                                <span>113443</span>
                            </div>
                            <div className="lab-paper-info-item">
                                <label>Data e hora:</label>
                                <span>20/06/2026 - 09:15</span>
                            </div>
                            <div className="lab-paper-info-item full-row">
                                <label>Paciente:</label>
                                <span className="font-bold">Maria Aparecida da Silva</span>
                            </div>
                            <div className="lab-paper-info-item">
                                <label>Idade:</label>
                                <span>58 anos</span>
                            </div>
                            <div className="lab-paper-info-item">
                                <label>Sexo:</label>
                                <span>Feminino</span>
                            </div>
                            <div className="lab-paper-info-item">
                                <label>Convênio:</label>
                                <span>SUS</span>
                            </div>
                            <div className="lab-paper-info-item">
                                <label>Local:</label>
                                <span>CENTRAL</span>
                            </div>
                            <div className="lab-paper-info-item full-row">
                                <label>Médico solicitante:</label>
                                <span>Não informado</span>
                            </div>
                        </div>

                        <div className="lab-paper-exams">
                            <table className="lab-paper-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>Cód.</th>
                                        <th style={{ width: '45%' }}>Exame Solicitado</th>
                                        <th style={{ width: '40%' }}>Resultado / Anotação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>GLI</td>
                                        <td>Glicose Jejum</td>
                                        <td className="lab-paper-line"></td>
                                    </tr>
                                    <tr>
                                        <td>COL</td>
                                        <td>Colesterol Total</td>
                                        <td className="lab-paper-line"></td>
                                    </tr>
                                    <tr>
                                        <td>HDL</td>
                                        <td>Colesterol HDL</td>
                                        <td className="lab-paper-line"></td>
                                    </tr>
                                    <tr>
                                        <td>LDL</td>
                                        <td>Colesterol LDL</td>
                                        <td className="lab-paper-line"></td>
                                    </tr>
                                    <tr>
                                        <td>TRI</td>
                                        <td>Triglicerídeos</td>
                                        <td className="lab-paper-line"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="lab-paper-footer">
                            <p>Impresso por: Usuário Sistema em 20/06/2026 às 10:30</p>
                            <p>Gestão 360 - Módulo Laboratório</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LaboratorioMapas;
