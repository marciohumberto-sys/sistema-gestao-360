import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { FarmaciaProvider, useFarmacia } from './FarmaciaContext';
import FarmaciaSaidaModal from './modals/FarmaciaSaidaModal';
import FarmaciaEntradaModal from './modals/FarmaciaEntradaModal';
import FarmaciaAjusteModal from './modals/FarmaciaAjusteModal';
import './FarmaciaModal.css';

const TOAST_MSGS = {
    saida:   '✔ Saída registrada com sucesso. (simulação)',
    entrada: '✔ Entrada registrada com sucesso. (simulação)',
    ajuste:  '✔ Ajuste registrado com sucesso. (simulação)',
};

const FarmaciaLayoutInner = () => {
    const { openModal, setOpenModal, atualizarEstoque } = useFarmacia();
    const location = useLocation();
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    
    useEffect(() => {
        if (location.state?.openModal) {
            setOpenModal(location.state.openModal);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate, setOpenModal]);

    const isDashboard = location.pathname === '/farmacia' || location.pathname === '/farmacia/';

    const showToast = tipo => {
        setToast(TOAST_MSGS[tipo]);
        setTimeout(() => setToast(null), 3200);
    };

    const handleClose = (tipo, confirmed, payload) => {
        if (confirmed) {
            showToast(tipo);
            if (tipo === 'saida' && payload?.codigo)
                atualizarEstoque(payload.codigo, -payload.quantidade, payload.unidadeId);
        }
        setOpenModal(null);
    };

    return (
        <>


            {/* Toast global */}
            {toast && (
                <div className="farmacia-toast farmacia-toast-global">
                    <CheckCircle2 size={15} /> {toast}
                </div>
            )}

            <Outlet />

            {/* Modais globais */}
            <FarmaciaSaidaModal  isOpen={openModal === 'saida'}   onClose={(ok, p) => handleClose('saida',   ok, p)} />
            <FarmaciaEntradaModal isOpen={openModal === 'entrada'} onClose={(ok)    => handleClose('entrada', ok)}    />
            <FarmaciaAjusteModal  isOpen={openModal === 'ajuste'}  onClose={(ok)    => handleClose('ajuste',  ok)}    />
        </>
    );
};

const FarmaciaLayout = () => (
    <FarmaciaProvider>
        <FarmaciaLayoutInner />
    </FarmaciaProvider>
);

export default FarmaciaLayout;
