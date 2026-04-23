import React from 'react';
const AcoesEmRisco = ({ data: acoesEmRisco }) => {
    if (!acoesEmRisco || acoesEmRisco.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%' }}>
                <h2 className="card-title">Ações em Risco</h2>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhuma ação em risco encontrada.
                </div>
            </div>
        );
    }

    const renderBadge = (status) => {
        const type = status.toLowerCase().replace('ã', 'a').replace(' ', '-');
        if (type === 'atencao') return <span className="badge badge-alto">{status}</span>;
        return <span className={`badge badge-${type}`}>{status}</span>;
    };

    return (
        <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">Ações em Risco</h2>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <table className="compact-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Ação</th>
                            <th style={{ width: '130px' }}>Progresso</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Problemas</th>
                            <th style={{ width: '20%' }}>Status Geral</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acoesEmRisco.slice(0, 5).map((item) => {
                            const isCritico = item.statusGeral === 'CRITICO';
                            return (
                                <tr key={item.id} style={{ 
                                    backgroundColor: isCritico ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                                    borderLeft: isCritico ? '3px solid #ef4444' : '3px solid transparent'
                                }}>
                                    <td style={{ fontWeight: 600, paddingLeft: isCritico ? '0.8rem' : '1rem', wordBreak: 'break-word' }}>{item.acao}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div className="progress-bar-animated" style={{ width: `${item.progresso}%`, height: '100%' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{item.progresso}%</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: isCritico ? '#fee2e2' : 'transparent',
                                            color: '#dc2626',
                                            fontWeight: 900,
                                            fontSize: '1rem'
                                        }}>
                                            {item.problemas}
                                        </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{renderBadge(item.statusGeral)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AcoesEmRisco;
