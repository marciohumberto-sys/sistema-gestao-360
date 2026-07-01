import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../lib/supabase';

// Componente para capturar a instância do mapa e converter coordenadas para pixels
const HoverManager = ({ pontos, hoveredPoint, setHoveredPoint }) => {
    const map = useMap();

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

            {pontos.map((ponto) => (
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
                        mouseover: (e) => {
                            const point = map.latLngToContainerPoint(e.latlng);
                            setHoveredPoint({ ...ponto, x: point.x, y: point.y });
                        },
                        mouseout: () => setHoveredPoint(null)
                    }}
                />
            ))}

            {hoveredPoint && (
                <div 
                    className="map-tooltip"
                    style={{
                        position: 'absolute',
                        left: hoveredPoint.x > 200 ? hoveredPoint.x - 225 : hoveredPoint.x + 20,
                        top: hoveredPoint.y > 150 ? hoveredPoint.y - 150 : hoveredPoint.y + 20,
                        zIndex: 1000,
                        width: '210px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        padding: '16px',
                        boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 12px -3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0',
                        pointerEvents: 'none',
                        borderLeft: `5px solid ${hoveredPoint.color}`,
                    }}
                >
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9rem', marginBottom: '10px', fontWeight: 600, lineHeight: '1.3' }}>
                        {hoveredPoint.title}
                    </strong>
                    
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Local:</span>
                                <span style={{ color: '#1e293b', fontWeight: 600 }}>{hoveredPoint.bairro}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Responsável:</span>
                                <span style={{ color: '#1e293b', fontWeight: 600 }}>{hoveredPoint.responsavel}</span>
                            </div>
                        </div>

                        {/* Divisor e Secretaria */}
                        <div style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                                <span style={{ fontSize: '0.8rem' }}>🏛</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
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

const FitBoundsManager = () => {
    return null;
};

const AcoesMapa = ({ data }) => {
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [geocodedActions, setGeocodedActions] = useState([]);
    const [isGeocoding, setIsGeocoding] = useState(false);

    if (!data && !true) { // Workaround for prop check if needed, but data is currently unused
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

    const acoes = data || [];
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

    useEffect(() => {
        const fetchMissingCoordinates = async () => {
            const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            
            if (!GOOGLE_API_KEY) {
                return; // Silencioso em produção, não falha apenas não executa rotina auto
            }

            const missing = acoes.filter(acao => {
                if (!acao.latitude || !acao.longitude) return true;
                const lat = Number(acao.latitude);
                const lng = Number(acao.longitude);
                return !(Number.isFinite(lat) && Number.isFinite(lng));
            });

            if (missing.length === 0) return;
            
            const elegiveis = missing.filter(a => a.address_street && a.address_number);

            if (elegiveis.length === 0) return;
            
            setIsGeocoding(true);
            const newGeocoded = [];
            
            for (const acao of elegiveis) {
                // Montar o endereço exato: Rua/Avenida, número, bairro, Bezerros, PE, CEP, Brasil.
                const street = acao.address_street.trim();
                const num = acao.address_number.trim();
                const district = acao.address_district ? acao.address_district.trim() : '';
                const zip = acao.address_zipcode ? acao.address_zipcode.trim() : '';
                
                const addressParts = [
                    `${street}, ${num}`,
                    district,
                    'Bezerros',
                    'PE',
                    zip,
                    'Brasil'
                ].filter(p => p); // Remove vazios

                const addressQuery = addressParts.join(', ');
                const cacheKey = `gmaps_${addressQuery}`;
                const cached = localStorage.getItem(cacheKey);
                
                let shouldFetch = true;

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed.lat && parsed.lng) {
                            newGeocoded.push({ ...acao, _latNumber: parsed.lat, _lngNumber: parsed.lng, _usedAddress: addressQuery });
                            shouldFetch = false;
                        }
                        if (parsed.notFound) {
                            localStorage.removeItem(cacheKey); // Força tentar de novo
                        }
                    } catch(e) {}
                }

                if (shouldFetch) {
                    try {
                        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${GOOGLE_API_KEY}`;
                        const response = await fetch(url);
                        const dataRes = await response.json();

                        if (dataRes.status === 'OK' && dataRes.results.length > 0) {
                            const location = dataRes.results[0].geometry.location;
                            localStorage.setItem(cacheKey, JSON.stringify({ lat: location.lat, lng: location.lng }));
                            newGeocoded.push({ ...acao, _latNumber: location.lat, _lngNumber: location.lng, _usedAddress: addressQuery });
                            
                            // Persistir no banco de forma silenciosa
                            supabase.from('planning_actions')
                                .update({ latitude: location.lat, longitude: location.lng })
                                .eq('id', acao.id)
                                .then(({ error }) => {
                                    if (error) console.error('[MAPA] Erro ao salvar coordenadas no banco:', error);
                                });
                        } else {
                            localStorage.setItem(cacheKey, JSON.stringify({ notFound: true }));
                        }
                    } catch (error) {
                        // Silencioso em produção
                    }
                }
            }
            
            if (newGeocoded.length > 0) {
                setGeocodedActions(prev => {
                    const map = new Map(prev.map(a => [a.id, a]));
                    newGeocoded.forEach(a => map.set(a.id, a));
                    return Array.from(map.values());
                });
            }
            setIsGeocoding(false);
        };

        fetchMissingCoordinates();
    }, [data]);

    const todasComCoordenadas = [...baseComCoordenadas, ...geocodedActions.filter(g => 
        !baseComCoordenadas.some(b => b.id === g.id)
    )];

    const qtdSemLocalizacao = acoes.length - todasComCoordenadas.length;

    const pontosGeorreferenciados = todasComCoordenadas.map((acao, idx) => {
        const latOffset = (Math.sin(idx * 1.5) * 0.00015);
        const lngOffset = (Math.cos(idx * 1.5) * 0.00015);

        return {
            ...acao,
            lat: acao._latNumber + latOffset,
            lng: acao._lngNumber + lngOffset
        };
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
            <h2 className="card-title">Mapa de Execução das Ações</h2>
            
            <div style={{ 
                flex: 1, 
                borderRadius: '12px', 
                overflow: 'hidden', 
                position: 'relative', 
                zIndex: 0,
                border: '1px solid #f1f5f9',
                margin: '0 4px 4px 4px'
            }}>
                {(qtdSemLocalizacao > 0 || isGeocoding) && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#475569',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backdropFilter: 'blur(4px)'
                    }}>
                        {isGeocoding ? (
                            <>
                                <span style={{color: '#3b82f6', fontSize: '0.8rem', animation: 'spin 1s linear infinite'}}>⟳</span>
                                Buscando endereços no mapa...
                            </>
                        ) : (
                            <>
                                <span style={{color: '#f59e0b', fontSize: '0.8rem'}}>ℹ</span>
                                {qtdSemLocalizacao} {qtdSemLocalizacao === 1 ? 'ação sem localização georreferenciada' : 'ações sem localização georreferenciada'}
                            </>
                        )}
                    </div>
                )}
                <MapContainer 
                    center={MUNICIPALITY_CENTER} 
                    zoom={zoom} 
                    minZoom={10}
                    maxZoom={18}
                    style={{ height: '100%', width: '100%', minHeight: '350px' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <HoverManager pontos={pontosGeorreferenciados} hoveredPoint={hoveredPoint} setHoveredPoint={setHoveredPoint} />
                    {renderLegend()}
                </MapContainer>
            </div>
        </div>
    );
};

export default AcoesMapa;
