import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Search, 
    Plus, 
    Filter, 
    ChevronDown, 
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp,
    Edit2,
    Trash2,
    MessageSquare,
    AlertCircle,
    X,
    Loader,
    Info,
    ArrowRight,
    History
} from 'lucide-react';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchAtualizacoes, createAtualizacao, updateAtualizacao, deleteAtualizacao, fetchAcoes, updateAcao } from '../../services/api/planejamentoAcoes.service';
import { getActionTypeStages, getActionTypeConfig } from '../../modules/planejamento/constants/planningActionTypes';

// Sub-componente para animação individual do card
const UpdateCard = ({ item, acaoContext, index, getTipoConfig, getStatusLabel, formatDate, onEdit, onDelete, onView, isLast, isConcluidaAnteriormente, getActionTypeConfig, getDisplayProgress }) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = React.useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.1, rootMargin: '50px' });

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    const conf = getTipoConfig(item.tipo, item.critica);
    const Icon = conf.icon;

    // 🎨 Aplica um tema visual Verde Histórico/Dessaturado para Conclusões Anteriores (mantendo a positividade da conquista de forma suave)
    const displayBg = isConcluidaAnteriormente ? 'rgba(93, 160, 133, 0.05)' : conf.bg;
    const displayColor = isConcluidaAnteriormente ? '#5da085' : conf.color;
    const displayBorder = isConcluidaAnteriormente ? '#b4d7c9' : conf.border;

    return (
        <div 
            ref={cardRef}
            className={`update-timeline-item ${isVisible ? 'visible' : ''}`} 
            style={{ 
                display: 'flex',
                gap: '1.25rem',
                opacity: 0,
                transform: 'translateY(12px)',
                transition: 'opacity 400ms ease-out, transform 400ms ease-out',
                transitionDelay: `${Math.min(index * 60, 600)}ms`
            }}
        >
            {/* Coluna Esquerda: Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '42px', flexShrink: 0 }}>
                {/* Marcador */}
                <div style={{ 
                    width: '42px', height: '42px', borderRadius: '12px', 
                    background: displayBg, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    border: `1px solid ${displayBg.replace('0.05', '0.15')}`,
                    zIndex: 2, position: 'relative'
                }}>
                    <Icon size={20} color={displayColor} />
                </div>
                {/* Linha Conectora */}
                {!isLast && (
                    <div style={{ flex: 1, width: '2px', background: 'var(--border)', opacity: 0.5, marginTop: '8px', marginBottom: '8px' }}></div>
                )}
            </div>

            {/* Coluna Direita: Card de Conteúdo */}
            <div 
                className="farmacia-card update-card"
                onClick={() => onView(item)}
                style={{ 
                    flex: 1,
                    padding: '1.25rem 1.5rem', 
                    border: '1px solid rgba(0,0,0,0.08)', 
                    borderLeft: `4px solid ${displayBorder}`,
                    background: item.critica ? 'rgba(239, 68, 68, 0.015)' : '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    borderRadius: '10px',
                    marginBottom: isLast ? '0' : '1.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Linha Superior: Cabeçalho com Contexto da Ação e Status/Ações na direita */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                                {item.acao}
                            </h3>

                            {acaoContext && (() => {
                                const tConf = getActionTypeConfig(acaoContext.action_type || 'PROJETO');
                                return (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: tConf.bg, color: tConf.color, border: `1px solid ${tConf.border}`, textTransform: 'uppercase', width: 'fit-content', marginTop: '2px' }}>
                                        {tConf.label}
                                    </span>
                                );
                            })()}

                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                                Secretaria Responsável: <strong style={{ color: '#475569' }}>{item.secretaria}</strong>
                            </span>

                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isConcluidaAnteriormente && (
                                    <span style={{ 
                                        fontSize: '0.65rem', fontWeight: 700, color: '#557a6d', background: '#edf5f2', 
                                        padding: '3px 8px', borderRadius: '6px', border: '1px solid #d7e7e1',
                                        display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }} title="Esta conclusão foi posteriormente revisada para um estágio anterior.">
                                        <History size={11} style={{ opacity: 0.8 }} /> Concluída Anteriormente
                                    </span>
                                )}
                                {item.statusNovo && (
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 700, 
                                        color: isConcluidaAnteriormente ? '#438a6e' : '#10b981', 
                                        background: isConcluidaAnteriormente ? '#e3f4ed' : '#ecfdf5', 
                                        padding: '3px 8px', 
                                        borderRadius: '6px', 
                                        border: isConcluidaAnteriormente ? '1px solid #c5e8dc' : '1px solid #a7f3d0' 
                                    }}>
                                        {getStatusLabel(item.statusNovo)}
                                    </span>
                                )}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="update-action-btn" title="Editar Atualização">
                                        <Edit2 size={14} color="var(--text-muted)" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="update-action-btn delete-btn" title="Excluir Atualização">
                                        <Trash2 size={14} color="#ef4444" />
                                    </button>
                                </div>
                            </div>

                            {/* Barra de Progresso Topo */}
                            {acaoContext && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                        {(() => {
                                            const p = getDisplayProgress(acaoContext);
                                            return <div style={{ width: `${p}%`, height: '100%', background: `linear-gradient(to right, ${p <= 25 ? '#ef4444' : p <= 60 ? '#3b82f6' : p <= 85 ? '#f59e0b' : '#10b981'})`, borderRadius: '2px' }} />;
                                        })()}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155' }}>{getDisplayProgress(acaoContext)}%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Corpo: Resumo */}
                    <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, marginTop: '12px' }}>
                        {item.descricao.length > 200 ? `${item.descricao.substring(0, 200)}...` : item.descricao}
                    </div>

                    {/* Rodapé: Autor e Data */}
                    <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.85rem', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)' }}>{item.responsavel.charAt(0).toUpperCase()}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                    Atualizado por <strong style={{ color: '#1e293b', fontWeight: 700 }}>{item.responsavel}</strong>
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {formatDate(item.data)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente Seletor de Ação Customizado
const ActionSelector = ({ value, onChange, acoes, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = React.useRef(null);

    const selectedAcao = acoes.find(a => a.id === value);
    
    // Filtra ações pelo termo de busca
    const filteredAcoes = acoes.filter(a => 
        (a.nome || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.action_type || '').toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeBadge = (type) => {
        const conf = getActionTypeConfig(type);
        
        return (
            <span style={{ 
                fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', 
                background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`,
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap'
            }}>
                {conf.label}
            </span>
        );
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                className={`farmacia-form-select ${disabled ? 'disabled' : ''}`}
                style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '0.6rem 1rem', cursor: disabled ? 'not-allowed' : 'pointer',
                    height: 'auto', minHeight: '42px', background: disabled ? '#f8fafc' : '#fff'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedAcao ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{selectedAcao.nome}</span>
                            {getTypeBadge(selectedAcao.action_type)}
                        </div>
                        {selectedAcao.participantes && selectedAcao.participantes.length > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {selectedAcao.participantes[0]}
                            </span>
                        )}
                    </div>
                ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecione a ação vinculada...</span>
                )}
                <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 50,
                    display: 'flex', flexDirection: 'column', maxHeight: '300px'
                }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text"
                                autoFocus
                                placeholder="Buscar ação..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '8px 12px 8px 32px', 
                                    border: '1px solid #e2e8f0', borderRadius: '6px',
                                    fontSize: '0.85rem', outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                        {filteredAcoes.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma ação encontrada.</div>
                        ) : (
                            filteredAcoes.map(acao => (
                                <div 
                                    key={acao.id}
                                    onClick={() => {
                                        onChange(acao.id, acao.nome);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    style={{ 
                                        padding: '10px 12px', cursor: 'pointer', borderRadius: '6px',
                                        display: 'flex', flexDirection: 'column', gap: '4px',
                                        background: value === acao.id ? '#f8fafc' : 'transparent',
                                        border: value === acao.id ? '1px solid #e2e8f0' : '1px solid transparent'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseOut={(e) => e.currentTarget.style.background = value === acao.id ? '#f8fafc' : 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{acao.nome}</span>
                                        {getTypeBadge(acao.action_type)}
                                    </div>
                                    {acao.participantes && acao.participantes.length > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {acao.participantes[0]}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const getClosestStep = (progress, steps) => {
    if (!steps || steps.length === 0) return '';
    if (progress === undefined || progress === null || progress === 0) return '';
    let closest = steps[0];
    let minDiff = Math.abs(progress - closest.progress);
    for (let i = 1; i < steps.length; i++) {
        const diff = Math.abs(progress - steps[i].progress);
        if (diff < minDiff) {
            minDiff = diff;
            closest = steps[i];
        }
    }
    return closest.label;
};

const getDisplayProgress = (acao) => {
    if (!acao) return 0;
    const type = acao.action_type || 'PROJETO';
    
    // Normaliza o progresso bruto recebido da ação
    const rawProgress = (typeof acao.progresso === 'number' && !isNaN(acao.progresso)) ? acao.progresso
        : (typeof acao.progress_percent === 'number' && !isNaN(acao.progress_percent)) ? acao.progress_percent : 0;

    // 1. Se tipo for Aquisição: manter comportamento de retornar o progresso salvo puro
    if (type === 'AQUISICAO') {
        return rawProgress;
    }

    // 2. Para Ação Pontual, usar custom_stages e current_stage_index para derivar o progresso
    if (type === 'ACAO_PONTUAL') {
        let stages = [];
        if (typeof acao.custom_stages === 'string') {
            try { stages = JSON.parse(acao.custom_stages); } catch(e) {}
        } else if (Array.isArray(acao.custom_stages)) {
            stages = acao.custom_stages;
        }
        
        if (stages && stages.length > 0 && typeof acao.current_stage_index === 'number') {
            const idx = acao.current_stage_index;
            if (stages[idx]) {
                return typeof stages[idx].progress === 'number' ? stages[idx].progress : rawProgress;
            }
        }
        return rawProgress;
    }

    // 3. Para Projeto/Obra/Programa/Serviço, obter etapas fixas e derivar pelo percentual mais próximo
    const steps = getActionTypeStages(type);
    if (steps && steps.length > 0 && rawProgress > 0) {
        const closestLabel = getClosestStep(rawProgress, steps);
        const closestStep = steps.find(s => s.label === closestLabel);
        return closestStep ? closestStep.progress : rawProgress;
    }

    return rawProgress;
};

// Função helper para obter informações da etapa atual da ação
const getStageInfo = (acao) => {
    if (!acao) return null;
    
    if (acao.action_type === 'ACAO_PONTUAL' && acao.custom_stages) {
        let stages;
        try {
            stages = typeof acao.custom_stages === 'string' ? JSON.parse(acao.custom_stages) : acao.custom_stages;
        } catch(e) { return null; }
        
        if (stages && stages.length > 0 && typeof acao.current_stage_index === 'number') {
            const currentStage = stages[acao.current_stage_index];
            if (currentStage) {
                const percentPerStage = 100 / stages.length;
                let calculatedProgress = Math.round((acao.current_stage_index + 1) * percentPerStage);
                if (acao.current_stage_index === stages.length - 1) calculatedProgress = 100;
                
                return {
                    label: currentStage.name,
                    progress: calculatedProgress
                };
            }
        }
    } else {
        const stages = getActionTypeStages(acao.action_type);
        if (stages && stages.length > 0) {
            const currentProg = getDisplayProgress(acao);
            
            // Tenta inferir a etapa pelo progresso (usando a mais próxima para baixo ou igual)
            let closestStage = stages[0];
            for (let i = 0; i < stages.length; i++) {
                if (currentProg >= stages[i].progress) {
                    closestStage = stages[i];
                }
            }
            return closestStage;
        }
    }
    return null;
};

// Componente: Card Contextual da Ação no Modal
const ActionContextCard = ({ acao, getStatusLabel }) => {
    if (!acao) return null;
    
    const stageInfo = getStageInfo(acao);
    const tipoConfig = getActionTypeConfig ? getActionTypeConfig(acao.action_type || 'PROJETO') : null;
    
    // Progresso real da ação derivado via etapa atual calculada
    const progressoAtual = getDisplayProgress(acao);
    
    // Verifica se é Ação Pontual com etapas personalizadas
    const isAcaoPontual = acao.action_type === 'ACAO_PONTUAL';
    let customStages = [];
    let currentStageIndex = typeof acao.current_stage_index === 'number' ? acao.current_stage_index : -1;
    
    if (isAcaoPontual && acao.custom_stages) {
        try {
            customStages = typeof acao.custom_stages === 'string' ? JSON.parse(acao.custom_stages) : acao.custom_stages;
        } catch(e) {}
    }

    return (
        <div style={{ 
            background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', 
            padding: '1rem 1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
            animation: 'fadeInDown 0.3s ease-out'
        }}>
            {/* Linha 1: Nome + badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', flex: 1, lineHeight: 1.35 }}>
                    {acao.nome}
                </h4>
                {tipoConfig && (
                    <span style={{ 
                        fontSize: '0.6rem', fontWeight: 700, padding: '3px 7px', borderRadius: '5px', 
                        background: tipoConfig.bg, color: tipoConfig.color, border: `1px solid ${tipoConfig.border}`,
                        textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0
                    }}>
                        {tipoConfig.label}
                    </span>
                )}
            </div>
            
            {/* Linha 2: Secretaria + status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                    {acao.participantes && acao.participantes.length > 0 ? acao.participantes[0] : (acao.secretaria || 'Sem secretaria')}
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', color: '#475569', whiteSpace: 'nowrap' }}>
                    {getStatusLabel(acao.status)}
                </span>
            </div>

            {/* Linha 3: Barra de progresso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${progressoAtual}%`, height: '100%', borderRadius: '3px',
                        background: `linear-gradient(to right, ${progressoAtual <= 25 ? '#ef4444' : progressoAtual <= 60 ? '#3b82f6' : progressoAtual <= 85 ? '#f59e0b' : '#10b981'})`
                    }}></div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', minWidth: '36px', textAlign: 'right' }}>{progressoAtual}%</span>
            </div>

            {/* Etapas Ação Pontual — timeline compacta */}
            {isAcaoPontual && customStages.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.625rem 0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                        Etapas
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {customStages.map((stage, idx) => {
                            const isCurrent = idx === currentStageIndex;
                            const isPast = idx < currentStageIndex;
                            const percent = idx === customStages.length - 1 ? 100 : Math.round((idx + 1) * (100 / customStages.length));
                            return (
                                <div key={idx} style={{ 
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.78rem', fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent ? '#3b82f6' : isPast ? '#059669' : '#94a3b8',
                                    background: isCurrent ? '#eff6ff' : 'transparent',
                                    padding: isCurrent ? '3px 6px' : '2px 0',
                                    borderRadius: '4px', marginLeft: isCurrent ? '-6px' : '0'
                                }}>
                                    <span style={{ fontSize: '0.65rem', minWidth: '14px', fontWeight: 700, 
                                        color: isCurrent ? '#3b82f6' : isPast ? '#059669' : '#cbd5e1' }}>●</span>
                                    <span>{stage.name}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700 }}>{percent}%</span>
                                    {isCurrent && (
                                        <span style={{ fontSize: '0.6rem', background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '8px' }}>Atual</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Etapa calculada para outros tipos */}
            {!isAcaoPontual && stageInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.25rem', borderTop: '1px solid #f1f5f9', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8' }}>Etapa Atual</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>{stageInfo.label}</span>
                </div>
            )}
        </div>
    );
};

// Componente principal
const PlanejamentoAtualizacoes = () => {
    const { tenantLink } = useAuth();
    const tenantId = tenantLink?.tenant_id;
    const location = useLocation();
    const navigate = useNavigate();

    // ---- ESTADO ----
    const [atualizacoes, setAtualizacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [acoes, setAcoes] = useState([]); // para popular o select do modal
    
    // Filtros
    const [busca, setBusca] = useState('');
    const [acaoFiltro, setAcaoFiltro] = useState('Todas');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');
    const [tipoFiltro, setTipoFiltro] = useState('Todos');
    const [periodoFiltro, setPeriodoFiltro] = useState('Todos');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingUpdate, setViewingUpdate] = useState(null);
    const [editingUpdateId, setEditingUpdateId] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    
    const [formData, setFormData] = useState({
        acaoId: '',
        acao: '',
        tipo: 'Geral',
        descricao: '',
        novoStatus: '',
        novoProgresso: '',
        novoStageIndex: '',   // Somente para ACAO_PONTUAL
        critica: false
    });

    // Toast
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // ---- CARGA REAL DO SUPABASE ----
    const loadAtualizacoes = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const data = await fetchAtualizacoes(tenantId);
            setAtualizacoes(data);
        } catch (err) {
            console.error('[PlanejamentoAtualizacoes] Erro ao carregar:', err);
            setLoadError('Não foi possível carregar as atualizações. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            loadAtualizacoes();
            fetchAcoes(tenantId).then(setAcoes).catch(console.error);
        }
    }, [tenantId, loadAtualizacoes]);

    const stateProcessed = React.useRef(false);

    // Tratar location.state para Nova Atualização / Filtro de Contexto
    useEffect(() => {
        if (location.state?.acaoId && acoes.length > 0 && !stateProcessed.current) {
            const foundAcao = acoes.find(a => String(a.id) === String(location.state.acaoId));
            if (foundAcao) {
                // Auto-filtrar a tela para esta ação (Contexto da Ação)
                setAcaoFiltro(foundAcao.nome);

                if (location.state?.openModal === 'nova-atualizacao') {
                    setFormData({
                        acaoId: foundAcao.id,
                        acao: foundAcao.nome,
                        tipo: 'Geral',
                        descricao: '',
                        novoStatus: '',
                        novoProgresso: '',
                        novoStageIndex: '',
                        critica: false
                    });
                    setIsModalOpen(true);
                }
                
                stateProcessed.current = true;
            }
        }
    }, [location.state, acoes]);

    const tiposUnicos = ['Geral', 'Avanço de Progresso', 'Mudança de Status'];

    // ---- LISTAS ÚNICAS PARA FILTROS (derivadas dos dados reais) ----
    const acoesUnicas = useMemo(() => [...new Set(atualizacoes.map(a => a.acao))].sort(), [atualizacoes]);
    const secretariasUnicas = useMemo(() => [...new Set(atualizacoes.map(a => a.secretaria).filter(Boolean))].sort((a, b) => (a || '').localeCompare((b || ''), 'pt-BR', { sensitivity: 'base' })), [atualizacoes]);

    // Identificar quais IDs de atualizações representam conclusões históricas (100%) que sofreram regressão/revisão posterior
    const revisitedConcludedIds = useMemo(() => {
        const ids = new Set();
        if (!atualizacoes || atualizacoes.length === 0) return ids;
        
        // Agrupar por ação
        const grouped = {};
        atualizacoes.forEach(u => {
            if (!u.acaoId) return;
            if (!grouped[u.acaoId]) grouped[u.acaoId] = [];
            grouped[u.acaoId].push(u);
        });
        
        Object.keys(grouped).forEach(acaoId => {
            const list = grouped[acaoId];
            // Ordena mais recente primeiro (futuro -> passado)
            list.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
            
            let minProgSeen = null;
            list.forEach(u => {
                const currentProg = u.progressoNovo ?? 0;
                // Se este snapshot passado era Concluído (100%), mas o menor progresso visto depois (futuro) foi menor que 100
                if (currentProg >= 100 && minProgSeen !== null && minProgSeen < 100) {
                    ids.add(u.id);
                }
                // Atualiza o menor progresso cronologicamente posterior
                if (minProgSeen === null || currentProg < minProgSeen) {
                    minProgSeen = currentProg;
                }
            });
        });
        
        return ids;
    }, [atualizacoes]);

    // ---- FILTRAGEM ----
    const atualizacoesFiltradas = useMemo(() => {
        const now = new Date();
        return atualizacoes.filter(item => {
            const mBusca = (item.acao || '').toLowerCase().includes(busca.toLowerCase()) || 
                           (item.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
                           (item.responsavel || '').toLowerCase().includes(busca.toLowerCase());
            const mAcao = acaoFiltro === 'Todas' || item.acao === acaoFiltro;
            const mSec = secretariaFiltro === 'Todas' || item.secretaria === secretariaFiltro;
            const mTipo = tipoFiltro === 'Todos' || item.tipo === tipoFiltro;
            
            let mPeriodo = true;
            if (periodoFiltro !== 'Todos') {
                const itemDate = new Date(item.data);
                const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
                if (periodoFiltro === 'hoje') mPeriodo = itemDate.toDateString() === now.toDateString();
                if (periodoFiltro === '7d') mPeriodo = diffDays <= 7;
                if (periodoFiltro === '30d') mPeriodo = diffDays <= 30;
            }

            return mBusca && mAcao && mSec && mTipo && mPeriodo;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
    }, [atualizacoes, busca, acaoFiltro, secretariaFiltro, tipoFiltro, periodoFiltro]);

    // ---- MÉTRICAS PARA CARDS ----
    const metrics = useMemo(() => {
        const now = new Date();
        const todayClear = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let countAtualizadas = 0;
        let countPendente = 0;
        let countAtraso = 0;

        acoes.forEach(acao => {
            const hasManual = !!acao.last_manual_update_at;
            
            if (hasManual) {
                const manualDate = new Date(acao.last_manual_update_at);
                const manualDateClear = new Date(manualDate.getFullYear(), manualDate.getMonth(), manualDate.getDate());
                const diffTime = todayClear - manualDateClear;
                const diffDaysManual = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDaysManual <= 7) {
                    countAtualizadas++;
                } else {
                    countAtraso++;
                }
            } else if (acao.created_at) {
                const createdDate = new Date(acao.created_at);
                const createdDateClear = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                const diffTime = todayClear - createdDateClear;
                const diffDaysCreated = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDaysCreated <= 7) {
                    countPendente++;
                } else {
                    countAtraso++;
                }
            }
        });

        let total = atualizacoesFiltradas.length;
        let criticas = 0;

        atualizacoesFiltradas.forEach(item => {
            if (item.critica) criticas++;
        });

        return { 
            total, 
            criticas, 
            atualizadas: countAtualizadas, 
            pendentes: countPendente, 
            atrasadas: countAtraso 
        };
    }, [acoes, atualizacoesFiltradas]);


    // ---- HELPERS VISUAIS ----
    const getTipoConfig = (tipo, critica) => {
        if (critica) return { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', label: 'ALERTA' };
        switch(tipo) {
            case 'Avanço de Progresso': return { icon: TrendingUp, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.05)', border: '#3b82f6', label: 'AVANÇO' };
            case 'Mudança de Status': return { icon: Activity, color: '#059669', bg: 'rgba(5, 150, 105, 0.05)', border: '#10b981', label: 'STATUS' };
            case 'Registro de Entrave': return { icon: AlertCircle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', border: '#ef4444', label: 'ALERTA' };
            case 'Observação Crítica': return { icon: AlertTriangle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.05)', border: '#ef4444', label: 'ALERTA' };
            default: return { icon: MessageSquare, color: '#475569', bg: 'rgba(71, 85, 105, 0.05)', border: '#94a3b8', label: 'GERAL' };
        }
    };

    const getStatusLabel = (s) => {
        const map = {
            'CONCLUIDA': 'Concluída',
            'EM_ANDAMENTO': 'Em Andamento',
            'EM_RISCO': 'Em Risco',
            'PARALISADA': 'Paralisada',
            'NAO_INICIADA': 'Não Iniciada',
            'CANCELADA': 'Cancelada'
        };
        return map[s] || s;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    };

    // ---- AÇÕES ----
    const handleEdit = (item) => {
        setIsViewModalOpen(false);
        setFormData({
            acaoId: item.acaoId,
            acao: item.acao,
            tipo: item.tipo,
            descricao: item.descricao,
            novoStatus: item.statusNovo || '',
            novoProgresso: item.progressoNovo !== null ? item.progressoNovo : '',
            critica: item.critica || false,
            details: item.details || '',
            next_steps: item.next_steps || '',
            reference_week: item.reference_week || '',
            update_date: item.update_date || '',
            novoStageIndex: '' // Garante reset limpo no estado para evitar mudouEtapa fantasma na edição
        });
        setEditingUpdateId(item.id);
        setSaveError(null);
        setIsModalOpen(true);
    };

    const handleViewUpdate = (item) => {
        setViewingUpdate(item);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId || !tenantId) return;
        setLoading(true);
        setIsConfirmDeleteOpen(false);
        try {
            await deleteAtualizacao(tenantId, deleteId);
            setToast('Atualização excluída com sucesso.');
            await loadAtualizacoes();
            fetchAcoes(tenantId).then(setAcoes).catch(console.error);
        } catch (err) {
            console.error('[PlanejamentoAtualizacoes] Erro ao excluir:', err);
            setLoadError(err.message || 'Erro ao excluir atualização.');
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!tenantId) return;
        setSaveLoading(true);
        setSaveError(null);
        try {
            const acaoSelecionada = acoes.find(a => a.id === formData.acaoId);
            if (!acaoSelecionada) {
                throw new Error('Ação selecionada não encontrada.');
            }

            const stageIndexSelecionado = (formData.novoStageIndex !== '' && formData.novoStageIndex !== undefined && formData.novoStageIndex !== null) ? parseInt(formData.novoStageIndex) : null;
            const isPontual = acaoSelecionada.action_type === 'ACAO_PONTUAL';
            const fixedStages = getActionTypeStages(acaoSelecionada.action_type);
            const isAquisicao = acaoSelecionada.action_type === 'AQUISICAO';

            let currentStageIdx = null;
            let stagesList = [];

            if (isPontual) {
                try {
                    stagesList = typeof acaoSelecionada.custom_stages === 'string'
                        ? JSON.parse(acaoSelecionada.custom_stages)
                        : (acaoSelecionada.custom_stages || []);
                } catch(err) {}
                currentStageIdx = typeof acaoSelecionada.current_stage_index === 'number'
                    ? acaoSelecionada.current_stage_index : null;
            } else if (fixedStages) {
                stagesList = fixedStages;
                const currentProg = getDisplayProgress(acaoSelecionada);
                let best = 0;
                stagesList.forEach((s, i) => {
                    if (currentProg >= s.progress) best = i;
                });
                currentStageIdx = best;
            }

            // Verifica se houve mudança efetiva de etapa (para tipos com etapas)
            const hasStages = isPontual || !!fixedStages;
            const mudouEtapa = (stagesList.length > 0 && stageIndexSelecionado !== null && stageIndexSelecionado !== currentStageIdx);

            let finalProgresso = null;
            let finalStatus = null;
            let shouldUpdateParent = false;

            if (mudouEtapa) {
                shouldUpdateParent = true;
                const idx = stageIndexSelecionado;
                const total = stagesList.length;
                const isUltima = idx === total - 1;

                if (isPontual) {
                    finalProgresso = isUltima ? 100 : Math.round((idx + 1) * (100 / total));
                } else {
                    finalProgresso = stagesList[idx].progress;
                }

                // Status automático: etapa final ou 100% -> CONCLUIDA, senão EM_ANDAMENTO
                finalStatus = (isUltima || finalProgresso >= 100) ? 'CONCLUIDA' : 'EM_ANDAMENTO';
            } else if (hasStages) {
                // Cenário de "Manter etapa atual" para tipos com etapas:
                // Garante que o progresso ao salvar derive sempre da etapa atual calculada.
                const calculatedProg = getDisplayProgress(acaoSelecionada);
                
                const currentDbProgress = typeof acaoSelecionada.progresso === 'number' ? acaoSelecionada.progresso
                    : typeof acaoSelecionada.progress_percent === 'number' ? acaoSelecionada.progress_percent : 0;

                // Se houver discrepância residual no banco de dados, forçar a sincronização/correção no pai
                if (calculatedProg !== currentDbProgress) {
                    finalProgresso = calculatedProg;
                    shouldUpdateParent = true;
                }
            } else if (isAquisicao && formData.novoStatus) {
                shouldUpdateParent = true;
                finalStatus = formData.novoStatus;
                const pMap = { 'EM_PLANEJAMENTO': 10, 'EM_ANDAMENTO': 50, 'PENDENTE': 25, 'CONCLUIDA': 100 };
                finalProgresso = pMap[finalStatus] || 0;
            } else if (!fixedStages && !isPontual && !isAquisicao) {
                // Outros tipos manuais (fallback)
                if (formData.novoStatus) {
                    finalStatus = formData.novoStatus;
                    shouldUpdateParent = true;
                }
                if (formData.novoProgresso !== '') {
                    finalProgresso = parseInt(formData.novoProgresso, 10);
                    shouldUpdateParent = true;
                }
            }

            // Atualizar pai se necessário
            if (shouldUpdateParent) {
                const acaoUpdates = {
                    ...acaoSelecionada,
                    nome: acaoSelecionada.nome,
                    secretariatId: acaoSelecionada.secretariaId,
                    participantes: acaoSelecionada.participantes || [],
                };

                if (finalProgresso !== null) acaoUpdates.progresso = finalProgresso;
                if (finalStatus !== null) acaoUpdates.status = finalStatus;

                if (isPontual && mudouEtapa) {
                    acaoUpdates.current_stage_index = stageIndexSelecionado;
                    acaoUpdates.custom_stages = acaoSelecionada.custom_stages;
                }

                await updateAcao(tenantId, formData.acaoId, acaoUpdates);
            }

            const formParaSalvar = { ...formData };
            if (finalStatus !== null) formParaSalvar.novoStatus = finalStatus;
            
            // RESOLUÇÃO DE PROGRESSO DEFINITIVA COM PRIORIDADE:
            // 1. Usar finalProgresso (computado por nova etapa ou correção/healing)
            // 2. Usar progresso atual calculado unificado da ação pai para servir de Snapshot real
            // 3. Fallback para 0
            let resolvedProgresso = 0;
            if (finalProgresso !== null) {
                resolvedProgresso = finalProgresso;
            } else {
                resolvedProgresso = getDisplayProgress(acaoSelecionada) || 0;
            }
            formParaSalvar.novoProgresso = resolvedProgresso.toString();

            // Sanitizar o payload de gravação removendo campos puramente visuais que não pertencem à tabela
            delete formParaSalvar.tipo;
            delete formParaSalvar.critica;

            if (editingUpdateId) {
                await updateAtualizacao(tenantId, editingUpdateId, formParaSalvar);
                setToast('Atualização editada com sucesso.');
            } else {
                await createAtualizacao(tenantId, formParaSalvar);
                setToast('Atualização registrada com sucesso.');
            }

            fetchAcoes(tenantId).then(setAcoes).catch(console.error);

            setIsModalOpen(false);
            setEditingUpdateId(null);
            setFormData({ acaoId: '', acao: '', tipo: 'Geral', descricao: '', novoStatus: '', novoProgresso: '', novoStageIndex: '', critica: false });
            await loadAtualizacoes();
        } catch (err) {
            console.error('[PlanejamentoAtualizacoes] Erro ao salvar:', err);
            setSaveError(err.message || 'Erro ao salvar atualização. Tente novamente.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleOpenNewModal = () => {
        setSaveError(null);
        setEditingUpdateId(null);
        setFormData({ acaoId: '', acao: '', tipo: 'Geral', descricao: '', novoStatus: '', novoProgresso: '', novoStageIndex: '', critica: false });
        setIsModalOpen(true);
    };

    return (
        <div className="farmacia-page-container">
            {/* Cabeçalho */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Atualizações das Ações</h1>
                    <p className="farmacia-page-subtitle">Acompanhe os registros recentes de evolução, status e observações das ações estratégicas.</p>
                </div>
                <button className="farmacia-btn-primary" onClick={handleOpenNewModal} disabled={loading}>
                    <Plus size={18} /> Nova Atualização
                </button>
            </header>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
                
                .farmacia-btn-secondary {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.5rem !important;
                    background: #f8fafc !important;
                    color: #334155 !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 8px !important;
                    font-size: 0.875rem !important;
                    font-weight: 600 !important;
                    padding: 0.5rem 1.1rem !important;
                    height: 38px !important;
                    cursor: pointer !important;
                    transition: all 180ms ease !important;
                    white-space: nowrap !important;
                }
                .farmacia-btn-secondary:hover {
                    background: #f1f5f9 !important;
                    border-color: #94a3b8 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }

                .update-card { 
                    opacity: 0; 
                    transform: translateY(12px);
                    transition: opacity 400ms ease-out, transform 400ms ease-out, box-shadow 200ms ease, border-color 200ms ease;
                    will-change: transform, opacity;
                }
                
                .update-timeline-item.visible { 
                    opacity: 1 !important; 
                    transform: translateY(0) !important; 
                }
                
                .update-card {
                    opacity: 1 !important;
                    transform: translateY(0) !important;
                }
                
                .update-card:hover { 
                    transform: translateY(-2px) !important; 
                    box-shadow: 0 12px 32px rgba(0,0,0,0.06) !important; 
                    border-color: rgba(0,0,0,0.12) !important; 
                }
                
                .update-badge { transition: all 0.2s ease; cursor: default; }
                .update-badge:hover { filter: saturate(1.3) brightness(0.95); transform: translateY(-1px); }
                
                .update-change-item { 
                    transition: all 0.2s ease; 
                    animation: fadeInRight 0.4s ease-out backwards; 
                }
                .update-change-item:hover { transform: scale(1.02); background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
                
                .update-action-btn {
                    background: transparent;
                    border: none;
                    padding: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    opacity: 0;
                }
                .update-card:hover .update-action-btn {
                    opacity: 0.6;
                }
                .update-action-btn:hover {
                    opacity: 1 !important;
                    background: rgba(0,0,0,0.05);
                    transform: translateY(-1px);
                }
                .update-action-btn.delete-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Ajustes obrigatórios de espaçamento */
                .updates-metrics { margin-bottom: 32px !important; }
                .updates-filters { margin-bottom: 0 !important; }
                .updates-feed { 
                    display: flex !important; 
                    flex-direction: column !important; 
                    gap: 0 !important; 
                    margin-top: 32px !important; 
                    padding-top: 0 !important; 
                }
                .update-card:first-child { margin-top: 0 !important; }

                /* Forçar 1 linha para Cards e Filtros em Desktop/Notebook (< 1550px) */
                @media (max-width: 1550px) {
                    /* KPI Cards: compressão para caber em 1 linha */
                    .updates-metrics {
                        grid-template-columns: repeat(5, 1fr) !important;
                        gap: 0.5rem !important;
                    }
                    .updates-metrics > .farmacia-card {
                        padding: 0.75rem 0.5rem !important;
                        min-width: auto !important;
                    }
                    .updates-metrics > .farmacia-card > span {
                        font-size: 0.6rem !important;
                        letter-spacing: -0.02em;
                    }
                    .updates-metrics > .farmacia-card > div {
                        font-size: 1.25rem !important;
                    }

                    /* Filtros: compressão para caber em 1 linha */
                    .farmacia-toolbar {
                        gap: 0.5rem !important;
                        flex-wrap: nowrap !important;
                    }
                    .farmacia-search-box {
                        min-width: 150px !important;
                        flex-basis: 180px !important;
                        padding: 0.35rem 0.5rem !important;
                    }
                    .farmacia-search-box input {
                        font-size: 0.8rem !important;
                    }
                    .farmacia-select-wrapper {
                        flex: 1 1 110px !important;
                        min-width: 100px !important;
                    }
                    .farmacia-filter-select {
                        font-size: 0.75rem !important;
                        padding: 0.35rem 20px 0.35rem 0.5rem !important;
                    }
                }

                @media (max-width: 1024px) {
                    /* Em telas menores que notebook (tablets/mobile), permite a quebra */
                    .updates-metrics {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 0.5rem !important;
                    }
                    .updates-metrics > .farmacia-card {
                        padding: 0.75rem !important;
                    }
                    
                    .farmacia-toolbar {
                        flex-wrap: wrap !important;
                    }
                    .farmacia-search-box {
                        flex-basis: 100% !important;
                    }
                    .farmacia-select-wrapper {
                        flex: 1 1 45% !important;
                    }
                }

                @media (max-width: 640px) {
                    .updates-metrics {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .farmacia-select-wrapper {
                        flex: 1 1 100% !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .updates-metrics {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando atualizações...</span>
                </div>
            ) : loadError ? (
                <div className="farmacia-card" style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <AlertTriangle size={32} style={{ opacity: 0.7 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>{loadError}</p>
                    <button className="farmacia-btn-secondary" onClick={loadAtualizacoes} style={{ marginTop: '0.5rem' }}>Tentar novamente</button>
                </div>
            ) : (
                <div className="planejamento-atualizacoes-container" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* Cards Executivos */}
                    <div className="updates-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #10b981' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Atualizadas</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{metrics.atualizadas}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #f59e0b' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Com atualização pendente</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{metrics.pendentes}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #ef4444' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Em atraso de atualização</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{metrics.atrasadas}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #64748b' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total de Atualizações</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>{metrics.total}</div>
                        </div>
                        <div className="farmacia-card" style={{ padding: '1rem', borderLeft: '3px solid #b91c1c' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Atenção / Críticas</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{metrics.criticas}</div>
                        </div>
                    </div>

                    {/* Toolbar de Filtros */}
                    <div className="farmacia-card updates-filters" style={{ padding: '1rem 1.25rem', gap: '0', marginBottom: '0 !important' }}>
                        <div className="farmacia-toolbar" style={{ flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
                            <div className="farmacia-search-box" style={{ flex: '2 1 250px', maxWidth: 'none', margin: 0 }}>
                                <Search size={16} className="farmacia-search-icon" />
                                <input
                                    type="text"
                                    className="farmacia-search-input"
                                    placeholder="Buscar texto ou responsável..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px', position: 'relative' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '36px', appearance: 'none', WebkitAppearance: 'none' }} value={acaoFiltro} onChange={(e) => setAcaoFiltro(e.target.value)}>
                                    <option value="Todas">Ação: Todas</option>
                                    {acoesUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 150px', position: 'relative' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '36px', appearance: 'none', WebkitAppearance: 'none' }} value={secretariaFiltro} onChange={(e) => setSecretariaFiltro(e.target.value)}>
                                    <option value="Todas">Secretaria: Todas</option>
                                    {secretariasUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px', position: 'relative' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '36px', appearance: 'none', WebkitAppearance: 'none' }} value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
                                    <option value="Todos">Tipo: Todos</option>
                                    {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>

                            <div className="farmacia-select-wrapper" style={{ flex: '1 1 140px', position: 'relative' }}>
                                <select className="farmacia-filter-select" style={{ width: '100%', paddingRight: '36px', appearance: 'none', WebkitAppearance: 'none' }} value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)}>
                                    <option value="Todos">Período: Todos</option>
                                    <option value="hoje">Hoje</option>
                                    <option value="7d">Últimos 7 dias</option>
                                    <option value="30d">Últimos 30 dias</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>

                    {/* Badge/Card de Contexto da Ação Filtrada */}
                    {acaoFiltro !== 'Todas' && (() => {
                        const filteredAcao = acoes.find(a => a.nome === acaoFiltro);
                        if (!filteredAcao) return null;
                        return (
                            <div style={{ marginTop: '1.5rem', marginBottom: '-1rem' }}>
                                <ActionContextCard 
                                    acao={filteredAcao} 
                                    getStatusLabel={getStatusLabel}
                                />
                            </div>
                        );
                    })()}

                    {/* Timeline / Lista de Atualizações */}
                    {atualizacoesFiltradas.length === 0 ? (
                        <div className="farmacia-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '32px !important' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>Nenhuma atualização encontrada.</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                                    As atualizações ajudam a acompanhar a evolução das ações estratégicas ao longo do tempo.
                                </p>
                            </div>
                            <button className="farmacia-btn-secondary" onClick={handleOpenNewModal} style={{ marginTop: '0.5rem' }}>
                                <Plus size={16} /> Registrar primeira atualização
                            </button>
                        </div>
                    ) : (
                        <div className="updates-feed" style={{ position: 'relative', marginTop: '32px !important' }}>
                            {atualizacoesFiltradas.map((item, index) => (
                                <UpdateCard 
                                    key={item.id} 
                                    item={item} 
                                    acaoContext={acoes.find(a => a.nome === item.acao)}
                                    index={index}
                                    getTipoConfig={getTipoConfig}
                                    getStatusLabel={getStatusLabel}
                                    formatDate={formatDate}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onView={handleViewUpdate}
                                    isLast={index === atualizacoesFiltradas.length - 1}
                                    isConcluidaAnteriormente={item.statusAnterior === 'Concluída' && item.statusNovo !== 'Concluída'}
                                    getActionTypeConfig={getActionTypeConfig}
                                    getDisplayProgress={getDisplayProgress}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Nova Atualização */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ maxWidth: '640px', width: '95%', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,150,125,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={18} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.05rem' }}>
                                        {editingUpdateId ? 'Editar Atualização' : 'Registrar Atualização'}
                                    </h2>
                                    <p className="farmacia-modal-subtitle">
                                        {editingUpdateId ? 'Altere as informações do evento na linha do tempo.' : 'Adicione um novo evento à linha do tempo.'}
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="farmacia-modal-close" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            <div className="farmacia-modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                                {saveError && (
                                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                                        <AlertTriangle size={16} />
                                        {saveError}
                                    </div>
                                )}
                                
                                <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                    <label className="farmacia-form-label" style={{ fontWeight: 600, color: '#334155' }}>Ação Estratégica Vinculada *</label>
                                    <ActionSelector 
                                        value={formData.acaoId} 
                                        acoes={acoes} 
                                        disabled={!!editingUpdateId} 
                                        onChange={(id, nome) => setFormData({...formData, acaoId: id, acao: nome})} 
                                    />
                                    <ActionContextCard 
                                        acao={acoes.find(a => a.id === formData.acaoId)} 
                                        getStatusLabel={getStatusLabel}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                        <label className="farmacia-form-label" style={{ fontWeight: 600, color: '#334155' }}>Tipo de Atualização</label>
                                        <div style={{ position: 'relative' }}>
                                            <select className="farmacia-form-select" style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px' }} value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                                                {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                        </div>
                                    </div>
                                    <div className="farmacia-form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px', marginBottom: 0 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#ef4444', background: formData.critica ? '#fef2f2' : 'transparent', padding: '8px 12px', borderRadius: '6px', border: formData.critica ? '1px solid #fecaca' : '1px solid transparent', transition: 'all 0.2s' }}>
                                            <input type="checkbox" checked={formData.critica} onChange={e => setFormData({...formData, critica: e.target.checked})} style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }} />
                                            Sinalizar como Crítica / Atenção
                                        </label>
                                    </div>
                                </div>

                                <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                    <label className="farmacia-form-label" style={{ fontWeight: 600, color: '#334155' }}>Descrição Detalhada *</label>
                                    <textarea 
                                        className="farmacia-form-textarea custom-textarea" 
                                        required 
                                        placeholder="Relate os avanços, decisões ou informações importantes deste evento..."
                                        value={formData.descricao} 
                                        onChange={e => setFormData({...formData, descricao: e.target.value})}
                                    />
                                    <style>{`
                                        .custom-textarea {
                                            min-height: 120px;
                                            resize: vertical;
                                            padding: 12px 16px;
                                            line-height: 1.6;
                                            font-size: 0.95rem;
                                            transition: all 0.2s ease;
                                        }
                                        .custom-textarea:focus {
                                            box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15) !important;
                                            border-color: var(--color-primary) !important;
                                        }
                                    `}</style>
                                </div>


                                {(() => {
                                    const currentAcao = acoes.find(a => a.id === formData.acaoId);
                                    if (!currentAcao) return null;

                                    const isPontual = currentAcao.action_type === 'ACAO_PONTUAL';
                                    const fixedStages = getActionTypeStages(currentAcao.action_type);
                                    const hasStages = isPontual || !!fixedStages;
                                    const isAquisicao = currentAcao.action_type === 'AQUISICAO';

                                    if (hasStages) {
                                        let stagesList = [];
                                        let currentStageIdx = null;
                                        
                                        if (isPontual) {
                                            try {
                                                stagesList = typeof currentAcao.custom_stages === 'string'
                                                    ? JSON.parse(currentAcao.custom_stages)
                                                    : (currentAcao.custom_stages || []);
                                            } catch(err) {}
                                            currentStageIdx = typeof currentAcao.current_stage_index === 'number'
                                                ? currentAcao.current_stage_index : null;
                                        } else {
                                            stagesList = fixedStages || [];
                                            const currentProg = getDisplayProgress(currentAcao);
                                            let best = 0;
                                            stagesList.forEach((s, i) => {
                                                if (currentProg >= s.progress) best = i;
                                            });
                                            currentStageIdx = best;
                                        }

                                        const total = stagesList.length;
                                        const selectedIdx = (formData.novoStageIndex !== '' && formData.novoStageIndex !== undefined && formData.novoStageIndex !== null) ? parseInt(formData.novoStageIndex) : null;
                                        const isManter = selectedIdx === null || selectedIdx === currentStageIdx;
                                        const mudouEtapa = !isManter;

                                        let novoProgrCalc = null;
                                        if (mudouEtapa) {
                                            if (isPontual) {
                                                const isUltima = selectedIdx === total - 1;
                                                novoProgrCalc = isUltima ? 100 : Math.round((selectedIdx + 1) * (100 / total));
                                            } else {
                                                novoProgrCalc = stagesList[selectedIdx]?.progress || 0;
                                            }
                                        }

                                        let novoStatusCalc = null;
                                        if (mudouEtapa) {
                                            const isUltima = selectedIdx === total - 1;
                                            novoStatusCalc = (isUltima || novoProgrCalc >= 100) ? 'Concluída' : 'Em Andamento';
                                        }

                                        const progressoAtualAcao = getDisplayProgress(currentAcao);
                                        const statusAtualLabel = {
                                            'CONCLUIDA': 'Concluída', 'EM_ANDAMENTO': 'Em Andamento',
                                            'EM_RISCO': 'Em Risco', 'PARALISADA': 'Paralisada',
                                            'NAO_INICIADA': 'Não Iniciada', 'CANCELADA': 'Cancelada'
                                        }[currentAcao.status] || currentAcao.status;

                                        return (
                                            <div style={{ background: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.25rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                                                    <TrendingUp size={13} /> Atualizar Etapa da Ação
                                                </span>
                                                {stagesList.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="farmacia-form-label" style={{ fontWeight: 600 }}>Nova Etapa da Ação</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <select
                                                                    className="farmacia-form-select"
                                                                    style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px' }}
                                                                    value={formData.novoStageIndex}
                                                                    onChange={e => setFormData({...formData, novoStageIndex: e.target.value})}
                                                                >
                                                                    <option value="">Manter etapa atual</option>
                                                                    {stagesList.map((st, idx) => {
                                                                        let pct = 0;
                                                                        let name = '';
                                                                        if (isPontual) {
                                                                            pct = idx === total - 1 ? 100 : Math.round((idx + 1) * (100 / total));
                                                                            name = st.name;
                                                                        } else {
                                                                            pct = st.progress;
                                                                            name = st.label;
                                                                        }
                                                                        return <option key={idx} value={idx}>{idx + 1}. {name} ({pct}%)</option>;
                                                                    })}
                                                                </select>
                                                                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                            </div>
                                                        </div>
                                                        {isManter ? (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.25rem' }}>
                                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                                                                    <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Progresso Atual</span>
                                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#64748b' }}>{progressoAtualAcao}%</span>
                                                                </div>
                                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                                                                    <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Status Atual</span>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>{statusAtualLabel}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.25rem' }}>
                                                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                                                                    <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '2px' }}>Progresso ao Salvar</span>
                                                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>{novoProgrCalc}%</span>
                                                                </div>
                                                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                                                                    <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '2px' }}>Status ao Salvar</span>
                                                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>{novoStatusCalc}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Esta ação não possui etapas cadastradas.</p>
                                                )}
                                            </div>
                                        );
                                    }

                                    if (isAquisicao) {
                                        return (
                                            <div style={{ background: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.25rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                                                    <TrendingUp size={13} /> Atualizar Indicadores Administrativos (Opcional)
                                                </span>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                    <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                                        <label className="farmacia-form-label" style={{ fontWeight: 600 }}>Novo Status Operacional</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <select
                                                                className="farmacia-form-select"
                                                                style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px' }}
                                                                value={formData.novoStatus}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    const pMap = { 'EM_PLANEJAMENTO': '10', 'EM_ANDAMENTO': '50', 'PENDENTE': '25', 'CONCLUIDA': '100' };
                                                                    setFormData({...formData, novoStatus: val, novoProgresso: val ? pMap[val] : ''});
                                                                }}
                                                            >
                                                                <option value="">Manter atual</option>
                                                                <option value="EM_PLANEJAMENTO">Em Planejamento</option>
                                                                <option value="EM_ANDAMENTO">Em Andamento</option>
                                                                <option value="PENDENTE">Pendente</option>
                                                                <option value="CONCLUIDA">Concluído</option>
                                                            </select>
                                                            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const stageInfo = getStageInfo(currentAcao);
                                    return (
                                        <div style={{ background: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '0.25rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                                                <TrendingUp size={13} /> Atualizar Indicadores (Opcional)
                                            </span>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                                    <label className="farmacia-form-label" style={{ fontWeight: 600 }}>Novo Status Operacional</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <select className="farmacia-form-select" style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: '36px' }} value={formData.novoStatus} onChange={e => {
                                                            const val = e.target.value;
                                                            const updates = { novoStatus: val };
                                                            if (val === 'CONCLUIDA') updates.novoProgresso = '100';
                                                            setFormData({...formData, ...updates});
                                                        }}>
                                                            <option value="">Manter atual</option>
                                                            <option value="NAO_INICIADA">Não Iniciada</option>
                                                            <option value="EM_ANDAMENTO">Em Andamento</option>
                                                            <option value="CONCLUIDA">Concluída</option>
                                                            <option value="EM_RISCO">Em Risco</option>
                                                            <option value="PARALISADA">Paralisada</option>
                                                        </select>
                                                        <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                    </div>
                                                </div>
                                                <div className="farmacia-form-group" style={{ marginBottom: 0 }}>
                                                    <label className="farmacia-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontWeight: 600 }}>
                                                        Evolução do Progresso (%)
                                                        {stageInfo && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#8b5cf6', background: '#f5f3ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                                <Info size={12} /> Recomendado: {stageInfo.progress}%
                                                            </span>
                                                        )}
                                                    </label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <input
                                                                type="range"
                                                                min="0" max="100"
                                                                value={parseInt(formData.novoProgresso) || 0}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const updates = { novoProgresso: val.toString() };
                                                                    if (val === 100 && formData.novoStatus !== 'CONCLUIDA') {
                                                                        updates.novoStatus = 'CONCLUIDA';
                                                                    }
                                                                    setFormData({...formData, ...updates});
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    height: '8px',
                                                                    borderRadius: '4px',
                                                                    background: `linear-gradient(to right, ${(parseInt(formData.novoProgresso) || 0) <= 25 ? '#ef4444' : (parseInt(formData.novoProgresso) || 0) <= 60 ? '#3b82f6' : (parseInt(formData.novoProgresso) || 0) <= 85 ? '#f59e0b' : '#10b981'} ${parseInt(formData.novoProgresso) || 0}%, #cbd5e1 ${parseInt(formData.novoProgresso) || 0}%)`,
                                                                    outline: 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'background 0.2s ease'
                                                                }}
                                                                className="modern-range-slider"
                                                            />
                                                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0" max="100"
                                                                    style={{ 
                                                                        width: '54px', padding: '0.5rem 0', textAlign: 'center', 
                                                                        fontWeight: 700, fontSize: '1rem', border: 'none', outline: 'none',
                                                                        color: '#0f172a', background: 'transparent'
                                                                    }}
                                                                    value={formData.novoProgresso || 0}
                                                                    onChange={e => {
                                                                        let val = parseInt(e.target.value) || 0;
                                                                        if (val > 100) val = 100;
                                                                        if (val < 0) val = 0;
                                                                        const updates = { novoProgresso: val.toString() };
                                                                        if (val === 100 && formData.novoStatus !== 'CONCLUIDA') {
                                                                            updates.novoStatus = 'CONCLUIDA';
                                                                        }
                                                                        setFormData({...formData, ...updates});
                                                                    }}
                                                                />
                                                                <span style={{ padding: '0 8px 0 0', fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>%</span>
                                                            </div>
                                                        </div>
                                                        <style>{`.modern-range-slider{-webkit-appearance:none;appearance:none;}.modern-range-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.15);transition:transform 0.1s ease;}.modern-range-slider::-webkit-slider-thumb:hover{transform:scale(1.15);}.modern-range-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.15);transition:transform 0.1s ease;}.modern-range-slider::-moz-range-thumb:hover{transform:scale(1.15);}`}</style>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                            </div>
                            <div className="farmacia-modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '0.875rem 1.5rem', gap: '0.75rem', flexShrink: 0, background: 'white' }}>
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsModalOpen(false)} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {saveLoading && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingUpdateId ? 'Salvar Alterações' : 'Registrar Atualização'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {isConfirmDeleteOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ maxWidth: '480px', width: '95%' }}>
                        <div className="farmacia-modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={18} color="#ef4444" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.05rem', color: '#0f172a' }}>Confirmar Exclusão</h2>
                                    <p className="farmacia-modal-subtitle">Excluir registro histórico</p>
                                </div>
                            </div>
                            <button type="button" className="farmacia-modal-close" onClick={() => setIsConfirmDeleteOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="farmacia-modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                Tem certeza que deseja excluir esta atualização?
                            </p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Essa ação não poderá ser desfeita.
                            </p>
                        </div>
                        <div className="farmacia-modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', gap: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="farmacia-modal-btn-cancel" onClick={() => setIsConfirmDeleteOpen(false)}>
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="farmacia-modal-btn-confirm" 
                                onClick={confirmDelete}
                                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                            >
                                Excluir Atualização
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Visualização da Atualização */}
            {isViewModalOpen && viewingUpdate && (
                <div className="farmacia-modal-overlay" onClick={() => setIsViewModalOpen(false)}>
                    <div className="farmacia-modal" style={{ maxWidth: '650px', width: '95%', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: '#f8fafc', padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{viewingUpdate.acao}</h2>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span style={{ fontWeight: 600 }}>{viewingUpdate.secretaria}</span>
                                    <span style={{ color: 'var(--border)' }}>&bull;</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {formatDate(viewingUpdate.data)}</span>
                                </div>
                            </div>
                            <button type="button" className="farmacia-modal-close" onClick={() => setIsViewModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Tags / Meta */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#94a3b8' }}>Responsável</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{viewingUpdate.responsavel}</span>
                                </div>
                                {(viewingUpdate.statusNovo || viewingUpdate.statusAnterior) && (
                                    <div style={{ background: '#ecfdf5', padding: '6px 12px', borderRadius: '6px', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#059669' }}>Status Atualizado</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {viewingUpdate.statusAnterior && <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', opacity: 0.6, color: '#059669' }}>{getStatusLabel(viewingUpdate.statusAnterior)}</span>}
                                            {viewingUpdate.statusAnterior && <span style={{ color: '#059669', opacity: 0.6 }}>→</span>}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>{getStatusLabel(viewingUpdate.statusNovo || viewingUpdate.statusAnterior)}</span>
                                        </div>
                                    </div>
                                )}
                                {(viewingUpdate.progressoNovo !== null && viewingUpdate.progressoNovo !== undefined) && (
                                    <div style={{ background: '#eff6ff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: '#2563eb' }}>Progresso</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {viewingUpdate.progressoAnterior !== null && <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', opacity: 0.6, color: '#2563eb' }}>{viewingUpdate.progressoAnterior}%</span>}
                                            {viewingUpdate.progressoAnterior !== null && <span style={{ color: '#2563eb', opacity: 0.6 }}>→</span>}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>{viewingUpdate.progressoNovo}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Descrição */}
                            <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição do Evento</h4>
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {viewingUpdate.descricao}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
                            <button className="farmacia-btn-secondary" onClick={() => handleEdit(viewingUpdate)} style={{ background: 'white' }}>
                                <Edit2 size={16} /> Editar Atualização
                            </button>
                            <button className="farmacia-btn-secondary" onClick={() => { setIsViewModalOpen(false); handleDelete(viewingUpdate.id); }} style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}>
                                <Trash2 size={16} /> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast de Sucesso */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: 'white',
                    padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9999, fontWeight: 500, fontSize: '0.9rem'
                }}>
                    <CheckCircle2 size={18} />
                    {toast}
                </div>
            )}
        </div>
    );
};

export default PlanejamentoAtualizacoes;
