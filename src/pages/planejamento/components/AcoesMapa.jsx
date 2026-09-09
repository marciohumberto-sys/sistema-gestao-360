import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { geocodeActionAddressProgressive } from '../../../services/api/cartoGeocoding.service';
import { Loader2, MapPin } from 'lucide-react';

const CARTO_BASEMAP_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY;

// Componente para capturar a instância do mapa e converter coordenadas para pixels
const HoverManager = ({ pontos, hoveredPoint, setHoveredPoint }) => {
    const map = useMap();
    const hoverTimeoutRef = React.useRef(null);

    const handleMouseOver = (ponto, e) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        const point = map.latLngToContainerPoint(e.latlng);
        setHoveredPoint({ ...ponto, x: point.x, y: point.y });
    };

    const handleMouseOut = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredPoint(null);
        }, 200);
    };

    const handleTooltipMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    const handleTooltipMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredPoint(null);
        }, 200);
    };

    const getStatusStyle = (status) => {
        const styles = {
            'CONCLUIDA': { label: 'Concluída', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
            'EM_ANDAMENTO': { label: 'Em Andamento', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
            'EM_RISCO': { label: 'Em Risco', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
            'PARALISADA': { label: 'Paralisada', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
            'NAO_INICIADA': { label: 'Não Iniciada', bg: 'rgba(148, 163, 184, 0.1)', color: '#64748b' },
            'CANCELADA': { label: 'Cancelada', bg: 'rgba(71, 85, 105, 0.1)', color: '#475569' }
        };
        return styles[status] || styles['NAO_INICIADA'];
    };

    return (
        <>
            <style>{`
                @keyframes tooltipEnter {
                    from { opacity: 0; transform: scale(0.96) translateY(5px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes progressGrow {
                    from { width: 0; }
                    to { width: var(--progress-width); }
                }
                .map-tooltip {
                    animation: tooltipEnter 0.18s ease-out forwards;
                }
                .tooltip-progress-fill {
                    animation: progressGrow 0.6s ease-out forwards;
                }
            `}</style>

            {pontos.map((ponto) => {
                if (ponto.isGroup) {
                    const icon = L.divIcon({
                        html: `<div style="background-color: ${ponto.color || '#94a3b8'}; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);">${ponto.count}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: [26, 26],
                        iconAnchor: [13, 13]
                    });
                    return (
                        <Marker
                            key={ponto.id}
                            position={[ponto.lat, ponto.lng]}
                            icon={icon}
                            eventHandlers={{
                                mouseover: (e) => handleMouseOver(ponto, e),
                                mouseout: handleMouseOut
                            }}
                        />
                    );
                }
                
                return (
                    <CircleMarker
                        key={ponto.id}
                        center={[ponto.lat, ponto.lng]}
                        radius={10}
                        pathOptions={{ 
                            color: ponto.color, 
                            fillColor: ponto.color, 
                            fillOpacity: 0.7, 
                            weight: 2 
                        }}
                        eventHandlers={{
                            mouseover: (e) => handleMouseOver(ponto, e),
                            mouseout: handleMouseOut
                        }}
                    />
                );
            })}

            {hoveredPoint && (
                <div 
                    className="map-tooltip"
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                    style={{
                        position: 'absolute',
                        left: hoveredPoint.x > 200 ? hoveredPoint.x - 225 : hoveredPoint.x + 20,
                        top: hoveredPoint.y > 150 ? hoveredPoint.y - 150 : hoveredPoint.y + 20,
                        zIndex: 1000,
                        width: '240px',
                        maxWidth: '280px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 12px -3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0',
                        pointerEvents: 'auto',
                        borderLeft: `5px solid ${hoveredPoint.color}`,
                    }}
                >
                    <strong style={{ 
                        color: '#0f172a', display: 'block', fontSize: '0.9rem', marginBottom: '10px', fontWeight: 600, lineHeight: '1.3',
                        minWidth: 0, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word'
                    }}>
                        {hoveredPoint.isGroup ? `${hoveredPoint.count} ações neste local` : hoveredPoint.title}
                    </strong>
                    
                    {hoveredPoint.isGroup ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                Local: <span style={{ color: '#1e293b', fontWeight: 600 }}>{hoveredPoint.bairro || 'Vários'}</span>
                            </div>
                            <div 
                                onWheel={(e) => e.stopPropagation()}
                                style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px', 
                                maxHeight: '180px', 
                                overflowY: 'auto',
                                paddingRight: '4px'
                            }}>
                                {hoveredPoint.actions.map((act, i) => {
                                    const s = getStatusStyle(act.status);
                                    return (
                                        <div key={i} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: '8px', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', lineHeight: '1.2' }}>{act.title || act.nome}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                                                <span style={{ fontSize: '0.65rem', color: s.color, fontWeight: 700 }}>{s.label}</span>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>{act.progresso}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Status Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
                                {(() => {
                                    const s = getStatusStyle(hoveredPoint.status);
                                    return (
                                        <span style={{ 
                                            backgroundColor: s.bg, 
                                            color: s.color, 
                                            fontSize: '0.65rem', 
                                            padding: '2px 8px', 
                                            borderRadius: '100px', 
                                            fontWeight: 700,
                                            border: `1px solid ${s.color}20`,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em'
                                        }}>
                                            {s.label}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Progresso com Barra */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Progresso:</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{hoveredPoint.progresso}%</span>
                                </div>
                                <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                                    <div 
                                        className="tooltip-progress-fill"
                                        style={{ 
                                            height: '100%', 
                                            backgroundColor: hoveredPoint.color,
                                            '--progress-width': `${hoveredPoint.progresso}%`
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Informações Extras */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: '4px', minWidth: 0 }}>
                                    <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Local:</span>
                                    <span style={{ color: '#1e293b', fontWeight: 600, minWidth: 0, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.25 }}>{hoveredPoint.bairro}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', minWidth: 0 }}>
                                    <span style={{ color: '#64748b', fontWeight: 500, flexShrink: 0 }}>Responsável:</span>
                                    <span style={{ color: '#1e293b', fontWeight: 600, minWidth: 0, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.25 }}>{hoveredPoint.responsavel}</span>
                                </div>
                            </div>

                            {/* Divisor e Secretaria */}
                            <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#64748b', minWidth: 0 }}>
                                    <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>🏛</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', minWidth: 0, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.25 }}>
                                        {hoveredPoint.secretaria && hoveredPoint.secretaria !== 'Não informada' && !hoveredPoint.secretaria.toLowerCase().startsWith('secretaria') 
                                            ? `Secretaria de ${hoveredPoint.secretaria}` 
                                            : hoveredPoint.secretaria}
                                    </span>
                                </div>
                            </div>

                            {hoveredPoint._usedAddress && (
                                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '0.65rem', color: '#94a3b8' }}>
                                    <strong>Endereço buscado:</strong><br/>
                                    {hoveredPoint._usedAddress}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

const formatStatus = (status) => {
    const map = {
        'NAO_INICIADA': 'Não Iniciada',
        'EM_ANDAMENTO': 'Em Andamento',
        'CONCLUIDA': 'Concluída',
        'EM_RISCO': 'Em Risco',
        'PARALISADA': 'Paralisada',
        'CANCELADA': 'Cancelada'
    };
    return map[status] || status.replace('_', ' ');
};

const BEZERROS_CENTER = [-8.2359, -35.7967];

const MapAutoFocus = ({ pontos, searchQuery }) => {
    const map = useMap();
    const previousSearchQuery = React.useRef(searchQuery);
    const previousPointsCount = React.useRef(pontos?.length || 0);
    
    useEffect(() => {
        const pointsCount = pontos?.length || 0;
        if (previousSearchQuery.current !== searchQuery || previousPointsCount.current !== pointsCount) {
            previousSearchQuery.current = searchQuery;
            previousPointsCount.current = pointsCount;
            
            if (!pontos || pontos.length === 0) return;
            
            if (pontos.length === 1) {
                map.flyTo([pontos[0].lat, pontos[0].lng], 16, { duration: 0.5 });
            } else {
                const bounds = pontos.map(p => [p.lat, p.lng]);
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true, duration: 0.5 });
            }
        }
    }, [searchQuery, pontos, map]);

    return null;
};

const AcoesMapa = ({ data }) => {
    const { isSuperAdmin, tenantLink } = useAuth();
    const isAdmin = isSuperAdmin || tenantLink?.role === 'admin';
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [localData, setLocalData] = useState(data || []);
    useEffect(() => {
        setLocalData(data || []);
    }, [data]);
    
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodingStatus, setGeocodingStatus] = useState('');

    if (!localData && !true) { // Workaround for prop check if needed, but data is currently unused
        return (
            <div className="dashboard-card animate-fade-in-up delay-300" style={{ height: '100%', minHeight: '400px' }}>
                <h2 className="card-title">Mapa de Execução das Ações</h2>
                <div style={{ flex: 1, width: '100%', minHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    Nenhuma ação disponível no mapa.
                </div>
            </div>
        );
    }

    const MUNICIPALITY_CENTER = [-8.234777256840292, -35.75168643326829];

    const normalizeSearch = (value = '') =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    const searchNormalized = normalizeSearch(searchQuery);

    const acoes = (localData || []).filter(acao => {
        if (acao.show_on_map !== true) return false;
        
        if (searchNormalized) {
            const searchableText = normalizeSearch([
                acao.title,
                acao.name,
                acao.nome,
                acao.descricao,
                acao.description,
                acao.local,
                acao.bairro,
                acao.neighborhood,
                acao.address_neighborhood,
                acao.endereco_bairro,
                acao.rua,
                acao.street,
                acao.endereco,
                acao.address,
                acao.complemento,
                acao.referencia,
                acao.reference,
                acao.cidade,
                acao.city,
                acao.secretaria,
                acao.responsavel,
                acao.eixo
            ].filter(Boolean).join(' '));
            
            if (!searchableText.includes(searchNormalized)) return false;
        }
        
        return true;
    });

    const baseComCoordenadas = [];
    const baseSemCoordenadas = [];

    acoes.forEach(acao => {
        if (!acao.latitude || !acao.longitude) {
            baseSemCoordenadas.push(acao);
            return;
        }

        const lat = Number(acao.latitude);
        const lng = Number(acao.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            baseComCoordenadas.push({ ...acao, _latNumber: lat, _lngNumber: lng });
        } else {
            baseSemCoordenadas.push(acao);
        }
    });

    const todasComCoordenadas = [...baseComCoordenadas];

    const runManualGeocoding = async () => {
        const allPendentesSemFiltro = (localData || []).filter(a => a.show_on_map === true && (!a.latitude || !a.longitude));
        
        const pendentes = baseSemCoordenadas.filter(a => 
            a.show_on_map === true && 
            (a.bairro || a.neighborhood || a.address_district || a.address_street || a.rua || a.address_reference || a.referencia)
        ).slice(0, 20);

        if (pendentes.length === 0) {
            setGeocodingStatus('Nenhuma ação pendente com endereço');
            setTimeout(() => setGeocodingStatus(''), 4000);
            return;
        }

        setIsGeocoding(true);
        let atualizadas = 0;
        let naoLocalizadas = 0;
        let rejeitadasArea = 0;

        for (let i = 0; i < pendentes.length; i++) {
            const acao = pendentes[i];
            setGeocodingStatus(`Atualizando coordenadas... ${i + 1} de ${pendentes.length}`);
            
            const coords = await geocodeActionAddressProgressive(acao);
            if (coords) {
                const isValidArea = (
                    coords.lat >= -8.45 && coords.lat <= -8.05 &&
                    coords.lng >= -36.05 && coords.lng <= -35.55
                );
                
                if (!isValidArea) {
                    rejeitadasArea++;
                    continue; // Pula o salvamento
                }

                const { error } = await supabase.from('planning_actions')
                    .update({ latitude: coords.lat, longitude: coords.lng })
                    .eq('id', acao.id);
                
                if (!error) {
                    atualizadas++;
                    setLocalData(prev =>
                        prev.map(item =>
                            item.id === acao.id
                                ? { ...item, latitude: String(coords.lat), longitude: String(coords.lng) }
                                : item
                        )
                    );
                } else {
                    console.error(`[CARTO Geocoding] update Supabase erro para ${acao.id}: ${error.message}`);
                    naoLocalizadas++;
                }
            } else {
                naoLocalizadas++;
            }
        }

        let finalStatus = '';
        if (rejeitadasArea > 0 && atualizadas === 0) {
            finalStatus = `${rejeitadasArea} coordenada(s) rejeitada(s) fora da área de Bezerros`;
        } else if (atualizadas > 0 && naoLocalizadas === 0 && rejeitadasArea === 0) {
            finalStatus = 'Coordenadas atualizadas com sucesso';
        } else {
            finalStatus = `${atualizadas} atualizadas · ${naoLocalizadas} não localizadas${rejeitadasArea > 0 ? ` · ${rejeitadasArea} rejeitada(s)` : ''}`;
        }
        setGeocodingStatus(finalStatus);
        
        setTimeout(() => {
            setIsGeocoding(false);
            setGeocodingStatus('');
        }, 5000);
    };

    const qtdSemLocalizacao = acoes.length - todasComCoordenadas.length;

    const getPriority = (status) => {
        const p = {
            'EM_RISCO': 5,
            'PARALISADA': 4,
            'EM_ANDAMENTO': 3,
            'NAO_INICIADA': 2,
            'CONCLUIDA': 1,
            'CANCELADA': 0
        };
        return p[status] || 2;
    };

    const groupedPoints = {};
    todasComCoordenadas.forEach(acao => {
        const rLat = Number(acao._latNumber).toFixed(5);
        const rLng = Number(acao._lngNumber).toFixed(5);
        const key = `${rLat},${rLng}`;
        
        if (!groupedPoints[key]) {
            groupedPoints[key] = [];
        }
        groupedPoints[key].push({
            ...acao,
            bairro: acao.bairro || acao.address_district || ''
        });
    });

    const pontosGeorreferenciados = Object.values(groupedPoints).map(group => {
        if (group.length === 1) {
            const acao = group[0];
            return {
                ...acao,
                isGroup: false,
                lat: acao._latNumber,
                lng: acao._lngNumber
            };
        } else {
            const sortedByPriority = [...group].sort((a, b) => getPriority(b.status) - getPriority(a.status));
            const mostCritical = sortedByPriority[0];
            
            return {
                id: `group-${mostCritical._latNumber}-${mostCritical._lngNumber}`,
                isGroup: true,
                count: group.length,
                actions: sortedByPriority,
                lat: mostCritical._latNumber,
                lng: mostCritical._lngNumber,
                color: mostCritical.color,
                bairro: mostCritical.bairro,
                status: mostCritical.status
            };
        }
    });

    const zoom = 15;

    const renderLegend = () => (
        <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            right: '20px', 
            background: 'white', 
            padding: '10px 14px', 
            borderRadius: '8px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
            zIndex: 1000,
            fontSize: '0.75rem',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a', fontSize: '0.8rem' }}>Legenda de Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></div>
                    <span style={{ color: '#475569' }}>Concluída</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '2px' }}></div>
                    <span style={{ color: '#475569' }}>Em Andamento</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#94a3b8', borderRadius: '2px' }}></div>
                    <span style={{ color: '#475569' }}>Não Iniciada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }}></div>
                    <span style={{ color: '#475569' }}>Paralisada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></div>
                    <span style={{ color: '#475569' }}>Em Risco / Crítico</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-card animate-fade-in-up delay-300" style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title" style={{ marginBottom: '12px' }}>Mapa de Execução das Ações</h2>
            
            <div style={{ 
                flex: 1, 
                borderRadius: '12px', 
                overflow: 'hidden', 
                position: 'relative', 
                zIndex: 0,
                border: '1px solid #f1f5f9',
                margin: '0 4px 4px 4px'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    right: '12px', 
                    width: '300px', 
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <style>{`
                        .btn-with-tooltip { position: relative; }
                        .btn-with-tooltip:hover::after {
                            content: attr(aria-label);
                            position: absolute;
                            bottom: -32px;
                            right: 0;
                            background-color: #1e293b;
                            color: white;
                            padding: 6px 10px;
                            border-radius: 6px;
                            font-size: 0.75rem;
                            white-space: nowrap;
                            z-index: 1000;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            pointer-events: none;
                            animation: tooltipEnter 0.2s ease-out forwards;
                            font-weight: 500;
                        }
                    `}</style>
                    <div style={{ 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Buscar bairro, rua, referência ou ação..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '36px',
                                    padding: '0 30px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                    color: '#1e293b',
                                    backgroundColor: 'transparent'
                                }}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 4 }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                        {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
                                {isGeocoding ? (
                                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                        <Loader2 size={16} className="animate-spin" />
                                    </span>
                                ) : (
                                    baseSemCoordenadas.length > 0 && (
                                        <button 
                                            onClick={runManualGeocoding}
                                            className="btn-with-tooltip"
                                            style={{ 
                                                background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', transition: 'all 0.2s'
                                            }}
                                            aria-label="Atualizar coordenadas faltantes"
                                        >
                                            <MapPin size={14} />
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                    {geocodingStatus && (
                        <div style={{ 
                            alignSelf: 'flex-end',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '0.75rem',
                            color: '#475569',
                            fontWeight: 500,
                            animation: 'tooltipEnter 0.2s ease-out forwards',
                            maxWidth: '100%',
                            textAlign: 'right'
                        }}>
                            {geocodingStatus}
                        </div>
                    )}
                </div>

                {searchQuery && acoes.length === 0 ? (
                    <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        background: 'rgba(255, 255, 255, 0.95)', 
                        padding: '10px 20px', 
                        borderRadius: '20px', 
                        zIndex: 900, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        pointerEvents: 'none',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>Nenhuma ação localizada para esta busca.</span>
                    </div>
                ) : null}

                <MapContainer 
                    center={MUNICIPALITY_CENTER} 
                    zoom={zoom} 
                    minZoom={10}
                    maxZoom={18}
                    style={{ height: '100%', width: '100%', minHeight: '350px' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
					  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
					  url={
						CARTO_BASEMAP_KEY
						  ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_BASEMAP_KEY}`
						  : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
					  }
					/>
                    <HoverManager pontos={pontosGeorreferenciados} hoveredPoint={hoveredPoint} setHoveredPoint={setHoveredPoint} />
                    <MapAutoFocus pontos={pontosGeorreferenciados} searchQuery={searchQuery} />
                    {renderLegend()}
                </MapContainer>
            </div>
        </div>
    );
};

export default AcoesMapa;
