import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Filter, MapPin, Landmark, Target, Activity, CheckCircle, AlertTriangle, ChevronRight, X, Users, HeartPulse, GraduationCap, TrendingUp, Building2, ShieldCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlanejamentoContext } from '../../utils/planejamentoAccess';
import { useAuth } from '../../context/AuthContext';
import { planejamentoService } from '../../services/api/planejamento.service';
import DistribuicaoAnualChart from './components/DistribuicaoAnualChart';
import './PlanejamentoEstrategico.css';

const TIMELINE_YEARS = [2024, 2025, 2026, 2027, 2028];

const PlanejamentoEstrategico = () => {
    const { tenantLink, scopes } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeEixo, setActiveEixo] = useState(null);
    const [expandedObjectiveId, setExpandedObjectiveId] = useState(null);
    const [showEmptyObjectives, setShowEmptyObjectives] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const contextPlanejamento = getPlanejamentoContext(tenantLink?.role, scopes);

    const [filters, setFilters] = useState({
        periodo: 'todos',
        eixoId: 'todos',
        secretariaId: contextPlanejamento.hasMultipleRestrictedSecretariats
            ? 'todas_minhas'
            : (contextPlanejamento.hasRestrictedAccess ? (contextPlanejamento.primarySecretariatId || 'nenhuma') : 'todas'),
        allowedSecretariatIds: contextPlanejamento.allowedSecretariatIds
    });

    useEffect(() => {
        if (contextPlanejamento.hasRestrictedAccess && !contextPlanejamento.hasMultipleRestrictedSecretariats && !contextPlanejamento.primarySecretariatId) {
            navigate('/planejamento/dashboard', { replace: true });
        }
    }, [contextPlanejamento, navigate]);

    const formatPercent = (value) => {
        if (value === null || value === undefined || isNaN(value)) return "0";
        const num = Number(value);
        if (isNaN(num)) return "0";
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(1).replace(/\.0$/, '');
    };

    const formatStatusLabel = (status) => {
        const labels = {
            'NAO_INICIADA': 'Não iniciada',
            'EM_ANDAMENTO': 'Em andamento',
            'CONCLUIDA': 'Concluída',
            'PARALISADA': 'Paralisada',
            'CANCELADA': 'Cancelada',
            'EM_RISCO': 'Em risco',
            'ATENCAO': 'Atenção'
        };
        return labels[status] || status;
    };

    const getProgressColor = (status) => {
        switch (status) {
            case 'CONCLUIDA': return '#15803d'; // verde forte
            case 'EM_ANDAMENTO': return '#22c55e'; // verde
            case 'ATENCAO': return '#eab308'; // amarelo
            case 'EM_RISCO': return '#ef4444'; // vermelho
            default: return '#94a3b8'; // cinza
        }
    };

    const getYear = (dateStr) => {
        if (!dateStr) return null;
        const match = String(dateStr).match(/^(\d{4})/);
        if (match) return parseInt(match[1], 10);
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d.getFullYear();
    };

    useEffect(() => {
        const loadData = async () => {
            if (!tenantLink?.tenant_id) return;
            try {
                setLoading(true);
                const result = await planejamentoService.getPlanoEstrategicoData(tenantLink.tenant_id);
                setData(result);
            } catch (error) {
                console.error('Erro ao carregar dados do plano estratégico:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tenantLink]);

    // Cores e ícones dos eixos estratégicos
    const axisColors = [
        '#3b82f6', // 01 Governo e Transparência = Azul
        '#8b5cf6', // 02 Proteção Social = Roxo
        '#10b981', // 03 Saúde = Verde
        '#f97316', // 04 Educação = Laranja
        '#eab308', // 05 Oportunidade e Desenvolvimento = Amarelo
        '#06b6d4', // 06 Cidade e Território = Ciano
        '#ef4444'  // 07 Segurança Pública e Qualidade de Vida = Vermelho
    ];

    const axisIcons = [
        Landmark,      // 01 Governo e Transparência
        Users,         // 02 Proteção Social
        HeartPulse,    // 03 Saúde
        GraduationCap, // 04 Educação
        TrendingUp,    // 05 Oportunidade e Desenvolvimento
        Building2,     // 06 Cidade e Território
        ShieldCheck    // 07 Segurança Pública e Qualidade de Vida
    ];

    const getEixoColorAndIcon = (eixoName) => {
        const nameMap = {
            'Governo e Transparência': 0,
            'Proteção Social': 1,
            'Saúde': 2,
            'Educação': 3,
            'Oportunidade e Desenvolvimento': 4,
            'Oportunidade e Desenvolvimento Cultural e Econômico': 4,
            'Cidade e Território': 5,
            'Segurança Pública e Qualidade de Vida': 6
        };
        const idx = nameMap[eixoName] !== undefined ? nameMap[eixoName] : 0;
        return {
            color: axisColors[idx] || '#3b82f6',
            Icon: axisIcons[idx] || Target
        };
    };

    // Ações filtradas pelos dropdowns de cabeçalho
    const filteredActions = useMemo(() => {
        if (!data?.actions) return [];
        let list = data.actions;

        // Filtro por Eixo
        if (filters.eixoId && filters.eixoId !== 'todos') {
            list = list.filter(a => a.axis_id === filters.eixoId);
        }

        // Filtro por Secretaria (secretaria principal)
        if (filters.secretariaId && filters.secretariaId !== 'todas') {
            if (filters.secretariaId === 'todas_minhas' && Array.isArray(filters.allowedSecretariatIds)) {
                list = list.filter(a => filters.allowedSecretariatIds.includes(a.secretariat_id));
            } else {
                list = list.filter(a => a.secretariat_id === filters.secretariaId);
            }
        }

        // Filtro por Período / Ano
        if (filters.periodo && filters.periodo !== 'todos') {
            const filterYear = parseInt(filters.periodo, 10);
            list = list.filter(a => {
                const sY = getYear(a.start_date);
                const dY = getYear(a.due_date);
                const cY = (a.status === 'CONCLUIDA' && a.completion_date) ? getYear(a.completion_date) : null;
                return sY === filterYear || dY === filterYear || cY === filterYear || (sY !== null && sY <= filterYear && (!cY || cY >= filterYear));
            });
        }

        return list;
    }, [data?.actions, filters]);

    // Todos os objetivos extraídos dos eixos para cálculo da timeline
    const allObjectives = useMemo(() => {
        if (!data?.eixos) return [];
        const objs = [];
        data.eixos.forEach(e => {
            if (filters.eixoId && filters.eixoId !== 'todos' && e.id !== filters.eixoId) return;
            if (e.objetivos) {
                e.objetivos.forEach(o => {
                    objs.push(o);
                });
            }
        });
        return objs;
    }, [data?.eixos, filters.eixoId]);

    // Estatísticas da Linha do Tempo baseada nos OBJETIVOS, conforme regra da Sec. de Planejamento
    const timelineAndYearStats = useMemo(() => {
        const statsByYear = {};

        TIMELINE_YEARS.forEach(yr => {
            let emAndamento = 0;
            let concluidas = 0;
            let naoIniciadas = 0;
            let naoConcluidas = 0;
            let iniciadasNoAno = 0;

            allObjectives.forEach(obj => {
                const acoes = obj.acoes || [];
                
                let acoesValidas = acoes.filter(a => a.objective_id === obj.id);

                if (filters.secretariaId && filters.secretariaId !== 'todas') {
                    if (filters.secretariaId === 'todas_minhas' && Array.isArray(filters.allowedSecretariatIds)) {
                        acoesValidas = acoesValidas.filter(a => filters.allowedSecretariatIds.includes(a.secretariat_id));
                    } else {
                        acoesValidas = acoesValidas.filter(a => a.secretariat_id === filters.secretariaId);
                    }
                }
                
                if (filters.secretariaId && filters.secretariaId !== 'todas' && acoesValidas.length === 0) {
                    return; 
                }

                const startedActions = acoesValidas.filter(a => a.status !== 'NAO_INICIADA' && getYear(a.start_date) !== null);

                if (startedActions.length === 0) {
                    naoIniciadas++;
                    return;
                }

                let startYear = Math.min(...startedActions.map(a => getYear(a.start_date)));
                if (startYear === 2024) {
                    startYear = 2025;
                }

                if (yr < startYear) {
                    naoIniciadas++;
                } else if (yr === startYear) {
                    iniciadasNoAno++;
                } else {
                    emAndamento++;
                }
            });

            const total = emAndamento + concluidas + naoIniciadas + iniciadasNoAno + naoConcluidas;

            const badges = [];
            if (iniciadasNoAno > 0) {
                badges.push({ text: `${iniciadasNoAno} ${iniciadasNoAno === 1 ? 'iniciado' : 'iniciados'}`, color: 'teal' });
            }
            if (emAndamento > 0) {
                badges.push({ text: `${emAndamento} em andamento`, color: 'blue' });
            }
            if (concluidas > 0) {
                badges.push({ text: `${concluidas} ${concluidas === 1 ? 'concluído' : 'concluídos'}`, color: 'green' });
            }
            if (naoConcluidas > 0) {
                badges.push({ text: `${naoConcluidas} não ${naoConcluidas === 1 ? 'concluído' : 'concluídos'}`, color: 'red' });
            }
            if (naoIniciadas > 0) {
                badges.push({ text: `${naoIniciadas} não ${naoIniciadas === 1 ? 'iniciado' : 'iniciados'}`, color: 'gray' });
            }
            if (badges.length === 0) {
                badges.push({ text: 'Sem objetivos', color: 'gray' });
            }

            statsByYear[yr] = {
                year: yr,
                total,
                emAndamento,
                concluidas,
                naoIniciadas,
                naoConcluidas,
                previstasTermino: 0,
                iniciadasNoAno,
                active: (emAndamento > 0 || concluidas > 0 || iniciadasNoAno > 0 || naoConcluidas > 0),
                badges
            };
        });

        return statsByYear;
    }, [allObjectives, filters.secretariaId, filters.allowedSecretariatIds]);

    // Recálculo dinâmico dos KPIs da página baseado nos filtros
    const dynamicKpis = useMemo(() => {
        if (!data) return { totalObjetivos: 0, totalAcoes: 0, execucaoGeral: 0, entregasConcluidas: 0, acoesEmRisco: 0 };
        
        const totalAcoes = filteredActions.length;
        const sumProgresso = filteredActions.reduce((acc, a) => acc + (a.progress_percent || 0), 0);
        const execucaoGeral = totalAcoes > 0 ? parseFloat((sumProgresso / totalAcoes).toFixed(2)) : 0;
        const entregasConcluidas = filteredActions.filter(a => a.status === 'CONCLUIDA').length;
        const acoesEmRisco = filteredActions.filter(a => a.status === 'EM_RISCO').length;

        return {
            totalObjetivos: data.kpis?.totalObjetivos || 0,
            totalAcoes,
            execucaoGeral,
            entregasConcluidas,
            acoesEmRisco
        };
    }, [data, filteredActions]);

    // Eixos compilados
    const compiledEixos = useMemo(() => {
        if (!data?.eixos) return [];
        return data.eixos.map((e, idx) => {
            const totalObjetivos = e.objetivosVinculados || (e.objetivos ? e.objetivos.length : 0);
            const objComAcao = e.objetivos ? e.objetivos.filter(obj => obj.acoesVinculadas > 0 || (obj.acoes && obj.acoes.length > 0)).length : 0;
            const novoProgresso = totalObjetivos > 0 ? (objComAcao / totalObjetivos) * 100 : 0;

            return {
                ...e,
                progresso: novoProgresso,
                color: axisColors[idx] || e.color || '#3b82f6',
                IconComponent: axisIcons[idx] || Target
            };
        });
    }, [data?.eixos]);

    // Compromissos prioritários / Ações em destaque filtradas
    const dynamicCompromissos = useMemo(() => {
        if (!filteredActions || filteredActions.length === 0) return [];
        const prioridadeStatus = {
            'EM_RISCO': 1,
            'PARALISADA': 2,
            'EM_ANDAMENTO': 3,
            'CONCLUIDA': 4,
            'NAO_INICIADA': 5,
            'CANCELADA': 6
        };

        return [...filteredActions]
            .sort((a, b) => {
                const pA = prioridadeStatus[a.status] || 99;
                const pB = prioridadeStatus[b.status] || 99;
                if (pA !== pB) return pA - pB;
                return (b.progress_percent || 0) - (a.progress_percent || 0);
            })
            .slice(0, 5)
            .map(a => {
                const eixo = data?.eixos?.find(ex => ex.id === a.axis_id);
                return {
                    id: a.id,
                    title: a.title,
                    status: a.status,
                    progresso: a.progress_percent || 0,
                    eixoName: eixo?.name || 'Planejamento Estratégico',
                    objetivoName: a.objective_title || 'Meta do Plano de Governo'
                };
            });
    }, [filteredActions, data?.eixos]);

    if (loading) {
        return (
            <div className="plano-estrategico-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#00967d', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ fontWeight: 600 }}>Carregando Plano Estratégico...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="plano-estrategico-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p style={{ color: '#ef4444', fontWeight: 600 }}>Não foi possível carregar os dados.</p>
            </div>
        );
    }

    const currentActiveEixo = activeEixo ? compiledEixos.find(e => e.id === activeEixo.id) : null;
    const selectedYearMetrics = timelineAndYearStats[selectedYear] || {
        total: 0,
        emAndamento: 0,
        concluidas: 0,
        naoIniciadas: 0,
        previstasTermino: 0,
        iniciadasNoAno: 0
    };

    return (
        <div className="plano-estrategico-container">
            {/* Header com Filtros Dinâmicos */}
            <header className="pe-header">
                <div className="pe-title-row">
                    <h1>Plano Estratégico 2025–2028</h1>
                </div>
                <div className="pe-subtitle-filters-row">
                    <p className="pe-subtitle">Visão estratégica baseada nos eixos do Plano de Governo.</p>
                    <div className="pe-filters">
                        {/* Filtro por Período */}
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <Calendar size={16} />
                        </div>
                        <select 
                            className="pe-filter-select"
                            value={filters.periodo}
                            onChange={(e) => setFilters(f => ({ ...f, periodo: e.target.value }))}
                        >
                            <option value="todos">Todos os Anos</option>
                            {TIMELINE_YEARS.map(yr => (
                                <option key={yr} value={yr.toString()}>{yr}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>

                    {/* Filtro por Eixo */}
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <Filter size={16} />
                        </div>
                        <select 
                            className="pe-filter-select"
                            value={filters.eixoId}
                            onChange={(e) => setFilters(f => ({ ...f, eixoId: e.target.value }))}
                        >
                            <option value="todos">Todos os Eixos</option>
                            {data?.eixos?.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>

                    {/* Filtro por Secretaria */}
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b', display: 'flex' }}>
                            <MapPin size={16} />
                        </div>
                        <select 
                            className="pe-filter-select"
                            style={{ 
                                cursor: (contextPlanejamento.hasRestrictedAccess && !contextPlanejamento.hasMultipleRestrictedSecretariats) ? 'not-allowed' : 'pointer', 
                                opacity: (contextPlanejamento.hasRestrictedAccess && !contextPlanejamento.hasMultipleRestrictedSecretariats) ? 0.7 : 1 
                            }}
                            value={filters.secretariaId}
                            onChange={(e) => setFilters(f => ({ ...f, secretariaId: e.target.value }))}
                            disabled={contextPlanejamento.hasRestrictedAccess && !contextPlanejamento.hasMultipleRestrictedSecretariats}
                        >
                            {!contextPlanejamento.hasRestrictedAccess && <option value="todas">Todas as Secretarias</option>}
                            {contextPlanejamento.hasMultipleRestrictedSecretariats && <option value="todas_minhas">Todas as minhas secretarias</option>}
                            {contextPlanejamento.hasRestrictedAccess && !contextPlanejamento.hasMultipleRestrictedSecretariats && !contextPlanejamento.primarySecretariatId && <option value="nenhuma">Sem Secretaria</option>}
                            {[...(data?.secretariats || [])]
                                .sort((a, b) => (a.name || a.sigla || '').localeCompare(b.name || b.sigla || '', 'pt-BR', { sensitivity: 'base' }))
                                .map(s => {
                                    if (contextPlanejamento.hasRestrictedAccess && !(contextPlanejamento.allowedSecretariatIds || []).includes(s.id)) return null;
                                    return <option key={s.id} value={s.id}>{s.name || s.sigla}</option>;
                            })}
                        </select>
                        <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b', fontSize: '0.6rem' }}>▼</div>
                    </div>
                    </div>
                </div>
            </header>

            {/* Linha 1: Visão e KPIs */}
            <div className="pe-overview-row">
                <div className="pe-visao-box">
                    <div className="pe-visao-content" style={{ flex: '1 1 240px', minWidth: '240px', position: 'relative', zIndex: 2, paddingRight: '1rem' }}>
                        <h3 style={{ color: '#0f766e', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px', margin: '0 0 0.5rem 0' }}>NOSSA VISÃO</h3>
                        <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.55', margin: 0, fontWeight: 500, maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'normal' }}>
                            Ser referência em gestão pública, com cidade próspera, inclusiva e sustentável até 2028.
                        </p>
                    </div>
                    <div className="pe-visao-illustration" style={{ position: 'absolute', right: '10px', bottom: '-5px', width: '180px', height: '90px', pointerEvents: 'none' }}>
                        <svg width="100%" height="100%" viewBox="0 0 240 120" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 120 110 Q 160 40 220 50 Q 235 60 240 110 Z" fill="#bbf7d0" opacity="0.6" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <path d="M 10 110 Q 30 80 60 110 Z" fill="#bbf7d0" opacity="0.4" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <path d="M 170 30 Q 170 20 180 20 Q 185 10 195 10 Q 205 10 210 20 Q 220 20 220 30 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="160" y1="30" x2="230" y2="30" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                            <path d="M 130 50 Q 130 40 140 40 Q 150 40 155 50" fill="none" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                            <rect x="80" y="80" width="30" height="30" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 90 110 V 95 A 5 5 0 0 1 100 95 V 110" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <circle cx="95" cy="88" r="3" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="85" y="50" width="20" height="30" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <rect x="88" y="55" width="4" height="8" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="98" y="55" width="4" height="8" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 85 50 L 95 25 L 105 50 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="95" y1="15" x2="95" y2="25" stroke="#0f766e" strokeWidth="1" />
                            <line x1="92" y1="20" x2="98" y2="20" stroke="#0f766e" strokeWidth="1" />
                            <rect x="50" y="90" width="20" height="20" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 50 90 L 60 75 L 70 90 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="60" y1="65" x2="60" y2="75" stroke="#0f766e" strokeWidth="1" />
                            <rect x="54" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="63" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 56 110 V 105 H 64 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="70" y="95" width="10" height="15" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <rect x="110" y="90" width="20" height="20" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 110 90 L 120 75 L 130 90 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="120" y1="65" x2="120" y2="75" stroke="#0f766e" strokeWidth="1" />
                            <rect x="114" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="123" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 116 110 V 105 H 124 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 130 100 L 145 90 L 160 100 V 110 H 130 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <rect x="135" y="100" width="5" height="10" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="145" y="100" width="10" height="10" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 148 110 V 102 H 152 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <line x1="0" y1="110" x2="240" y2="110" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                <div className="pe-kpis-grid">
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <Target size={20} />
                        </div>
                        <div className="pe-kpi-value">{dynamicKpis.totalObjetivos}</div>
                        <div className="pe-kpi-label">Objetivos<br/>Estratégicos</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                            <Activity size={20} />
                        </div>
                        <div className="pe-kpi-value">{dynamicKpis.totalAcoes}</div>
                        <div className="pe-kpi-label">Ações<br/>Vinculadas</div>
                    </div>
                    <div className="pe-kpi-card" title="Média de execução considerando apenas ações já vinculadas a objetivos estratégicos.">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <CheckCircle size={20} />
                        </div>
                        <div className="pe-kpi-value">{formatPercent(dynamicKpis.execucaoGeral)}%</div>
                        <div className="pe-kpi-label">Execução das<br/>Ações Vinculadas</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Target size={20} />
                        </div>
                        <div className="pe-kpi-value">{dynamicKpis.entregasConcluidas}</div>
                        <div className="pe-kpi-label">Entregas<br/>Concluídas</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="pe-kpi-value" style={{ color: dynamicKpis.acoesEmRisco > 0 ? '#ef4444' : 'inherit' }}>{dynamicKpis.acoesEmRisco}</div>
                        <div className="pe-kpi-label">Ações<br/>em Risco</div>
                    </div>
                </div>
            </div>

            {/* Eixos Estratégicos */}
            <div className="pe-section-title">Eixos Estratégicos</div>
            <div className="pe-section-subtitle">Clique em um eixo para ver seus objetivos e ações vinculadas.</div>
            
            <div className="pe-eixos-grid">
                {compiledEixos.map((eixo, index) => {
                    const idxStr = String(index + 1).padStart(2, '0');
                    const isActive = activeEixo?.id === eixo.id;
                    return (
                        <div key={eixo.id} className={`pe-eixo-card ${isActive ? 'active' : ''}`} style={{ borderTopColor: eixo.color || '#3b82f6', borderColor: isActive ? eixo.color : '' }}>
                            <div className="pe-eixo-icon-wrapper" style={{ background: `${eixo.color}15`, color: eixo.color }}>
                                <eixo.IconComponent size={24} />
                            </div>
                            <div className="pe-eixo-title">{idxStr}. {eixo.name}</div>
                            
                            <div className="pe-eixo-progress-wrapper">
                                <div className="pe-eixo-progress-header">
                                    <span className="pe-eixo-progress-percent">{formatPercent(eixo.progresso)}%</span>
                                </div>
                                <div className="pe-eixo-progress-bar-bg">
                                    <div className="pe-eixo-progress-bar-fill" style={{ width: `${formatPercent(eixo.progresso)}%`, background: eixo.color }}></div>
                                </div>
                            </div>

                            <div className="pe-eixo-stats">
                                <span>{eixo.objetivosVinculados} objetivos</span>
                                <span>{eixo.acoesVinculadas} ações</span>
                            </div>

                            <button 
                                className="pe-eixo-btn"
                                style={{ color: eixo.color, border: `1px solid ${eixo.color}40`, background: isActive ? `${eixo.color}10` : 'transparent' }}
                                onClick={() => {
                                    setActiveEixo(isActive ? null : eixo);
                                    setExpandedObjectiveId(null);
                                    setShowEmptyObjectives(false);
                                }}
                            >
                                {isActive ? 'Fechar eixo' : 'Ver eixo'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Detalhes do Eixo Selecionado */}
            {currentActiveEixo && (
                <div className="pe-eixo-details-panel" style={{ borderLeft: `4px solid ${currentActiveEixo.color}` }}>
                    <div className="pe-details-header" style={{ alignItems: 'flex-start' }}>
                        <div className="pe-details-title-wrapper" style={{ alignItems: 'flex-start' }}>
                            <div style={{ background: `${currentActiveEixo.color}20`, padding: '12px', borderRadius: '8px', color: currentActiveEixo.color, marginTop: '4px' }}>
                                <Target size={32} />
                            </div>
                            <div>
                                <h2 className="pe-details-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>{currentActiveEixo.name}</h2>
                                <p style={{ margin: '8px 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '800px' }}>
                                    {currentActiveEixo.description || 'Descrição não cadastrada para este eixo estratégico.'}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Objetivos</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentActiveEixo.objetivosVinculados}</span>
                                    </div>
                                    <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ações Vinculadas</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentActiveEixo.acoesVinculadas}</span>
                                    </div>
                                    <div style={{ width: '1px', background: 'var(--border-light)' }}></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Objetivos com Ação</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: currentActiveEixo.color }}>{formatPercent(currentActiveEixo.progresso)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="pe-close-btn" onClick={() => {
                            setActiveEixo(null);
                            setExpandedObjectiveId(null);
                            setShowEmptyObjectives(false);
                        }}>
                            <X size={24} />
                        </button>
                    </div>

                    {currentActiveEixo.objetivos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sem objetivos cadastrados.</div>
                    ) : (
                        <div className="pe-accordion-container">
                            {/* Objetivos COM ações */}
                            {currentActiveEixo.objetivos.filter(obj => obj.acoesVinculadas > 0).map(obj => {
                                const objectiveProgress = obj.progress ?? obj.progressPercent ?? obj.progress_percent ?? obj.progresso ?? obj.avgProgress ?? 0;
                                return (
                                <div key={obj.id} className={`pe-accordion-item ${expandedObjectiveId === obj.id ? 'expanded' : ''}`}>
                                    <div 
                                        className="pe-accordion-header" 
                                        onClick={() => setExpandedObjectiveId(expandedObjectiveId === obj.id ? null : obj.id)}
                                        style={{ borderLeft: `3px solid ${currentActiveEixo.color}` }}
                                    >
                                        <div className="pe-accordion-header-main" style={{ minWidth: 0 }}>
                                            <h4 className="pe-accordion-title" title={obj.title} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obj.title}</h4>
                                            <div className="pe-accordion-badges" style={{ flexShrink: 0 }}>
                                                <span className="pe-badge pe-badge-acao-com">Com ação</span>
                                                <span className="pe-badge pe-badge-acoes-count">{obj.acoesVinculadas} {obj.acoesVinculadas === 1 ? 'ação' : 'ações'}</span>
                                            </div>
                                        </div>
                                        <div className="pe-accordion-header-right" style={{ flexShrink: 0 }}>
                                            <div className="pe-accordion-progress-wrapper" style={{ flexShrink: 0 }}>
                                                <div className="pe-accordion-progress-bar">
                                                    <div className="pe-accordion-progress-fill" style={{ width: `${formatPercent(objectiveProgress)}%`, background: currentActiveEixo.color }}></div>
                                                </div>
                                                <span className="pe-accordion-progress-text" style={{ flexShrink: 0 }}>{formatPercent(objectiveProgress)}%</span>
                                            </div>
                                            <div className={`pe-accordion-chevron ${expandedObjectiveId === obj.id ? 'rotated' : ''}`}>
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedObjectiveId === obj.id && (
                                        <div className="pe-accordion-body">
                                            <p className="pe-accordion-desc">{obj.description || 'Sem descrição cadastrada para este objetivo.'}</p>
                                            
                                            {obj.acoes && obj.acoes.length > 0 ? (
                                                <div className="pe-accordion-acoes-list">
                                                    <h5 className="pe-accordion-acoes-title">Ações Vinculadas</h5>
                                                    {obj.acoes.map(acao => {
                                                        const acaoProgress = acao.progress_percent ?? acao.progresso ?? acao.progress ?? 0;
                                                        return (
                                                        <div key={acao.id} className="pe-accordion-acao-item">
                                                            <div className="pe-acao-info" style={{ minWidth: 0 }}>
                                                                <span className="pe-acao-title" title={acao.title} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acao.title}</span>
                                                                <span className={`pe-badge pe-badge-acao-status ${acao.status === 'CONCLUIDA' ? 'CONCLUIDA' : acao.status === 'EM_RISCO' || acao.status === 'PARALISADA' ? 'EM_RISCO' : 'EM_ANDAMENTO'}`} style={{ flexShrink: 0 }}>
                                                                    {formatStatusLabel(acao.status)}
                                                                </span>
                                                            </div>
                                                            <div className="pe-acao-progress-wrapper" style={{ flexShrink: 0 }}>
                                                                <div className="pe-acao-progress-bar">
                                                                    <div className="pe-acao-progress-fill" style={{ width: `${formatPercent(acaoProgress)}%`, background: acao.status === 'CONCLUIDA' ? '#10b981' : acao.status === 'EM_RISCO' || acao.status === 'PARALISADA' ? '#ef4444' : '#8b5cf6' }}></div>
                                                                </div>
                                                                <span className="pe-acao-progress-text" style={{ flexShrink: 0 }}>{formatPercent(acaoProgress)}%</span>
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                            ) : (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem', fontStyle: 'italic' }}>Sem ações detalhadas.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )})}

                            {/* Objetivos SEM ações */}
                            {currentActiveEixo.objetivos.filter(obj => obj.acoesVinculadas === 0).length > 0 && (
                                <div className="pe-empty-objectives-section">
                                    <div 
                                        className="pe-empty-objectives-toggle"
                                        onClick={() => setShowEmptyObjectives(!showEmptyObjectives)}
                                    >
                                        <div className="pe-empty-toggle-left">
                                            <span style={{ fontWeight: 600 }}>Objetivos sem ações vinculadas</span>
                                            <span className="pe-badge pe-badge-empty-count">{currentActiveEixo.objetivos.filter(obj => obj.acoesVinculadas === 0).length} objetivos</span>
                                        </div>
                                        <div className={`pe-accordion-chevron ${showEmptyObjectives ? 'rotated' : ''}`}>
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                    
                                    {showEmptyObjectives && (
                                        <div className="pe-empty-objectives-list">
                                            {currentActiveEixo.objetivos.filter(obj => obj.acoesVinculadas === 0).map(obj => (
                                                <div key={obj.id} className="pe-empty-objective-item" style={{ minWidth: 0 }}>
                                                    <h4 className="pe-accordion-title" title={obj.title} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{obj.title}</h4>
                                                    <span className="pe-badge pe-badge-acao-sem" style={{ flexShrink: 0 }}>Sem ação</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Linha do Tempo Estratégica Completa (2024–2028) */}
            <div className="pe-panel pe-timeline-panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                        <h3 className="pe-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Linha do Tempo Estratégica</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                            Evolução temporal dos objetivos ao longo do ciclo de governo (clique em um ano para inspecionar).
                        </p>
                    </div>

                    <div className="pe-legend" style={{ margin: 0 }}>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#0d9488' }}></div> Iniciados</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#3b82f6' }}></div> Em andamento</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#10b981' }}></div> Concluídos</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#ef4444' }}></div> Não concluídos</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#94a3b8' }}></div> Não iniciados</div>
                    </div>
                </div>

                <div className="pe-timeline-wrapper">
                    <div className="pe-timeline-line"></div>
                    <div className="pe-timeline-container">
                        {TIMELINE_YEARS.map((yr) => {
                            const step = timelineAndYearStats[yr];
                            const isSelected = selectedYear === yr;

                            return (
                                <div 
                                    key={yr} 
                                    className={`pe-timeline-step ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedYear(yr)}
                                    title={`Clique para visualizar o detalhamento de ${yr}`}
                                >
                                    <div className={`pe-timeline-year ${isSelected ? 'selected-year' : ''}`}>{yr}</div>
                                    <div className={`pe-timeline-dot ${step.active ? 'active' : ''} ${isSelected ? 'selected-dot' : ''}`}></div>
                                    <div className={`pe-timeline-content ${isSelected ? 'selected-content' : ''}`}>
                                        <div className="pe-timeline-badges" style={{ flexDirection: 'column', width: '100%', gap: '6px' }}>
                                            {step.badges.map((badge, bIdx) => (
                                                <span key={bIdx} className={`pe-timeline-badge ${badge.color}`} style={{ width: '100%' }}>
                                                    {badge.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Painel Inferior: Gráfico Anual de Distribuição + Ações em Destaque */}
            <div className="pe-bottom-grid">
                {/* 1. Novo Gráfico Anual de Distribuição */}
                <DistribuicaoAnualChart
                    selectedYear={selectedYear}
                    onSelectYear={(yr) => setSelectedYear(yr)}
                    availableYears={TIMELINE_YEARS}
                    metrics={selectedYearMetrics}
                />

                {/* 2. Ações em Destaque (Compromissos Prioritários) */}
                <div className="pe-panel pe-compromissos-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 className="pe-section-title" style={{ fontSize: '1.1rem', margin: 0 }}>Ações em Destaque</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                            Principais iniciativas em execução prioritária no plano
                        </p>
                    </div>
                    
                    {dynamicCompromissos.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                            Nenhuma ação encontrada para os filtros aplicados.
                        </div>
                    ) : (
                        <>
                            <div className="pe-compromissos-list-exec" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '10px' }}>
                                {dynamicCompromissos.map(comp => {
                                    const { color: eixoColor, Icon: EixoIcon } = getEixoColorAndIcon(comp.eixoName);
                                    return (
                                        <div key={comp.id} className="pe-compromisso-exec-item">
                                            <div className="pe-comp-icon" style={{ background: `${eixoColor}15`, color: eixoColor }}>
                                                <EixoIcon size={16} />
                                            </div>
                                            <div className="pe-comp-main">
                                                <h4 className="pe-comp-title" title={comp.title}>{comp.title}</h4>
                                                <p className="pe-comp-meta" title={`${comp.eixoName} • ${comp.objetivoName}`}>
                                                    <span className="pe-comp-eixo">{comp.eixoName}</span> <span className="pe-comp-dot">•</span> {comp.objetivoName}
                                                </p>
                                            </div>
                                            <span className={`pe-badge pe-comp-badge ${comp.status}`}>
                                                {formatStatusLabel(comp.status)}
                                            </span>
                                            <div className="pe-comp-progress-compact">
                                                <span className="pe-comp-progress-val">{formatPercent(comp.progresso)}%</span>
                                                <div className="pe-comp-pbar">
                                                    <div className="pe-comp-pfill" style={{ width: `${formatPercent(comp.progresso)}%`, background: getProgressColor(comp.status) }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Link/Botão Discreto de Rodapé */}
                            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/planejamento/acoes')}
                                    className="pe-ver-todas-btn"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#0f766e',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Ver todas as ações
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
};

export default PlanejamentoEstrategico;
