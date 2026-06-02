import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    Search, 
    Plus, 
    Filter, 
    ChevronDown, 
    ChevronUp,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    CheckCircle2,
    Eye, 
    Edit2, 
    Calendar,
    Target,
    Activity,
    AlertTriangle,
    ShieldCheck,
    Clock,
    MapPin,
    Loader,
    X,
    Info,
    CheckCircle, Trash2, History, MessageSquare
} from 'lucide-react';
import '../farmacia/FarmaciaPages.css';
import '../farmacia/FarmaciaModal.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

import { fetchAcoes, fetchAxes, fetchSecretariats, createAcao, updateAcao, deleteAcao, fetchObjectivesByAxis, createAtualizacao, fetchActionSecretariats, recordActionHistory, fetchActionDeletions, fetchUpdatesByAction } from '../../services/api/planejamentoAcoes.service';

import { PLANNING_ACTION_TYPES_ARRAY, getActionTypeConfig, getActionTypeStages } from '../../modules/planejamento/constants/planningActionTypes';

// Removidos passos hardcoded, usando planejamentoActionTypes centralizado

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
    const rawProgress = acao.progresso ?? 0;

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
                return stages[idx].progress !== undefined ? stages[idx].progress : rawProgress;
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

const getUpdateDelayStatus = (acao) => {
    const hasManualUpdate = !!acao.last_manual_update_at;
    const baseDateStr = acao.last_manual_update_at || acao.created_at;
    if (!baseDateStr) {
        return { status: 'normal', days: 0 };
    }
    
    const lastDate = new Date(baseDateStr);
    const today = new Date();
    
    // Clear hours to calculate full days
    const lastDateClear = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const todayClear = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayClear - lastDateClear;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (hasManualUpdate) {
        if (diffDays > 7) {
            return { status: 'critical', days: diffDays };
        } else {
            return { status: 'normal', days: diffDays };
        }
    } else {
        if (diffDays > 7) {
            return { status: 'critical', days: diffDays };
        } else {
            // Sem atualização manual registrada e criada há até 7 dias
            return { status: 'pending', days: diffDays };
        }
    }
};


const getActionTypeBadge = (type) => {
    const config = getActionTypeConfig(type);
    return (
        <span className="farmacia-badge" style={{ 
            backgroundColor: config.bg, 
            color: config.color, 
            border: `1px solid ${config.border}`, 
            padding: '2px 8px', 
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '4px',
            whiteSpace: 'nowrap'
        }}>
            {config.label}
        </span>
    );
};

const formatAcaoAddress = (acao) => {
    if (!acao) return 'Não informada';
    const parts = [];
    if (acao.address_street) {
        let streetStr = acao.address_street;
        if (acao.address_number) streetStr += `, ${acao.address_number}`;
        if (acao.address_complement) streetStr += ` (${acao.address_complement})`;
        parts.push(streetStr);
    }
    const district = acao.address_district || acao.local;
    if (district) parts.push(district);
    
    let cityState = '';
    if (acao.address_city) cityState += acao.address_city;
    if (acao.address_state) cityState += cityState ? ` - ${acao.address_state}` : acao.address_state;
    if (cityState) parts.push(cityState);
    
    if (acao.address_zipcode) parts.push(`CEP ${acao.address_zipcode}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Não informada';
};

const getDeadlineStatus = (start, end, status) => {
    if (!end) return { text: 'Prazo indefinido', color: '#64748b', bg: '#f1f5f9' };
    if (status === 'CONCLUIDA') return { text: 'Concluída', color: '#059669', bg: '#d1fae5' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const [y, m, d] = end.split('-');
    const endDate = new Date(y, m-1, d);
    endDate.setHours(0,0,0,0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Vencido há ${Math.abs(diffDays)} dias`, color: '#dc2626', bg: '#fee2e2' };
    if (diffDays <= 7) return { text: `Vence em ${diffDays} dias`, color: '#d97706', bg: '#fef3c7' };
    return { text: `No prazo (${diffDays} dias)`, color: '#0284c7', bg: '#e0f2fe' };
};

const formatUserDisplayName = (rawString) => {
    if (!rawString) return '';
    
    // Remove domínios de email se existirem
    let str = String(rawString).split('@')[0];
    
    // Substituir pontos, traços e underlines por espaços
    str = str.replace(/[._-]/g, ' ');
    
    // Capitalizar cada palavra e remover espaços extras
    return str
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

const getDisplayName = (del, usersMap) => {
    if (!del) return 'Usuário não identificado';
    // 1. Procurar no usersMap pelo UUID do usuário
    if (del.deleted_by && usersMap && usersMap[del.deleted_by]) {
        return usersMap[del.deleted_by];
    }
    // 2. Se tiver o nome salvo no histórico de exclusões, formatar e exibir
    if (del.deleted_by_name) {
        return formatUserDisplayName(del.deleted_by_name);
    }
    // 3. Fallback
    return 'Usuário não identificado';
};

const AcoesList = () => {
    const { authUser, tenantLink, scopes, isSuperAdmin } = useAuth();
    const tenantId = tenantLink?.tenant_id;
    const location = useLocation();
    const navigate = useNavigate();

    const [busca, setBusca] = useState('');
    const [statusFiltro, setStatusFiltro] = useState('Todos');
    const [secretariaFiltro, setSecretariaFiltro] = useState('Todas');
    const [tipoFiltro, setTipoFiltro] = useState('Todos');

    // Estado dos dados reais
    const [acoes, setAcoes] = useState([]);
    const [axes, setAxes] = useState([]);
    const [secretariats, setSecretariats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [actionUpdates, setActionUpdates] = useState([]);
    const [viewingAcao, setViewingAcao] = useState(null);
    const [viewingParticipantes, setViewingParticipantes] = useState([]);
    const [initialParticipants, setInitialParticipants] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [usersMap, setUsersMap] = useState({});
    const [historyLimit, setHistoryLimit] = useState(3);

    const [isDeletionsHistoryOpen, setIsDeletionsHistoryOpen] = useState(false);
    const [deletionsHistory, setDeletionsHistory] = useState([]);
    const [deletionsLoading, setDeletionsLoading] = useState(false);

    const openDeletionsHistory = async () => {
        setIsDeletionsHistoryOpen(true);
        setDeletionsLoading(true);
        try {
            const data = await fetchActionDeletions(tenantId);
            setDeletionsHistory(data || []);
        } catch (err) {
            console.error("Erro ao carregar histórico de exclusões", err);
        } finally {
            setDeletionsLoading(false);
        }
    };

    const sortedHistory = useMemo(() => {
        if (!actionHistory || actionHistory.length === 0) return [];
        return [...actionHistory].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [actionHistory]);

    const [toast, setToast] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Buscar participantes ao abrir view
    useEffect(() => {
        if (!isViewModalOpen || !viewingAcao?.id) return;
        let isMounted = true;
        setViewingParticipantes([]);

        const fetchStats = async () => {
            try {
                const { data: links, error: errLinks } = await supabase
                    .from('planning_action_secretariats')
                    .select('is_primary, secretariats(name)')
                    .eq('action_id', viewingAcao.id);

                if (errLinks) throw errLinks;

                const participantNames = (links || [])
                    .filter(l => !l.is_primary && l.secretariats)
                    .map(l => l.secretariats.name);

                if (isMounted) {
                    setViewingParticipantes(participantNames);
                }
            } catch (err) {
                console.error("Erro ao buscar participantes da ação:", err);
            }
        };

        fetchStats();
        return () => { isMounted = false; };
    }, [isViewModalOpen, viewingAcao]);

    // Buscar histórico de alterações ao abrir modal de detalhes
    useEffect(() => {
        if (!isViewModalOpen || !viewingAcao?.id) { setActionHistory([]); return; }
        
        setHistoryExpanded(false);
        setHistoryLimit(3);
        
        supabase
            .from('planning_action_history')
            .select('*')
            .eq('action_id', viewingAcao.id)
            .order('created_at', { ascending: false })
            .limit(30)
            .then(({ data }) => setActionHistory(data || []))
            .catch(() => setActionHistory([]));
    }, [isViewModalOpen, viewingAcao]);

    // Buscar atualizações (updates) ao abrir modal de detalhes
    useEffect(() => {
        if (!isViewModalOpen || !viewingAcao?.id || !tenantId) {
            setActionUpdates([]);
            return;
        }

        fetchUpdatesByAction(tenantId, viewingAcao.id)
            .then(data => setActionUpdates(data || []))
            .catch(err => {
                console.error("Erro ao carregar atualizações da ação", err);
                setActionUpdates([]);
            });
    }, [isViewModalOpen, viewingAcao, tenantId]);

    // Carregar dados do banco
    const loadAcoes = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const data = await fetchAcoes(tenantId);
            console.log('[ACOES_FETCH] IDs retornados:', data?.map(a => a.id));
            setAcoes(data);
        } catch (err) {
            console.error('[AcoesList] Erro ao carregar ações:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        if (tenantId) {
            loadAcoes();
            fetchAxes(tenantId).then(setAxes);
            fetchSecretariats(tenantId).then(data => {
                const sorted = [...data].sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'pt-BR', { sensitivity: 'base' }));
                setSecretariats(sorted);
            });
            
            // Carregar mapa de usuários do sistema para exibir nomes ao invés de UUID
            supabase.rpc('get_farmacia_users_with_auth', { p_tenant_id: tenantId })
                .then(({ data }) => {
                    if (data) {
                        const uMap = {};
                        data.forEach(r => {
                            const uid = r.user_id || r.id;
                            if (uid) {
                                const rawName = r.full_name || r.name || (r.email ? r.email.split('@')[0] : '');
                                uMap[uid] = rawName ? formatUserDisplayName(rawName) : 'Usuário Sem Nome';
                            }
                        });
                        setUsersMap(uMap);
                    }
                }).catch(err => console.warn('[AcoesList] Erro ao carregar nomes de usuários:', err));
        }
    }, [tenantId, loadAcoes]);

    // Filtrar secretarias permitidas via escopo do usuário
    const filteredSecretariats = useMemo(() => {
        if (isSuperAdmin) return secretariats;
        
        const planningModuleId = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';
        const allowedIds = scopes
            .filter(s => s.module_id === planningModuleId)
            .map(s => s.secretariat_id)
            .filter(Boolean);

        if (allowedIds.length === 0) return secretariats;
        return secretariats.filter(s => allowedIds.includes(s.id));
    }, [secretariats, scopes, isSuperAdmin]);

    // Detectar gatilho global de "Nova Ação" via Topbar
    useEffect(() => {
        if (location.state?.openModal === 'nova-acao') {
            openModal();
            // Limpar o estado para não reabrir ao atualizar
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Estado do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAcao, setEditingAcao] = useState(null);

    const emptyForm = {
        nome: '',
        local: '',
        secretariatId: '',
        secretaria: '',
        axisId: '',
        eixo: '',
        status: 'NAO_INICIADA',
        progresso: 0,
        prazo: '',
        data_inicio: '',
        responsible_name: '',
        descricao: '',
        observacoes: '',
        action_type: 'PROJETO',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_district: '',
        address_city: 'Bezerros',
        address_state: 'PE',
        address_zipcode: '',
        address_reference: '',
        participantes: [],
        custom_stages: null,
        current_stage_index: null,
        current_stage_observation: ''
    };
    const [formData, setFormData] = useState(emptyForm);
    const [objectives, setObjectives] = useState([]);
    const [loadingObjectives, setLoadingObjectives] = useState(false);

    // Validar objetivos ao trocar o eixo
    useEffect(() => {
        const validateAxisObjectives = async () => {
            if (isModalOpen && formData.axisId && tenantId && !editingAcao) {
                setLoadingObjectives(true);
                try {
                    const objs = await fetchObjectivesByAxis(tenantId, formData.axisId);
                    setObjectives(objs);
                    

                    



                } catch (err) {
                    console.error('[Planejamento] Erro ao validar objetivos:', err);
                    setObjectives([]);
                } finally {
                    setLoadingObjectives(false);
                }
            } else if (editingAcao) {
                // Se estiver editando, assumimos que já existe objetivo ou não bloqueamos
                setObjectives([{ id: 'existing', is_active: true }]);
            }
        };

        validateAxisObjectives();
    }, [formData.axisId, isModalOpen, tenantId, editingAcao]);

    const openModal = (acao = null) => {
        setSaveError(null);
        if (acao) {
            setEditingAcao(acao);
            setInitialParticipants([]); // Resetar histórico de origem
            const actionType = acao.action_type || 'PROJETO';
            let initialProgress = acao.progresso ?? 0;
            if (initialProgress > 0) {
                const steps = getActionTypeStages(actionType);
                if (steps && steps.length > 0) {
                    const closestLabel = getClosestStep(initialProgress, steps);
                    const closestStep = steps.find(s => s.label === closestLabel);
                    initialProgress = closestStep ? closestStep.progress : 0;
                }
            }
            setFormData({
                ...emptyForm,
                nome: acao.nome || '',
                local: acao.local || '',
                secretariatId: acao.secretariaId || '',
                secretaria: acao.secretaria || '',
                axisId: acao.eixoId || '',
                eixo: acao.eixo || '',
                status: acao.status || 'NAO_INICIADA',
                progresso: initialProgress,
                prazo: acao.prazo || '',
                data_inicio: acao.data_inicio || '',
                responsible_name: acao.responsavel || '',
                descricao: acao.descricao || '',
                observacoes: acao.observacoes || '',
                action_type: actionType,
                address_street: acao.address_street || '',
                address_number: acao.address_number || '',
                address_complement: acao.address_complement || '',
                address_district: acao.address_district || '',
                address_city: acao.address_city || 'Bezerros',
                address_state: acao.address_state || 'PE',
                address_zipcode: acao.address_zipcode || '',
                address_reference: acao.address_reference || '',
                participantes: [],
                custom_stages: acao.custom_stages || null,
                current_stage_index: acao.current_stage_index ?? null,
                current_stage_observation: acao.current_stage_observation || ''
            });

            // Carregar secretarias participantes de forma assíncrona e travar estado original
            fetchActionSecretariats(acao.id).then(links => {
                const participants = (links || []).filter(l => !l.is_primary).map(l => l.secretariat_id);
                setInitialParticipants(participants); // Travar captura de IDs para comparação no save
                if (participants.length > 0) {
                    setFormData(prev => ({ ...prev, participantes: participants }));
                }
            }).catch(console.warn);
        } else {
            setEditingAcao(null);
            const firstAxis = axes[0];
            const firstSec = secretariats[0];
            setFormData({
                ...emptyForm,
                axisId: firstAxis?.id || '',
                eixo: firstAxis?.name || '',
                secretariatId: firstSec?.id || '',
                secretaria: firstSec?.name || '',
                progresso: 0
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSaveError(null);
        setConfirmDeleteOpen(false);
        setDeleteError(null);
        setEditingAcao(null);
    };

    const openViewModal = (acao) => {
        setViewingAcao(acao);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setViewingAcao(null);
    };

    // Função auxiliar para renderizar o ícone de ordenação
    const renderSortIcon = (key) => {
        const isActive = sortConfig.key === key;
        if (isActive) {
            return sortConfig.direction === 'asc' 
                ? <ArrowUp size={12} style={{ color: 'var(--color-secondary)', transition: 'all 0.2s' }} /> 
                : <ArrowDown size={12} style={{ color: 'var(--color-secondary)', transition: 'all 0.2s' }} />;
        }
        return <ArrowUpDown size={12} style={{ color: 'var(--text-muted)', opacity: 0.4, transition: 'all 0.2s' }} />;
    };

    // ─── Compara acao original (editingAcao) com formData após save ───────────
    // Mapeamento real dos campos: editingAcao.X → formData.X
    // nome, progresso, status, prazo, responsible_name (responsavel→responsible_name),
    // descricao, observacoes, current_stage_index, custom_stages
    const buildHistoryEvents = (original, novo) => {
        const events = [];
        const obs = novo.observacoes || null;

        // Helper: compara dois valores, retorna true se forem equivalentes (sem história)
        const eq = (a, b) => {
            const norm = v => (v === undefined || v === null || v === '') ? null : String(v).trim();
            return norm(a) === norm(b);
        };
        const eqJSON = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

        // Status
        if (!eq(original.status, novo.status)) {
            const labels = { NAO_INICIADA:'Não Iniciada', EM_ANDAMENTO:'Em Andamento',
                CONCLUIDA:'Concluída', EM_RISCO:'Em Risco', PARALISADA:'Paralisada', CANCELADA:'Cancelada' };
            events.push({ event_type:'STATUS_CHANGED', field_changed:'status',
                old_value: { value: original.status, label: labels[original.status] || original.status },
                new_value: { value: novo.status,     label: labels[novo.status]     || novo.status },
                description: `Status alterado de "${labels[original.status]||original.status}" para "${labels[novo.status]||novo.status}"`,
                observations: obs });
        }

        // Progresso (editingAcao.progresso → formData.progresso)
        const oldProg = Number(original.progresso ?? 0);
        const newProg = Number(novo.progresso ?? 0);
        if (oldProg !== newProg) {
            events.push({ event_type:'PROGRESS_CHANGED', field_changed:'progresso',
                old_value: { value: oldProg, label: `${oldProg}%` },
                new_value: { value: newProg, label: `${newProg}%` },
                description: `Progresso alterado de ${oldProg}% para ${newProg}%`,
                observations: obs });
        }

        // Prazo (editingAcao.prazo → formData.prazo)
        if (!eq(original.prazo, novo.prazo)) {
            events.push({ event_type:'DEADLINE_CHANGED', field_changed:'prazo',
                old_value: { value: original.prazo || null, label: original.prazo || 'Sem prazo' },
                new_value: { value: novo.prazo     || null, label: novo.prazo     || 'Sem prazo' },
                description: `Prazo alterado de "${original.prazo||'(vazio)'}" para "${novo.prazo||'(vazio)'}"`,
                observations: obs });
        }

        // Responsável (editingAcao.responsavel → formData.responsible_name)
        if (!eq(original.responsavel, novo.responsible_name)) {
            events.push({ event_type:'RESPONSIBLE_CHANGED', field_changed:'responsible_name',
                old_value: { value: original.responsavel     || null, label: original.responsavel     || '(vazio)' },
                new_value: { value: novo.responsible_name    || null, label: novo.responsible_name    || '(vazio)' },
                description: `Responsável alterado de "${original.responsavel||'(vazio)'}" para "${novo.responsible_name||'(vazio)'}"`,
                observations: obs });
        }

        // Etapa atual — Ação Pontual (current_stage_index + custom_stages para labels)
        const oldIdx = original.current_stage_index;
        const newIdx = novo.current_stage_index;
        if (!eq(oldIdx, newIdx)) {
            let stages = [];
            try { stages = typeof novo.custom_stages === 'string' ? JSON.parse(novo.custom_stages) : (novo.custom_stages || []); } catch(e) {}
            const total = stages.length;
            const stageName = (idx) => stages[idx]?.name || `Etapa ${idx+1}`;
            const stagePct  = (idx) => idx === null || idx === undefined ? 0 : (idx === total-1 ? 100 : Math.round((idx+1)*(100/total)));
            const oldLabel  = oldIdx !== null && oldIdx !== undefined ? `${stageName(oldIdx)} (${stagePct(oldIdx)}%)` : 'Não iniciada';
            const newLabel  = newIdx !== null && newIdx !== undefined ? `${stageName(newIdx)} (${stagePct(newIdx)}%)` : 'Não iniciada';
            events.push({ event_type:'STAGE_CHANGED', field_changed:'current_stage_index',
                old_value: { value: oldIdx ?? null, label: oldLabel },
                new_value: { value: newIdx ?? null, label: newLabel },
                old_stage_index: oldIdx ?? null,
                new_stage_index: newIdx ?? null,
                description: `Etapa alterada de "${oldLabel}" para "${newLabel}"`,
                observations: obs });
        }

        // Nome (editingAcao.nome → formData.nome)
        if (!eq(original.nome, novo.nome)) {
            events.push({ event_type:'ACTION_UPDATED', field_changed:'nome',
                old_value: { value: original.nome || null, label: original.nome || '(vazio)' },
                new_value: { value: novo.nome     || null, label: novo.nome     || '(vazio)' },
                description: `Nome alterado de "${original.nome||'(vazio)'}" para "${novo.nome||'(vazio)'}"`,
                observations: obs });
        }

        // Descrição (editingAcao.descricao → formData.descricao)
        if (!eq(original.descricao, novo.descricao)) {
            events.push({ event_type:'ACTION_UPDATED', field_changed:'descricao',
                old_value: { value: original.descricao || null, label: original.descricao ? 'Texto anterior' : '(vazio)' },
                new_value: { value: novo.descricao     || null, label: novo.descricao     ? 'Texto atualizado' : '(vazio)' },
                description: 'Descrição da ação atualizada',
                observations: obs });
        }

        // Observações (editingAcao.observacoes → formData.observacoes)
        if (!eq(original.observacoes, novo.observacoes)) {
            events.push({ event_type:'ACTION_UPDATED', field_changed:'observacoes',
                old_value: { value: original.observacoes || null, label: original.observacoes ? 'Texto anterior' : '(vazio)' },
                new_value: { value: novo.observacoes     || null, label: novo.observacoes     ? 'Texto atualizado' : '(vazio)' },
                description: 'Observações da ação atualizadas',
                observations: novo.observacoes || null });
        }

        // Participantes (Comparação de IDs Segura via State Capturado em openModal)
        const oldIds = [...(initialParticipants || [])].sort();
        const newIds = [...(novo.participantes || [])].sort();
        
        const addedIds = newIds.filter(id => !oldIds.includes(id));
        const removedIds = oldIds.filter(id => !newIds.includes(id));
        
        if (addedIds.length > 0 || removedIds.length > 0) {
            // Mapear os IDs modificados para Nomes usando o array fixo secretariats
            const addedNames = addedIds
                .map(pid => secretariats.find(s => s.id === pid)?.name)
                .filter(Boolean)
                .sort();
            
            const removedNames = removedIds
                .map(pid => secretariats.find(s => s.id === pid)?.name)
                .filter(Boolean)
                .sort();

            const totalChanges = addedNames.length + removedNames.length;
            
            if (totalChanges > 0) {
                const originalPartNames = oldIds
                    .map(pid => secretariats.find(s => s.id === pid)?.name)
                    .filter(Boolean)
                    .sort();
                
                const novoPartNames = newIds
                    .map(pid => secretariats.find(s => s.id === pid)?.name)
                    .filter(Boolean)
                    .sort();

                console.log('[DEBUG_HISTORICO_PARTICIPANTES]', {
                    participantesAnteriores: originalPartNames,
                    participantesNovos: novoPartNames,
                    adicionados: addedNames,
                    removidos: removedNames,
                    totalAlteracoes: totalChanges
                });

                const oldString = originalPartNames.join(', ') || null;
                const newString = novoPartNames.join(', ') || null;

                // Se existirem MUITAS alterações (> 3), usar resumo elegante de uma linha
                if (totalChanges > 3) {
                    events.push({
                        event_type: 'ACTION_UPDATED', // Mapear para tipo existente para evitar 400 (Constraint/Enum)
                        field_changed: 'participantes',
                        old_value: { value: oldString, label: oldString || '(nenhum)' },
                        new_value: { value: newString, label: newString || '(nenhum)' },
                        description: 'Secretarias participantes atualizadas',
                        observations: null
                    });
                } else {
                    const summaryList = [];
                    if (addedNames.length > 0) summaryList.push(...addedNames.map(n => `+ ${n}`));
                    if (removedNames.length > 0) summaryList.push(...removedNames.map(n => `- ${n}`));
                    
                    events.push({
                        event_type: 'ACTION_UPDATED', // Mapear para tipo existente para evitar 400 (Constraint/Enum)
                        field_changed: 'participantes',
                        old_value: { value: oldString, label: oldString || '(nenhum)' },
                        new_value: { value: newString, label: newString || '(nenhum)' },
                        description: 'Participantes atualizados',
                        observations: summaryList.join(' | ')
                    });
                }
            }
        }
        
        return events;
    };

    const handleDeleteAcao = async () => {
        console.log('[DELETE] handleDeleteAcao EXECUTOU');
        console.log('[DELETE_ACAO] Botão Confirmar Exclusão clicado.');
        console.log('[DELETE_ACAO] Status das variáveis:', { tenantId, editingAcaoId: editingAcao?.id });

        if (!tenantId) {
            const errMsg = 'Não foi possível excluir: Tenant ID ausente.';
            console.error('[DELETE_ACAO] Erro:', errMsg);
            setDeleteError(errMsg);
            return;
        }

        if (!editingAcao?.id) {
            const errMsg = 'Não foi possível excluir: ID da ação ausente.';
            console.error('[DELETE_ACAO] Erro:', errMsg);
            setDeleteError(errMsg);
            return;
        }

        setDeleteLoading(true);
        setDeleteError(null);
        try {
            console.log('[DELETE_ACAO] Disparando service deleteAcao para ID:', editingAcao.id);
            const success = await deleteAcao(tenantId, editingAcao.id);
            console.log('[DELETE_ACAO] Resultado da exclusão no service:', success);
            const deletedId = editingAcao.id;
            setAcoes(prev => {
                const filtered = prev.filter(a => a.id !== deletedId);
                console.log('[DELETE_ACAO] Estado local atualizado. Removido ID:', deletedId);
                return filtered;
            });
            
            setToast('Ação estratégica excluída com sucesso.');
            
            // Fechar modals, limpar estados e recarregar dados
            setConfirmDeleteOpen(false);
            closeModal(); // Fecha o modal de edição
            
            console.log('[DELETE_ACAO] Atualizando listagem de ações...');
            await loadAcoes();
        } catch (err) {
            console.error('[DELETE_ACAO] Captura de Erro:', err);
            setDeleteError(err.message || 'Erro desconhecido ao excluir ação estratégica.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!tenantId) return;
        
        let finalData = { ...formData };
        if (finalData.action_type === 'ACAO_PONTUAL') {
            if (!finalData.custom_stages || finalData.custom_stages.length < 2) {
                setSaveError('Selecione a quantidade de etapas e configure-as.');
                return;
            }
            if (finalData.custom_stages.some(s => !s.name || s.name.trim() === '')) {
                setSaveError('Todas as etapas devem ter um nome preenchido.');
                return;
            }
            if (finalData.current_stage_index === null || finalData.current_stage_index === undefined || finalData.current_stage_index === '') {
                finalData.status = 'NAO_INICIADA';
                finalData.progresso = 0;
            } else {
                if (parseInt(finalData.current_stage_index) === finalData.custom_stages.length - 1) {
                    finalData.status = 'CONCLUIDA';
                } else {
                    finalData.status = 'EM_ANDAMENTO';
                }
            }
        } else if (finalData.action_type !== 'AQUISICAO') {
            if (!finalData.progresso || finalData.progresso === 0) {
                finalData.status = 'NAO_INICIADA';
            } else if (finalData.progresso >= 100) {
                finalData.status = 'CONCLUIDA';
            } else {
                finalData.status = 'EM_ANDAMENTO';
            }
        }

        setSaveLoading(true);
        setSaveError(null);
        try {

            if (editingAcao) {
                // Snapshot ANTES do save (editingAcao contém os valores originais)
                const originalSnapshot = editingAcao;
                await updateAcao(tenantId, editingAcao.id, finalData);
                setToast('Ação atualizada com sucesso.');

                // Registrar histórico de alterações (fire-and-forget, não bloqueia)
                const histEvents = buildHistoryEvents(originalSnapshot, finalData);
                if (histEvents.length > 0) {
                    console.log('[DEBUG_SUPABASE_SAVE] Payload final enviado ao recordActionHistory:', JSON.stringify(histEvents, null, 2));
                    recordActionHistory(tenantId, editingAcao.id, histEvents)
                        .catch(err => console.warn('[AcoesList] Histórico não registrado:', err));
                }
            } else {
                await createAcao(tenantId, finalData, axes);
                setToast('Ação criada com sucesso.');
            }
            closeModal();
            await loadAcoes();
        } catch (err) {
            console.error('[AcoesList] Erro ao salvar:', err);
            setSaveError(err.message || 'Erro ao salvar. Tente novamente.');
        } finally {
            setSaveLoading(false);
        }
    };

    const hasActiveObjective = useMemo(() => {
        if (editingAcao) return true;
        return objectives.length > 0 && objectives.some(o => o.is_active);
    }, [objectives, editingAcao]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const acoesFiltradas = useMemo(() => {
        let filtered = acoes.filter(a => {
            const mBusca = (a.nome || '').toLowerCase().includes(busca.toLowerCase()) || (a.local || '').toLowerCase().includes(busca.toLowerCase());
            const mStatus = statusFiltro === 'Todos' || a.status === statusFiltro;
            const mSec = secretariaFiltro === 'Todas' || a.secretaria === secretariaFiltro || a.secretariaId === secretariaFiltro;
            const mTipo = tipoFiltro === 'Todos' || (a.action_type || 'PROJETO') === tipoFiltro || (tipoFiltro === 'ACAO_PONTUAL' && a.action_type === 'ACAO');
            return mBusca && mStatus && mSec && mTipo;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Mapeamento de campos especiais se necessário
                if (sortConfig.key === 'secretaria') {
                    valA = a.secretaria_nome || a.secretaria;
                    valB = b.secretaria_nome || b.secretaria;
                } else if (sortConfig.key === 'progresso') {
                    valA = getDisplayProgress(a);
                    valB = getDisplayProgress(b);
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [busca, statusFiltro, secretariaFiltro, tipoFiltro, acoes, sortConfig]);

    const metrics = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const limitDate = new Date(today);
        limitDate.setDate(limitDate.getDate() + 7);

        let emAndamento = 0;
        let concluidas = 0;
        let emRisco = 0;
        let semAtualizacao = 0;
        let prazoProximoVencido = 0;

        acoesFiltradas.forEach(a => {
            if (a.status === 'EM_ANDAMENTO') emAndamento++;
            if (a.status === 'CONCLUIDA') concluidas++;
            if (a.status === 'EM_RISCO') emRisco++;

            const lastUpdate = new Date(a.last_manual_update_at || a.created_at || now);
            const diffDaysUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
            if (diffDaysUpdate > 15) semAtualizacao++;

            if (a.prazo && a.status !== 'CONCLUIDA') {
                const prazoDate = new Date(`${a.prazo}T12:00:00`);
                if (prazoDate < today || (prazoDate >= today && prazoDate <= limitDate)) {
                    prazoProximoVencido++;
                }
            }
        });

        return {
            total: acoesFiltradas.length,
            emAndamento,
            concluidas,
            emRisco,
            semAtualizacao,
            prazoProximoVencido
        };
    }, [acoesFiltradas]);

    const getStatusBadge = (status) => {
        const styles = {
            'CONCLUIDA': { label: 'Concluída', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857', border: 'rgba(16, 185, 129, 0.4)' },
            'EM_ANDAMENTO': { label: 'Em Andamento', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8', border: 'rgba(59, 130, 246, 0.4)' },
            'EM_RISCO': { label: 'Em Risco', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.4)' },
            'PARALISADA': { label: 'Paralisada', bg: 'rgba(245, 158, 11, 0.18)', color: '#b45309', border: 'rgba(245, 158, 11, 0.4)' },
            'NAO_INICIADA': { label: 'Não Iniciada', bg: 'rgba(148, 163, 184, 0.18)', color: '#334155', border: 'rgba(148, 163, 184, 0.4)' },
            'CANCELADA': { label: 'Cancelada', bg: 'rgba(71, 85, 105, 0.18)', color: '#1e293b', border: 'rgba(71, 85, 105, 0.4)' },
            'EM_PLANEJAMENTO': { label: 'Em planejamento', bg: 'rgba(148, 163, 184, 0.18)', color: '#334155', border: 'rgba(148, 163, 184, 0.4)' },
            'PENDENTE': { label: 'Pendente', bg: 'rgba(245, 158, 11, 0.18)', color: '#b45309', border: 'rgba(245, 158, 11, 0.4)' }
        };
        const s = styles[status] || styles['NAO_INICIADA'];
        return (
            <span className="farmacia-badge" style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '5px 12px', fontWeight: 600 }}>
                {s.label}
            </span>
        );
    };

    const getProgressColor = (status, isDelayed) => {
        if (status === 'CONCLUIDA') return '#059669';
        if (status === 'EM_RISCO' || isDelayed) return '#dc2626';
        if (status === 'PARALISADA') return '#d97706';
        if (status === 'EM_ANDAMENTO') return '#2563eb';
        return '#64748b';
    };

    const getProgressGradient = (status, isDelayed) => {
        if (status === 'CONCLUIDA') return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
        if (status === 'EM_RISCO' || isDelayed) return 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
        if (status === 'PARALISADA') return 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
        if (status === 'EM_ANDAMENTO') return 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)';
        return 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)';
    };

    const formatSecretaria = (name) => {
        if (!name || name === 'Não informada') return { simplified: 'Não informada', full: '' };
        
        // Remove prefixos comuns para o nome curto
        let simplified = name.replace(/^Secretaria de /i, '').replace(/^Sec\. de /i, '').replace(/^Secretaria /i, '');
        
        // Garante que o nome completo tenha o prefixo correto
        let full = name;
        if (!name.toLowerCase().startsWith('secretaria')) {
            full = `Secretaria de ${name}`;
        }

        return { simplified, full };
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="farmacia-page-container">
            {/* Cabeçalho */}
            <header className="farmacia-page-header">
                <div>
                    <h1 className="farmacia-page-title">Ações Estratégicas</h1>
                    <p className="farmacia-page-subtitle">Monitore o progresso e execução das ações do plano de governo.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                        className="farmacia-btn-historico" 
                        onClick={openDeletionsHistory} 
                        disabled={loading}
                    >
                        <History size={16} />
                        Histórico de Exclusões
                    </button>
                    <button className="farmacia-btn-primary" onClick={() => openModal()} disabled={loading}>
                        <Plus size={18} /> Nova Ação
                    </button>
                </div>
            </header>

            {/* Animação spin e estilos para histórico de exclusões */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                
                /* Botão de Histórico de Exclusões Refinado */
                .farmacia-btn-historico {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 0.5rem 1.1rem;
                    height: 38px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    background-color: #ffffff;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                    transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                }
                .farmacia-btn-historico:hover:not(:disabled) {
                    background-color: #f8fafc;
                    border-color: #94a3b8;
                    color: #0f172a;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                }
                .farmacia-btn-historico:active:not(:disabled) {
                    transform: translateY(0);
                    background-color: #f1f5f9;
                }
                .farmacia-btn-historico:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                /* Card de Histórico de Exclusões Premium */
                .farmacia-deletions-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-left: 4px solid #94a3b8;
                    border-radius: 8px;
                    padding: 12px 16px;
                    transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                }
                .farmacia-deletions-card:hover {
                    background-color: #f8fafc;
                    border-color: #cbd5e1;
                    border-left-color: #3b82f6;
                    transform: translateY(-1.5px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
                }
            `}</style>

            {/* Estado de carregamento */}
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', gap: '0.5rem' }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem' }}>Carregando ações...</span>
                </div>
            )}

            {/* Cards Executivos */}
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #64748b' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Ações</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.total}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #3b82f6' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Andamento</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{metrics.emAndamento}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #10b981' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concluídas</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{metrics.concluidas}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #ef4444' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Risco</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{metrics.emRisco}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #f59e0b' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sem Atualização</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{metrics.semAtualizacao}</span>
                    </div>
                    <div className="farmacia-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid #d946ef' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo Próximo/Vencido</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d946ef' }}>{metrics.prazoProximoVencido}</span>
                    </div>
                </div>
            )}

            {/* Container Principal (Filtros + Tabela) */}
            <div className="farmacia-card" style={{ padding: 0, overflow: 'visible', background: '#ffffff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                {/* Toolbar de Filtros */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="farmacia-toolbar">
                        <div className="farmacia-search-box" style={{ maxWidth: '300px' }}>
                            <Search size={16} className="farmacia-search-icon" />
                            <input
                                type="text"
                                className="farmacia-search-input"
                                placeholder="Buscar ação ou local..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />
                        </div>

                        <div className="farmacia-select-wrapper status-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                            <select 
                                className="farmacia-filter-select" 
                                style={{ width: '100%' }}
                                value={statusFiltro}
                                onChange={(e) => setStatusFiltro(e.target.value)}
                            >
                                <option value="Todos">Status: Todos</option>
                                <option value="EM_ANDAMENTO">Em Andamento</option>
                                <option value="CONCLUIDA">Concluída</option>
                                <option value="EM_RISCO">Em Risco</option>
                                <option value="PARALISADA">Paralisada</option>
                                <option value="NAO_INICIADA">Não Iniciada</option>
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>

                        <div className="farmacia-select-wrapper secretaria-wrapper" style={{ minWidth: '180px', position: 'relative' }}>
                            <select 
                                className="farmacia-filter-select" 
                                style={{ width: '100%' }}
                                value={secretariaFiltro}
                                onChange={(e) => setSecretariaFiltro(e.target.value)}
                            >
                                <option value="Todas">Secretaria: Todas</option>
                                {filteredSecretariats.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>

                        <div className="farmacia-select-wrapper tipo-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                            <select 
                                className="farmacia-filter-select" 
                                style={{ width: '100%' }}
                                value={tipoFiltro}
                                onChange={(e) => setTipoFiltro(e.target.value)}
                            >
                                <option value="Todos">Tipo: Todos</option>
                                {PLANNING_ACTION_TYPES_ARRAY.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>

                        <div className="farmacia-select-wrapper eixo-wrapper" style={{ minWidth: '160px', position: 'relative' }}>
                            <select className="farmacia-filter-select" style={{ width: '100%' }}>
                                <option value="Todos">Eixo: Todos</option>
                                {axes.map(ax => (
                                    <option key={ax.id} value={ax.name}>{ax.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        </div>
                    </div>
                </div>

                {/* Listagem */}
                <style>{`
                @media (min-width: 1024px) {
                    .farmacia-toolbar {
                        display: flex !important;
                        flex-flow: row nowrap !important;
                        align-items: center !important;
                        gap: 8px !important;
                        width: 100% !important;
                    }
                    .farmacia-search-box {
                        flex: 2 1 0% !important;
                        max-width: none !important;
                    }
                    .status-wrapper {
                        flex: 1 1 0% !important;
                        min-width: 120px !important;
                        max-width: 160px !important;
                    }
                    .secretaria-wrapper {
                        flex: 1.5 1 0% !important;
                        min-width: 160px !important;
                        max-width: 220px !important;
                    }
                    .tipo-wrapper {
                        flex: 1 1 0% !important;
                        min-width: 120px !important;
                        max-width: 160px !important;
                    }
                    .eixo-wrapper {
                        flex: 1 1 0% !important;
                        min-width: 120px !important;
                        max-width: 160px !important;
                    }
                }
                .farmacia-table thead th { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 600; padding-top: calc(14px + 1rem); padding-bottom: 14px; position: sticky; top: -1rem; z-index: 20; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
                .farmacia-table tbody td { padding-top: 16px; padding-bottom: 16px; }
                .farmacia-table tbody tr { transition: all 0.2s ease; }
                .farmacia-table tbody tr:hover { background-color: #f8fafc !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); z-index: 10; position: relative; }
                .farmacia-table tbody tr:hover .farmacia-action-icon { opacity: 1 !important; background: rgba(0,0,0,0.03); }
                .farmacia-action-icon { opacity: 0.5; transition: all 0.2s ease; }
                .farmacia-action-icon:hover { transform: scale(1.1); background: rgba(0,0,0,0.06) !important; }
                @keyframes fillBar { from { width: 0; } }
                `}</style>
                <div className="farmacia-table-wrapper" style={{ border: 'none', boxShadow: 'none', margin: 0, borderRadius: '0 0 10px 10px' }}>
                <table className="farmacia-table">
                    <colgroup>
                        <col style={{ width: '25%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('nome')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Ação
                                    {renderSortIcon('nome')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('secretaria')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Secretaria
                                    {renderSortIcon('secretaria')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Status
                                    {renderSortIcon('status')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('progresso')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Progresso
                                    {renderSortIcon('progresso')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('prazo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Prazo
                                    {renderSortIcon('prazo')}
                                </div>
                            </th>
                            <th>Responsável</th>
                            <th style={{ textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acoesFiltradas.map((acao) => {
                            const sec = formatSecretaria(acao.secretaria);
                            
                            // 2. Inteligência de prazo
                            let isDelayed = false;
                            let isVencido = false;
                            let prazoUI = null;
                            if (acao.prazo && acao.status !== 'CONCLUIDA') {
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const pDate = new Date(`${acao.prazo}T12:00:00`);
                                pDate.setHours(0,0,0,0);
                                const diffDays = Math.ceil((pDate - today) / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                    isDelayed = true;
                                    isVencido = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Atrasado há {Math.abs(diffDays)} dia{Math.abs(diffDays)>1?'s':''}</span>;
                                } else if (diffDays === 0) {
                                    isDelayed = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Vence hoje</span>;
                                } else if (diffDays < 7) {
                                    isDelayed = true;
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#ef4444', fontWeight:600, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                } else if (diffDays <= 30) {
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'#d97706', fontWeight:600, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                } else {
                                    prazoUI = <span style={{fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500, marginTop:'2px'}}>Faltam {diffDays} dias</span>;
                                }
                            }

                            // 3. Fundo sutil aplicado APENAS para casos críticos (EM RISCO ou PRAZO VENCIDO)
                            let rowBg = 'transparent';
                            if (acao.status === 'EM_RISCO' || isVencido) {
                                rowBg = 'rgba(239, 68, 68, 0.012)'; // Opacidade ultra-sutil reduzida
                            }

                            // 1 & 5. Inteligência de barra de progresso
                            const pbColor = getProgressColor(acao.status, isDelayed);
                            const pbGradient = getProgressGradient(acao.status, isDelayed);

                            return (
                                <tr key={acao.id} style={{ backgroundColor: rowBg }}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem', cursor: 'default' }}>{acao.nome}</span>
                                                {getActionTypeBadge(acao.action_type)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {acao.eixo && <span>{acao.eixo}</span>}
                                                {acao.eixo && acao.local && <span>&bull;</span>}
                                                {acao.local && <span style={{ fontWeight: 400 }}>{acao.local}</span>}
                                            </div>
                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div 
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                                    onClick={(e) => { e.stopPropagation(); navigate('/planejamento/atualizacoes', { state: { acaoId: acao.id } }); }}
                                                >
                                                    <History size={10} style={{ color: '#64748b' }} />
                                                    {!acao.update_count || acao.update_count === 0 
                                                        ? 'Sem atualizações' 
                                                        : `${acao.update_count} ${acao.update_count === 1 ? 'Atualização' : 'Atualizações'}`}
                                                </div>
                                                {acao.last_manual_update_at && (
                                                    <span 
                                                        style={{ fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer' }}
                                                        onClick={(e) => { e.stopPropagation(); navigate('/planejamento/atualizacoes', { state: { acaoId: acao.id } }); }}
                                                    >
                                                        Última: {new Date(acao.last_manual_update_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                     <td>
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                             <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{sec.simplified}</span>
                                             {acao.participantes && acao.participantes.length > 0 && (
                                                 <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                     <span style={{fontWeight: 600}}>Participantes:</span> {acao.participantes.join(', ')}
                                                 </span>
                                             )}
                                         </div>
                                     </td>
                                     <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                            {getStatusBadge(acao.status)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: pbColor }}>
                                                <span>{Math.round(getDisplayProgress(acao))}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div 
                                                    style={{ 
                                                        width: `${Math.round(getDisplayProgress(acao))}%`, 
                                                        height: '100%', 
                                                        background: pbGradient,
                                                        animation: 'fillBar 0.6s ease-out forwards'
                                                    }} 
                                                />
                                            </div>
                                            {acao.action_type === 'ACAO_PONTUAL' && acao.custom_stages && acao.custom_stages.length > 0 && acao.current_stage_index !== null && (
                                                <div 
                                                    title={`Etapa atual: ${acao.custom_stages[acao.current_stage_index]?.name || 'Não definida'}`}
                                                    style={{ 
                                                        fontSize: '0.65rem', 
                                                        color: '#64748b', 
                                                        marginTop: '2px',
                                                        maxWidth: '180px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    Etapa atual: <span style={{ fontWeight: 600 }}>{acao.custom_stages[acao.current_stage_index]?.name || 'Não definida'}</span>
                                                </div>
                                            )}
                                            {(() => {
                                                if (acao.status === 'CONCLUIDA' || Math.round(getDisplayProgress(acao)) >= 100) {
                                                    return null;
                                                }
                                                const delay = getUpdateDelayStatus(acao);
                                                const hasManual = !!acao.last_manual_update_at;
                                                
                                                let color = '#64748b'; // Slate (Padrão Saudável)
                                                let Icon = Clock;
                                                let text = '';
                                                
                                                if (hasManual && delay.days <= 7) {
                                                    // STATUS SAUDÁVEL (Atualizada)
                                                    color = '#10b981'; // Verde suave
                                                    Icon = CheckCircle2;
                                                    text = delay.days === 0 ? 'Atualizada hoje' : `Atualizada há ${delay.days} dia${delay.days !== 1 ? 's' : ''}`;
                                                } else if (delay.days <= 7) {
                                                    // STATUS SAUDÁVEL (Sem atualização)
                                                    color = '#64748b'; // Slate cinza elegante
                                                    Icon = Clock;
                                                    text = `Sem atualização há ${delay.days} dia${delay.days !== 1 ? 's' : ''}`;
                                                } else if (delay.days <= 14) {
                                                    // STATUS DE ATENÇÃO MODERADA (8–14 dias)
                                                    color = '#f59e0b'; // Amber suave / laranja leve
                                                    Icon = Clock;
                                                    text = `Sem atualização há ${delay.days} dia${delay.days !== 1 ? 's' : ''}`;
                                                } else if (delay.days <= 20) {
                                                    // STATUS DE ATENÇÃO ALTA (15–20 dias)
                                                    color = '#ea580c'; // Laranja forte
                                                    Icon = Clock;
                                                    text = `Sem atualização há ${delay.days} dia${delay.days !== 1 ? 's' : ''}`;
                                                } else {
                                                    // STATUS CRÍTICO (21+ dias)
                                                    color = '#dc2626'; // Vermelho crítico
                                                    Icon = AlertTriangle;
                                                    text = `Sem atualização há ${delay.days} dia${delay.days !== 1 ? 's' : ''}`;
                                                }

                                                return (
                                                    <div 
                                                        title={text}
                                                        style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '4px', 
                                                            fontSize: '0.65rem', 
                                                            fontWeight: 600, 
                                                            color: color, 
                                                            opacity: 0.95,
                                                            whiteSpace: 'nowrap',
                                                            cursor: 'help',
                                                            marginTop: '2px'
                                                        }}
                                                    >
                                                        <Icon size={11} style={{ flexShrink: 0, opacity: 0.8 }} /> {text}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                     <td>
                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                             <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isDelayed ? '#ef4444' : 'var(--text)' }}>
                                                 <Calendar size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
                                                 <span style={{ fontWeight: 600 }}>{formatDate(acao.prazo)}</span>
                                             </div>
                                             {prazoUI}
                                         </div>
                                     </td>
                                     <td>
                                         <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{acao.responsavel || 'Não informado'}</span>
                                     </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button className="farmacia-action-icon" style={{ padding: '4px' }} onClick={(e) => { e.stopPropagation(); navigate('/planejamento/atualizacoes', { state: { openModal: 'nova-atualizacao', acaoId: acao.id } }); }}>
                                                <Plus size={16} />
                                                <span className="premium-tooltip">Nova Atualização</span>
                                            </button>
                                            <button className="farmacia-action-icon" style={{ padding: '4px' }} onClick={() => openViewModal(acao)}>
                                                <Eye size={16} />
                                                <span className="premium-tooltip">Visualizar</span>
                                            </button>
                                            <button className="farmacia-action-icon" style={{ padding: '4px' }} onClick={() => openModal(acao)}>
                                                <Edit2 size={16} />
                                                <span className="premium-tooltip">Editar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            </div> {/* Fecha o Container Principal */}

            {/* Modal de Ação */}
            {isModalOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{
                        maxWidth: '800px',
                        width: '95%',
                        boxShadow: '0 20px 60px -16px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15,23,42,0.05)'
                    }}>
                        {/* Header */}
                        <div className="farmacia-modal-header" style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px',
                                    background: 'rgba(0,150,125,0.08)', border: '1px solid rgba(0,150,125,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <Target size={16} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>
                                        {editingAcao ? 'Editar Ação Estratégica' : 'Nova Ação Estratégica'}
                                    </h2>
                                    <p className="farmacia-modal-subtitle" style={{ marginTop: '1px' }}>
                                        {editingAcao ? 'Atualize as informações da ação selecionada.' : 'Preencha os dados para registrar uma nova iniciativa.'}
                                    </p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={closeModal}>
                                <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            {/* Body com scroll */}
                            <div className="farmacia-modal-body" style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* ── Bloco: Informações Gerais ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(0,150,125,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <Target size={13} color="var(--color-primary)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
                                            Informações Gerais
                                        </span>
                                    </div>
                                    <div className="farmacia-modal-grid" style={{ gap: '0.875rem' }}>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Nome da Ação</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Reforma da Praça Central"
                                                required
                                                value={formData.nome}
                                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Tipo da Ação</label>
                                            <select
                                                className="farmacia-form-select"
                                                required
                                                value={formData.action_type}
                                                onChange={e => {
                                                    const newType = e.target.value;
                                                    let newProgress = formData.progresso;
                                                    if (newType === 'PROJETO' || newType === 'OBRA' || newType === 'ACAO_PONTUAL') {
                                                        newProgress = 0;
                                                    }
                                                    setFormData({ 
                                                        ...formData, 
                                                        action_type: newType, 
                                                        progresso: newProgress,
                                                        custom_stages: null,
                                                        current_stage_index: null
                                                    });
                                                }}
                                            >
                                                {PLANNING_ACTION_TYPES_ARRAY.map(type => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Eixo Estratégico</label>
                                            <select
                                                className="farmacia-form-select"
                                                value={formData.axisId}
                                                onChange={e => {
                                                    const axis = axes.find(a => a.id === e.target.value);
                                                    setFormData({ ...formData, axisId: e.target.value, eixo: axis?.name || '' });
                                                }}
                                            >
                                                <option value="">Selecione o eixo...</option>
                                                {[...axes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Secretaria Responsável (Principal)</label>
                                            <select
                                                className="farmacia-form-select"
                                                value={formData.secretariatId}
                                                onChange={e => {
                                                    const secId = e.target.value;
                                                    const sec = secretariats.find(s => s.id === secId);
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        secretariatId: secId, 
                                                        secretaria: sec?.name || '',
                                                        participantes: (prev.participantes || []).filter(id => id !== secId)
                                                    }));
                                                }}
                                            >
                                                <option value="">Selecione a secretaria...</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="farmacia-form-group col-span-2">
                                            <label className="farmacia-form-label">Secretarias Participantes</label>
                                            <div style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', padding: '12px 14px' }}>
                                                {(() => {
                                                    const filtered = secretariats
                                                        .filter(s => s.id !== formData.secretariatId)
                                                        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                                                    if (filtered.length === 0) {
                                                        return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Selecione a Secretaria Responsável primeiro.</span>;
                                                    }

                                                    // Dividir a lista em 3 colunas balanceadas
                                                    const total = filtered.length;
                                                    const perCol = Math.ceil(total / 3);
                                                    const col1 = filtered.slice(0, perCol);
                                                    const col2 = filtered.slice(perCol, perCol * 2);
                                                    const col3 = filtered.slice(perCol * 2);

                                                    const renderCol = (items) => items.map(s => (
                                                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer', color: '#334155', marginBottom: '6px' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={formData.participantes?.includes(s.id) || false}
                                                                onChange={(e) => {
                                                                    const isChecked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        participantes: isChecked 
                                                                            ? [...(prev.participantes || []), s.id]
                                                                            : (prev.participantes || []).filter(id => id !== s.id)
                                                                    }));
                                                                }}
                                                                style={{ accentColor: 'var(--color-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                                                            />
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                                        </label>
                                                    ));

                                                    return (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>{renderCol(col1)}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>{renderCol(col2)}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>{renderCol(col3)}</div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="farmacia-form-group col-span-2">
                                            <label className="farmacia-form-label">Descrição</label>
                                            <textarea
                                                className="farmacia-form-textarea"
                                                rows="2"
                                                placeholder="Detalhe o objetivo desta ação..."
                                                value={formData.descricao}
                                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Execução ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(139,92,246,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <Activity size={13} color="#8b5cf6" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6' }}>
                                            Execução e Monitoramento
                                        </span>
                                    </div>
                                    {getActionTypeStages(formData.action_type) ? (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Etapa Atual</label>
                                                    <select
                                                        className="farmacia-form-select"
                                                        value={getClosestStep(formData.progresso, getActionTypeStages(formData.action_type))}
                                                        onChange={e => {
                                                            const stages = getActionTypeStages(formData.action_type);
                                                            if (!stages) return;
                                                            const selectedStep = stages.find(s => s.label === e.target.value);
                                                            if (selectedStep) {
                                                                setFormData({ ...formData, progresso: selectedStep.progress });
                                                            } else {
                                                                setFormData({ ...formData, progresso: 0 });
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Selecione a etapa...</option>
                                                        {getActionTypeStages(formData.action_type)?.map(step => (
                                                            <option key={step.label} value={step.label}>
                                                                {step.label} ({step.progress}%)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Responsável Técnico</label>
                                                    <input
                                                        type="text"
                                                        className="farmacia-form-input"
                                                        placeholder="Nome do responsável"
                                                        value={formData.responsible_name}
                                                        onChange={e => setFormData({ ...formData, responsible_name: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Observação</label>
                                                    <input
                                                        type="text"
                                                        className="farmacia-form-input"
                                                        placeholder="Observação da etapa atual"
                                                        value={formData.current_stage_observation || ''}
                                                        onChange={e => setFormData({ ...formData, current_stage_observation: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '4px', marginBottom: '2px', width: '100%' }}>
                                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', display: 'block', opacity: 0.8, letterSpacing: '0.015em' }}>
                                                    Status calculado automaticamente conforme a etapa atual.
                                                </span>
                                            </div>

                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progresso da Ação</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>{formData.progresso || 0}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                                                    <div style={{ 
                                                        width: `${formData.progresso || 0}%`, 
                                                        height: '100%', 
                                                        background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', 
                                                        borderRadius: '10px',
                                                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 1px 2px rgba(139, 92, 246, 0.2)'
                                                    }} />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                        <div style={{ display: 'grid', gridTemplateColumns: formData.action_type === 'ACAO_PONTUAL' ? '1fr' : formData.action_type === 'AQUISICAO' ? '1fr 1fr' : '1fr 0.8fr 1fr', gap: '0.875rem' }}>
                                            {formData.action_type !== 'ACAO_PONTUAL' && (
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Status Atual</label>
                                                    {formData.action_type === 'AQUISICAO' ? (
                                                        <select className="farmacia-form-select" value={formData.status} onChange={e => {
                                                            const val = e.target.value;
                                                            const pMap = { 'EM_PLANEJAMENTO': 10, 'EM_ANDAMENTO': 50, 'PENDENTE': 25, 'CONCLUIDA': 100 };
                                                            setFormData({ ...formData, status: val, progresso: pMap[val] || 0 });
                                                        }}>
                                                            <option value="EM_PLANEJAMENTO">Em planejamento</option>
                                                            <option value="EM_ANDAMENTO">Em andamento</option>
                                                            <option value="PENDENTE">Pendente</option>
                                                            <option value="CONCLUIDA">Concluído</option>
                                                        </select>
                                                    ) : (
                                                        <select className="farmacia-form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                            <option value="NAO_INICIADA">Não Iniciada</option>
                                                            <option value="EM_ANDAMENTO">Em Andamento</option>
                                                            <option value="CONCLUIDA">Concluída</option>
                                                            <option value="EM_RISCO">Em Risco</option>
                                                            <option value="PARALISADA">Paralisada</option>
                                                        </select>
                                                    )}
                                                </div>
                                            )}
                                            {formData.action_type !== 'AQUISICAO' && formData.action_type !== 'ACAO_PONTUAL' && (
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Progresso (%)</label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <input
                                                                type="range"
                                                                min="0" max="100"
                                                                value={formData.progresso || 0}
                                                                disabled={formData.action_type === 'ACAO_PONTUAL'}
                                                                onChange={e => setFormData({ ...formData, progresso: parseInt(e.target.value) || 0 })}
                                                                style={{
                                                                    flex: 1,
                                                                    height: '6px',
                                                                    borderRadius: '4px',
                                                                    background: `linear-gradient(to right, ${formData.progresso <= 25 ? '#ef4444' : formData.progresso <= 60 ? '#3b82f6' : formData.progresso <= 85 ? '#f59e0b' : '#10b981'} ${formData.progresso || 0}%, #e2e8f0 ${formData.progresso || 0}%)`,
                                                                    outline: 'none',
                                                                    cursor: formData.action_type === 'ACAO_PONTUAL' ? 'not-allowed' : 'pointer',
                                                                    opacity: formData.action_type === 'ACAO_PONTUAL' ? 0.6 : 1
                                                                }}
                                                                className="modern-range-slider"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="farmacia-form-input"
                                                                min="0" max="100"
                                                                disabled={formData.action_type === 'ACAO_PONTUAL'}
                                                                style={{ width: '64px', padding: '0.4rem', textAlign: 'center', fontWeight: 600, backgroundColor: formData.action_type === 'ACAO_PONTUAL' ? '#f8fafc' : 'white', color: formData.action_type === 'ACAO_PONTUAL' ? '#94a3b8' : 'inherit' }}
                                                                value={formData.progresso || 0}
                                                                onChange={e => {
                                                                    let val = parseInt(e.target.value) || 0;
                                                                    if (val > 100) val = 100;
                                                                    if (val < 0) val = 0;
                                                                    setFormData({ ...formData, progresso: val });
                                                                }}
                                                            />
                                                        </div>
                                                        {formData.action_type === 'ACAO_PONTUAL' && (
                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '-4px', fontStyle: 'italic' }}>
                                                                Calculado automaticamente pela etapa atual
                                                            </span>
                                                        )}
                                                        <style>{`
                                                            .modern-range-slider {
                                                                -webkit-appearance: none;
                                                                appearance: none;
                                                            }
                                                            .modern-range-slider::-webkit-slider-thumb {
                                                                -webkit-appearance: none;
                                                                appearance: none;
                                                                width: 16px;
                                                                height: 16px;
                                                                border-radius: 50%;
                                                                background: #fff;
                                                                border: 2px solid ${formData.progresso <= 25 ? '#ef4444' : formData.progresso <= 60 ? '#3b82f6' : formData.progresso <= 85 ? '#f59e0b' : '#10b981'};
                                                                cursor: pointer;
                                                                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                                                transition: transform 0.1s ease;
                                                            }
                                                            .modern-range-slider::-webkit-slider-thumb:hover {
                                                                transform: scale(1.15);
                                                            }
                                                            .modern-range-slider::-moz-range-thumb {
                                                                width: 16px;
                                                                height: 16px;
                                                                border-radius: 50%;
                                                                background: #fff;
                                                                border: 2px solid ${formData.progresso <= 25 ? '#ef4444' : formData.progresso <= 60 ? '#3b82f6' : formData.progresso <= 85 ? '#f59e0b' : '#10b981'};
                                                                cursor: pointer;
                                                                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                                                                transition: transform 0.1s ease;
                                                            }
                                                            .modern-range-slider::-moz-range-thumb:hover {
                                                                transform: scale(1.15);
                                                            }
                                                        `}</style>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="farmacia-form-group">
                                                <label className="farmacia-form-label">Responsável Técnico</label>
                                                <input
                                                    type="text"
                                                    className="farmacia-form-input"
                                                    placeholder="Nome do responsável"
                                                    value={formData.responsible_name}
                                                    onChange={e => setFormData({ ...formData, responsible_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                            <div className="farmacia-form-group">
                                                <label className="farmacia-form-label">Observação</label>
                                                <input
                                                    type="text"
                                                    className="farmacia-form-input"
                                                    placeholder="Observação da etapa atual"
                                                    value={formData.current_stage_observation || ''}
                                                    onChange={e => setFormData({ ...formData, current_stage_observation: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                    )}
                                    {formData.action_type === 'ACAO_PONTUAL' && (
                                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                                                    Configuração das Etapas
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
                                                O progresso será calculado automaticamente conforme a etapa atual selecionada.
                                            </p>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                                                <div className="farmacia-form-group">
                                                    <label className="farmacia-form-label">Quantidade de etapas</label>
                                                    <select 
                                                        className="farmacia-form-select"
                                                        value={formData.custom_stages?.length || ''}
                                                        onChange={e => {
                                                            const qty = parseInt(e.target.value);
                                                            if (!qty) {
                                                                setFormData({ ...formData, custom_stages: null, current_stage_index: null, progresso: 0 });
                                                                return;
                                                            }
                                                            const newStages = Array.from({ length: qty }).map((_, i) => {
                                                                const prog = Math.round(((i + 1) / qty) * 100);
                                                                const existingName = formData.custom_stages && formData.custom_stages[i] ? formData.custom_stages[i].name : `Etapa ${i + 1}`;
                                                                return { name: existingName, progress: prog };
                                                            });
                                                            setFormData({ ...formData, custom_stages: newStages, current_stage_index: null, progresso: 0 });
                                                        }}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {[2,3,4,5,6,7,8,9,10].map(n => (
                                                            <option key={n} value={n}>{n} etapas</option>
                                                        ))}
                                                    </select>

                                                    {formData.custom_stages && formData.custom_stages.length > 0 && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                                                            <div className="farmacia-form-group">
                                                                <label className="farmacia-form-label">Etapa Atual</label>
                                                                <select 
                                                                    className="farmacia-form-select"
                                                                    value={formData.current_stage_index !== null ? formData.current_stage_index : ''}
                                                                    onChange={e => {
                                                                        const idxStr = e.target.value;
                                                                        if (idxStr === '') {
                                                                            setFormData({ ...formData, current_stage_index: null, progresso: 0 });
                                                                            return;
                                                                        }
                                                                        const idx = parseInt(idxStr);
                                                                        const progress = formData.custom_stages[idx].progress;
                                                                        setFormData({ ...formData, current_stage_index: idx, progresso: progress });
                                                                    }}
                                                                >
                                                                    <option value="">Selecione a etapa...</option>
                                                                    {formData.custom_stages.map((stage, idx) => (
                                                                        <option key={idx} value={idx}>{stage.name} ({stage.progress}%)</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="farmacia-form-group">
                                                                <label className="farmacia-form-label">Observação</label>
                                                                <input
                                                                    type="text"
                                                                    className="farmacia-form-input"
                                                                    placeholder="Observação da etapa atual"
                                                                    value={formData.current_stage_observation || ''}
                                                                    onChange={e => setFormData({ ...formData, current_stage_observation: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {formData.custom_stages && formData.custom_stages.length > 0 && (
                                                    <div>
                                                        <label className="farmacia-form-label" style={{ marginBottom: '0.5rem' }}>Nomes das Etapas</label>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                            {formData.custom_stages.map((stage, idx) => (
                                                                <input
                                                                    key={idx}
                                                                    type="text"
                                                                    className="farmacia-form-input"
                                                                    value={stage.name}
                                                                    onChange={e => {
                                                                        const newStages = [...formData.custom_stages];
                                                                        newStages[idx].name = e.target.value;
                                                                        setFormData({ ...formData, custom_stages: newStages });
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {formData.custom_stages && formData.custom_stages.length > 0 && formData.current_stage_index !== null && (
                                                <div style={{ marginTop: '1.25rem', paddingTop: '1.1rem', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progresso Automático</span>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>{formData.progresso || 0}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ 
                                                            width: `${formData.progresso || 0}%`, 
                                                            height: '100%', 
                                                            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', 
                                                            borderRadius: '10px',
                                                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            boxShadow: '0 1px 2px rgba(139, 92, 246, 0.2)'
                                                        }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* ── Bloco: Planejamento ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(59,130,246,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <Calendar size={13} color="#3b82f6" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6' }}>
                                            Planejamento
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Data Início</label>
                                            <input type="date" className="farmacia-form-input" value={formData.data_inicio} onChange={e => setFormData({ ...formData, data_inicio: e.target.value })} />
                                        </div>
                                        <div className="farmacia-form-group">
                                            <label className="farmacia-form-label">Data Término</label>
                                            <input type="date" className="farmacia-form-input" value={formData.prazo} onChange={e => setFormData({ ...formData, prazo: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Localização e Endereço ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(245,158,11,0.7)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <MapPin size={13} color="#f59e0b" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>
                                            Localização e Endereço
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.875rem' }}>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 8' }}>
                                            <label className="farmacia-form-label">Rua / Avenida</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Av. Governador Agamenon Magalhães"
                                                value={formData.address_street}
                                                onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 4' }}>
                                            <label className="farmacia-form-label">Número</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: 123 ou S/N"
                                                value={formData.address_number}
                                                onChange={e => setFormData({ ...formData, address_number: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 6' }}>
                                            <label className="farmacia-form-label">Complemento</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Sala A, Bloco 2"
                                                value={formData.address_complement}
                                                onChange={e => setFormData({ ...formData, address_complement: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 6' }}>
                                            <label className="farmacia-form-label">Bairro</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Centro"
                                                value={formData.address_district}
                                                onChange={e => setFormData({ ...formData, address_district: e.target.value, local: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 4' }}>
                                            <label className="farmacia-form-label">CEP</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: 55660-000"
                                                value={formData.address_zipcode}
                                                onChange={e => setFormData({ ...formData, address_zipcode: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 5' }}>
                                            <label className="farmacia-form-label">Cidade</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Bezerros"
                                                value={formData.address_city}
                                                onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 3' }}>
                                            <label className="farmacia-form-label">Estado</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: PE"
                                                value={formData.address_state}
                                                onChange={e => setFormData({ ...formData, address_state: e.target.value })}
                                            />
                                        </div>
                                        <div className="farmacia-form-group" style={{ gridColumn: 'span 12' }}>
                                            <label className="farmacia-form-label">Referência / Ponto de Referência</label>
                                            <input
                                                type="text"
                                                className="farmacia-form-input"
                                                placeholder="Ex: Próximo à Escola Municipal"
                                                value={formData.address_reference}
                                                onChange={e => setFormData({ ...formData, address_reference: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Observações ── */}
                                <div style={{
                                    background: 'hsl(220,20%,97%)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1.1rem 1.25rem',
                                    borderLeft: '3px solid rgba(100,116,139,0.6)',
                                    boxShadow: '0 1px 4px rgba(15,23,42,0.05)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '1rem' }}>
                                        <AlertTriangle size={13} color="#64748b" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                                            Observações
                                        </span>
                                    </div>
                                    <div className="farmacia-form-group">
                                        <textarea
                                            className="farmacia-form-textarea"
                                            rows="2"
                                            placeholder="Entraves, pendências ou informações relevantes..."
                                            value={formData.observacoes}
                                            onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Footer fixo */}
                            <div className="farmacia-modal-footer" style={{
                                borderTop: '1px solid var(--border)',
                                padding: '0.875rem 1.5rem',
                                gap: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '0.75rem' }}>
                                    {editingAcao && (
                                        <button
                                            type="button"
                                            className="farmacia-modal-btn-cancel"
                                            style={{
                                                backgroundColor: '#dc2626',
                                                borderColor: '#dc2626',
                                                color: '#ffffff',
                                                padding: '0.5rem 1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                opacity: deleteLoading ? 0.7 : 1,
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = '#b91c1c';
                                                e.currentTarget.style.borderColor = '#b91c1c';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = '#dc2626';
                                                e.currentTarget.style.borderColor = '#dc2626';
                                            }}
                                            onClick={() => setConfirmDeleteOpen(true)}
                                            disabled={saveLoading || deleteLoading}
                                        >
                                            <Trash2 size={14} />
                                            Excluir Ação
                                        </button>
                                    )}
                                    {saveError && (
                                    <span style={{ flex: 1, fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={14} /> {saveError}
                                    </span>
                                )}
                                </div>
                                <button type="button" className="farmacia-modal-btn-cancel" onClick={closeModal} disabled={saveLoading}>
                                    Cancelar
                                </button>
                                <button type="submit" className="farmacia-modal-btn-confirm" disabled={saveLoading || loadingObjectives} style={{
                                    padding: '0.55rem 1.5rem',
                                    fontSize: '0.875rem',
                                    boxShadow: '0 2px 8px rgba(0,150,125,0.25)',
                                    opacity: (saveLoading || loadingObjectives) ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    {(saveLoading || loadingObjectives) && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {editingAcao ? 'Salvar Alterações' : 'Criar Ação'}
                                </button>
                            </div>


                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal de Visualização (Somente Leitura) ── */}
            {isViewModalOpen && viewingAcao && (
                <div className="farmacia-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="farmacia-modal-content" style={{ 
                        maxWidth: '750px', 
                        width: '100%',
                        maxHeight: '85vh', 
                        borderTop: '4px solid #3b82f6',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden' 
                    }}>
                        {/* Header Fixo */}
                        <div className="farmacia-modal-header" style={{ flexShrink: 0, padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
                                    <Info size={18} color="#3b82f6" />
                                </div>
                                <div>
                                    <h2 className="farmacia-modal-title" style={{ fontSize: '1.1rem' }}>Detalhes da Ação</h2>
                                    <p className="farmacia-modal-subtitle">Informações consolidadas da ação estratégica</p>
                                </div>
                            </div>
                            <button className="farmacia-modal-close" onClick={closeViewModal}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Conteúdo Rolável */}
                        <div className="farmacia-modal-body custom-scrollbar" style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            padding: '1.25rem 1.75rem 2.5rem 1.75rem',
                            backgroundColor: '#fff'
                        }}>
                            <style>{`
                                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                                .history-header { transition: all 200ms ease; border-radius: 8px; padding: 8px 12px !important; margin: -8px -12px; display: flex; align-items: center; }
                                .history-header:hover { background-color: #f8fafc; }
                                .history-timeline-item {
                                    background: rgba(255, 255, 255, 0.7);
                                    border: 1px solid #e2e8f0;
                                    border-radius: 8px;
                                    padding: 12px 14px;
                                    transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
                                    box-shadow: 0 1px 2px rgba(0,0,0,0.01);
                                }
                                .history-timeline-item:hover {
                                    background: #ffffff;
                                    border-color: #cbd5e1;
                                    box-shadow: 0 4px 12px -4px rgba(0,0,0,0.06);
                                    transform: translateY(-1px);
                                }
                                .history-jump-btn {
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 6px 12px;
                                    border-radius: 6px;
                                    border: 1px solid #dbeafe;
                                    background: #eff6ff;
                                    color: #1d4ed8;
                                    font-size: 0.75rem;
                                    font-weight: 750;
                                    cursor: pointer;
                                    transition: all 150ms ease;
                                }
                                .history-jump-btn:hover {
                                    background: #dbeafe;
                                    border-color: #bfdbfe;
                                    transform: translateY(-1px);
                                    box-shadow: 0 2px 4px rgba(37,99,235,0.08);
                                }
                            `}</style>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                
                                {(() => {
                                    if (viewingAcao.status === 'CONCLUIDA' || Math.round(getDisplayProgress(viewingAcao)) >= 100) return null;
                                    const delay = getUpdateDelayStatus(viewingAcao);
                                    if (delay.days <= 7) return null; // Saudável, sem necessidade de banner invasivo
                                    
                                    if (delay.days <= 14) {
                                         // STATUS DE ATENÇÃO (8–14 dias)
                                         return (
                                             <div style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '10px',
                                                 backgroundColor: '#fffbeb',
                                                 border: '1px solid #fde68a',
                                                 borderRadius: '8px',
                                                 padding: '0.85rem 1.15rem',
                                                 color: '#b45309',
                                                 fontSize: '0.85rem',
                                                 fontWeight: 600,
                                                 boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                             }}>
                                                 <Clock size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                                                 <span>Esta ação está há {delay.days} dias sem atualização.</span>
                                             </div>
                                         );
                                     } else if (delay.days <= 20) {
                                         return (
                                             <div style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '10px',
                                                 backgroundColor: '#fff7ed',
                                                 border: '1px solid #ffedd5',
                                                 borderRadius: '8px',
                                                 padding: '0.85rem 1.15rem',
                                                 color: '#c2410c',
                                                 fontSize: '0.85rem',
                                                 fontWeight: 600,
                                                 boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                             }}>
                                                 <Clock size={16} color="#ea580c" style={{ flexShrink: 0 }} />
                                                 <span>Esta ação está há {delay.days} dias sem atualização.</span>
                                             </div>
                                         );
                                     } else {
                                         // STATUS CRÍTICO (15+ dias)
                                         return (
                                             <div style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '10px',
                                                 backgroundColor: '#fef2f2',
                                                 border: '1px solid #fca5a5',
                                                 borderRadius: '8px',
                                                 padding: '0.85rem 1.15rem',
                                                 color: '#dc2626',
                                                 fontSize: '0.85rem',
                                                 fontWeight: 700,
                                                 boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                             }}>
                                                 <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                                                 <span>Ação sem atualização há {delay.days} dias.</span>
                                             </div>
                                         );
                                     }
                                 })()}


                                {/* Cabeçalho Premium: Título e Status */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', 
                                    padding: '1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.4', margin: 0 }}>
                                            {viewingAcao.nome}
                                        </h3>
                                        <div style={{ flexShrink: 0 }}>
                                            {getStatusBadge(viewingAcao.status)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progresso da Ação</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>{getDisplayProgress(viewingAcao)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                                            <div style={{ 
                                                width: `${getDisplayProgress(viewingAcao)}%`, 
                                                height: '100%', 
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', 
                                                borderRadius: '10px',
                                                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 1px 2px rgba(139,92,246,0.2)'
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Bloco: Atualizações da Ação (Timeline Vertical) ── */}
                                {actionUpdates.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                                Atualizações da Ação
                                            </h4>
                                            <button 
                                                className="farmacia-btn-secondary" 
                                                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px', height: 'auto', backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                                onClick={() => {
                                                    closeViewModal();
                                                    navigate('/planejamento/atualizacoes', { state: { openModal: 'nova-atualizacao', acaoId: viewingAcao.id } });
                                                }}
                                            >
                                                <Plus size={12} /> Nova
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                                            {/* Linha guia vertical no fundo */}
                                            <div style={{ position: 'absolute', left: '11px', top: '10px', bottom: '10px', width: '2px', background: '#e2e8f0', zIndex: 0 }}></div>
                                            
                                            {actionUpdates.slice(0, 3).map((update, idx) => {
                                                const dt = new Date(update.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year: 'numeric', hour:'2-digit', minute:'2-digit' });
                                                
                                                // Resolver nome do usuário
                                                let rawResolvedName = '';
                                                if (update.updated_by === authUser?.id) {
                                                    rawResolvedName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || (authUser?.email ? authUser.email.split('@')[0] : '');
                                                }
                                                if (!rawResolvedName) {
                                                    rawResolvedName = usersMap[update.updated_by] || '';
                                                }
                                                const userDisplay = rawResolvedName ? formatUserDisplayName(rawResolvedName) : 'Usuário não identificado';

                                                return (
                                                    <div key={update.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1, marginBottom: '16px' }}>
                                                        {/* Dot da timeline */}
                                                        <div style={{ 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '50%', 
                                                            background: '#eff6ff', 
                                                            border: '2px solid #3b82f6', 
                                                            flexShrink: 0, 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            boxShadow: '0 0 0 4px #ffffff'
                                                        }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                                        </div>
                                                        
                                                        {/* Conteúdo */}
                                                        <div style={{ 
                                                            flex: 1, 
                                                            background: '#f8fafc', 
                                                            border: '1px solid #e2e8f0', 
                                                            borderRadius: '8px', 
                                                            padding: '12px 16px',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{dt}</span>
                                                                {update.progress_percent_snapshot !== null && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', opacity: 0.8 }}>
                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                                            {update.progress_percent_snapshot}% concluído
                                                                        </span>
                                                                        <div style={{ width: '40px', height: '3px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                                                            <div style={{ width: `${update.progress_percent_snapshot}%`, height: '100%', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', fontWeight: 500 }}>
                                                                {update.summary}
                                                            </div>
                                                            {update.details && (
                                                                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid #cbd5e1' }}>
                                                                    {update.details}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                                                                    Atualizado por <strong style={{ color: '#475569' }}>{userDisplay}</strong>
                                                                </span>
                                                                {update.status_snapshot && (
                                                                    <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
                                                                        Status alterado para: <strong style={{ color: '#0f172a' }}>{update.status_snapshot}</strong>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {actionUpdates.length > 3 && (
                                            <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '8px' }}>
                                                <button 
                                                    className="history-jump-btn" 
                                                    style={{ margin: '0 auto' }}
                                                    onClick={() => {
                                                        closeViewModal();
                                                        navigate('/planejamento/atualizacoes', { state: { acaoId: viewingAcao.id } });
                                                    }}
                                                >
                                                    Ver todas as atualizações ({actionUpdates.length})
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ 
                                        marginTop: '0.5rem', 
                                        padding: '2.5rem 1.5rem', 
                                        textAlign: 'center', 
                                        background: '#f8fafc', 
                                        borderRadius: '12px', 
                                        border: '1px dashed #cbd5e1', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '16px' 
                                    }}>
                                        <div style={{ 
                                            width: '56px', 
                                            height: '56px', 
                                            borderRadius: '50%', 
                                            background: '#e2e8f0', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            color: '#64748b',
                                            marginBottom: '2px' 
                                        }}>
                                            <MessageSquare size={24} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                                                Nenhuma atualização registrada
                                            </h5>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', maxWidth: '300px', lineHeight: '1.4' }}>
                                                Esta ação ainda não recebeu registros de acompanhamento.
                                            </p>
                                        </div>
                                        <button 
                                            className="farmacia-btn-primary" 
                                            style={{ 
                                                marginTop: '4px', 
                                                padding: '8px 16px', 
                                                fontSize: '0.8rem', 
                                                gap: '8px', 
                                                height: 'auto', 
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                closeViewModal();
                                                navigate('/planejamento/atualizacoes', { state: { openModal: 'nova-atualizacao', acaoId: viewingAcao.id } });
                                            }}
                                        >
                                            <Plus size={14} /> Registrar primeira atualização
                                        </button>
                                    </div>
                                )}
                                {/* Grid de Informações */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tipo da Ação</span>
                                            <div style={{ marginTop: '2px' }}>{getActionTypeBadge(viewingAcao.action_type)}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eixo Estratégico</span>
                                            <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{viewingAcao.eixo || 'Não informado'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Responsável Técnico</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {(viewingAcao.responsible_name || viewingAcao.responsavel || 'N').charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.responsible_name || viewingAcao.responsavel || 'Não informado'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secretaria Principal</span>
                                            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{viewingAcao.secretariaFull || viewingAcao.secretaria || 'Não informada'}</span>
                                            {viewingParticipantes && viewingParticipantes.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Participantes</span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {viewingParticipantes.map((part, idx) => (
                                                            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600, lineHeight: '1.2' }}>
                                                                {part}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Localização</span>
                                            <div style={{ marginTop: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <MapPin size={14} color="#64748b" style={{ flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                                                        {viewingAcao.address_street || viewingAcao.local || 'Rua/Local não informado'}{viewingAcao.address_number ? `, ${viewingAcao.address_number}` : ''}
                                                    </span>
                                                </div>
                                                <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {(viewingAcao.address_district || viewingAcao.address_city) && (
                                                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                                                            {viewingAcao.address_district || ''}{viewingAcao.address_district && viewingAcao.address_city ? ' - ' : ''}{viewingAcao.address_city || ''}{viewingAcao.address_state ? `/${viewingAcao.address_state}` : ''}
                                                        </span>
                                                    )}
                                                    {viewingAcao.address_zipcode && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CEP: {viewingAcao.address_zipcode}</span>}
                                                    {viewingAcao.address_reference && <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>Ref: {viewingAcao.address_reference}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Descrição Detalhada - Movida para cima */}
                                    <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Info size={14} /> Descrição Detalhada
                                        </span>
                                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                            {viewingAcao.descricao || 'Sem descrição detalhada cadastrada.'}
                                        </div>
                                    </div>
                                    {(() => {
                                        const currentProgress = getDisplayProgress(viewingAcao);
                                        let stageList = [];
                                        let currentIdx = null;
                                        
                                        if (viewingAcao.action_type === 'ACAO_PONTUAL') {
                                            if (typeof viewingAcao.custom_stages === 'string') {
                                                try { stageList = JSON.parse(viewingAcao.custom_stages); } catch(e) {}
                                            } else if (Array.isArray(viewingAcao.custom_stages)) {
                                                stageList = viewingAcao.custom_stages;
                                            }
                                            currentIdx = viewingAcao.current_stage_index;
                                        } else {
                                            stageList = getActionTypeStages(viewingAcao.action_type) || [];
                                            let best = -1;
                                            stageList.forEach((s, i) => { if (s.progress <= currentProgress) best = i; });
                                            currentIdx = best >= 0 ? best : null;
                                        }
                                        
                                        if (!stageList || stageList.length === 0) return null;
                                        
                                        const config = getActionTypeConfig ? getActionTypeConfig(viewingAcao.action_type) : null;
                                        const stageTitle = config?.label ? `Etapas — ${config.label}` : 'Progresso por Etapas';
                                        return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Activity size={14} /> {stageTitle}
                                            </span>
                                            <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '280px', overflowY: 'auto', padding: '8px' }} className="custom-scrollbar">
                                                    {stageList.map((stage, idx) => {
                                                        const isCurrent = currentIdx === idx;
                                                        const isCompleted = currentIdx !== null && idx < currentIdx;
                                                        let bgColor = 'transparent', borderColor = 'transparent', titleColor = '#94a3b8', progColor = '#94a3b8';
                                                        if (isCompleted) { bgColor = '#f0fdf4'; borderColor = '#bbf7d0'; titleColor = '#166534'; progColor = '#22c55e'; }
                                                        else if (isCurrent) { bgColor = '#eff6ff'; borderColor = '#bfdbfe'; titleColor = '#1e3a8a'; progColor = '#3b82f6'; }
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', backgroundColor: bgColor, borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {isCompleted ? <CheckCircle2 size={13} color="#22c55e" /> : <span style={{ fontSize: '0.78rem', fontWeight: 700, color: titleColor, width: '16px' }}>{idx + 1}.</span>}
                                                                        <span style={{ fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 500, color: titleColor }}>{stage.name}</span>
                                                                        {isCurrent && <span style={{ fontSize: '0.6rem', backgroundColor: '#bfdbfe', color: '#1e3a8a', padding: '1px 7px', borderRadius: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atual</span>}
                                                                    </div>
                                                                    {isCurrent && viewingAcao.current_stage_observation && (
                                                                        <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginLeft: '24px', opacity: 0.9 }}>
                                                                            "{viewingAcao.current_stage_observation}"
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: progColor, flexShrink: 0, marginLeft: '8px' }}>{stage.progress}%</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}



                                {/* Observações Importantes */}
                                {viewingAcao.observacoes && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '2px dashed #f1f5f9' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={14} /> Observações Importantes
                                        </span>
                                        <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '10px', border: '1px solid #fde68a', fontSize: '0.9rem', color: '#92400e', lineHeight: '1.6', boxShadow: '0 1px 3px rgba(251,191,36,0.1)' }}>
                                            {viewingAcao.observacoes}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>

                        {/* Footer Fixo */}
                        <div className="farmacia-modal-footer" style={{ 
                            flexShrink: 0,
                            padding: '1rem 1.75rem', 
                            borderTop: '1px solid #f1f5f9', 
                            display: 'flex', 
                            justifyContent: 'flex-end', 
                            gap: '10px',
                            background: '#fcfcfc',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px'
                        }}>
                            <button 
                                className="farmacia-btn-secondary" 
                                style={{ 
                                    padding: '0.5rem 1.25rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fff'
                                }} 
                                onClick={closeViewModal}
                            >
                                Fechar
                            </button>
                            <button 
                                className="farmacia-btn-primary" 
                                style={{ 
                                    padding: '0.5rem 1.25rem', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                                }}
                                onClick={() => {
                                    const targetAcao = viewingAcao;

                                    closeViewModal();
                                    setTimeout(() => openModal(targetAcao), 100);
                                }}
                            >
                                <Edit2 size={14} /> Editar Ação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão Operacional */}
            {confirmDeleteOpen && (
                <div className="farmacia-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}>
                    <div className="farmacia-modal-content" style={{ 
                        maxWidth: '400px', 
                        width: '100%',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        borderTop: '4px solid #dc2626',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        background: '#ffffff'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                            <div style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
                                <AlertTriangle size={20} color="#dc2626" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Confirmar Exclusão</h3>
                                <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.4', margin: 0 }}>
                                    Tem certeza que deseja excluir esta ação estratégica? 
                                    <strong style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontWeight: 500 }}>Esta operação não poderá ser desfeita.</strong>
                                </p>
                            </div>
                        </div>

                        {deleteError && (
                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} color="#dc2626" />
                                <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 500 }}>{deleteError}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <button 
                                className="farmacia-modal-btn-cancel" 
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} 
                                onClick={() => setConfirmDeleteOpen(false)}
                                disabled={deleteLoading}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                className="farmacia-modal-btn-confirm" 
                                style={{ 
                                    fontSize: '0.8rem', 
                                    padding: '0.5rem 1.25rem',
                                    backgroundColor: '#dc2626',
                                    borderColor: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: deleteLoading ? 0.7 : 1,
                                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteAcao();
                                }}
                                disabled={deleteLoading}
                            >
                                {deleteLoading && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                {deleteLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico de Exclusões */}
            {isDeletionsHistoryOpen && (
                <div className="farmacia-modal-overlay">
                    <div className="farmacia-modal" style={{ 
                        width: '100%', 
                        maxWidth: '640px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        background: '#ffffff',
                        animation: 'farmacia-modal-in 200ms cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div className="farmacia-modal-header" style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 className="farmacia-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Histórico de Exclusões</h2>
                                {!deletionsLoading && deletionsHistory.length > 0 && (
                                    <span style={{ 
                                        fontSize: '0.72rem', 
                                        fontWeight: 600, 
                                        color: '#475569', 
                                        backgroundColor: '#f1f5f9', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px',
                                        border: '1px solid #cbd5e1',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        height: '20px'
                                    }}>
                                        {deletionsHistory.length} {deletionsHistory.length === 1 ? 'exclusão registrada' : 'exclusões registradas'}
                                    </span>
                                )}
                            </div>
                            <button className="farmacia-modal-close" onClick={() => setIsDeletionsHistoryOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="farmacia-modal-body" style={{ maxHeight: '450px', overflowY: 'auto', padding: '1.5rem' }}>
                            {deletionsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: '#64748b' }} />
                                </div>
                            ) : deletionsHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                                    <History size={54} style={{ opacity: 0.3, marginBottom: '16px', strokeWidth: 1.5, color: '#64748b' }} />
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>Nenhuma exclusão registrada.</h3>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#94a3b8' }}>As exclusões realizadas aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {deletionsHistory.map(del => (
                                        <div key={del.id} className="farmacia-deletions-card">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#f8fafc',
                                                    color: '#64748b',
                                                    flexShrink: 0
                                                }}>
                                                    <History size={16} strokeWidth={2} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={del.action_title}>
                                                        {del.action_title}
                                                    </span>
                                                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        Excluído por: <strong style={{ color: '#475569', fontWeight: 550 }}>{getDisplayName(del, usersMap)}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ 
                                                fontSize: '0.78rem', 
                                                color: '#64748b', 
                                                backgroundColor: '#f8fafc',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #f1f5f9',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                alignSelf: 'center'
                                            }}>
                                                {formatDate(del.deleted_at.split('T')[0])} às {new Date(del.deleted_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback de Sucesso (Toast) */}
            {toast && (
                <div className="farmacia-toast farmacia-toast-global">
                    <CheckCircle2 size={15} /> {toast}
                </div>
            )}
        </div>
    );
};

export default AcoesList;
