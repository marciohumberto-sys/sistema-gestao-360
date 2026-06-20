import React, { useState } from 'react';
import { 
    Users, UserPlus, RefreshCw, Activity, Search,
    CheckCircle2, AlertTriangle, ShieldAlert,
    MapPin, Phone, Edit, Printer, FileText, ChevronRight
} from 'lucide-react';
import './LaboratorioPacientes.css';

const LaboratorioPacientes = () => {
    const [selectedPatient, setSelectedPatient] = useState('113443');

    const resumo = [
        { label: 'Total de Pacientes', value: '14.285', icon: Users, color: '#3b82f6' },
        { label: 'Cadastrados hoje', value: '28', icon: UserPlus, color: '#10b981' },
        { label: 'Cadastros incompletos', value: '142', icon: ShieldAlert, color: '#ef4444' },
        { label: 'Atendimentos ativos', value: '45', icon: Activity, color: '#f59e0b' },
        { label: 'Pacientes SUS', value: '13.950', icon: CheckCircle2, color: '#10b981' },
    ];

    const pacientesList = [
        { 
            id: '113443', 
            nome: 'Maria Aparecida da Silva', 
            idade: '58', 
            nascimento: '15/04/1968',
            sexo: 'Feminino', 
            cns: '702.1234.5678.9012', 
            rg: '4.582.111 SSP/PE',
            bairro: 'Santo Antônio', 
            cidade: 'Bezerros/PE', 
            rua: 'Rua Imperador Dom Pedro II',
            numero: '76',
            cep: '55660-000',
            telefone: '(81) 99888-7777',
            status: 'Completo', 
            statusClass: 'lab-badge-success',
            ultimoAtendimento: '20/06/2026',
            historico: [
                { prot: '113443', data: '20/06/2026', exames: 5, status: 'Em aberto', statusClass: 'text-warning' },
                { prot: '98441', data: '10/01/2026', exames: 3, status: 'Entregue', statusClass: 'text-success' },
                { prot: '81220', data: '05/08/2025', exames: 8, status: 'Entregue', statusClass: 'text-success' },
            ]
        },
        { 
            id: '113444', 
            nome: 'João Carlos Santos', 
            idade: '42', 
            nascimento: '10/11/1983',
            sexo: 'Masculino', 
            cns: '701.9999.8888.7777', 
            rg: '7.888.999 SSP/PE',
            bairro: 'Centro', 
            cidade: 'Bezerros/PE', 
            rua: 'Rua da Matriz',
            numero: '12',
            cep: '55660-000',
            telefone: '(81) 99111-2222',
            status: 'Completo', 
            statusClass: 'lab-badge-success',
            ultimoAtendimento: '20/06/2026',
            historico: [
                { prot: '113444', data: '20/06/2026', exames: 4, status: 'Em aberto', statusClass: 'text-warning' }
            ]
        },
        { 
            id: '113445', 
            nome: 'Ana Paula Ferreira', 
            idade: '36', 
            nascimento: '22/07/1989',
            sexo: 'Feminino', 
            cns: '700.5555.4444.3333', 
            rg: 'Não informado',
            bairro: 'São Pedro', 
            cidade: 'Bezerros/PE', 
            rua: 'Rua da Paz',
            numero: 'S/N',
            cep: '55660-000',
            telefone: 'Não informado',
            status: 'Incompleto', 
            statusClass: 'lab-badge-danger',
            ultimoAtendimento: '20/06/2026',
            historico: []
        },
        { 
            id: '113446', 
            nome: 'José Bento da Silva', 
            idade: '71', 
            nascimento: '03/02/1955',
            sexo: 'Masculino', 
            cns: '708.2222.1111.0000', 
            rg: '1.222.333 SSP/PE',
            bairro: 'Cruzeiro', 
            cidade: 'Bezerros/PE', 
            rua: 'Rua do Sol',
            numero: '45',
            cep: '55660-000',
            telefone: '(81) 99333-4444',
            status: 'Revisar', 
            statusClass: 'lab-badge-warning',
            ultimoAtendimento: '19/06/2026',
            historico: [
                { prot: '113400', data: '19/06/2026', exames: 2, status: 'Liberado', statusClass: 'text-primary' }
            ]
        },
    ];

    const currentPac = pacientesList.find(p => p.id === selectedPatient) || pacientesList[0];

    return (
        <div className="lab-pac-container">
            {/* Header */}
            <header className="lab-pac-header">
                <div>
                    <h1 className="lab-title">Pacientes</h1>
                    <p className="lab-subtitle">Cadastro, consulta e histórico de pacientes do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline"><RefreshCw size={16} /> Atualizar lista</button>
                    <button className="lab-btn lab-btn-primary"><Activity size={16} /> Abrir atendimento</button>
                    <button className="lab-btn lab-btn-success"><UserPlus size={16} /> Novo paciente</button>
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpis-grid" style={{ marginBottom: '1.25rem' }}>
                {resumo.map((item, idx) => {
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

            {/* Filtros */}
            <div className="lab-card lab-filters-card">
                <div className="lab-filters-grid">
                    <div className="lab-filter-item">
                        <label>Nome / Cartão SUS / CNS</label>
                        <input type="text" placeholder="Buscar..." />
                    </div>
                    <div className="lab-filter-item">
                        <label>Código</label>
                        <input type="text" placeholder="Ex: 113443" />
                    </div>
                    <div className="lab-filter-item">
                        <label>CPF/RG</label>
                        <input type="text" placeholder="Apenas números..." />
                    </div>
                    <div className="lab-filter-item">
                        <label>Bairro</label>
                        <input type="text" placeholder="Ex: Centro" />
                    </div>
                    <div className="lab-filter-item">
                        <label>Cidade</label>
                        <input type="text" defaultValue="Bezerros" />
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary"><Search size={16} /> Buscar</button>
                    </div>
                </div>
            </div>

            {/* Layout Principal: 2 Colunas */}
            <div className="lab-pac-layout">
                
                {/* Coluna Esquerda: Lista de Pacientes em Cards */}
                <div className="lab-pac-sidebar">
                    <div className="lab-pac-card-list">
                        {pacientesList.map((pac) => (
                            <div 
                                key={pac.id} 
                                className={`lab-pac-item-card ${selectedPatient === pac.id ? 'active' : ''}`}
                                onClick={() => setSelectedPatient(pac.id)}
                            >
                                <div className="pac-item-header">
                                    <span className="font-extrabold text-gray-900" style={{ fontSize: '0.9rem' }}>#{pac.id}</span>
                                    <span className={`lab-badge ${pac.statusClass}`}>{pac.status}</span>
                                </div>
                                <div className="pac-item-name font-bold text-primary" style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>{pac.nome}</div>
                                <div className="pac-item-meta text-gray-500 text-sm">
                                    {pac.idade} anos &bull; {pac.sexo}
                                </div>
                                <div className="pac-item-docs text-gray-500 text-sm" style={{ marginBottom: '0.5rem' }}>
                                    SUS: <span className="text-gray-700 font-medium">{pac.cns}</span>
                                </div>
                                <div className="pac-item-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {pac.bairro}</span>
                                    <span>Último: {pac.ultimoAtendimento}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coluna Direita: Painel de Detalhes */}
                <div className="lab-pac-main">
                    
                    <div className="lab-card lab-pac-details-panel">
                        
                        {/* Header do Painel */}
                        <div className="pac-panel-header">
                            <div className="pac-panel-title">
                                <h2>{currentPac.nome}</h2>
                                <div className="pac-panel-badges">
                                    <span className="lab-badge lab-badge-gray">{currentPac.idade} anos</span>
                                    <span className={`lab-badge ${currentPac.statusClass}`}>{currentPac.status}</span>
                                </div>
                            </div>
                            <div className="pac-panel-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button className="lab-btn lab-btn-outline"><Edit size={14} /> Editar</button>
                                <button className="lab-btn lab-btn-outline"><FileText size={14} /> Histórico</button>
                                <button className="lab-btn lab-btn-outline"><Printer size={14} /> Imprimir ficha</button>
                                <button className="lab-btn lab-btn-primary"><Activity size={14} /> Novo atendimento</button>
                            </div>
                        </div>

                        {/* Corpo do Painel */}
                        <div className="pac-panel-body">
                            
                            {/* Bloco: Dados do Paciente */}
                            <div className="pac-info-section">
                                <h3 className="pac-section-title"><Users size={16} /> Dados do Paciente</h3>
                                <div className="pac-info-grid">
                                    <div className="pac-info-box">
                                        <label>Código</label>
                                        <span>{currentPac.id}</span>
                                    </div>
                                    <div className="pac-info-box" style={{ gridColumn: 'span 2' }}>
                                        <label>Nome Completo</label>
                                        <span className="font-semibold text-gray-900">{currentPac.nome}</span>
                                    </div>
                                    <div className="pac-info-box">
                                        <label>Sexo</label>
                                        <span>{currentPac.sexo}</span>
                                    </div>
                                    <div className="pac-info-box">
                                        <label>Data de Nascimento</label>
                                        <span>{currentPac.nascimento}</span>
                                    </div>
                                    <div className="pac-info-box">
                                        <label>Idade</label>
                                        <span>{currentPac.idade} anos</span>
                                    </div>
                                    <div className="pac-info-box">
                                        <label>RG</label>
                                        <span>{currentPac.rg}</span>
                                    </div>
                                    <div className="pac-info-box" style={{ gridColumn: 'span 2' }}>
                                        <label>CNS / Cartão SUS</label>
                                        <span className="font-semibold text-primary">{currentPac.cns}</span>
                                    </div>
                                    <div className="pac-info-box">
                                        <label>Telefone / Celular</label>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {currentPac.telefone}</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="pac-divider" />

                            {/* Bloco: Endereço e Infos */}
                            <div className="pac-info-row-split">
                                <div className="pac-info-section flex-1">
                                    <h3 className="pac-section-title"><MapPin size={16} /> Endereço</h3>
                                    <div className="pac-info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <div className="pac-info-box" style={{ gridColumn: 'span 2' }}>
                                            <label>Rua</label>
                                            <span>{currentPac.rua}</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>Número</label>
                                            <span>{currentPac.numero}</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>Bairro</label>
                                            <span>{currentPac.bairro}</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>Cidade</label>
                                            <span>{currentPac.cidade}</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>CEP</label>
                                            <span>{currentPac.cep}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pac-info-section flex-1">
                                    <h3 className="pac-section-title"><ShieldAlert size={16} /> Informações do SUS</h3>
                                    <div className="pac-info-grid" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="pac-info-box">
                                            <label>Convênio</label>
                                            <span className="font-semibold text-gray-900">SUS</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>Matrícula SUS</label>
                                            <span>Não informada</span>
                                        </div>
                                        <div className="pac-info-box">
                                            <label>Local Padrão de Entrega</label>
                                            <span>CENTRAL</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="pac-divider" />

                            {/* Bloco: Histórico de Atendimentos */}
                            <div className="pac-info-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="pac-section-title" style={{ margin: 0 }}><FileText size={16} /> Histórico de Atendimentos</h3>
                                    <button className="lab-btn lab-btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Ver histórico completo</button>
                                </div>
                                
                                {currentPac.historico.length > 0 ? (
                                    <div className="pac-history-list">
                                        {currentPac.historico.map((hist, idx) => (
                                            <div key={idx} className="pac-history-item">
                                                <div className="phi-col" style={{ flex: '0.8' }}>
                                                    <span className="phi-label">Protocolo</span>
                                                    <span className="phi-val font-semibold text-primary">#{hist.prot}</span>
                                                </div>
                                                <div className="phi-col" style={{ flex: '1' }}>
                                                    <span className="phi-label">Data</span>
                                                    <span className="phi-val">{hist.data}</span>
                                                </div>
                                                <div className="phi-col" style={{ flex: '1' }}>
                                                    <span className="phi-label">Exames</span>
                                                    <span className="phi-val">{hist.exames} solicitados</span>
                                                </div>
                                                <div className="phi-col" style={{ flex: '1.2' }}>
                                                    <span className="phi-label">Status</span>
                                                    <span className={`phi-val font-bold ${hist.statusClass}`}>{hist.status}</span>
                                                </div>
                                                <div className="phi-action">
                                                    <button className="lab-btn lab-btn-outline" style={{ border: 'none', color: '#3b82f6', padding: '0.3rem' }}><ChevronRight size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="lab-history-empty text-center" style={{ padding: '2rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                        <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                        <p style={{ fontSize: '0.9rem', margin: 0 }}>Nenhum atendimento recente encontrado.</p>
                                        <p style={{ fontSize: '0.8rem', margin: '0.3rem 0 0', opacity: 0.8 }}>Histórico completo disponível após integração/migração dos dados anteriores.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default LaboratorioPacientes;
