import React from 'react';

const RankingSetores = ({ data: rankingSetores }) => {
    if (!rankingSetores || rankingSetores.length === 0) {
        return (
            <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%' }}>
                <h2 className="card-title">Ranking de Setores</h2>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhum problema vinculado a setores.
                </div>
            </div>
        );
    }
    const maxProblemas = Math.max(...rankingSetores.map(item => item.problemas));

    return (
        <div className="dashboard-card animate-fade-in-up delay-200" style={{ height: '100%' }}>
            <h2 className="card-title">Ranking de Setores</h2>
            <ul className="ranking-list">
                {rankingSetores.map((item, index) => {
                    const percentage = (item.problemas / maxProblemas) * 100;
                    return (
                        <li key={item.id} className={`ranking-item ${index === 0 ? 'ranking-top-1' : ''}`} style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="ranking-bar-bg" style={{ width: `${percentage}%` }}></div>
                            <div className="ranking-content">
                                <span className="ranking-setor-name">
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, width: '16px' }}>{index + 1}º</span>
                                    {item.setor}
                                </span>
                                <span className="ranking-score" title={`${item.problemas} problemas`}>{item.problemas}</span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default RankingSetores;
