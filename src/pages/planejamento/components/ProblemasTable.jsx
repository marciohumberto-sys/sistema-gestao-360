import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

const ProblemasTable = ({ data: problemasCriticos }) => {
    if (!problemasCriticos || problemasCriticos.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%' }}>
                <h2 className="card-title">Problemas Críticos</h2>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhum problema crítico em aberto.
                </div>
            </div>
        );
    }

    const renderBadge = (severidade) => {
        const type = severidade.toLowerCase().replace('é', 'e');
        return <span className={`badge badge-${type}`}>{severidade}</span>;
    };

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">Problemas Críticos</h2>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <table className="compact-table" style={{ width: '100%', borderSpacing: '0' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', width: '40%' }}>Problema</th>
                            <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', width: '110px' }}>Severidade</th>
                            <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', width: '40%' }}>Ação Relacionada</th>
                            <th style={{ textAlign: 'right', padding: '0.75rem 0.5rem', width: '100px' }}>Prazo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {problemasCriticos.slice(0, 4).map((item) => (
                            <tr key={item.id}>
                                <td style={{ fontWeight: 600, padding: '0.85rem 0.5rem', fontSize: '0.85rem', color: '#1e293b', wordBreak: 'break-word' }}>
                                    {item.problema}
                                </td>
                                <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem' }}>
                                    <div style={{ whiteSpace: 'nowrap' }}>
                                        {renderBadge(item.severidade)}
                                    </div>
                                </td>
                                <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4', wordBreak: 'break-word' }}>
                                    {item.acao}
                                </td>
                                <td style={{ textAlign: 'right', padding: '0.85rem 0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 600 }}>
                                    {item.prazo}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProblemasTable;
