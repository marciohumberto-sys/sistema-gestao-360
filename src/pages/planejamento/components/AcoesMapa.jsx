import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

const AcoesMapa = ({ data }) => {
    const [hoveredPoint, setHoveredPoint] = useState(null);

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

    const MUNICIPALITY_CENTER = [-8.234579, -35.751683];

    const BAIRRO_COORDINATES = {
        'Centro': [-8.234579, -35.751683],
        'Bairro Novo': [-8.236400, -35.750200],
        'Santo Amaro': [-8.231200, -35.753500],
        'Cruzeiro': [-8.233500, -35.756800],
        'Gameleira': [-8.238200, -35.752100],
        'São Sebastião': [-8.235100, -34.748500], // Ajustado para não cair no mar
        'Retiro': [-8.240500, -35.745800],
        'Zona Rural': [-8.255000, -35.720000],
        'São Pedro': [-8.225000, -35.780000]
    };

    const pontosGeorreferenciados = (data || []).map((acao, idx) => {
        const coords = BAIRRO_COORDINATES[acao.bairro] || MUNICIPALITY_CENTER;
        
        // Jitter determinístico baseado no index para evitar sobreposição total
        const latOffset = (Math.sin(idx * 1.5) * 0.0015);
        const lngOffset = (Math.cos(idx * 1.5) * 0.0015);

        return {
            ...acao,
            lat: coords[0] + latOffset,
            lng: coords[1] + lngOffset
        };
    });

    const zoom = 14;

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
                <MapContainer 
                    center={MUNICIPALITY_CENTER} 
                    zoom={zoom} 
                    style={{ height: '100%', width: '100%', minHeight: '350px' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    
                    <HoverManager 
                        pontos={pontosGeorreferenciados} 
                        hoveredPoint={hoveredPoint} 
                        setHoveredPoint={setHoveredPoint} 
                    />
                    
                    {renderLegend()}
                </MapContainer>
            </div>
        </div>
    );
};

export default AcoesMapa;
