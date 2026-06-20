import React, { useState } from 'react';
import { 
    Search, CheckCircle2, Edit3, Clock, Send, Printer, 
    ChevronLeft, ChevronRight, Save, Activity, User, FileText,
    History, AlertCircle, Info
} from 'lucide-react';
import './LaboratorioResultados.css';

const LaboratorioResultados = () => {
    const [selectedExam, setSelectedExam] = useState('GLI');

    const isComplexExam = ['HEMO', 'URI', 'FEZ'].includes(selectedExam);

    const exames = [
        { id: 'HEMO', nome: 'Hemograma completo', status: 'Coletado', statusClass: 'status-info' },
        { id: 'GLI', nome: 'Glicose Jejum', status: 'Em digitação', statusClass: 'status-warning' },
        { id: 'COL', nome: 'Colesterol Total', status: 'Pendente', statusClass: 'status-default' },
        { id: 'HDL', nome: 'Colesterol HDL', status: 'Pendente', statusClass: 'status-default' },
        { id: 'LDL', nome: 'Colesterol LDL', status: 'Pendente', statusClass: 'status-default' },
        { id: 'TRI', nome: 'Triglicerídeos', status: 'Pendente', statusClass: 'status-default' },
        { id: 'URI', nome: 'Urina Tipo I', status: 'Pendente', statusClass: 'status-default' },
    ];

    const historico = [];

    const selectedExamData = exames.find(e => e.id === selectedExam) || exames[1];

    return (
        <div className="lab-res-container">
            {/* Header */}
            <header className="lab-res-header">
                <div>
                    <h1 className="lab-title">Resultados</h1>
                    <p className="lab-subtitle">Digitação e acompanhamento dos resultados de exames</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><Edit3 size={16} /> Novo Resultado</button>
                    <button className="lab-btn lab-btn-primary"><Save size={16} /> Salvar Resultado</button>
                    <button className="lab-btn lab-btn-success"><Send size={16} /> Enviar para Conferência</button>
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
                        <input type="text" defaultValue="113443" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Paciente</label>
                        <input type="text" defaultValue="Maria Aparecida da Silva" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor</label>
                        <select defaultValue="Bioquímica">
                            <option>Todos</option>
                            <option>Bioquímica</option>
                            <option>Hematologia</option>
                            <option>Urinálise</option>
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Status</label>
                        <select defaultValue="Em digitação">
                            <option>Todos</option>
                            <option>Pendente</option>
                            <option>Coletado</option>
                            <option>Em digitação</option>
                            <option>Digitado</option>
                            <option>Enviado para conferência</option>
                        </select>
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Resumo do Paciente */}
            <div className="lab-card lab-patient-summary">
                <div className="lab-patient-summary-grid">
                    <div className="lab-ps-item"><span className="lab-ps-label">Protocolo:</span> <span className="lab-ps-val font-semibold">113443</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Paciente:</span> <span className="lab-ps-val font-bold text-primary">Maria Aparecida da Silva</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Idade:</span> <span className="lab-ps-val">58 anos</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Sexo:</span> <span className="lab-ps-val">Feminino</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Convênio:</span> <span className="lab-ps-val">SUS</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Local:</span> <span className="lab-ps-val">CENTRAL</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Médico:</span> <span className="lab-ps-val">Não informado</span></div>
                    <div className="lab-ps-item"><span className="lab-ps-label">Status geral:</span> <span className="lab-status-tag status-warning">Resultado em digitação</span></div>
                </div>
            </div>

            {/* Layout Principal */}
            <div className="lab-res-layout">
                
                {/* Coluna Esquerda: Exames & Ações Finais */}
                <div className="lab-res-sidebar">
                    <div className="lab-card lab-exams-list-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><Activity size={18} /> Exames do Atendimento</h3>
                        </div>
                        <div className="lab-exams-list">
                            {exames.map((ex) => (
                                <div 
                                    key={ex.id} 
                                    className={`lab-exam-item ${selectedExam === ex.id ? 'active' : ''}`}
                                    onClick={() => setSelectedExam(ex.id)}
                                >
                                    <div className="lab-exam-item-header">
                                        <span className="lab-exam-code">{ex.id}</span>
                                        <span className={`lab-status-tag ${ex.statusClass}`}>{ex.status}</span>
                                    </div>
                                    <div className="lab-exam-name">{ex.nome}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lab-card lab-final-actions-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><CheckCircle2 size={18} /> Ações do Atendimento</h3>
                        </div>
                        <div className="lab-final-actions">
                            <button className="lab-btn lab-btn-primary lab-btn-block"><Save size={16} /> Salvar Resultado</button>
                            <button className="lab-btn lab-btn-outline lab-btn-block"><CheckCircle2 size={16} /> Marcar como Digitado</button>
                            <button className="lab-btn lab-btn-success lab-btn-block"><Send size={16} /> Enviar para Conferência</button>
                            <button className="lab-btn lab-btn-outline lab-btn-block"><Printer size={16} /> Imprimir Rascunho</button>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Digitação e Histórico */}
                <div className="lab-res-main">
                    {/* Painel de Digitação */}
                    <div className="lab-card lab-typing-card">
                        <div className="lab-typing-header">
                            <div className="lab-typing-title">
                                <h2>{selectedExamData.id} — {selectedExamData.nome}</h2>
                                {!isComplexExam && (
                                    <div className="lab-typing-badges">
                                        <span className="lab-badge lab-badge-gray">Material: Soro</span>
                                        <span className="lab-badge lab-badge-gray">Método: Enzimático</span>
                                    </div>
                                )}
                            </div>
                            <div className="lab-typing-status">
                                <span className={`lab-status-tag ${selectedExamData.statusClass}`}>{selectedExamData.status}</span>
                            </div>
                        </div>

                        {isComplexExam ? (
                            <div className="lab-typing-body" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '2rem 0' }}>
                                <div className="lab-alert-box" style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <AlertCircle size={40} style={{ color: '#3b82f6', margin: '0 auto 1rem', display: 'block' }} />
                                    <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Exame Estruturado</h3>
                                    <p style={{ color: '#64748b', lineHeight: '1.5', maxWidth: '400px', margin: '0 auto' }}>
                                        Este exame possui estrutura especial de digitação e será configurado na próxima etapa.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="lab-typing-body">
                                    <div className="lab-typing-result-row">
                                        <div className="lab-typing-input-group">
                                            <label>Resultado</label>
                                            <div className="lab-input-huge-container">
                                                <input type="text" className="lab-input-huge-field" defaultValue="87" placeholder="Digite..." />
                                                <span className="lab-unit-addon">mg/dL</span>
                                            </div>
                                        </div>
                                        <div className="lab-typing-interpretation">
                                            <div className="lab-interp-badge success">
                                                <CheckCircle2 size={16} /> Dentro da referência
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lab-typing-ref-row">
                                        <div className="lab-ref-box">
                                            <span className="lab-ref-label"><Info size={14} /> Valor de referência:</span>
                                            <span className="lab-ref-value">70 a 100 mg/dL</span>
                                        </div>
                                    </div>

                                    <div className="lab-typing-text-row">
                                        <div className="lab-text-group">
                                            <label>Comentário do Exame</label>
                                            <textarea placeholder="Adicionar comentário ao laudo..."></textarea>
                                        </div>
                                        <div className="lab-text-group">
                                            <label>Observações Internas (Não sai no laudo)</label>
                                            <textarea placeholder="Observações para a bancada..."></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="lab-typing-footer">
                                    <div className="lab-nav-buttons">
                                        <button className="lab-btn lab-btn-outline"><ChevronLeft size={16} /> Exame anterior</button>
                                        <button className="lab-btn lab-btn-outline">Próximo exame <ChevronRight size={16} /></button>
                                    </div>
                                    <div className="lab-save-buttons">
                                        <button className="lab-btn lab-btn-outline"><Save size={16} /> Salvar este exame</button>
                                        <button className="lab-btn lab-btn-primary"><CheckCircle2 size={16} /> Salvar e próximo</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Histórico do Paciente */}
                    <div className="lab-card lab-history-card">
                        <div className="lab-card-header">
                            <h3 className="lab-card-title"><History size={18} /> Histórico do Paciente</h3>
                        </div>
                        <div className="lab-history-list">
                            <div className="lab-history-empty text-center" style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Histórico disponível após integração/migração dos dados anteriores.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LaboratorioResultados;
