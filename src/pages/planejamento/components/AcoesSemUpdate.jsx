import React from 'react';
const AcoesSemUpdate = ({ data: acoesSemUpdate }) => {
    if (!acoesSemUpdate || acoesSemUpdate.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%' }}>
                <h2 className="card-title">Ações sem Atualização Recente</h2>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhuma ação sem atualização.
                </div>
            </div>
        );
    }

    const renderBadge = (status) => {
        const type = status.toLowerCase().replace(/ã/g, 'a').replace(/ /g, '-').replace(/_/g, '-');
        if (type === 'em-andamento') return <span className="badge badge-medio">Em Andamento</span>;
        if (type === 'nao-iniciada') return <span className="badge badge-nao-iniciada">Não Iniciada</span>;
        if (type === 'concluida') return <span className="badge badge-ok">Concluída</span>;
        if (type === 'paralisada') return <span className="badge badge-alto">Paralisada</span>;
        if (type === 'cancelada') return <span className="badge badge-critico">Cancelada</span>;
        return <span className={`badge badge-${type}`}>{status}</span>;
    };

    const getProgressColor = (progresso) => {
        if (progresso <= 30) return '#94a3b8'; // Cinza
        if (progresso <= 70) return '#3b82f6'; // Azul
        return '#10b981'; // Verde
    };

    return (
        <div className="dashboard-card animate-fade-in-up delay-100" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">Ações sem Atualização Recente</h2>
            <div style={{ flex: 1, overflow: 'hidden' }}> {/* Eliminated scroll */}
                <table className="compact-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Ação</th>
                            <th style={{ width: '20%' }}>Status</th>
                            <th style={{ width: '20%' }}>Progresso</th>
                            <th style={{ width: '20%' }}>Última</th>
                        </tr>
                    </thead>
                    <tbody>
                        {acoesSemUpdate.slice(0, 5).map((item, index) => {
                            // Simulação de data antiga baseada no mock
                            const isOldDate = item.ultimaAtualizacao.startsWith('15') || item.ultimaAtualizacao.startsWith('20');
                            
                            return (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.acao}</td>
                                    <td style={{ whiteSpace: 'nowrap', minWidth: '110px' }}>{renderBadge(item.status)}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${item.progresso}%`, height: '100%', background: getProgressColor(item.progresso), transition: 'width 1s ease' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{item.progresso}%</span>
                                        </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        <span style={{ 
                                            color: isOldDate ? '#ef4444' : '#64748b', 
                                            fontWeight: isOldDate ? 600 : 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {isOldDate && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />}
                                            {item.ultimaAtualizacao}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AcoesSemUpdate;
