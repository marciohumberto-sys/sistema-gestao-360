import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import '../FarmaciaModal.css';

const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((p, i) => 
        p.toLowerCase() === query.toLowerCase() 
            ? <span key={i} style={{ color: 'var(--color-primary)', fontWeight: 800, background: 'rgba(0, 150, 125, 0.08)' }}>{p}</span> 
            : p
    );
};

/**
 * MedAutocomplete — Busca orgânica ligada ao Supabase 'inventory_items'
 */
const MedAutocomplete = ({ value, onSelect, placeholder = 'Buscar medicamento / material...', autoFocus, className = '' }) => {
    const [busca, setBusca]   = useState('');
    const [aberto, setAberto] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState({});
    const [sugestoes, setSugestoes] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    
    const wrapperRef          = useRef(null);
    const inputRef            = useRef(null);

    useEffect(() => { 
        setBusca(''); 
        setActiveIndex(-1);
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

    // Resgate dinâmico do Banco
    useEffect(() => {
        const fetchItems = async () => {

            if (busca.trim().length > 1) {
                const { data } = await supabase
                    .from('inventory_items')
                    .select('id, name, code')
                    .or(`name.ilike.%${busca}%,code.ilike.%${busca}%`)
                    .limit(10);
                
                if (data) {
                    const mapped = data.map(item => ({
                        id: item.id,
                        codigo: item.code || '-',
                        descricao: item.name,
                        unidade: 'UN' // Unidade padronizada em Maiúscula
                    }));
                    setSugestoes(mapped);
                    setActiveIndex(-1);
                }
            } else {
                setSugestoes([]);
                setActiveIndex(-1);
            }
        };

        const timerId = setTimeout(() => fetchItems(), 350);
        return () => clearTimeout(timerId);
    }, [busca]);

    useEffect(() => {
        if (value && value.id) return; // Prevent auto-select if already selected
        
        if (sugestoes.length === 1 && busca.trim().length > 3) {
            const timer = setTimeout(() => {
                const item = sugestoes[0];
                setBusca('');
                setAberto(false);
                onSelect(item);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [sugestoes, busca, onSelect, value]);

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

    const handleKeyDown = (e) => {
        if (!aberto || sugestoes.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < sugestoes.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            const item = sugestoes[activeIndex];
            setBusca('');
            setAberto(false);
            onSelect(item);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = sugestoes[0];
            setBusca('');
            setAberto(false);
            onSelect(item);
        }
    };

    return (
        <div className={`farmacia-autocomplete-box ${className}`} ref={wrapperRef}>
            <div className="farmacia-input-with-icon">
                <Search className="farmacia-input-icon" size={18} />
                <input ref={inputRef} type="text" className="farmacia-form-input"
                    placeholder={placeholder} value={busca}
                    onChange={e => { 
                        setBusca(e.target.value); 
                        setAberto(true);
                        // Desseleciona o medicamento atual se o texto for modificado
                        if (value) {
                            onSelect(null);
                        }
                    }}
                    onFocus={() => {
                        if (busca.trim()) setAberto(true);
                    }}
                    onKeyDown={handleKeyDown}
                    autoComplete="off" spellCheck="false"
                />
            </div>
            {aberto && sugestoes.length > 0 && createPortal(
                <ul className="farmacia-autocomplete-list premium-autocomplete-list" style={dropdownStyles}>
                    {sugestoes.map((item, idx) => (
                        <li key={item.id} 
                            className={`farmacia-autocomplete-item ${idx === activeIndex ? 'active-item' : ''}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onMouseLeave={() => setActiveIndex(-1)}
                            onMouseDown={() => { 
                                setBusca(''); 
                                setAberto(false); 
                                onSelect(item); 
                            }}
                            style={{ 
                                padding: '6px 12px',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease',
                                ...(idx === activeIndex ? {
                                    backgroundColor: 'rgba(0,0,0,0.04)',
                                    borderLeft: '3px solid var(--color-primary)'
                                } : {
                                    borderLeft: '3px solid transparent'
                                })
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', lineHeight: '1' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {highlightMatch(item.descricao, busca)}
                                </span>
                                
                                {item.codigo !== '-' && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.4, margin: '0 1px' }}>&middot;</span>}
                                {item.codigo !== '-' && (
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                        {highlightMatch(item.codigo, busca)}
                                    </span>
                                )}
                                
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.4, margin: '0 1px' }}>&middot;</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', opacity: 0.6, fontWeight: 700 }}>
                                    {item.unidade}
                                </span>
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
