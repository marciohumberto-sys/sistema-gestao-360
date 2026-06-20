import React, { useState } from 'react';
import { 
    CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw, 
    FileCheck, Activity, Clock, ShieldCheck, User, 
    CheckSquare, Square, Eye, Printer, Send, ChevronLeft, ChevronRight,
    Info, ListChecks
} from 'lucide-react';
import './LaboratorioConferencia.css';

const LaboratorioConferencia = () => {
    const [selectedPatient, setSelectedPatient] = useState(1);
    const [selectedExam, setSelectedExam] = useState('GLI');

    const fila = [
        { id: 1, protocolo: '113443', paciente: 'Maria Aparecida da Silva', setor: 'Bioquímica', exames: 5, status: 'Aguardando conferência', statusClass: 'lab-badge-warning', date: '11:45' },
        { id: 2, protocolo: '113444', paciente: 'João Carlos Santos', setor: 'Sorologia', exames: 4, status: 'Aguardando conferência', statusClass: 'lab-badge-warning', date: '10:30' },
        { id: 3, protocolo: '113445', paciente: 'Ana Paula Ferreira', setor: 'Fezes', exames: 1, status: 'Devolvido para correção', statusClass: 'lab-badge-danger', date: '09:15' },
    ];

    const examesDoAtendimento = [
        { id: 'GLI', nome: 'Glicose Jejum', status: 'Aguardando conferência', material: 'Soro', metodo: 'Enzimático', resultado: '87', ref: '70 a 100', situacao: 'Dentro da referência', situacaoClass: 'success' },
        { id: 'COL', nome: 'Colesterol Total', status: 'Aguardando conferência', material: 'Soro', metodo: 'Enzimático', resultado: '251', ref: 'Menor que 200', situacao: 'Acima da referência', situacaoClass: 'danger' },
    ];

    const currentExam = examesDoAtendimento.find(e => e.id === selectedExam) || examesDoAtendimento[0];

    return (
        <div className="lab-conf-container">
            {/* Header */}
            <header className="lab-conf-header">
                <div>
                    <h1 className="lab-title">Conferência</h1>
                    <p className="lab-subtitle">Revisão técnica dos resultados antes da liberação do laudo</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><RefreshCw size={16} /> Atualizar lista</button>
                    <button className="lab-btn lab-btn-danger"><AlertTriangle size={16} /> Devolver para correção</button>
                </div>
            </header>

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
                        <input type="text" placeholder="Nome..." />
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor</label>
                        <select defaultValue="Todos">
                            <option>Todos</option>
                            <option>Bioquímica</option>
                            <option>Sorologia</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Status</label>
                        <select defaultValue="Aguardando conferência">
                            <option>Todos</option>
                            <option>Aguardando conferência</option>
                            <option>Em revisão</option>
                            <option>Devolvido para correção</option>
                            <option>Liberado</option>
                        </select>
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Resumo do Paciente (Igual Resultados) */}
            <div className="lab-card lab-patient-summary">
                <div className="lab-patient-summary-grid">
                    <div className="lab-ps-item"><span className="lab-ps-label">Protocolo:</span> <span className="lab-ps-val font-semibold">113443</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Paciente:</span> <span className="lab-ps-val font-bold text-primary">Maria Aparecida da Silva</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Idade:</span> <span className="lab-ps-val">58 anos</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Sexo:</span> <span className="lab-ps-val">Feminino</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Convênio:</span> <span className="lab-ps-val">SUS</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Local:</span> <span className="lab-ps-val">CENTRAL</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Médico:</span> <span className="lab-ps-val">Não informado</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Status geral:</span> <span className="lab-status-tag status-warning">Aguardando conferência</span></div>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="lab-conf-layout">
                
                {/* Coluna Esquerda: Fila */}
                <div className="lab-conf-sidebar">
                    <div className="lab-card lab-queue-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Clock size={18} /> Aguardando Conferência</h3>
                            <span className="lab-badge lab-badge-primary">3 registros</span>
                        </div>
                        <div className="lab-queue-list">
                            {fila.map((item) => (
                                <div 
                                    key={item.id} 
                                    className={`lab-queue-item ${selectedPatient === item.id ? 'active' : ''}`}
                                    onClick={() => setSelectedPatient(item.id)}
                                >
                                    <div className="lab-qi-header">
                                        <span className="font-bold text-gray-900">{item.protocolo}</span>
                                        <span className="text-gray-500 text-sm">{item.date}</span>
                                    </div>
                                    <div className="lab-qi-name font-semibold">{item.paciente}</div>
                                    <div className="lab-qi-meta">
                                        <span className="lab-sector-tag">{item.setor}</span>
                                        <span className="text-gray-500 text-sm">{item.exames} exames</span>
                                    </div>
                                    <div className="lab-qi-status mt-2">
                                        <span className={`lab-badge ${item.statusClass}`}>{item.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lab-card" style={{ padding: '0.5rem 1rem' }}>
                        <div className="lab-card-header" style={{ marginBottom: '0.5rem', borderBottom: 'none' }}>
                            <h3 className="lab-card-title" style={{ fontSize: '0.9rem' }}><Info size={16} /> Histórico do Paciente</h3>
                        </div>
                        <div className="lab-history-empty text-center" style={{ padding: '0.5rem', color: '#64748b' }}>
                            <p style={{ fontSize: '0.8rem', margin: 0 }}>Histórico disponível após integração/migração dos dados anteriores.</p>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Painel de Revisão */}
                <div className="lab-conf-main">
                    
                    {/* Card de Progresso */}
                    <div className="lab-card lab-progress-card">
                        <div className="lab-progress-header">
                            <div className="lab-progress-title"><ListChecks size={20} className="text-primary" /> Progresso da Conferência</div>
                            <div className="lab-progress-stats">
                                <div className="stat-item"><strong>5</strong> Total</div>
                                <div className="stat-item text-success"><strong>3</strong> Conferidos</div>
                                <div className="stat-item text-warning"><strong>2</strong> Pendentes</div>
                                <div className="stat-item text-danger"><strong>0</strong> Devolvidos</div>
                            </div>
                        </div>
                        <div className="lab-progress-bar-container">
                            <div className="lab-progress-bar">
                                <div className="lab-progress-fill bg-success" style={{ width: '60%' }}></div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '130px' }}>
                                <span className="lab-progress-pct" style={{ marginBottom: '0.2rem' }}>60% Concluído</span>
                                <span className="text-warning" style={{ fontSize: '0.8rem', fontWeight: '600' }}>2 exames pendentes</span>
                            </div>
                        </div>
                    </div>

                    {/* Painel do Exame Específico */}
                    <div className="lab-card lab-review-panel">
                        <div className="lab-typing-header">
                            <div className="lab-typing-title">
                                <h2>{currentExam.id} — {currentExam.nome}</h2>
                                <div className="lab-typing-badges">
                                    <span className="lab-badge lab-badge-gray">Material: {currentExam.material}</span>
                                    <span className="lab-badge lab-badge-gray">Método: {currentExam.metodo}</span>
                                </div>
                            </div>
                            <div className="lab-typing-status">
                                <span className="lab-status-tag status-warning">{currentExam.status}</span>
                            </div>
                        </div>

                        <div className="lab-review-body">
                            <div className="lab-review-data-row">
                                <div className="lab-review-result-box">
                                    <label>Resultado Digitado</label>
                                    <div className="result-display">
                                        <span className={`result-value ${currentExam.situacaoClass === 'danger' ? 'text-danger' : ''}`}>{currentExam.resultado}</span>
                                        <span className="result-unit">mg/dL</span>
                                    </div>
                                </div>

                                <div className="lab-review-ref-box">
                                    <div className="ref-line">
                                        <span className="ref-label">Valor de referência:</span>
                                        <span className="ref-val">{currentExam.ref}</span>
                                    </div>
                                    <div className="ref-status">
                                        <div className={`lab-interp-badge ${currentExam.situacaoClass}`}>
                                            {currentExam.situacaoClass === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            {currentExam.situacao}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lab-typing-text-row" style={{ marginTop: '2rem' }}>
                                <div className="lab-text-group">
                                    <label>Comentário do Exame</label>
                                    <textarea placeholder="Comentários digitados na fase anterior..." disabled defaultValue=""></textarea>
                                </div>
                                <div className="lab-text-group">
                                    <label>Observações Internas</label>
                                    <textarea placeholder="Observações da bancada..." disabled defaultValue=""></textarea>
                                </div>
                            </div>

                            <div className="lab-text-group" style={{ marginTop: '1.5rem' }}>
                                <label className="text-primary font-bold">Parecer da Conferência (Opcional)</label>
                                <textarea placeholder="Digite um parecer técnico ou motivo de devolução se necessário..." style={{ borderColor: '#bfdbfe' }}></textarea>
                            </div>
                        </div>

                        <div className="lab-typing-footer">
                            <div className="lab-nav-buttons">
                                <button className="lab-btn lab-btn-outline"><ChevronLeft size={16} /> Exame anterior</button>
                                <button className="lab-btn lab-btn-outline">Próximo exame <ChevronRight size={16} /></button>
                            </div>
                            <div className="lab-save-buttons" style={{ alignItems: 'center' }}>
                                <button className="lab-btn lab-btn-danger"><XCircle size={16} /> Devolver Exame</button>
                                <button className="lab-btn lab-btn-success"><CheckCircle2 size={16} /> Aprovar Exame</button>
                                <div title="Liberação disponível somente após todos os exames serem conferidos." style={{ display: 'inline-block' }}>
                                    <button className="lab-btn lab-btn-primary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}><ShieldCheck size={16} /> Liberar Laudo</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LaboratorioConferencia;
