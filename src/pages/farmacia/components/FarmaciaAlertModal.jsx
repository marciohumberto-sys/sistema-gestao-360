import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const FarmaciaAlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'warning': return <AlertTriangle size={24} />;
            case 'error': return <ShieldAlert size={24} />;
            case 'success': return <CheckCircle size={24} />;
            case 'info':
            default: return <Info size={24} />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'warning': return { bg: 'rgba(251, 191, 36, 0.1)', color: '#d97706' };
            case 'error': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
            case 'success': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'info':
            default: return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
        }
    };

    const colors = getColors();

    return (
        <div className="farmacia-modal-confirm-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
            <div className="farmacia-modal-confirm-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                <div className="farmacia-modal-confirm-header" style={{ border: 'none', paddingBottom: '0.5rem' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', background: colors.bg, color: colors.color, display: 'flex' }}>
                        {getIcon()}
                    </div>
                </div>
                <div className="farmacia-modal-confirm-body" style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
                    <h2 className="farmacia-modal-confirm-title" style={{ fontSize: '1.25rem', marginBottom: '0.75rem', textAlign: 'center' }}>{title}</h2>
                    <p className="farmacia-modal-confirm-msg" style={{ textAlign: 'center', margin: 0, fontSize: '0.92rem', opacity: 0.8 }}>
                        {message}
                    </p>
                </div>
                <div className="farmacia-modal-confirm-footer" style={{ background: 'transparent', padding: '0.5rem 1.5rem 2.25rem', border: 'none', justifyContent: 'center', display: 'flex' }}>
                    <button 
                        className="farmacia-btn-primary" 
                        onClick={onClose}
                        style={{ 
                            width: 'auto', 
                            minWidth: '130px', 
                            height: '42px', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            fontSize: '0.9rem',
                            padding: '0 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'none',
                            background: 'rgba(0, 150, 125, 0.9)' // Slightly softer green
                        }}
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FarmaciaAlertModal;
