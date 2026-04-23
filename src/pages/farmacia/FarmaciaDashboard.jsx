import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Package, PackagePlus, PackageMinus, AlertTriangle, ArrowLeftRight,
    ChevronRight, Bell, XCircle, Clock, TrendingUp, Activity, Heart, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia } from '../../utils/farmaciaAcl';
import {
    LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
    Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Area, AreaChart, Legend, ReferenceLine
} from 'recharts';
import { useFarmacia } from './FarmaciaContext';
import './FarmaciaPages.css';

const rankColors = ['#00967D', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

/* ─── Gauge SVG Circular ─────────────────────────────────────── */
const GaugeCircular = ({ pct, cor }) => {
    const R = 36;
    const circ = 2 * Math.PI * R;
    const dash = (pct / 100) * circ;
    return (
        <svg width="76" height="76" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--bg-muted)" strokeWidth="10" />
            <circle
                cx="50" cy="50" r={R} fill="none"
                stroke={cor} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
            />
            <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill={cor}>{pct}%</text>
        </svg>
    );
};

/* ─── Tooltip Customizado do Hero Chart ──────────────────────── */
const HeroTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--text)' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
                    {p.name}: <span style={{ color: 'var(--text)' }}>{p.value} unid</span>
                </p>
            ))}
        </div>
    );
};

/* ─── Componente Contador Animado ────────────────────────────── */
const AnimatedCount = ({ target, dur = 1000 }) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / (dur / 16));
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setVal(start);
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, dur]);
    return <>{val.toLocaleString('pt-BR')}</>;
};

/* Tooltip customizado para Consumo por Unidade */
const TooltipConsumo = ({ active, payload, totalConsumo }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const total = totalConsumo || 1;
    const pct = ((item.consumo / total) * 100).toFixed(1);
    return (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.82rem' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>{item.name}</p>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Distribuído: <strong style={{ color: 'var(--text)' }}>{item.consumo.toLocaleString('pt-BR')} un</strong></p>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)' }}>Participação: <strong style={{ color: '#00967D' }}>{pct}%</strong></p>
        </div>
    );
};

/* Tooltip customizado para Distribuição do Estoque */
const TooltipDistribuicao = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    const color = item.payload.fill || item.color || item.payload.color;
    // pct e valueInt vêm pré-calculados no data point (adicionados durante o build)
    // Isso evita depender do item.percent do Recharts (instável entre versões)
    const pct      = item.payload.pct      ?? 0;
    const valorAbs = (item.payload.valueInt ?? Math.round(item.value || 0)).toLocaleString('pt-BR');

    return (
        <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${color}`,
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
        }}>
            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.9rem' }}>{item.name}</span>
            <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {valorAbs} <span style={{ opacity: 0.7 }}>unidades em estoque</span>
            </span>
            <span style={{ fontWeight: 700, color: color }}>
                {pct}% <span style={{ fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-muted)' }}>do total</span>
            </span>
        </div>
    );
};


const FarmaciaDashboard = () => {
    const navigate = useNavigate();
    const { tenantLink, isSuperAdmin } = useAuth();
    const { unidadeAtiva, isUnitResolved, dataRefreshKey } = useFarmacia();
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');
    
    const [alertaAberto, setAlertaAberto] = useState(false);
    const [barrasAnimadas, setBarrasAnimadas] = useState(false);
    const alertaRef = useRef(null);
    const analiseOpRef = useRef(null);

    // KPI Real Data State
    const diasTraduzidos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const initFlow = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        initFlow.push({ _ref: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, name: diasTraduzidos[d.getDay()], Entradas: 0, Saídas: 0 });
    }

    const [kpiData, setKpiData] = useState({
        totalItens: 0,
        entradasHoje: 0,
        saidasHoje: 0,
        itensCriticos: 0,
        saudePercentual: 0,
        itensSemEstoque: 0,
        itensAbaixoMinimo: 0,
        flowChartData: initFlow,
        distribuicaoData: [],
        insightsData: null,
        validadesData: [
            { label: '0 – 30 dias', sub: 'Crítico',   qtd: 0, pct: 0, cor: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { label: '30 – 60 dias', sub: 'Atenção',  qtd: 0, pct: 0, cor: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: '60 – 90 dias', sub: 'Monitorar', qtd: 0, pct: 0, cor: '#3b82f6', bg: 'rgba(59,130,246,0.1)' }
        ],
        feedData: [],
        isLoading: true
    });

    // Mesma função da tela de Saídas — range BRT correto para 'Hoje'
    const getHojeSP = () => {
        const agora = new Date();
        const partes = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(agora);
        const p = Object.fromEntries(partes.map(x => [x.type, x.value]));
        const inicio = new Date(`${p.year}-${p.month}-${p.day}T00:00:00-03:00`);
        const fim    = new Date(`${p.year}-${p.month}-${p.day}T23:59:59.999-03:00`);
        return { inicio, fim };
    };

    useEffect(() => {
        const fetchFarmaciaKPIs = async () => {
            try {
                // 1. Buscar items SEM filtro is_active (idêntico à tela de Entradas)
                const { data: items, error: itemsError } = await supabase
                    .from('inventory_items')
                    .select('id, minimum_stock, category_id, name');

                if (itemsError) throw itemsError;

                const { data: cats } = await supabase.from('item_categories').select('id, name');
                const catMap = {}; (cats||[]).forEach(c => catMap[c.id] = c.name);

                const { data: unts } = await supabase.from('units').select('id, name');
                const unitsMap = {}; (unts||[]).forEach(u => unitsMap[u.id] = u.name);

                // Fase 3: Batches para Validade
                const { data: batches } = await supabase.from('item_batches').select('id, expiration_date');

                const validItems = items || [];
                const totalItens = validItems.length;
                let entradasHoje = 0;
                let saidasHoje = 0;
                let itensCriticos = 0;
                let itensSemEstoque = 0;
                let itensAbaixoMinimo = 0;
                let saudePercentual = 0;
                
                let historicoDias = [...initFlow];
                let distribuicaoData = [];
                let consumoUnidadesData = [];
                let topMedicamentosData = [];
                let insightsData = null;
                let validadesData = [...kpiData.validadesData];
                let feedData = [];

                // Aguardar resolução da unidade antes de calcular (evita fetch prematuro com unidade null)
                if (!isUnitResolved) return;

                const { data: movements, error: movError } = await supabase
                    .from('stock_movements')
                    .select('id, inventory_item_id, movement_type, quantity, created_at, unit_id, batch_id, created_by, notes');

                if (movError) throw movError;

                console.log(`[Dashboard Farmácia] Total de movimentos carregados: ${(movements || []).length}`);

                // Range BRT de hoje — idêntico ao getHojeSP() da tela de Saídas
                const { inicio: hojeInicio, fim: hojeFim } = getHojeSP();

                // Usado para validade de lotes
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const limitDate = new Date(); limitDate.setDate(limitDate.getDate() - 30);
                limitDate.setHours(0, 0, 0, 0);
                const start30 = limitDate.toISOString();

                    const distMap = {};
                    const unitMap = {};
                    const itemExitMap = {};
                    const itemsNameMap = {};
                    validItems.forEach(i => itemsNameMap[i.id] = i.name);

                    const balanceByItem = {};
                    const batchBalance = {};
                    const allItemIds = new Set(validItems.map(i => i.id));
                    
                    // Identificar a Unidade ativa (espelha o contexto das telas operacionais)
                    let targetUnitId = null;
                    if (unidadeAtiva && unidadeAtiva.label && unidadeAtiva.label !== 'Todas') {
                        const foundUnit = (unts || []).find(u => u.name.toUpperCase() === unidadeAtiva.label.toUpperCase());
                        if (foundUnit) targetUnitId = foundUnit.id;
                    }
                    
                    // HOJE_INICIO_ISO / HOJE_FIM_ISO declarados aqui — usados pelo gráfico e pelos cards abaixo
                    const HOJE_INICIO_ISO = hojeInicio.toISOString();
                    const HOJE_FIM_ISO    = hojeFim.toISOString();

                    // ── flowChartData: query DEDICADA — últimos 7 dias ───────────────────────
                    // Mesmo problema dos cards: os 1000 registros mais antigos não incluem os últimos 7 dias.
                    // Solução: query no servidor com filtro de data, sem filtro de unidade (visão consolidada).
                    // Conta REGISTROS por dia (coerente com os cards de Entradas/Saídas Hoje).

                    const dia7Inicio = new Date(hojeInicio);
                    dia7Inicio.setDate(dia7Inicio.getDate() - 6); // meia-noite BRT de 6 dias atrás
                    const DIA7_INICIO_ISO = dia7Inicio.toISOString();

                    const { data: movsGrafico } = await supabase
                        .from('stock_movements')
                        .select('movement_type, created_at')
                        .gte('created_at', DIA7_INICIO_ISO)
                        .lte('created_at', HOJE_FIM_ISO)
                        .in('movement_type', ['ENTRY', 'EXIT']);

                    console.log('[Dashboard Gráfico] Total movimentos 7 dias:', (movsGrafico || []).length);
                    console.log('[Dashboard Gráfico] ENTRY no intervalo:', (movsGrafico || []).filter(m => m.movement_type === 'ENTRY').length);
                    console.log('[Dashboard Gráfico] EXIT no intervalo:', (movsGrafico || []).filter(m => m.movement_type === 'EXIT').length);

                    // Montar os 7 dias com chave BRT via Intl (mesmo padrão usado no forEach original)
                    historicoDias = [];
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date(hojeInicio);
                        d.setDate(d.getDate() - i);
                        const p = Object.fromEntries(
                            new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
                                .formatToParts(d).map(x => [x.type, x.value])
                        );
                        historicoDias.push({
                            _ref: `${p.year}-${p.month}-${p.day}`,
                            name: diasTraduzidos[d.getDay()],
                            Entradas: 0, Saídas: 0
                        });
                    }
                    console.log('[Dashboard Gráfico] Chave exemplo (hoje):', historicoDias[6]?._ref);

                    // Distribuir movimentos por dia — conta registros (não quantidade de itens)
                    (movsGrafico || []).forEach(m => {
                        const p = Object.fromEntries(
                            new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
                                .formatToParts(new Date(m.created_at)).map(x => [x.type, x.value])
                        );
                        const movKey = `${p.year}-${p.month}-${p.day}`;
                        const diaAlvo = historicoDias.find(h => h._ref === movKey);
                        if (diaAlvo) {
                            if (m.movement_type === 'ENTRY') diaAlvo.Entradas += 1;
                            else if (m.movement_type === 'EXIT') diaAlvo['Saídas'] += 1;
                        }
                    });

                    console.log('[Dashboard Gráfico] Série final:', JSON.stringify(historicoDias.map(d => ({ dia: d._ref, E: d.Entradas, S: d['Saídas'] }))));
                    // ─────────────────────────────────────────────────────────────────────────
                    


                    console.log('[Dashboard] Primeiro created_at da lista:', movements?.[0]?.created_at ?? 'nenhum');
                    console.log('[Dashboard] Início do dia BRT:', HOJE_INICIO_ISO);
                    console.log('[Dashboard] Fim do dia BRT:  ', HOJE_FIM_ISO);

                    const entryMovsTotal = (movements || []).filter(m => m.movement_type === 'ENTRY');
                    console.log('[Dashboard] ENTRY antes do filtro de data:', entryMovsTotal.length);

                    // Dashboard = visão gerencial consolidada — SEM filtro de unidade
                    // UPA (57) + UMSJ (1) = 58 → card mostra 58, independente da unidade selecionada
                    const { count: entradasHojeCount, error: entradasErr } = await supabase
                        .from('stock_movements')
                        .select('id', { count: 'exact', head: true })
                        .eq('movement_type', 'ENTRY')
                        .gte('created_at', HOJE_INICIO_ISO)
                        .lte('created_at', HOJE_FIM_ISO);
                    if (!entradasErr && entradasHojeCount !== null) {
                        entradasHoje = entradasHojeCount;
                    }
                    console.log('[Dashboard] ENTRY hoje (todas as unidades):', entradasHoje);

                    // ── saidasHoje: mesma lógica de entradasHoje, filtro EXIT ───────────────
                    const exitMovsTotal = (movements || []).filter(m => m.movement_type === 'EXIT');
                    console.log('[Dashboard] EXIT antes do filtro de data:', exitMovsTotal.length);

                    const { count: saidasHojeCount, error: saidasErr } = await supabase
                        .from('stock_movements')
                        .select('id', { count: 'exact', head: true })
                        .eq('movement_type', 'EXIT')
                        .gte('created_at', HOJE_INICIO_ISO)
                        .lte('created_at', HOJE_FIM_ISO);
                    if (!saidasErr && saidasHojeCount !== null) {
                        saidasHoje = saidasHojeCount;
                    }
                    console.log('[Dashboard] EXIT hoje (todas as unidades):', saidasHoje);
                    // ─────────────────────────────────────────────────────────────────────────

                    if (movements) {
                        // HOJE_ISO mantida apenas para compatibilidade dos outros cálculos do forEach
                        const HOJE_ISO = new Date().toISOString().split('T')[0];

                        movements.forEach(m => {
                            if (targetUnitId && m.unit_id !== targetUnitId) return;

                            const dataObj = new Date(m.created_at);
                            const isToday = dataObj >= hojeInicio && dataObj <= hojeFim;

                            const qty = Number(m.quantity) || 0;
                            const itemId = m.inventory_item_id;

                            // diaAlvo removido — historicoDias agora é alimentado pela query dedicada acima

                            if (!balanceByItem[itemId]) balanceByItem[itemId] = 0;

                            if (m.movement_type === 'ENTRY') {
                                balanceByItem[itemId] += qty;
                                // entradasHoje já calculado via query dedicada acima — não incrementar aqui
                            } else if (m.movement_type === 'EXIT') {
                                balanceByItem[itemId] += qty;
                                // saidasHoje já calculado via query dedicada acima — não incrementar aqui
                            }

                            if (m.movement_type === 'EXIT' && m.created_at >= start30) {
                                if (m.unit_id) {
                                    unitMap[m.unit_id] = (unitMap[m.unit_id] || 0) + Math.abs(qty);
                                }
                                itemExitMap[itemId] = (itemExitMap[itemId] || 0) + Math.abs(qty);
                            }

                            if (m.batch_id) {
                                batchBalance[m.batch_id] = (batchBalance[m.batch_id] || 0) + qty;
                            }
                        });

                        console.log(`[Dashboard Farmácia] Resultado final — EntradasHoje=${entradasHoje} SaídasHoje=${saidasHoje}`);

                        const sortedMovs = [...movements].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                        feedData = sortedMovs.map(m => {
                            let responsavel = m.created_by || 'Não informado';
                            const notes = m.notes || '';
                            
                            if (notes.includes('||RESP:')) {
                                const parts = notes.split('||RESP:');
                                responsavel = parts[1]?.trim() || responsavel;
                            }
                            
                            const isUuid = typeof responsavel === 'string' && uuidRegex.test(responsavel);
                            if (!responsavel || responsavel === '-' || responsavel === 'null' || responsavel === 'undefined' || isUuid) {
                                responsavel = 'Não informado';
                            }
                            
                            return {
                                id: m.id,
                                tipo: m.movement_type === 'ENTRY' ? 'Entrada' : 'Saída',
                                medicamento: itemsNameMap[m.inventory_item_id] || 'Removido',
                                responsavel,
                                quantidade: m.movement_type === 'ENTRY' ? m.quantity : -m.quantity,
                                data: m.created_at
                            };
                        });
                    }
                    // ── itensCriticos: balanço COMPLETO via query dedicada ──────────────────
                    // Motivo: balanceByItem é construído dos 1000 registros mais antigos do fetch principal.
                    // Com banco grande, o balanço fica incompleto → saldo parece OK mas item está crítico.
                    // Solução: buscar TODOS os movimentos com payload mínimo (3 campos) para calcular
                    // o saldo real de cada item, idêntico ao FarmaciaEstoque (DB exits = negativos).
                    const { data: allMovsBalance, error: balanceErr } = await supabase
                        .from('stock_movements')
                        .select('inventory_item_id, movement_type, quantity')
                        .limit(100000); // payload leve: só 3 campos

                    const balanceCompleto = {};
                    const batchBalanceCompleto = {}; // batchBalance real — sem limite de 1000
                    (allMovsBalance || []).forEach(m => {
                        const net = Number(m.quantity) || 0; // EXITs já são negativos no banco (mesmo que FarmaciaEstoque ln.101)
                        balanceCompleto[m.inventory_item_id] = (balanceCompleto[m.inventory_item_id] || 0) + net;
                    });

                    console.log('[Dashboard] Total itens cadastrados:', validItems.length);
                    console.log('[Dashboard] Itens com balanço calculado:', Object.keys(balanceCompleto).length);

                    let healthySkus = 0;
                    let totalMonitorado = 0;
                    const exemplosCriticos = [];

                    validItems.forEach(item => {
                        // Usa balanceCompleto (todos os movimentos) em vez de balanceByItem (limitado a 1000)
                        const balance = balanceCompleto[item.id] ?? null;
                        if (balance === null) return; // item sem nenhuma movimentação — não monitora

                        totalMonitorado += 1;
                        const minStock = Number(item.minimum_stock) || 0;

                        if (balance === 0) {
                            itensSemEstoque += 1;
                        } else if (balance > 0 && balance <= minStock) {
                            itensAbaixoMinimo += 1;
                        }

                        if (balance <= minStock) {
                            itensCriticos += 1;
                            if (exemplosCriticos.length < 3) {
                                exemplosCriticos.push({ nome: item.name, balance, minStock });
                            }
                        } else {
                            healthySkus += 1;
                        }

                        // distMap usa balanceCompleto (todos os movimentos, sem limite de 1000)
                        const balRef = balanceCompleto[item.id] || 0;
                        if (balRef > 0) {
                            distMap[item.category_id] = (distMap[item.category_id] || 0) + balRef;
                        }
                    });

                    console.log('[Dashboard] Itens críticos encontrados:', itensCriticos);
                    if (exemplosCriticos.length > 0) {
                        console.log('[Dashboard] Exemplos de itens críticos:', exemplosCriticos.map(e => `${e.nome} (saldo=${e.balance}, mín=${e.minStock})`).join(' | '));
                    }
                    // ─────────────────────────────────────────────────────────────────────────

                    saudePercentual = totalMonitorado > 0 ? Math.round((healthySkus / totalMonitorado) * 100) : 0;

                    if (batches) {
                        // batchBalanceCompleto: saldo real de cada lote (todos os movimentos, sem limite)
                        // Precisamos de batch_id no allMovsBalance — fetch complementar
                        const { data: allMovsBatch } = await supabase
                            .from('stock_movements')
                            .select('batch_id, quantity')
                            .not('batch_id', 'is', null)
                            .limit(100000);
                        (allMovsBatch || []).forEach(m => {
                            const net = Number(m.quantity) || 0;
                            if (m.batch_id) batchBalanceCompleto[m.batch_id] = (batchBalanceCompleto[m.batch_id] || 0) + net;
                        });

                        let critico = 0, atencao = 0, monitorar = 0;
                        batches.forEach(b => {
                            // Usa batchBalanceCompleto em vez de batchBalance (limitado a 1000 registros antigos)
                            if ((batchBalanceCompleto[b.id] || 0) > 0 && b.expiration_date) {
                                const expDate = new Date(b.expiration_date);
                                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                                if (diffDays <= 30) critico++;
                                else if (diffDays <= 60) atencao++;
                                else if (diffDays <= 90) monitorar++;
                            }
                        });
                        const totalB = critico + atencao + monitorar || 1;
                        validadesData[0] = { ...validadesData[0], qtd: critico,   pct: Math.round((critico/totalB)*100)  };
                        validadesData[1] = { ...validadesData[1], qtd: atencao,   pct: Math.round((atencao/totalB)*100)  };
                        validadesData[2] = { ...validadesData[2], qtd: monitorar, pct: Math.round((monitorar/totalB)*100) };
                    }

                    const distribuicaoDataRaws = Object.keys(distMap)
                        .map(id => ({ name: catMap[id] || 'Sem Categoria', value: distMap[id] }))
                        .sort((a, b) => b.value - a.value);

                    // Debug: resumo da distribuição
                    const totalGeral = distribuicaoDataRaws.reduce((s, c) => s + c.value, 0) || 1;
                    console.log('[Dashboard Distribuição] Total geral de estoque:', totalGeral);
                    distribuicaoDataRaws.forEach(cat => {
                        console.log(`  Categoria: ${cat.name} | Saldo: ${cat.value} | Pct: ${Math.round((cat.value / totalGeral) * 100)}%`);
                    });

                    distribuicaoData = distribuicaoDataRaws.slice(0, 4);
                    if (distribuicaoDataRaws.length > 4) {
                        const outrosValue = distribuicaoDataRaws.slice(4).reduce((s, c) => s + c.value, 0);
                        distribuicaoData.push({ name: 'Outros', value: outrosValue });
                    }
                    const colors = ['#00967D', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];
                    // Recalcular totalGeral sobre os dados finais (inclui "Outros" consolidado)
                    const totalGeralFinal = distribuicaoData.reduce((s, d) => s + d.value, 0) || 1;
                    distribuicaoData.forEach((d, i) => {
                        d.color   = colors[i % colors.length];
                        d.pct     = Math.round((d.value / totalGeralFinal) * 100); // percentual pronto para o tooltip
                        d.valueInt = Math.round(d.value);                           // inteiro sem casas decimais
                        console.log(`[Dashboard Distrib] ${d.name}: ${d.valueInt} un | ${d.pct}% do total (total=${Math.round(totalGeralFinal)})`);
                    });
                    // ── consumoUnidadesData: query DEDICADA — EXITs últimos 30 dias ────────────
                    // Motivo: unitMap é construído no forEach dos 1000 registros mais antigos.
                    // EXITs recentes ficam além do limite → gráfico fica zerado.
                    // Solução: query dedicada com filtro de data e tipo no servidor.
                    const { data: exitsUlt30, error: exitsErr } = await supabase
                        .from('stock_movements')
                        .select('unit_id, quantity')
                        .eq('movement_type', 'EXIT')
                        .gte('created_at', start30);

                    const unitMapDedicado = {};
                    (exitsUlt30 || []).forEach(m => {
                        if (m.unit_id) {
                            unitMapDedicado[m.unit_id] = (unitMapDedicado[m.unit_id] || 0) + Math.abs(Number(m.quantity) || 0);
                        }
                    });

                    console.log('[Dashboard Consumo] Total EXITs últimos 30d:', (exitsUlt30 || []).length);
                    Object.entries(unitMapDedicado).forEach(([uid, consumo]) => {
                        console.log(`  Unidade: ${unitsMap[uid] || uid} | Consumo: ${Math.round(consumo)}`);
                    });

                    consumoUnidadesData = Object.keys(unitMapDedicado)
                        .map(id => ({ name: unitsMap[id] || 'Desconhecida', consumo: unitMapDedicado[id] }))
                        .sort((a, b) => b.consumo - a.consumo)
                        .slice(0, 5);

                    console.log('[Dashboard Consumo] Série final:', JSON.stringify(consumoUnidadesData.map(u => ({ unidade: u.name, consumo: Math.round(u.consumo) }))));
                    // ─────────────────────────────────────────────────────────────────────────

                    // ── topMedicamentosData: query DEDICADA — Itens mais movimentados (30d) ─────
                    // Motivo: itemExitMap era preenchido no forEach dos 1000 registros mais antigos.
                    // Solução: buscar movimentações (ENTRY e EXIT) dos últimos 30 dias no servidor.
                    const { data: movsTop30 } = await supabase
                        .from('stock_movements')
                        .select('inventory_item_id, quantity')
                        .gte('created_at', start30);

                    const movTotalMap = {};
                    (movsTop30 || []).forEach(m => {
                        const itemId = m.inventory_item_id;
                        if (itemId) {
                            movTotalMap[itemId] = (movTotalMap[itemId] || 0) + Math.abs(Number(m.quantity) || 0);
                        }
                    });

                    console.log('[Dashboard Movimentados] Total de registros 30d:', (movsTop30 || []).length);

                    const topMedicamentosDataRaw = Object.keys(movTotalMap)
                        .map(id => ({ 
                            nome: itemsNameMap[id] || 'Item Removido', 
                            qtd: movTotalMap[id] 
                        }))
                        .sort((a, b) => b.qtd - a.qtd)
                        .slice(0, 5);

                    console.log('[Dashboard Movimentados] Top 5 itens:', JSON.stringify(topMedicamentosDataRaw));

                    const maxQtd = topMedicamentosDataRaw[0]?.qtd || 1;
                    topMedicamentosData = topMedicamentosDataRaw.map(d => ({ ...d, max: maxQtd }));

                    const totalSaidas30d = consumoUnidadesData.reduce((s, u) => s + u.consumo, 0) || 1;
                    const topUnit = consumoUnidadesData[0];
                    const pctUnit = topUnit ? Math.round((topUnit.consumo / totalSaidas30d) * 100) : 0;
                    const topCat = distribuicaoData[0];
                    const topItem = topMedicamentosData[0];

                    insightsData = {
                        insight1: topUnit ? { tag: 'Maior Consumidor', name: topUnit.name, desc: `${pctUnit}% das requisições corporativas (30d)`, color: '#00967D' } : null,
                        insight2: topCat ? { tag: 'Maior Volume Físico', name: topCat.name, desc: `${topCat.value.toLocaleString('pt-BR')} itens no depósito em tempo real`, color: '#3b82f6' } : null,
                        insight3: topItem ? { tag: 'Alta Dispensação', name: topItem.nome, desc: `${topItem.qtd.toLocaleString('pt-BR')} saídas nos últimos 30d`, color: '#ea580c' } : null
                    };

                    // ── Debug: resumo consolidado do badge de alertas ─────────────────────────
                    const alertasValidade  = validadesData[0]?.qtd || 0; // lotes 0-30 dias
                    const alertasZerado    = itensSemEstoque;             // saldo === 0
                    const alertasAbaixoMin = itensAbaixoMinimo;           // 0 < saldo <= minStock
                    const totalAlertas     = alertasValidade + alertasZerado + alertasAbaixoMin;
                    console.log('[Dashboard Badge] Alertas por tipo:');
                    console.log('  Validade próxima (0-30d):', alertasValidade);
                    console.log('  Estoque zerado:          ', alertasZerado);
                    console.log('  Abaixo do mínimo:        ', alertasAbaixoMin);
                    console.log('  TOTAL DO BADGE:          ', totalAlertas);
                    // ─────────────────────────────────────────────────────────────────────────

                const chartDataLimpo = historicoDias.map(({ name, Entradas, Saídas }) => ({ name, Entradas, Saídas }));

                setKpiData({
                    totalItens,
                    entradasHoje,
                    saidasHoje,
                    itensCriticos,
                    itensSemEstoque,
                    itensAbaixoMinimo,
                    saudePercentual,
                    flowChartData: chartDataLimpo,
                    distribuicaoData,
                    consumoUnidadesData,
                    topMedicamentosData,
                    insightsData,
                    validadesData,
                    feedData,
                    isLoading: false
                });

            } catch (err) {
                console.error("Erro ao buscar KPIs Reais da Farmácia:", err);
                setKpiData(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchFarmaciaKPIs();
    }, [isUnitResolved, unidadeAtiva, dataRefreshKey]);

    // Fade-in animation for bars on scroll visibility
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setBarrasAnimadas(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 } // Dispara quando 15% do bloco estiver visível
        );

        if (analiseOpRef.current) {
            observer.observe(analiseOpRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Fechar painel ao clicar fora
    useEffect(() => {
        const handleClickFora = (e) => {
            if (alertaRef.current && !alertaRef.current.contains(e.target)) {
                setAlertaAberto(false);
            }
        };
        if (alertaAberto) document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, [alertaAberto]);

    const { itensSemEstoque, itensAbaixoMinimo, saudePercentual } = kpiData;
    const itensVencendo = (kpiData.validadesData && kpiData.validadesData[0]) ? kpiData.validadesData[0].qtd : 0;
    const saudeCor = saudePercentual < 70 ? '#ef4444' : saudePercentual <= 85 ? '#f59e0b' : '#10b981';
    const saudeLabel = saudePercentual < 70 ? 'Crítico' : saudePercentual <= 85 ? 'Atenção' : 'Saudável';


    // Cálculo da média semanal para o Hero Chart
    const mediaMovimentacoes = useMemo(() => {
        const arr = kpiData.flowChartData || [];
        if (arr.length === 0) return 0;
        const total = arr.reduce((acc, curr) => acc + curr.Entradas + curr.Saídas, 0);
        return Math.round(total / (arr.length * 2));
    }, [kpiData.flowChartData]);

    const kpiCards = [
        { label: 'Total de Itens',  value: kpiData.totalItens,  desc: 'estoque ativo no sistema', context: 'base consolidada', trendColor: 'var(--text-muted)', icon: Package,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', shadow: 'rgba(59,130,246,0.15)' },
        { label: 'Entradas Hoje',   value: kpiData.entradasHoje, desc: 'fluxo dentro da média de abastecimento', context: '+1 vs ontem', trendColor: '#10b981', icon: PackagePlus,   color: '#00967D', bg: 'rgba(0,150,125,0.1)', shadow: 'rgba(0,150,125,0.15)' },
        { label: 'Saídas Hoje',     value: kpiData.saidasHoje,   desc: 'demanda regular do dia',   context: 'dentro da média semanal', trendColor: 'var(--text-muted)', icon: PackageMinus,  color: '#ea580c', bg: 'rgba(234,88,12,0.1)', shadow: 'rgba(234,88,12,0.15)' },
        { label: 'Itens Críticos',  value: kpiData.itensCriticos,desc: 'reposição recomendada', context: 'prioridade de análise', trendColor: '#ef4444', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef4444', shadow: 'rgba(239,68,68,0.15)' },
    ];

    return (
        <div className="farmacia-page-container" style={{ gap: '0.85rem' }}>
            {/* Keyframe da animação do painel flutuante e do ícone crítico */}
            <style>{`
                @keyframes alertaPainelEntrar {
                    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulseIconCritico {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.15); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes alertaItemFadeIn {
                    from { opacity: 0; transform: translateX(-5px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
            {/* ── Header + Alerta Dropdown Flutuante ── */}
            <header className="farmacia-page-header" style={{ alignItems: 'center', position: 'relative' }}>
                {/* Título */}
                <div style={{ flex: 1 }}>
                    <h1 className="farmacia-page-title">Dashboard — Farmácia</h1>
                    <p className="farmacia-page-subtitle">Centro de comando operacional do estoque hospitalar.</p>
                </div>

                {/* Gatilho + Painel Flutuante */}
                {(itensSemEstoque > 0 || itensAbaixoMinimo > 0 || itensVencendo > 0) && (
                    <div ref={alertaRef} style={{ position: 'relative', flexShrink: 0 }}>
                        {/* Botão gatilho */}
                        <button
                            onClick={() => setAlertaAberto(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                                border: `1px solid ${alertaAberto ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.28)'}`,
                                background: alertaAberto ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
                                color: '#dc2626', fontSize: '0.8rem', fontWeight: 700,
                                transition: 'all 0.2s ease',
                                boxShadow: alertaAberto ? '0 2px 8px rgba(239,68,68,0.12)' : 'none',
                            }}
                        >
                            <Bell 
                                size={16} 
                                strokeWidth={2.5} 
                                style={{
                                    animation: (!alertaAberto && itensSemEstoque > 0) ? 'pulseIconCritico 2s infinite ease-in-out' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                            <span>
                                {itensSemEstoque + itensAbaixoMinimo + itensVencendo} alerta
                                {itensSemEstoque + itensAbaixoMinimo + itensVencendo > 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.65, marginLeft: '2px' }}>
                                {alertaAberto ? '▲' : '▼'}
                            </span>
                        </button>

                        {/* Painel flutuante */}
                        {alertaAberto && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                width: '296px', zIndex: 100,
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                boxShadow: '0 16px 40px rgba(0,0,0,0.08), 0 6px 16px rgba(0,0,0,0.04)',
                                padding: '1rem',
                                animation: 'alertaPainelEntrar 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
                                transformOrigin: 'top right'
                            }}>
                                {/* Cabeçalho do painel */}
                                <div style={{ marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <Bell size={14} color="#dc2626" strokeWidth={2.5} />
                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Atenção Operacional</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                        {itensSemEstoque + itensAbaixoMinimo + itensVencendo} eventos exigem atenção
                                    </div>
                                </div>

                                {/* Alertas por nível */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {itensSemEstoque > 0 && canAccessFarmacia(role, '/farmacia/estoque') && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(239,68,68,0.25)', borderLeft: '3px solid #dc2626',
                                                background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)', 
                                                textAlign: 'left', transition: 'background 0.15s, transform 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.05s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <XCircle size={14} color="#dc2626" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#dc2626' }}>
                                                    {itensSemEstoque === 1
                                                        ? `1 item sem estoque`
                                                        : `${itensSemEstoque} itens sem estoque`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Reposição imediata recomendada.</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensAbaixoMinimo > 0 && canAccessFarmacia(role, '/farmacia/estoque') && (
                                        <button onClick={() => { navigate('/farmacia/estoque'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', 
                                                textAlign: 'left', transition: 'background 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.1s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <AlertTriangle size={14} color="#b45309" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#b45309' }}>
                                                    {itensAbaixoMinimo === 1
                                                        ? `1 item abaixo do mínimo`
                                                        : `${itensAbaixoMinimo} itens abaixo do mínimo`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Análise de reabastecimento sugerida.</div>
                                            </div>
                                        </button>
                                    )}
                                    {itensVencendo > 0 && canAccessFarmacia(role, '/farmacia/relatorios') && (
                                        <button onClick={() => { navigate('/farmacia/relatorios'); setAlertaAberto(false); }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)', 
                                                textAlign: 'left', transition: 'background 0.15s', width: '100%',
                                                animation: 'alertaItemFadeIn 0.3s ease-out 0.15s both'
                                            }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Clock size={14} color="#1d4ed8" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1d4ed8' }}>
                                                    {itensVencendo === 1
                                                        ? `1 item com validade próxima` // Cannot easily extract name here without the complex filter logic duplicated
                                                        : `${itensVencendo} itens com validade próxima`}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Avaliar redistribuição de estoque.</div>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* ── 2) KPI Cards + Gauge Saúde (Movido para cima do gráfico) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                {kpiCards.map((k, i) => (
                    <div key={i} className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${k.border || k.color}`, gap: '0.2rem', padding: '0.875rem 1rem' }}>
                        <span className="farmacia-kpi-label">{k.label}</span>
                        <span className="farmacia-kpi-value" style={{ color: k.color }}>
                            <AnimatedCount target={k.value} />
                        </span>
                        <span className="farmacia-kpi-desc" style={{ marginBottom: '2px' }}>{k.desc}</span>
                        <span style={{ fontSize: '0.62rem', color: k.trendColor, opacity: 0.48, fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            • {k.context}
                        </span>
                        <div className="farmacia-kpi-icon" style={{ 
                            backgroundColor: k.bg, 
                            color: k.color, 
                            top: '1rem', 
                            right: '1rem',
                            border: `1px solid ${k.bg.replace('0.1)', '0.2)')}`,
                            boxShadow: `0 4px 10px ${k.shadow}`,
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px'
                        }}>
                            <k.icon size={17} />
                        </div>
                    </div>
                ))}

                {/* Gauge Saúde */}
                <div className="farmacia-kpi-card dashboard-chart-surface" style={{ borderLeft: `4px solid ${saudeCor}`, gap: '0.1rem', padding: '0.875rem 1rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <span className="farmacia-kpi-label" style={{ marginBottom: '0.2rem' }}>Saúde do Estoque</span>
                    <div style={{ margin: '0.2rem 0' }}>
                        <GaugeCircular pct={saudePercentual} cor={saudeCor} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: saudeCor, marginTop: '2px' }}>{saudeLabel}</span>
                    <span style={{ fontSize: '0.62rem', color: saudePercentual <= 85 ? saudeCor : 'var(--text-muted)', opacity: 0.48, fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        • {saudePercentual < 70 ? 'ação preventiva urgente' : saudePercentual <= 85 ? 'análise recomendada' : 'operação estabilizada'}
                    </span>
                </div>
            </div>

            {/* ── 3) Hero Chart – Fluxo Últimos 7 Dias ── */}
            <div className="dashboard-chart-surface" style={{ padding: '1.1rem 1.5rem 0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
                            Fluxo de Medicamentos — Últimos 7 dias
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Entradas e saídas diárias do período</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: 18, height: 3, background: '#00967D', borderRadius: 2, display: 'inline-block' }} />
                                <span style={{ width: 8, height: 8, background: '#00967D', borderRadius: '50%', display: 'inline-block' }} />
                            </span>
                            <span style={{ color: 'var(--text)' }}>Entradas</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: 18, height: 3, background: '#ea580c', borderRadius: 2, display: 'inline-block' }} />
                                <span style={{ width: 8, height: 8, background: '#ea580c', borderRadius: '50%', display: 'inline-block' }} />
                            </span>
                            <span style={{ color: 'var(--text)' }}>Saídas</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--text-muted)', opacity: 0.5, display: 'inline-block' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Média semanal</span>
                        </span>
                    </div>
                </div>
                <div style={{ width: '100%', height: 280, minHeight: 280 }}>
                    {kpiData.flowChartData && kpiData.flowChartData.length > 0 && (
                        <ResponsiveContainer width="99%" height={280}>
                            <AreaChart data={kpiData.flowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#00967D" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#00967D" stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#ea580c" stopOpacity={0.14} />
                                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                            <RechartsTooltip content={<HeroTooltip />} />
                            <ReferenceLine y={mediaMovimentacoes} stroke="var(--text-muted)" strokeDasharray="4 4" opacity={0.3} />
                            <Area type="monotone" dataKey="Entradas" stroke="#00967D" strokeWidth={3} fill="url(#gradEntradas)" dot={{ r: 4, fill: '#00967D', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#00967D' }} animationDuration={1000} />
                            <Area type="monotone" dataKey="Saídas"   stroke="#ea580c" strokeWidth={3} fill="url(#gradSaidas)"   dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#ea580c' }} animationDuration={1000} animationBegin={200} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── 4) Análise Operacional: Donut + Barras Setor ── */}
            <div ref={analiseOpRef} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
                <Activity size={15} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Análise Operacional</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>

                {/* Donut Distribuição — refinado */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small">Distribuição do Estoque</h3>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4.5rem', marginTop: '1.25rem', marginBottom: '0.75rem',
                        opacity: barrasAnimadas ? 1 : 0,
                        transform: barrasAnimadas ? 'scale(1)' : 'scale(0.96)',
                        transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)' 
                    }}>
                        {/* Donut com espessura maior (innerRadius 50, outerRadius 78 = 28px de espessura) */}
                        <div style={{ position: 'relative', width: 170, height: 170, minHeight: 170, flexShrink: 0 }}>
                            {kpiData.distribuicaoData && kpiData.distribuicaoData.length > 0 && (
                                <PieChart width={170} height={170} style={{ overflow: 'visible' }}>
                                    {barrasAnimadas && (
                                        <Pie
                                            data={kpiData.distribuicaoData || []}
                                            innerRadius={54} outerRadius={78}
                                            paddingAngle={3} dataKey="value"
                                            stroke="none" startAngle={90} endAngle={-270}
                                            animationDuration={800}
                                        >
                                            {(kpiData.distribuicaoData || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                    )}
                                    <RechartsTooltip
                                        wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
                                        content={<TooltipDistribuicao />}
                                    />
                                </PieChart>
                            )}
                            {/* Conteúdo central do Donut */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', lineHeight: 1.1 }}>
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, marginBottom: '2px' }}>Total de Categ.</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0' }}>{(kpiData.distribuicaoData || []).length}</span>
                                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', opacity: 0.65, marginTop: '1px' }}>ativas</span>
                            </div>
                        </div>
                        {/* Legenda com melhor alinhamento e espaçamento */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {(kpiData.distribuicaoData || []).map((item, idx) => {
                                const totalDist = (kpiData.distribuicaoData || []).reduce((a, b) => a + b.value, 0) || 1;
                                return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                                    <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.82rem' }}>{item.name}</span>
                                    <span style={{ color: item.color, fontWeight: 700, fontSize: '0.85rem' }}>
                                        {Math.round((item.value / totalDist) * 100)}%
                                    </span>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>

                {/* Consumo por Unidade — presença visual reforçada */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small">Consumo de Medicamentos por Unidade</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1.5rem' }}>
                        {(kpiData.consumoUnidadesData || []).map((u, i) => {
                            const totalList = kpiData.consumoUnidadesData || [];
                            const total = totalList.reduce((s, d) => s + d.consumo, 0) || 1;
                            const pct = ((u.consumo / total) * 100).toFixed(1);
                            const maxCons = totalList.length > 0 ? totalList[0].consumo : 1;
                            const barW = (u.consumo / maxCons) * 100;
                            const barColor = i === 0 ? '#00967D' : '#2E86AB';
                            const trilhoColor = i === 0 ? 'rgba(0,150,125,0.06)' : 'rgba(46,134,171,0.05)';
                            return (
                                <div key={i}>
                                    {/* Nome da unidade — destaque máximo */}
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>
                                        {u.name}
                                    </div>
                                    {/* Barra proporcional — mais espessa e com contraste */}
                                    <div style={{ height: '16px', background: trilhoColor, borderRadius: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                                        <div style={{ height: '100%', width: barrasAnimadas ? `${barW}%` : '0%', background: barColor, borderRadius: '8px', transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                                    </div>
                                    {/* Valor e percentual — hierarquia clara */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: barColor, lineHeight: 1 }}>
                                            {u.consumo.toLocaleString('pt-BR')} un
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', opacity: 0.7, lineHeight: 1 }}>
                                            {pct}% do total
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── 5) Top Medicamentos ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={17} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Análise de Consumo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 2.5fr) minmax(280px, 1fr)', gap: '1rem' }}>
                <div className="dashboard-chart-surface" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem' }}>Medicamentos Mais Movimentados</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '1rem' }}>
                        {(kpiData.topMedicamentosData || []).map((m, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                        <span style={{ display: 'inline-block', width: '22px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}º</span>
                                        {m.nome}
                                    </div>
                                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>
                                        {m.qtd.toLocaleString('pt-BR')} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>un</span>
                                    </span>
                                </div>
                                
                                {/* Barra da exata mesma largura total (100%) */}
                                <div style={{ height: '6px', background: 'rgba(150, 150, 150, 0.3)', borderRadius: '999px', overflow: 'hidden', width: '100%' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: barrasAnimadas ? `${(m.qtd / m.max) * 100}%` : '0%', 
                                        background: rankColors[i], 
                                        borderRadius: '999px', 
                                        transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)' 
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Painel Inteligente de Insights */}
                <div className="dashboard-chart-surface" style={{ 
                    display: 'flex', flexDirection: 'column',
                    opacity: barrasAnimadas ? 1 : 0, 
                    transform: barrasAnimadas ? 'translateX(0)' : 'translateX(15px)',
                    background: barrasAnimadas ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)' : 'rgba(255, 255, 255, 0)',
                    border: barrasAnimadas ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                    boxShadow: barrasAnimadas ? '0 12px 35px -5px rgba(59, 130, 246, 0.15), 0 4px 15px rgba(59, 130, 246, 0.05)' : 'none',
                    transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-25px', top: '50%', opacity: 0.05, pointerEvents: 'none', transform: 'translateY(-50%)', zIndex: 0 }}>
                        <Activity size={160} color="var(--color-primary)" strokeWidth={1.2} />
                    </div>
                
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem', color: 'var(--color-primary)', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', paddingBottom: '0.65rem', fontWeight: 900, fontSize: '0.95rem', textShadow: '0 1px 2px rgba(59, 130, 246, 0.1)', zIndex: 1, position: 'relative' }}>
                        Insights de Consumo
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, zIndex: 1, position: 'relative' }}>
                        {kpiData.insightsData?.insight1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
                                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: kpiData.insightsData.insight1.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpiData.insightsData.insight1.tag}</span>
                                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>{kpiData.insightsData.insight1.name}</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>{kpiData.insightsData.insight1.desc}</span>
                            </div>
                        )}
                        
                        {kpiData.insightsData?.insight2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.2)' }}>
                                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: kpiData.insightsData.insight2.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpiData.insightsData.insight2.tag}</span>
                                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)' }}>{kpiData.insightsData.insight2.name}</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>{kpiData.insightsData.insight2.desc}</span>
                            </div>
                        )}
                        
                        {kpiData.insightsData?.insight3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: 'auto' }}>
                                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: kpiData.insightsData.insight3.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpiData.insightsData.insight3.tag}</span>
                                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>
                                    {kpiData.insightsData.insight3.desc}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 6 + 7) Monitoramento + Movimentações ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={17} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monitoramento</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr)', gap: '1rem', paddingBottom: '1.5rem' }}>

                {/* Validades */}
                <div className="dashboard-chart-surface">
                    <h3 className="farmacia-title-small" style={{ marginBottom: '1.25rem' }}>Validades Próximas</h3>
                    {(kpiData.validadesData || []).map((v, i) => (
                        <div key={i} style={{ marginBottom: i < 2 ? '1.25rem' : 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.83rem', fontWeight: i === 0 ? 700 : 600, marginBottom: '6px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: v.cor, fontSize: i === 0 ? '0.87rem' : '0.83rem' }}>{v.label} <span style={{ color: i === 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 0.9 : 1 }}>({v.sub})</span></span>
                                    {i === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>Vencem em até 30 dias</span>}
                                </div>
                                <span style={{ color: i === 0 ? 'var(--text)' : 'var(--text-muted)', fontSize: i === 0 ? '0.9rem' : '0.83rem' }}>
                                    {v.qtd} {i === 0 ? 'itens críticos' : 'itens'}
                                </span>
                            </div>
                            <div style={{ height: '8px', background: v.bg, borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${v.pct}%`, background: v.cor, borderRadius: '4px', transition: 'width 1s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Movimentações Recentes */}
                <div className="farmacia-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem 0.65rem', borderBottom: '1px solid rgba(150, 150, 150, 0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                            <h3 className="farmacia-title-small">Movimentações Recentes</h3>
                            <button className="farmacia-link-action" onClick={() => navigate('/farmacia/movimentacoes')} style={{ fontSize: '0.83rem' }}>
                                Ver todas <ChevronRight size={14} />
                            </button>
                        </div>
                        
                        {/* Resumo do Dia — dados reais derivados do kpiData */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', backgroundColor: 'var(--bg-muted-light)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}>Hoje:</span>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <ArrowLeftRight size={12} color="#00967D" />
                                <span style={{ fontWeight: 600, color: '#00967D' }}>+{kpiData.entradasHoje}</span> <span style={{ color: 'var(--text-muted)' }}>entradas</span>
                            </div>
                            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <ArrowLeftRight size={12} color="#ea580c" style={{ transform: 'scaleX(-1)' }} />
                                <span style={{ fontWeight: 600, color: '#ea580c' }}>-{kpiData.saidasHoje}</span> <span style={{ color: 'var(--text-muted)' }}>saídas</span>
                            </div>
                            <div style={{ height: '12px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                            <span style={{ fontWeight: 600, color: kpiData.entradasHoje >= kpiData.saidasHoje ? '#00967D' : '#ea580c', background: kpiData.entradasHoje >= kpiData.saidasHoje ? 'rgba(0,150,125,0.1)' : 'rgba(234,88,12,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                {kpiData.entradasHoje >= kpiData.saidasHoje ? 'Saldo positivo' : 'Saldo negativo'}
                            </span>
                        </div>
                    </div>
                    <div className="farmacia-table-wrapper" style={{ border: 'none', flex: 1, borderRadius: 0, paddingBottom: '0.75rem' }}>
                        <table className="farmacia-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.5rem 1rem', width: '12%' }}>Data</th>
                                    <th style={{ padding: '0.5rem 1rem', width: '15%' }}>Tipo</th>
                                    <th style={{ padding: '0.5rem 1rem', width: '43%' }}>Medicamento</th>
                                    <th style={{ padding: '0.5rem 1rem', width: '20%' }}>Responsável</th>
                                    <th style={{ padding: '0.5rem 1rem', textAlign: 'right', width: '10%' }}>Qtd</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const feedList = kpiData.feedData || [];
                                    if (feedList.length === 0) return <tr><td colSpan="5" style={{padding:'2rem', textAlign:'center', color:'var(--text-muted)'}}>Nenhuma movimentação registrada.</td></tr>;

                                    const highestEntry = Math.max(...feedList.filter(m => m.tipo === 'Entrada').map(m => m.quantidade), 0);
                                    const highestExit = Math.min(...feedList.filter(m => m.tipo === 'Saída').map(m => m.quantidade), 0);
                                    
                                    return feedList.map(mov => {
                                        const isHighestEntry = mov.tipo === 'Entrada' && mov.quantidade === highestEntry;
                                        const isHighestExit = mov.tipo === 'Saída' && mov.quantidade === highestExit;
                                        const isHighlight = isHighestEntry || isHighestExit;
                                        
                                        return (
                                            <tr key={mov.id} style={{ 
                                                cursor: 'default', 
                                                transition: 'background 0.15s',
                                                backgroundColor: isHighlight ? 'var(--bg-muted)' : 'transparent'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = isHighlight ? 'var(--bg-muted)' : 'var(--bg-muted-light)'}
                                                onMouseLeave={e => e.currentTarget.style.background = isHighlight ? 'var(--bg-muted)' : 'transparent'}>
                                                <td className="farmacia-td-muted" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {new Date(mov.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    <span className={`farmacia-badge badge-tipo badge-tipo-${mov.tipo.toLowerCase()}`}
                                                        style={{ fontSize: '0.7rem', padding: '0.12rem 0.4rem', flexShrink: 0 }}>
                                                        {mov.tipo}
                                                    </span>
                                                </td>
                                                <td className="farmacia-td-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 500, overflow: 'hidden' }}>
                                                    <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mov.medicamento}>
                                                        {mov.medicamento}
                                                    </div>
                                                </td>
                                                <td style={{ 
                                                    padding: '0.5rem 1rem', 
                                                    fontSize: '0.82rem', 
                                                    color: 'var(--text-muted)', 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis', 
                                                    whiteSpace: 'nowrap',
                                                    fontStyle: mov.responsavel === 'Não informado' ? 'italic' : 'normal'
                                                }} title={mov.responsavel}>
                                                    {mov.responsavel}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: mov.quantidade > 0 ? '#00967D' : '#ea580c', whiteSpace: 'nowrap' }}>
                                                            {mov.quantidade > 0 ? '+' : ''}{mov.quantidade}
                                                        </span>
                                                        {isHighlight && (
                                                            <span style={{ fontSize: '0.62rem', fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                                                maior do dia
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FarmaciaDashboard;
