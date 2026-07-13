import React, { useState, useEffect } from 'react';
import { Calendar, Filter, MapPin, Landmark, Target, Activity, CheckCircle, AlertTriangle, ChevronRight, X, Compass, Users, HeartPulse, GraduationCap, TrendingUp, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { planejamentoService } from '../../services/api/planejamento.service';
import './PlanejamentoEstrategico.css';

const strategicTimelineMockData = [
    { year: 2025, active: true, badges: [{ text: '32 objetivos em andamento', color: 'blue' }, { text: '8 entregas concluídas', color: 'green' }] },
    { year: 2026, active: false, badges: [{ text: '28 objetivos planejados', color: 'gray' }, { text: '0 entregas', color: 'gray' }] },
    { year: 2027, active: false, badges: [{ text: '22 objetivos planejados', color: 'gray' }, { text: '0 entregas', color: 'gray' }] },
    { year: 2028, active: false, badges: [{ text: '12 objetivos planejados', color: 'gray' }, { text: '0 entregas', color: 'gray' }] }
];

const PlanejamentoEstrategico = () => {
    const { tenantLink } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeEixo, setActiveEixo] = useState(null);
    const [expandedObjectiveId, setExpandedObjectiveId] = useState(null);
    const [showEmptyObjectives, setShowEmptyObjectives] = useState(false);

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

    let { kpis, eixos, compromissos, actions } = data;

    const USE_PLANO_ESTRATEGICO_MOCK = false;

    // MOCK TEMPORÁRIO - manter apenas para testes visuais
    if (USE_PLANO_ESTRATEGICO_MOCK) {
        kpis = {
            totalObjetivos: 221,
            totalAcoes: 140,
            execucaoGeral: 61,
            entregasConcluidas: 18,
            acoesEmRisco: 5
        };

        const mockEixosData = [
            { name: 'Governo e Transparência', objetivos: 43, acoesVinculadas: 18, progress: 80 },
            { name: 'Proteção Social', objetivos: 21, acoesVinculadas: 14, progress: 65 },
            { name: 'Saúde', objetivos: 17, acoesVinculadas: 26, progress: 60 },
            { name: 'Educação', objetivos: 26, acoesVinculadas: 32, progress: 48 },
            { name: 'Oportunidade e Desenvolvimento Cultural e Econômico', objetivos: 20, acoesVinculadas: 20, progress: 55 },
            { name: 'Cidade e Território', objetivos: 43, acoesVinculadas: 18, progress: 40 },
            { name: 'Segurança Pública e Qualidade de Vida', objetivos: 51, acoesVinculadas: 12, progress: 50 }
        ];

        eixos = mockEixosData.map((m, idx) => {
            const eixoId = `mock-eixo-${idx}`;
            
            const objComAcao = Array.from({length: 3}).map((_, i) => ({
                id: `${eixoId}-obj-c-${i}`,
                title: m.name === 'Educação' && i === 0 ? 'Ampliar a rede de Educação Integral, Escola Viva' : 
                       m.name === 'Educação' && i === 1 ? 'Melhorar a infraestrutura das escolas' : 
                       m.name === 'Educação' && i === 2 ? 'Implantar avaliações periódicas dos estudantes' : 
                       m.name === 'Saúde' && i === 0 ? 'Ampliar a rede de atendimento materno infantil' : 
                       m.name === 'Saúde' && i === 1 ? 'Implantar novas tecnologias na saúde municipal' : 
                       m.name === 'Saúde' && i === 2 ? 'Qualificar o sistema de regulação' : 
                       `Objetivo estratégico ${i+1} focado na expansão de ${m.name}`,
                acoesVinculadas: i === 0 ? 2 : 1,
                progress_percent: i === 0 ? 70 : i === 1 ? 45 : 0,
                acoes: [
                    { id: `${eixoId}-acao-c-${i}-1`, title: 
                       m.name === 'Educação' && i === 0 ? 'Reforma da Escola Municipal José de Góes' : 
                       m.name === 'Educação' && i === 1 ? 'Requalificação de unidades escolares' : 
                       m.name === 'Educação' && i === 2 ? 'Painel de acompanhamento pedagógico' : 
                       m.name === 'Saúde' && i === 0 ? 'Nova Maternidade Municipal' : 
                       m.name === 'Saúde' && i === 1 ? 'Telemedicina nas unidades de saúde' : 
                       m.name === 'Saúde' && i === 2 ? 'Painel de absenteísmo e regulação' : 
                       `Iniciativa principal ${i+1}`, status: i === 2 ? 'NAO_INICIADA' : i === 1 ? 'ATENCAO' : 'EM_ANDAMENTO', progress_percent: i === 2 ? 0 : i === 1 ? 45 : 80 },
                    ...(i === 0 ? [{ id: `${eixoId}-acao-c-${i}-2`, title: m.name === 'Educação' ? 'Ampliação de salas de aula' : `Iniciativa secundária de ampliação ${i+1}`, status: 'EM_ANDAMENTO', progress_percent: 55 }] : [])
                ]
            }));

            const objSemAcao = Array.from({length: 3}).map((_, i) => ({
                id: `${eixoId}-obj-s-${i}`,
                title: `Meta estruturante para o futuro de ${m.name} ${i+1}`,
                acoesVinculadas: 0,
                progress_percent: 0,
                acoes: []
            }));

            return {
                id: eixoId,
                name: m.name,
                objetivosVinculados: m.objetivos,
                acoesVinculadas: m.acoesVinculadas,
                progresso: m.progress,
                objetivos: [...objComAcao, ...objSemAcao]
            };
        });
    }

    // --- Aplicar cores fixas e ícones nos eixos ---
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

    let compromissosList = data.compromissos || data.compromissosPrioritarios || [];
    
    // MOCK TEMPORÁRIO - manter apenas para testes visuais
    if (USE_PLANO_ESTRATEGICO_MOCK && compromissosList.length < 4) {
        const MOCK_COMPROMISSOS = [
            { id: 'mock-1', title: 'Nova Maternidade Municipal', eixoName: 'Saúde', objetivoName: 'Ampliar a rede de atendimento materno infantil', status: 'EM_ANDAMENTO', progresso: 72 },
            { id: 'mock-2', title: 'Escola Integral em Tempo Integral', eixoName: 'Educação', objetivoName: 'Ampliar a rede de Educação Integral, Escola Viva', status: 'EM_ANDAMENTO', progresso: 80 },
            { id: 'mock-3', title: 'Plano de Mobilidade Urbana', eixoName: 'Cidade e Território', objetivoName: 'Elaborar e executar um Plano de Mobilidade', status: 'ATENCAO', progresso: 45 },
            { id: 'mock-4', title: 'Geração de Emprego e Renda', eixoName: 'Oportunidade e Desenvolvimento', objetivoName: 'Ampliar programas de qualificação e empregabilidade', status: 'EM_ANDAMENTO', progresso: 58 }
        ];
        
        // Evitar duplicar mock se já houver ações reais misturadas
        const existingTitles = compromissosList.map(c => c.title);
        const mocksToAdd = MOCK_COMPROMISSOS.filter(m => !existingTitles.includes(m.title));
        
        compromissosList = [...compromissosList, ...mocksToAdd].slice(0, 4);
    }

    const getYear = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d.getFullYear();
    };

    let strategicTimelineRealData = strategicTimelineMockData;
    
    if (actions && actions.length > 0) {
        const timelineByYear = {
            2025: { year: 2025, NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 },
            2026: { year: 2026, NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 },
            2027: { year: 2027, NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 },
            2028: { year: 2028, NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 }
        };

        actions.forEach(a => {
            const dateStr = a.due_date || a.start_date || a.created_at;
            const year = getYear(dateStr);
            if (!year) return;

            if (!timelineByYear[year]) {
                timelineByYear[year] = { year, NAO_INICIADA: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0 };
            }

            if (a.status === 'NAO_INICIADA') timelineByYear[year].NAO_INICIADA++;
            else if (a.status === 'EM_ANDAMENTO') timelineByYear[year].EM_ANDAMENTO++;
            else if (a.status === 'CONCLUIDA') timelineByYear[year].CONCLUIDA++;
        });

        const sortedYears = Object.keys(timelineByYear).sort((a, b) => parseInt(a) - parseInt(b));
        
        strategicTimelineRealData = sortedYears.map(yearStr => {
            const stats = timelineByYear[yearStr];
            const badges = [];
            
            if (stats.EM_ANDAMENTO > 0) {
                badges.push({ text: `${stats.EM_ANDAMENTO} ações em andamento`, color: 'blue' });
            }
            if (stats.CONCLUIDA > 0) {
                badges.push({ text: `${stats.CONCLUIDA} entregas concluídas`, color: 'green' });
            }
            if (stats.NAO_INICIADA > 0) {
                badges.push({ text: `${stats.NAO_INICIADA} ações planejadas`, color: 'gray' });
            }
            
            if (badges.length === 0) {
                badges.push({ text: `Sem ações cadastradas`, color: 'gray' });
            }

            return {
                year: parseInt(yearStr),
                active: stats.EM_ANDAMENTO > 0 || stats.CONCLUIDA > 0,
                badges
            };
        });
        
        if (strategicTimelineRealData.length > 4) {
            const currentYear = new Date().getFullYear();
            let startIdx = strategicTimelineRealData.findIndex(d => d.year >= currentYear);
            if (startIdx === -1) startIdx = strategicTimelineRealData.length - 4;
            if (startIdx > strategicTimelineRealData.length - 4) startIdx = strategicTimelineRealData.length - 4;
            startIdx = Math.max(0, startIdx);
            
            strategicTimelineRealData = strategicTimelineRealData.slice(startIdx, startIdx + 4);
        }
    }

    eixos = eixos.map((e, idx) => {
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

    // Update activeEixo reference if it is open
    const currentActiveEixo = activeEixo ? eixos.find(e => e.id === activeEixo.id) : null;

    return (
        <div className="plano-estrategico-container">
            {/* Header */}
            <header className="pe-header">
                <div className="pe-title-group">
                    <h1>Plano Estratégico 2025–2028</h1>
                    <p>Visão estratégica da gestão com base nos eixos do Plano de Governo.</p>
                </div>
                <div className="pe-filters">
                    <button className="pe-filter-btn">
                        <Calendar size={16} /> Período
                    </button>
                    <button className="pe-filter-btn">
                        <Filter size={16} /> Eixo Estratégico
                    </button>
                    <button className="pe-filter-btn">
                        <MapPin size={16} /> Secretaria
                    </button>
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
                            {/* Montanha/Colina preenchida */}
                            <path d="M 120 110 Q 160 40 220 50 Q 235 60 240 110 Z" fill="#bbf7d0" opacity="0.6" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            
                            {/* Colina Esquerda */}
                            <path d="M 10 110 Q 30 80 60 110 Z" fill="#bbf7d0" opacity="0.4" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            
                            {/* Nuvens */}
                            {/* Nuvem Superior */}
                            <path d="M 170 30 Q 170 20 180 20 Q 185 10 195 10 Q 205 10 210 20 Q 220 20 220 30 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="160" y1="30" x2="230" y2="30" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                            
                            {/* Nuvem Esquerda (parcial) */}
                            <path d="M 130 50 Q 130 40 140 40 Q 150 40 155 50" fill="none" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                            
                            {/* Prédio Principal (Igreja/Prefeitura) */}
                            {/* Base */}
                            <rect x="80" y="80" width="30" height="30" fill="white" stroke="#0f766e" strokeWidth="1" />
                            {/* Porta */}
                            <path d="M 90 110 V 95 A 5 5 0 0 1 100 95 V 110" fill="white" stroke="#0f766e" strokeWidth="1" />
                            {/* Janela redonda */}
                            <circle cx="95" cy="88" r="3" fill="none" stroke="#0f766e" strokeWidth="1" />
                            {/* Torre */}
                            <rect x="85" y="50" width="20" height="30" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <rect x="88" y="55" width="4" height="8" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="98" y="55" width="4" height="8" fill="none" stroke="#0f766e" strokeWidth="1" />
                            {/* Cúpula / Telhado da Torre */}
                            <path d="M 85 50 L 95 25 L 105 50 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            {/* Cruz no topo */}
                            <line x1="95" y1="15" x2="95" y2="25" stroke="#0f766e" strokeWidth="1" />
                            <line x1="92" y1="20" x2="98" y2="20" stroke="#0f766e" strokeWidth="1" />
                            
                            {/* Prédio Esquerdo */}
                            <rect x="50" y="90" width="20" height="20" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 50 90 L 60 75 L 70 90 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="60" y1="65" x2="60" y2="75" stroke="#0f766e" strokeWidth="1" />
                            {/* Janelas */}
                            <rect x="54" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="63" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 56 110 V 105 H 64 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            {/* Conector Esquerdo */}
                            <rect x="70" y="95" width="10" height="15" fill="white" stroke="#0f766e" strokeWidth="1" />

                            {/* Prédio Direito */}
                            <rect x="110" y="90" width="20" height="20" fill="white" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 110 90 L 120 75 L 130 90 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <line x1="120" y1="65" x2="120" y2="75" stroke="#0f766e" strokeWidth="1" />
                            {/* Janelas */}
                            <rect x="114" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="123" y="95" width="3" height="5" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 116 110 V 105 H 124 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            
                            {/* Prédio Extrema Direita */}
                            <path d="M 130 100 L 145 90 L 160 100 V 110 H 130 Z" fill="white" stroke="#0f766e" strokeWidth="1" strokeLinejoin="round" />
                            <rect x="135" y="100" width="5" height="10" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <rect x="145" y="100" width="10" height="10" fill="none" stroke="#0f766e" strokeWidth="1" />
                            <path d="M 148 110 V 102 H 152 V 110" fill="none" stroke="#0f766e" strokeWidth="1" />
                            
                            {/* Linha Base */}
                            <line x1="0" y1="110" x2="240" y2="110" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                <div className="pe-kpis-grid">
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            <Target size={20} />
                        </div>
                        <div className="pe-kpi-value">{kpis.totalObjetivos}</div>
                        <div className="pe-kpi-label">Objetivos<br/>Estratégicos</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                            <Activity size={20} />
                        </div>
                        <div className="pe-kpi-value">{kpis.totalAcoes}</div>
                        <div className="pe-kpi-label">Ações<br/>Vinculadas</div>
                    </div>
                    <div className="pe-kpi-card" title="Média de execução considerando apenas ações já vinculadas a objetivos estratégicos.">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <CheckCircle size={20} />
                        </div>
                        <div className="pe-kpi-value">{formatPercent(kpis.execucaoGeral)}%</div>
                        <div className="pe-kpi-label">Execução das<br/>Ações Vinculadas</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Target size={20} /> {/* Can use Medal or Award later */}
                        </div>
                        <div className="pe-kpi-value">{kpis.entregasConcluidas}</div>
                        <div className="pe-kpi-label">Entregas<br/>Concluídas</div>
                    </div>
                    <div className="pe-kpi-card">
                        <div className="pe-kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="pe-kpi-value" style={{ color: kpis.acoesEmRisco > 0 ? '#ef4444' : 'inherit' }}>{kpis.acoesEmRisco}</div>
                        <div className="pe-kpi-label">Ações<br/>em Risco</div>
                    </div>
                </div>
            </div>

            {/* Eixos Estratégicos */}
            <div className="pe-section-title">Eixos Estratégicos</div>
            <div className="pe-section-subtitle">Clique em um eixo para ver seus objetivos e ações vinculadas.</div>
            
            <div className="pe-eixos-grid">
                {eixos.map((eixo, index) => {
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

            {/* Linha 2: Timeline e Entregas */}
            <div className="pe-bottom-row">
                
                {/* Linha do Tempo */}
                <div className="pe-panel pe-timeline-panel">
                    <h3 className="pe-section-title" style={{ fontSize: '1.1rem' }}>Linha do Tempo Estratégica</h3>
                    
                    <div className="pe-legend">
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#cbd5e1' }}></div> Planejado</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#3b82f6' }}></div> Em andamento</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#10b981' }}></div> Concluído</div>
                        <div className="pe-legend-item"><div className="pe-legend-dot" style={{ background: '#ef4444' }}></div> Atrasado</div>
                    </div>

                    {/* Linha do tempo baseada nas ações ativas */}
                    <div className="pe-timeline-wrapper">
                        <div className="pe-timeline-line"></div>
                        <div className="pe-timeline-container">
                            {strategicTimelineRealData.map((step, idx) => (
                                <div key={idx} className="pe-timeline-step">
                                    <div className="pe-timeline-year">{step.year}</div>
                                    <div className={`pe-timeline-dot ${step.active ? 'active' : ''}`}></div>
                                    <div className="pe-timeline-content">
                                        <div className="pe-timeline-badges" style={{ flexDirection: 'column', width: '100%', gap: '8px' }}>
                                            {step.badges.map((badge, bIdx) => (
                                                <span key={bIdx} className={`pe-timeline-badge ${badge.color}`} style={{ width: '100%' }}>
                                                    {badge.text}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ações em Destaque */}
                <div className="pe-panel">
                    <h3 className="pe-section-title" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Ações em Destaque</h3>
                    
                    {compromissosList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma ação cadastrada.</div>
                    ) : (
                        <div className="pe-compromissos-list-exec">
                            {compromissosList.map(comp => {
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
                    )}
                </div>

            </div>

        </div>
    );
};

export default PlanejamentoEstrategico;
