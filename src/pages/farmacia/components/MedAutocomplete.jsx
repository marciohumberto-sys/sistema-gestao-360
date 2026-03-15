import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { mockEstoqueItems } from '../../../mocks/farmaciaMocks';
import '../FarmaciaModal.css';

/**
 * MedAutocomplete — busca por descrição ou código.
 * Props: value (item|null), onSelect, placeholder, autoFocus
 */
const MedAutocomplete = ({ value, onSelect, placeholder = 'Buscar medicamento...', autoFocus, className = '' }) => {
    const [busca, setBusca]   = useState('');
    const [aberto, setAberto] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const wrapperRef          = useRef(null);
    const inputRef            = useRef(null);

    useEffect(() => { 
        setBusca(''); 
    }, [value]);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 60);
        }
    }, [autoFocus]);

    useEffect(() => {
        if (!aberto) return;
        const h = e => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [aberto]);

    const sugestoes = busca.trim().length > 0
        ? mockEstoqueItems.filter(i =>
            i.descricao.toLowerCase().includes(busca.toLowerCase()) ||
            i.codigo.toLowerCase().includes(busca.toLowerCase())
          ).slice(0, 8)
        : [];

    useEffect(() => {
        if (sugestoes.length === 1 && busca.trim().length > 2) {
            const timer = setTimeout(() => {
                const item = sugestoes[0];
                setBusca('');
                setAberto(false);
                onSelect(item);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [sugestoes, busca, onSelect]);

    // Calcular posição dinamicamente para o portal
    const updatePosition = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownStyles({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            });
        }
    };

    useEffect(() => {
        if (aberto && sugestoes.length > 0) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [aberto, sugestoes.length]);

    return (
        <div className={`farmacia-autocomplete-box ${className}`} ref={wrapperRef}>
            <div className="farmacia-input-with-icon">
                <Search className="farmacia-input-icon" size={18} />
                <input ref={inputRef} type="text" className="farmacia-form-input"
                    placeholder={placeholder} value={busca}
                    onChange={e => { setBusca(e.target.value); setAberto(true); if (!e.target.value) onSelect(null); }}
                    onFocus={() => busca.trim() && setAberto(true)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && aberto && sugestoes.length > 0) {
                            e.preventDefault();
                            const item = sugestoes[0];
                            setBusca('');
                            setAberto(false);
                            onSelect(item);
                        }
                    }}
                    autoComplete="off" spellCheck="false"
                />
            </div>
            {aberto && sugestoes.length > 0 && createPortal(
                <ul className="farmacia-autocomplete-list" style={dropdownStyles}>
                    {sugestoes.map(item => (
                        <li key={item.id} className="farmacia-autocomplete-item"
                            onMouseDown={() => { setBusca(''); setAberto(false); onSelect(item); }}>
                            <div className="autocomplete-item-single-line">
                                <span className="item-desc">{item.descricao}</span>
                                <span className="item-sep">—</span>
                                <span className="item-meta">{item.codigo} • {item.unidade}</span>
                            </div>
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
};

export default MedAutocomplete;
