import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Componente para capturar a instância do mapa e converter coordenadas para pixels
const HoverManager = ({ pontos, hoveredPoint, setHoveredPoint }) => {
    const map = useMap();

    return (
        <>
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
                <div style={{
                    position: 'absolute',
                    // Lógica de posicionamento inteligente para evitar cortes
                    left: hoveredPoint.x > 200 ? hoveredPoint.x - 210 : hoveredPoint.x + 20,
                    top: hoveredPoint.y > 150 ? hoveredPoint.y - 140 : hoveredPoint.y + 20,
                    zIndex: 1000,
                    width: '190px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0',
                    pointerEvents: 'none',
                    borderLeft: `4px solid ${hoveredPoint.color}`,
                    transition: 'all 0.1s ease-out'
                }}>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.85rem', marginBottom: '6px', lineHeight: '1.2' }}>
                        {hoveredPoint.title}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span><strong style={{ color: '#1e293b' }}>Status:</strong> {hoveredPoint.status.replace('_', ' ')}</span>
                        <span><strong style={{ color: '#1e293b' }}>Progresso:</strong> {hoveredPoint.progresso}%</span>
                        <span><strong style={{ color: '#1e293b' }}>Local:</strong> {hoveredPoint.bairro}</span>
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>
                            {hoveredPoint.secretaria}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
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

    // Coordenadas base de Bezerros/PE e mapeamento de bairros
    const MUNICIPALITY_CENTER = [-8.234579, -35.751683];

    const BAIRRO_COORDINATES = {
        'Centro': [-8.234579, -35.751683],
        'Bairro Novo': [-8.236400, -35.750200],
        'Santo Amaro': [-8.231200, -35.753500],
        'Cruzeiro': [-8.233500, -35.756800],
        'Gameleira': [-8.238200, -35.752100],
        'São Sebastião': [-8.235100, -35.748500],
        'Retiro': [-8.240500, -35.745800]
    };

    const STATUS_COLORS = {
        'CONCLUIDA': '#10b981',
        'EM_ANDAMENTO': '#8b5cf6',
        'EM_RISCO': '#ef4444',
        'PARALISADA': '#f59e0b',
        'NAO_INICIADA': '#94a3b8'
    };

    const acoesMockadas = [
        {
            id: 'm-1',
            title: 'Cozinha Comunitária – Gameleira',
            bairro: 'Gameleira',
            status: 'EM_ANDAMENTO',
            progresso: 45,
            secretaria: 'Sec. de Assistência Social'
        },
        {
            id: 'm-2',
            title: 'Pavimentação de Vias – Bairro Novo',
            bairro: 'Bairro Novo',
            status: 'CONCLUIDA',
            progresso: 100,
            secretaria: 'Sec. de Infraestrutura'
        },
        {
            id: 'm-3',
            title: 'Iluminação LED – Centro',
            bairro: 'Centro',
            status: 'EM_ANDAMENTO',
            progresso: 80,
            secretaria: 'Sec. de Serviços Públicos'
        },
        {
            id: 'm-4',
            title: 'Reforma UBS – Santo Amaro',
            bairro: 'Santo Amaro',
            status: 'EM_RISCO',
            progresso: 30,
            secretaria: 'Sec. de Saúde'
        },
        {
            id: 'm-5',
            title: 'Quadra Poliesportiva – Cruzeiro',
            bairro: 'Cruzeiro',
            status: 'PARALISADA',
            progresso: 15,
            secretaria: 'Sec. de Esportes'
        },
        {
            id: 'm-6',
            title: 'Centro de Inovação – São Sebastião',
            bairro: 'São Sebastião',
            status: 'NAO_INICIADA',
            progresso: 0,
            secretaria: 'Sec. de Planejamento'
        },
        {
            id: 'm-7',
            title: 'Creche Municipal – Retiro',
            bairro: 'Retiro',
            status: 'EM_ANDAMENTO',
            progresso: 60,
            secretaria: 'Sec. de Educação'
        }
    ];

    const pontosGeorreferenciados = acoesMockadas.map(acao => {
        const coords = BAIRRO_COORDINATES[acao.bairro] || MUNICIPALITY_CENTER;
        return {
            ...acao,
            lat: coords[0],
            lng: coords[1],
            color: STATUS_COLORS[acao.status] || '#94a3b8'
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
