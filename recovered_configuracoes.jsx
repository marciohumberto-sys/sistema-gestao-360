import React, { useState } from 'react';
import { 
    Settings, RefreshCw, Plus, Save, AlertTriangle, 
    FileSignature, Layers, Droplet, TestTube2, Users, 
    Search, Edit, Copy, Trash2, Eye, ShieldCheck, Lock, Activity
} from 'lucide-react';
import './LaboratorioConfiguracoes.css';

const LaboratorioConfiguracoes = () => {
    const [activeTab, setActiveTab] = useState('exames');
    const [selectedExam, setSelectedExam] = useState('GLI');

    const kpis = [
        { label: 'Exames cadastrados', value: '128', icon: FileSignature, color: '#3b82f6' },
        { label: 'Setores ativos', value: '6', icon: Layers, color: '#10b981' },
        { label: 'Valores de referência', value: '342', icon: Activity, color: '#f59e0b' },
        { label: 'Modelos de impressão', value: '4', icon: TestTube2, color: '#8b5cf6' },
        { label: 'Usuários vinculados', value: '12', icon: Users, color: '#64748b' },
    ];

    const tabs = [
        { id: 'exames', label: 'Exames' },
        { id: 'setores', label: 'Setores' },
        { id: 'materiais', label: 'Materiais' },
        { id: 'metodos', label: 'Métodos' },
        { id: 'referencias', label: 'Referências' },
        { id: 'usuarios', label: 'Usuários' },
    ];

    const examesMock = [
        { id: 'HEMO', nome: 'Hemograma completo', setor: 'Hematologia', material: 'Sangue Total EDTA', metodo: 'Automatizado', ref: 'Por faixa etária', status: 'Ativo', statusClass: 'lab-badge-success', unidade: 'N/A', numerico: 'Não', laudo: 'Sim', conf: 'Sim' },
        { id: 'GLI', nome: 'Glicose Jejum', setor: 'Bioquímica', material: 'Soro', metodo: 'Enzimático', ref: '70 a 100 mg/dL', status: 'Ativo', statusClass: 'lab-badge-success', unidade: 'mg/dL', numerico: 'Sim', laudo: 'Sim', conf: 'Sim' },
        { id: 'COL', nome: 'Colesterol Total', setor: 'Bioquímica', material: 'Soro', metodo: 'Enzimático', ref: '< 200 mg/dL', status: 'Ativo', statusClass: 'lab-badge-success', unidade: 'mg/dL', numerico: 'Sim', laudo: 'Sim', conf: 'Sim' },
        { id: 'URI', nome: 'Urina Tipo I', setor: 'Urinálise', material: 'Urina', metodo: 'Físico-químico', ref: 'Qualitativo', status: 'Ativo', statusClass: 'lab-badge-success', unidade: 'N/A', numerico: 'Não', laudo: 'Sim', conf: 'Sim' },
        { id: 'PAR', nome: 'Parasitológico de Fezes', setor: 'Fezes', material: 'Fezes', metodo: 'Microscopia', ref: 'Qualitativo', status: 'Ativo', statusClass: 'lab-badge-success', unidade: 'N/A', numerico: 'Não', laudo: 'Sim', conf: 'Sim' },
        { id: 'TSH', nome: 'Hormônio Tireoestimulante', setor: 'Sorologia', material: 'Soro', metodo: 'Quimioluminescência', ref: '0,4 a 4,0 µUI/mL', status: 'Inativo', statusClass: 'lab-badge-gray', unidade: 'µUI/mL', numerico: 'Sim', laudo: 'Sim', conf: 'Sim' },
    ];

    const setoresMock = [
        { nome: 'Bioquímica', exames: 45, ordem: 1, status: 'Ativo' },
        { nome: 'Hematologia', exames: 22, ordem: 2, status: 'Ativo' },
        { nome: 'Urinálise', exames: 12, ordem: 3, status: 'Ativo' },
        { nome: 'Sorologia', exames: 34, ordem: 4, status: 'Ativo' },
        { nome: 'Fezes', exames: 8, ordem: 5, status: 'Ativo' },
        { nome: 'Diversos', exames: 7, ordem: 6, status: 'Ativo' },
    ];

    const usuariosMock = [
        { nome: 'João (Recepção)', perfil: 'Visualiza configurações', access: 'Apenas leitura', icon: Eye, color: '#64748b' },
        { nome: 'Maria (Coordenadora)', perfil: 'Cadastra e edita', access: 'Acesso médio', icon: Edit, color: '#3b82f6' },
        { nome: 'Dr. Pedro (Biomédico)', perfil: 'Libera e configura exames', access: 'Acesso alto', icon: ShieldCheck, color: '#10b981' },
        { nome: 'Admin Master', perfil: 'Acesso completo', access: 'Total', icon: Lock, color: '#ef4444' },
    ];

    const currentExam = examesMock.find(e => e.id === selectedExam) || examesMock[0];

    return (
        <div className="lab-cfg-container">
            
            <div className="lab-warning-banner">
                <AlertTriangle size={16} />
                <span>Usuários da Recepção terão acesso somente para visualização das configurações.</span>
            </div>

            <header className="lab-cfg-header">
                <div>
                    <h1 className="lab-title">Configurações</h1>
                    <p className="lab-subtitle">Parâmetros, cadastros e regras operacionais do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><RefreshCw size={16} /> Atualizar lista</button>
                    <button className="lab-btn lab-btn-primary"><Plus size={16} /> Novo exame</button>
                    <button className="lab-btn lab-btn-success"><Save size={16} /> Salvar alterações</button>
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpis-grid" style={{ marginBottom: '1.25rem' }}>
                {kpis.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-kpi-card">
                            <div className="lab-kpi-header">
                                <span className="lab-kpi-label">{item.label}</span>
                                <div className="lab-kpi-icon-wrapper" style={{ backgroundColor: `${item.color}15`, color: item.color, width: '36px', height: '36px', borderRadius: '8px' }}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="lab-kpi-value" style={{ fontSize: '1.6rem' }}>{item.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Abas */}
            <div className="lab-cfg-tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        className={`lab-cfg-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === 'exames' && (
                <div className="lab-cfg-layout">
                    
                    {/* Lista de Exames */}
                    <div className="lab-cfg-main-col">
                        <div className="lab-card lab-cfg-list-card">
                            <div className="lab-cfg-list-header">
                                <div className="lab-cfg-filters-grid">
                                    <div className="lab-filter-item">
                                        <label>Nome / Código</label>
                                        <input type="text" placeholder="Buscar exame..." style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} />
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Setor</label>
                                        <select style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}>
                                            <option>Todos</option>
                                            <option>Bioquímica</option>
                                            <option>Hematologia</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Status</label>
                                        <select style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}>
                                            <option>Ativos</option>
                                            <option>Inativos</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-actions">
                                        <button className="lab-btn lab-btn-primary" style={{ height: '38px' }}><Search size={16} /> Buscar</button>
                                    </div>
                                </div>
                            </div>
                            <div className="lab-cfg-table-wrapper">
                                <table className="lab-cfg-table">
                                    <thead>
                                        <tr>
                                            <th>Cód</th>
                                            <th>Exame</th>
                                            <th>Setor</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examesMock.map(ex => (
                                            <tr 
                                                key={ex.id} 
                                                className={selectedExam === ex.id ? 'active' : ''}
                                                onClick={() => setSelectedExam(ex.id)}
                                            >
                                                <td className="font-bold text-gray-500" style={{ fontSize: '0.8rem' }}>#{ex.id}</td>
                                                <td className="font-bold text-primary">{ex.nome}</td>
                                                <td><span className="lab-badge lab-badge-gray" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}>{ex.setor}</span></td>
                                                <td><span className={`lab-badge ${ex.statusClass}`}>{ex.status}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                        <button className="lab-btn lab-btn-outline" style={{ padding: '0.35rem', border: '1px solid #e2e8f0' }} title="Editar"><Edit size={14} /></button>
                                                        <button className="lab-btn lab-btn-outline" style={{ padding: '0.35rem', border: '1px solid #e2e8f0' }} title="Duplicar"><Copy size={14} /></button>
                                                        <button className="lab-btn lab-btn-outline" style={{ padding: '0.35rem', border: '1px solid #e2e8f0', color: '#ef4444' }} title="Desativar"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detalhe do Exame */}
                    <div className="lab-cfg-side-col">
                        <div className="lab-cfg-details-panel">
                            <div className="cfg-panel-header">
                                <div className="cfg-panel-title">
                                    <h2>{currentExam.id} — {currentExam.nome}</h2>
                                </div>
                                <div className="cfg-panel-badges mt-2">
                                    <span className="lab-badge lab-badge-gray">{currentExam.setor}</span>
                                    <span className="lab-badge lab-badge-gray">{currentExam.material}</span>
                                    <span className={`lab-badge ${currentExam.statusClass}`}>{currentExam.status}</span>
                                </div>
                            </div>
                            <div className="cfg-panel-body">
                                <div className="cfg-info-box">
                                    <label>Código</label>
                                    <span className="font-semibold text-primary">{currentExam.id}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Nome</label>
                                    <span className="font-bold text-gray-900">{currentExam.nome}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Setor</label>
                                    <span>{currentExam.setor}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Material</label>
                                    <span>{currentExam.material}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Método Padrão</label>
                                    <span>{currentExam.metodo}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Unidade de Medida</label>
                                    <span>{currentExam.unidade}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Valor de Referência Base</label>
                                    <span className="font-semibold">{currentExam.ref}</span>
                                </div>
                                <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />
                                <div className="cfg-info-box">
                                    <label>Resultado Numérico?</label>
                                    <span>{currentExam.numerico}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Imprime no Laudo?</label>
                                    <span>{currentExam.laudo}</span>
                                </div>
                                <div className="cfg-info-box">
                                    <label>Exige Conferência?</label>
                                    <span>{currentExam.conf}</span>
                                </div>
                            </div>
                            <div className="cfg-panel-actions">
                                <button className="lab-btn lab-btn-primary"><Edit size={16} /> Editar exame</button>
                                <button className="lab-btn lab-btn-outline"><Activity size={16} /> Configurar referência</button>
                                <button className="lab-btn lab-btn-outline"><FileSignature size={16} /> Histórico de edições</button>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {activeTab === 'setores' && (
                <div className="cfg-simple-grid">
                    {setoresMock.map((setor, i) => (
                        <div key={i} className="cfg-simple-card">
                            <div className="cfg-sc-header">
                                <span className="cfg-sc-title">{setor.nome}</span>
                                <span className="lab-badge lab-badge-success">{setor.status}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <span><strong>Ordem:</strong> {setor.ordem}</span>
                                <span><strong>Exames vinculados:</strong> {setor.exames}</span>
                            </div>
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                <button className="lab-btn lab-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Gerenciar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'usuarios' && (
                <div className="cfg-simple-grid">
                    {usuariosMock.map((usr, i) => {
                        const Icon = usr.icon;
                        return (
                            <div key={i} className="cfg-simple-card">
                                <div className="cfg-sc-header">
                                    <span className="cfg-sc-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ background: `${usr.color}15`, color: usr.color, padding: '0.4rem', borderRadius: '8px' }}>
                                            <Icon size={16} />
                                        </div>
                                        {usr.nome}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <span><strong>Perfil:</strong> {usr.perfil}</span>
                                    <span><strong>Nível de acesso:</strong> {usr.access}</span>
                                </div>
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <button className="lab-btn lab-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Permissões</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {(activeTab === 'materiais' || activeTab === 'metodos' || activeTab === 'referencias') && (
                <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Settings size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Aba em construção</h3>
                    <p>Esta aba seguirá o mesmo padrão estrutural da aba de Exames.</p>
                </div>
            )}

        </div>
    );
};

export default LaboratorioConfiguracoes;
