import React from 'react';
import { useParams } from 'react-router-dom';

const AcaoDetails = () => {
    const { id } = useParams();

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Detalhes da Ação: {id}</h1>
            <p>Página em construção.</p>
        </div>
    );
};

export default AcaoDetails;
