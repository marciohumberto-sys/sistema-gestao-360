import React, { useState, useEffect } from 'react';
import { 
    Settings, RefreshCw, Plus, AlertTriangle, 
    FileSignature, Layers, Activity, Users, 
    Search, Loader2, Eye, FlaskConical,
    Ban, CheckCircle2, ChevronLeft, ChevronRight, Lock, Edit, CheckCircle, Filter
} from 'lucide-react';
import { laboratorioConfiguracoesService } from '../../services/api/laboratorioConfiguracoes.service';

import ReactDOM from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './LaboratorioConfiguracoes.css';

const LabCombobox = ({
    label,
    value,
    options,
    onChange,
    placeholder,
    disabled,
    required,
    allowCustomValue = true,
    searchable = false,
    emptyMessage = "Nenhum resultado encontrado.",
    error,
    inputId,
    name
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchText, setSearchText] = React.useState(value || '');
    const [filteredOptions, setFilteredOptions] = React.useState(options);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const [dropdownStyles, setDropdownStyles] = React.useState({});
    
    const wrapperRef = React.useRef(null);
    const listRef = React.useRef(null);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        setSearchText(value || '');
    }, [value]);

    React.useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
            if (value !== searchText) {
                setSearchText(value || '');
            }
        }
    }, [isOpen, value]);

    const filterOptions = (text) => {
        if (!text.trim()) return options;
        const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return options.filter(opt => 
            opt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lower)
        );
    };

    const handleInputChange = (e) => {
        if (!allowCustomValue && !searchable && e.target.value !== '' && !isOpen) return;
        const val = e.target.value;
        setSearchText(val);
        setIsOpen(true);
        const filtered = filterOptions(val);
        setFilteredOptions(filtered);
        setHighlightedIndex(filtered.length > 0 ? 0 : (allowCustomValue && val.trim() ? 0 : -1));
    };

    const handleInputFocus = () => {
        setFilteredOptions(filterOptions(searchText));
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
            setFilteredOptions(filterOptions(searchText));
        }
    };

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            setFilteredOptions(options); // show all on toggle open
            setIsOpen(true);
            inputRef.current?.focus();
        } else {
            setIsOpen(false);
        }
    };

    const selectOption = (opt) => {
        onChange(opt);
        setSearchText(opt);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'Tab') {
            if (isOpen) {
                setIsOpen(false);
                // If custom value is allowed and there is text, keep it. Otherwise reset to original value
                if (allowCustomValue && searchText.trim() && searchText !== value) {
                    onChange(searchText.trim());
                } else {
                    setSearchText(value || '');
                }
            }
            return; // let standard tab order apply
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setSearchText(value || '');
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
            e.preventDefault();
        }

        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setIsOpen(true);
            setFilteredOptions(options);
            return;
        }

        const maxIndex = allowCustomValue && searchText.trim() && !filteredOptions.some(o => o.toLowerCase() === searchText.toLowerCase()) 
            ? filteredOptions.length 
            : filteredOptions.length - 1;

        if (e.key === 'ArrowDown') {
            setHighlightedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Home') {
            setHighlightedIndex(0);
        } else if (e.key === 'End') {
            setHighlightedIndex(maxIndex);
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                selectOption(filteredOptions[highlightedIndex]);
            } else if (allowCustomValue && searchText.trim()) {
                selectOption(searchText.trim());
            } else {
                setIsOpen(false);
            }
        }
    };

    // Calculate position for portal dropdown
    const updatePosition = React.useCallback(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 240; // Max height

            let top, bottom;
            if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
                top = rect.bottom + window.scrollY + 4;
                bottom = 'auto';
            } else {
                top = 'auto';
                bottom = (window.innerHeight - rect.top) - window.scrollY + 4;
            }

            setDropdownStyles({
                position: 'absolute',
                top,
                bottom,
                left: rect.left + window.scrollX,
                width: rect.width,
                maxHeight: `${dropdownHeight}px`,
                zIndex: 100000,
            });
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            
            const handleClickOutside = (event) => {
                if (wrapperRef.current && !wrapperRef.current.contains(event.target) &&
                    listRef.current && !listRef.current.contains(event.target)) {
                    setIsOpen(false);
                    if (allowCustomValue && searchText.trim() !== value) {
                        onChange(searchText.trim());
                    } else {
                        setSearchText(value || '');
                    }
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, updatePosition, allowCustomValue, searchText, value, onChange]);

    // Scroll highlighted item into view
    React.useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const listEl = listRef.current;
            const highlightedEl = listEl.children[highlightedIndex];
            if (highlightedEl) {
                const listRect = listEl.getBoundingClientRect();
                const elementRect = highlightedEl.getBoundingClientRect();
                
                if (elementRect.bottom > listRect.bottom) {
                    listEl.scrollTop += elementRect.bottom - listRect.bottom;
                } else if (elementRect.top < listRect.top) {
                    listEl.scrollTop -= listRect.top - elementRect.top;
                }
            }
        }
    }, [highlightedIndex, isOpen]);

    const showCustomOption = allowCustomValue && searchText.trim() && !filteredOptions.some(o => o.toLowerCase() === searchText.toLowerCase());

    const dropdownContent = isOpen ? (
        <ul
            ref={listRef}
            role="listbox"
            style={{
                ...dropdownStyles,
                margin: 0, padding: 0, listStyle: 'none',
                background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                overflowY: 'auto'
            }}
        >
            {filteredOptions.length > 0 || showCustomOption ? (
                <>
                    {filteredOptions.map((opt, idx) => (
                        <li
                            key={idx}
                            role="option"
                            aria-selected={highlightedIndex === idx}
                            onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                background: highlightedIndex === idx ? '#f1f5f9' : 'transparent',
                                color: highlightedIndex === idx ? '#0f172a' : '#475569',
                                fontWeight: value === opt ? '600' : 'normal',
                                fontSize: '0.9rem'
                            }}
                        >
                            {opt}
                        </li>
                    ))}
                    {showCustomOption && (
                        <li
                            role="option"
                            aria-selected={highlightedIndex === filteredOptions.length}
                            onMouseDown={(e) => { e.preventDefault(); selectOption(searchText.trim()); }}
                            onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                background: highlightedIndex === filteredOptions.length ? '#f1f5f9' : 'transparent',
                                color: highlightedIndex === filteredOptions.length ? '#0f172a' : '#475569',
                                fontSize: '0.9rem',
                                borderTop: filteredOptions.length > 0 ? '1px solid #f1f5f9' : 'none'
                            }}
                        >
                            Usar "{searchText.trim()}"
                        </li>
                    )}
                </>
            ) : (
                <li style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>
                    {emptyMessage}
                </li>
            )}
        </ul>
    ) : null;

    return (
        <div ref={wrapperRef} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            {label && (
                <label 
                    htmlFor={inputId} 
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}
                >
                    {label} {required && <span style={{color: '#ef4444'}}>*</span>}
                </label>
            )}
            <div 
                style={{ 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: error ? '#ef4444' : (isOpen ? '#3b82f6' : '#cbd5e1'),
                    borderRadius: '6px',
                    background: disabled ? '#f8fafc' : '#fff',
                    boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                    cursor: disabled ? 'not-allowed' : 'text',
                    transition: 'all 0.2s'
                }}
            >
                <input
                    id={inputId}
                    ref={inputRef}
                    name={name}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-autocomplete={allowCustomValue || searchable ? "list" : "none"}
                    aria-controls={isOpen ? `${inputId}-listbox` : undefined}
                    value={searchText}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={!allowCustomValue && !searchable}
                    style={{ 
                        width: '100%', 
                        height: '38px', 
                        border: 'none', 
                        background: 'transparent',
                        padding: '0 36px 0 10px',
                        fontSize: '0.9rem',
                        color: disabled ? '#94a3b8' : '#0f172a',
                        outline: 'none',
                        cursor: (!allowCustomValue && !searchable) ? 'pointer' : 'text'
                    }}
                    autoComplete="off"
                />
                <div 
                    onClick={toggleOpen}
                    style={{ 
                        position: 'absolute', 
                        right: 0, 
                        top: 0, 
                        bottom: 0, 
                        width: '36px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        color: '#94a3b8'
                    }}
                >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            {isOpen && ReactDOM.createPortal(dropdownContent, document.body)}
        </div>
    );
};

const LaboratorioConfiguracoes = () => {
    const [activeTab, setActiveTab] = useState('exames');
    
    // Cards State
    // -- SETORES STATES --
    const [sectorsList, setSectorsList] = useState([]);
    const [selectedSectorId, setSelectedSectorId] = useState(null);
    const [sectorFilters, setSectorFilters] = useState({ search: '', status: 'ativos' });
    const [showSectorModal, setShowSectorModal] = useState(false);
    const [editingSector, setEditingSector] = useState(null);
    const [sectorForm, setSectorForm] = useState({ code: '', name: '', description: '', print_order: '', is_active: true });
    const [initialSectorForm, setInitialSectorForm] = useState(null);
    const [showUnsavedSectorModal, setShowUnsavedSectorModal] = useState(false);
    const [sectorActionModal, setSectorActionModal] = useState({ isOpen: false, type: '', sector: null, examCount: 0 });
    const [selectedSectorExamCount, setSelectedSectorExamCount] = useState(null);
    const [loadingSectors, setLoadingSectors] = useState(false);

    const [loadingCards, setLoadingCards] = useState(false);
    const [cards, setCards] = useState({
        examesAtivos: 0,
        setoresAtivos: 0,
        parametrosAtivos: 0,
        usuariosVinculados: 0
    });

    // Filters and Data State for Exames
    const [loadingExames, setLoadingExames] = useState(false);
    const [examesList, setExamesList] = useState([]);
    const [sectorsFilter, setSectorsFilter] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState(null);
    
    const [filters, setFilters] = useState({
        search: '',
        sector_id: 'todos',
        status: 'ativos'
    });

    // --- Exames Modal State ---
    const [showExamModal, setShowExamModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [initialExamForm, setInitialExamForm] = useState(null);
    const [examForm, setExamForm] = useState({
        code: '', name: '', sector_id: '', is_active: true,
        material: '', method: '', result_type: '', unit: '', analyzer_name: '',
        print_order: '', requires_conference: false, prints_on_report: true
    });
    const [showUnsavedExamModal, setShowUnsavedExamModal] = useState(false);
    const [examToToggle, setExamToToggle] = useState(null);
    const [showConfirmToggleExam, setShowConfirmToggleExam] = useState(false);
    const [distinctMaterials, setDistinctMaterials] = useState([]);
    const [distinctMethods, setDistinctMethods] = useState([]);
    const [distinctAnalyzers, setDistinctAnalyzers] = useState([]);

    // --- Parâmetros State ---
    const [loadingParams, setLoadingParams] = useState(false);
    const [paramsList, setParamsList] = useState([]);
    const [selectedParamId, setSelectedParamId] = useState(null);
    const [paramPage, setParamPage] = useState(1);
    const [paramTotal, setParamTotal] = useState(0);
    const [paramTotalPages, setParamTotalPages] = useState(0);
    const [paramFilters, setParamFilters] = useState({
        search: '',
        exam_id: 'todos',
        status: 'ativos'
    });
    
    const [allExamsLookup, setAllExamsLookup] = useState([]);
    const [distinctUnits, setDistinctUnits] = useState([]);
    
    // Modal e Edição de Parâmetros
    const [showParamModal, setShowParamModal] = useState(false);
    const [editingParam, setEditingParam] = useState(null);
    const [initialParamForm, setInitialParamForm] = useState(null);
    const [paramForm, setParamForm] = useState({
        exam_id: '', code: '', name: '', result_type: '', unit: '',
        reference_text: '', min_value: '', max_value: '', display_order: 10, is_active: true, is_required: false
    });
    const [showUnsavedParamModal, setShowUnsavedParamModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [paramToToggle, setParamToToggle] = useState(null);
    const [showConfirmToggleParam, setShowConfirmToggleParam] = useState(false);
    
    const [selectedParamHistory, setSelectedParamHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    
    const [feedbackMsg, setFeedbackMsg] = useState(null);
    const showFeedback = (type, text) => {
        setFeedbackMsg({ type, text });
        setTimeout(() => setFeedbackMsg(null), 5000);
    };
    // ------------------------

    // Initial Load
    useEffect(() => {
        loadDashboardCards();
        loadSectorsFilter();
    }, []);

    // Load data based on tab
    useEffect(() => {
        if (activeTab === 'exames') {
            loadExames();
        } else if (activeTab === 'parametros') {
            loadParametros();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'parametros') {
            loadParametros();
        }
    }, [paramPage]);
    
    useEffect(() => {
        const checkHistory = async () => {
            if (!selectedParamId) {
                setSelectedParamHistory(null);
                return;
            }
            try {
                setHistoryLoading(true);
                const hasHist = await laboratorioConfiguracoesService.hasParameterHistory(selectedParamId);
                setSelectedParamHistory(hasHist);
            } catch (err) {
                console.error("Erro ao verificar histórico", err);
                setSelectedParamHistory(null);
            } finally {
                setHistoryLoading(false);
            }
        };
        checkHistory();
    }, [selectedParamId]);

    const loadDashboardCards = async () => {
        try {
            setLoadingCards(true);
            const data = await laboratorioConfiguracoesService.getDashboardCards();
            setCards(data);
        } catch (error) {
            console.error("Erro ao carregar cards:", error);
        } finally {
            setLoadingCards(false);
        }
    };

    const loadSectorsFilter = async () => {
        try {
            const data = await laboratorioConfiguracoesService.getSetoresAtivos();
            setSectorsFilter(data);
            
            // dependências dos parâmetros
            const exams = await laboratorioConfiguracoesService.getExames();
            setAllExamsLookup(exams);
            
            const units = await laboratorioConfiguracoesService.getDistinctValues('unit');
            setDistinctUnits(units);
            
            const materials = await laboratorioConfiguracoesService.getDistinctValues('material');
            setDistinctMaterials(materials);
            
            const methods = await laboratorioConfiguracoesService.getDistinctValues('method');
            setDistinctMethods(methods);
            
            const analyzers = await laboratorioConfiguracoesService.getDistinctValues('analyzer_name');
            setDistinctAnalyzers(analyzers);
        } catch (error) {
            console.error("Erro ao carregar setores/dependências:", error);
        }
    };

    const loadExames = async () => {
        try {
            setLoadingExames(true);
            const data = await laboratorioConfiguracoesService.getExames(filters);
            setExamesList(data);
            
            // Se o exame selecionado não estiver na nova lista, seleciona o primeiro
            if (data.length > 0) {
                const stillExists = data.find(e => e.id === selectedExamId);
                if (!stillExists) {
                    setSelectedExamId(data[0].id);
                }
            } else {
                setSelectedExamId(null);
            }
        } catch (error) {
            console.error("Erro ao carregar exames:", error);
        } finally {
            setLoadingExames(false);
        }
    };

    const handleFilterKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadExames();
        }
    };

    const handleRefresh = async () => {
        await Promise.all([
            loadDashboardCards(),
            activeTab === 'exames' ? loadExames() : Promise.resolve(),
            activeTab === 'setores' ? loadSectors() : Promise.resolve(),
            activeTab === 'parametros' ? loadParametros() : Promise.resolve()
        ]);
    };

    const loadParametros = async () => {
        try {
            setLoadingParams(true);
            const data = await laboratorioConfiguracoesService.getParametros(paramFilters, paramPage, 20);
            setParamsList(data.data);
            setParamTotal(data.total);
            setParamTotalPages(data.totalPages);
            
            if (data.data.length > 0) {
                const stillExists = data.data.find(e => e.id === selectedParamId);
                if (!stillExists) {
                    setSelectedParamId(data.data[0].id);
                }
            } else {
                setSelectedParamId(null);
            }
        } catch (error) {
            console.error("Erro ao carregar parâmetros:", error);
            showFeedback('error', 'Erro ao carregar parâmetros.');
        } finally {
            setLoadingParams(false);
        }
    };

    const handleParamFilterKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setParamPage(1);
            loadParametros();
        }
    };
    
    // --- Funções de Exames ---
    // --- Funções de Setores ---
    const loadSectors = async () => {
        try {
            setLoadingSectors(true);
            const data = await laboratorioConfiguracoesService.getSectors(sectorFilters);
            setSectorsList(data);
            if (data.length > 0) {
                const stillExists = data.find(s => s.id === selectedSectorId);
                if (!stillExists) setSelectedSectorId(data[0].id);
            } else {
                setSelectedSectorId(null);
            }
        } catch (error) {
            console.error(error);
            showFeedback('error', 'Falha ao carregar setores.');
        } finally {
            setLoadingSectors(false);
        }
    };
    
    useEffect(() => {
        if (activeTab === 'setores') loadSectors();
    }, [activeTab, sectorFilters]); // eslint-disable-line react-hooks/exhaustive-deps
    
    useEffect(() => {
        if (activeTab === 'setores' && selectedSectorId) {
            laboratorioConfiguracoesService.getSectorExamCount(selectedSectorId)
                .then(setSelectedSectorExamCount)
                .catch(() => setSelectedSectorExamCount(null));
        }
    }, [selectedSectorId, activeTab]);

    const handleFilterSector = (field, value) => {
        setSectorFilters(prev => ({ ...prev, [field]: value }));
    };
    
    const openNewSectorModal = () => {
        const initial = { code: '', name: '', description: '', print_order: '', is_active: true };
        setSectorForm(initial);
        setInitialSectorForm(initial);
        setEditingSector(null);
        setShowSectorModal(true);
    };

    const openEditSectorModal = (sector) => {
        const initial = {
            code: sector.code || '',
            name: sector.name || '',
            description: sector.description || '',
            print_order: sector.print_order !== null ? sector.print_order : '',
            is_active: sector.is_active
        };
        setSectorForm(initial);
        setInitialSectorForm(initial);
        setEditingSector(sector);
        setShowSectorModal(true);
    };

    const handleCloseSectorModal = () => {
        if (JSON.stringify(sectorForm) !== JSON.stringify(initialSectorForm)) {
            setShowUnsavedSectorModal(true);
        } else {
            setShowSectorModal(false);
        }
    };

    const confirmDiscardSectorChanges = () => {
        setShowUnsavedSectorModal(false);
        setShowSectorModal(false);
    };
    
    const handleSaveSector = async () => {
        try {
            if (!sectorForm.code.trim()) { showFeedback('error', 'O Código é obrigatório.'); return; }
            if (!sectorForm.name.trim()) { showFeedback('error', 'O Nome é obrigatório.'); return; }
            
            setLoadingSectors(true);
            const payload = {
                ...sectorForm,
                print_order: sectorForm.print_order !== '' ? parseInt(sectorForm.print_order, 10) : null
            };

            const codeExists = await laboratorioConfiguracoesService.checkSectorCodeExists(payload.code, editingSector?.id);
            if (codeExists) {
                setLoadingSectors(false);
                showFeedback('error', 'Já existe um setor cadastrado com este código.');
                return;
            }

            if (editingSector) {
                await laboratorioConfiguracoesService.updateSector(editingSector.id, payload);
                showFeedback('success', 'Setor atualizado com sucesso.');
            } else {
                const newSec = await laboratorioConfiguracoesService.createSector(payload);
                showFeedback('success', 'Setor cadastrado com sucesso.');
                setSelectedSectorId(newSec.id);
            }
            
            await loadSectors();
            await loadDashboardCards();
            setShowSectorModal(false);
            setLoadingSectors(false);
        } catch (error) {
            console.error(error);
            setLoadingSectors(false);
            showFeedback('error', 'Erro ao salvar setor.');
        }
    };
    
    const requestSectorAction = async (sector, type) => {
        try {
            let count = 0;
            if (type === 'inactivate') {
                count = await laboratorioConfiguracoesService.getSectorExamCount(sector.id);
            }
            setSectorActionModal({ isOpen: true, type, sector, examCount: count });
        } catch (err) {
            showFeedback('error', 'Erro ao consultar exames vinculados.');
        }
    };

    const confirmSectorAction = async () => {
        try {
            setLoadingSectors(true);
            const isActive = sectorActionModal.type === 'activate';
            await laboratorioConfiguracoesService.toggleSectorStatus(sectorActionModal.sector.id, isActive);
            showFeedback('success', isActive ? 'Setor ativado com sucesso.' : 'Setor inativado com sucesso.');
            await loadSectors();
            await loadDashboardCards();
            setSectorActionModal({ isOpen: false, type: '', sector: null, examCount: 0 });
            setLoadingSectors(false);
        } catch (error) {
            setLoadingSectors(false);
            showFeedback('error', 'Erro ao alterar status do setor.');
        }
    };

    const openNewExamModal = () => {
        const initial = {
            code: '',
            name: '',
            sector_id: '',
            is_active: true,
            material: '',
            method: '',
            result_type: '',
            unit: '',
            analyzer_name: '',
            print_order: '',
            requires_conference: true,
            prints_on_report: true
        };
        setExamForm(initial);
        setInitialExamForm(initial);
        setEditingExam(null);
        setShowExamModal(true);
    };

    const openEditExamModal = (exam) => {
        const initial = {
            code: exam.code || '',
            name: exam.name || '',
            sector_id: exam.sector_id || '',
            is_active: !!exam.is_active,
            material: exam.material || '',
            method: exam.method || '',
            result_type: exam.result_type || '',
            unit: exam.unit || '',
            analyzer_name: exam.analyzer_name || '',
            print_order: exam.print_order !== null && exam.print_order !== undefined ? String(exam.print_order) : '',
            requires_conference: !!exam.requires_conference,
            prints_on_report: !!exam.prints_on_report
        };
        setExamForm(initial);
        setInitialExamForm(initial);
        setEditingExam(exam);
        setShowExamModal(true);
    };

    const hasUnsavedExamChanges = () => {
        if (!initialExamForm) return false;
        const normalizeField = (val) => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val.trim();
            if (typeof val === 'number') return String(val);
            return val;
        };

        const formA = { ...examForm };
        const formB = { ...initialExamForm };

        if (formA.code) formA.code = formA.code.trim().toUpperCase();
        if (formB.code) formB.code = formB.code.trim().toUpperCase();

        for (const key of Object.keys(initialExamForm)) {
            if (normalizeField(formA[key]) !== normalizeField(formB[key])) {
                return true;
            }
        }
        return false;
    };

    const handleCloseExamModal = () => {
        if (hasUnsavedExamChanges()) {
            setShowUnsavedExamModal(true);
        } else {
            setShowExamModal(false);
        }
    };

    const confirmDiscardExamChanges = () => {
        setShowUnsavedExamModal(false);
        setShowExamModal(false);
    };

    const handleSaveExam = async () => {
        if (actionLoading) return;
        
        const normalizedCode = (examForm.code || '').trim().toUpperCase();
        if (!normalizedCode) return showFeedback('error', 'Informe o código do exame.');
        if (!(examForm.name || '').trim()) return showFeedback('error', 'Informe o nome do exame.');
        if (!examForm.sector_id) return showFeedback('error', 'Selecione o setor.');
        if (!examForm.result_type) return showFeedback('error', 'Selecione o tipo de resultado.');

        let parsedOrder = null;
        if (examForm.print_order !== '') {
            parsedOrder = parseInt(examForm.print_order, 10);
            if (isNaN(parsedOrder) || parsedOrder < 0) return showFeedback('error', 'Ordem de impressão inválida.');
        }

        try {
            setActionLoading(true);

            const codeExists = await laboratorioConfiguracoesService.checkExamCodeExists(
                normalizedCode, editingExam ? editingExam.id : null
            );
            if (codeExists) return showFeedback('error', 'Já existe um exame com este código.');

            const cleanStr = (val) => (val || '').trim() === '' ? null : (val || '').trim();
            
            const payload = {
                code: normalizedCode,
                name: (examForm.name || '').trim(),
                sector_id: examForm.sector_id,
                is_active: examForm.is_active,
                material: cleanStr(examForm.material),
                method: cleanStr(examForm.method),
                result_type: examForm.result_type,
                unit: cleanStr(examForm.unit),
                analyzer_name: cleanStr(examForm.analyzer_name),
                print_order: parsedOrder,
                requires_conference: examForm.requires_conference,
                prints_on_report: examForm.prints_on_report
            };

            if (editingExam) {
                await laboratorioConfiguracoesService.updateExam(editingExam.id, payload);
                showFeedback('success', 'Exame atualizado com sucesso.');
                if (selectedExamId === editingExam.id) {
                    await loadExames();
                } else {
                    await loadExames();
                }
            } else {
                const newEx = await laboratorioConfiguracoesService.createExam(payload);
                showFeedback('success', 'Exame cadastrado com sucesso.');
                setSelectedExamId(newEx.id);
                await loadExames();
                
                // Show additional toast if filters hide the new exam
                if (
                    (filters.status === 'ativos' && !newEx.is_active) || 
                    (filters.status === 'inativos' && newEx.is_active) ||
                    (filters.sector_id !== 'todos' && filters.sector_id !== newEx.sector_id)
                ) {
                    setTimeout(() => showFeedback('success', 'O exame foi cadastrado, mas não corresponde aos filtros atuais.'), 3500);
                }
            }
            await loadDashboardCards();
            setShowExamModal(false);

        } catch (error) {
            console.error(error);
            showFeedback('error', 'Erro ao salvar exame.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleExamStatus = (exam) => {
        setExamToToggle(exam);
        setShowConfirmToggleExam(true);
    };

    const confirmToggleExamStatus = async () => {
        if (!examToToggle || actionLoading) return;
        try {
            setActionLoading(true);
            const newStatus = !examToToggle.is_active;
            await laboratorioConfiguracoesService.toggleExamStatus(examToToggle.id, newStatus);
            showFeedback('success', `Exame ${newStatus ? 'ativado' : 'inativado'} com sucesso.`);
            await loadExames();
            await loadDashboardCards();
            setShowConfirmToggleExam(false);
            setExamToToggle(null);
        } catch (error) {
            console.error(error);
            showFeedback('error', 'Erro ao alterar status do exame.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Funções de Parâmetros ---
    const openNewParamModal = () => {
        const initial = {
            exam_id: '', code: '', name: '', result_type: '', unit: '',
            reference_text: '', min_value: '', max_value: '', display_order: 10, is_active: true, is_required: false
        };
        setParamForm(initial);
        setInitialParamForm(initial);
        setEditingParam(null);
        setShowParamModal(true);
    };

    const openEditParamModal = (param) => {
        const initial = {
            exam_id: param.exam_id || '',
            code: param.code || '',
            name: param.name || '',
            result_type: param.result_type || '',
            unit: param.unit || '',
            reference_text: param.reference_text || '',
            min_value: param.min_value !== null && param.min_value !== undefined ? String(param.min_value) : '',
            max_value: param.max_value !== null && param.max_value !== undefined ? String(param.max_value) : '',
            display_order: param.display_order !== null && param.display_order !== undefined ? param.display_order : 10,
            is_active: !!param.is_active,
            is_required: !!param.is_required
        };
        setParamForm(initial);
        setInitialParamForm(initial);
        setEditingParam(param);
        setShowParamModal(true);
    };

    const isParamFormDirty = () => {
        if (!initialParamForm) return false;
        const normalizeField = (val) => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val.trim();
            if (typeof val === 'number') return String(val);
            return val;
        };

        const formA = { ...paramForm };
        const formB = { ...initialParamForm };

        if (formA.code) formA.code = formA.code.trim().toUpperCase();
        if (formB.code) formB.code = formB.code.trim().toUpperCase();

        for (const key of Object.keys(initialParamForm)) {
            if (normalizeField(formA[key]) !== normalizeField(formB[key])) {
                return true;
            }
        }
        return false;
    };

    const handleCloseParamModal = () => {
        if (isParamFormDirty()) {
            setShowUnsavedParamModal(true);
        } else {
            setShowParamModal(false);
        }
    };

    const confirmDiscardParamChanges = () => {
        setShowUnsavedParamModal(false);
        setShowParamModal(false);
    };

    const handleSaveParam = async () => {
        const normalizedCode = (paramForm.code || '').trim().toUpperCase();
        if (!normalizedCode) return showFeedback('error', 'Informe o código do parâmetro.');
        if (!(paramForm.name || '').trim()) return showFeedback('error', 'Informe o nome do parâmetro.');
        if (!paramForm.exam_id) return showFeedback('error', 'Selecione o exame vinculado.');
        if (!paramForm.result_type) return showFeedback('error', 'Selecione o tipo de resultado.');

        let parsedOrder = parseInt(paramForm.display_order, 10);
        if (isNaN(parsedOrder) || parsedOrder < 0) return showFeedback('error', 'Ordem de exibição inválida.');

        let minVal = null;
        let maxVal = null;
        if (paramForm.min_value !== '') {
            minVal = parseFloat(String(paramForm.min_value).replace(',', '.'));
            if (isNaN(minVal)) return showFeedback('error', 'Valor mínimo inválido.');
        }
        if (paramForm.max_value !== '') {
            maxVal = parseFloat(String(paramForm.max_value).replace(',', '.'));
            if (isNaN(maxVal)) return showFeedback('error', 'Valor máximo inválido.');
        }
        if (minVal !== null && maxVal !== null && minVal > maxVal) {
            return showFeedback('error', 'Valor mínimo não pode ser maior que o máximo.');
        }

        try {
            setActionLoading(true);

            // Validações de duplicidade
            const codeExists = await laboratorioConfiguracoesService.checkParamCodeExists(
                paramForm.exam_id, normalizedCode, editingParam ? editingParam.id : null
            );
            if (codeExists) return showFeedback('error', 'Já existe um parâmetro com este código neste exame.');

            const orderExists = await laboratorioConfiguracoesService.checkParamOrderExists(
                paramForm.exam_id, parsedOrder, editingParam ? editingParam.id : null
            );
            if (orderExists) return showFeedback('error', 'Já existe um parâmetro com esta ordem neste exame.');

            const cleanStr = (val) => (val || '').trim() === '' ? null : (val || '').trim();
            
            const payload = {
                exam_id: paramForm.exam_id,
                code: normalizedCode,
                name: (paramForm.name || '').trim(),
                result_type: paramForm.result_type,
                unit: cleanStr(paramForm.unit),
                reference_text: cleanStr(paramForm.reference_text),
                min_value: minVal,
                max_value: maxVal,
                display_order: parsedOrder,
                is_active: paramForm.is_active,
                is_required: paramForm.is_required
            };

            if (editingParam) {
                await laboratorioConfiguracoesService.updateParameter(editingParam.id, payload);
                showFeedback('success', 'Parâmetro atualizado com sucesso.');
                if (selectedParamId === editingParam.id) {
                    const hasHist = await laboratorioConfiguracoesService.hasParameterHistory(selectedParamId);
                    setSelectedParamHistory(hasHist);
                }
            } else {
                const newP = await laboratorioConfiguracoesService.createParameter(payload);
                setSelectedParamId(newP.id);
                showFeedback('success', 'Parâmetro cadastrado com sucesso.');
            }

            await loadParametros();
            await loadDashboardCards();
            setShowParamModal(false);

        } catch (error) {
            if (error.message && error.message.includes('OPERATION_BLOCKED')) {
                showFeedback('error', 'Operação bloqueada: O tipo de resultado não pode ser alterado pois já existem resultados.');
            } else {
                showFeedback('error', 'Erro ao salvar parâmetro.');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleParamStatus = (param) => {
        setParamToToggle(param);
        setShowConfirmToggleParam(true);
    };

    const confirmToggleParamStatus = async () => {
        if (!paramToToggle) return;
        try {
            setActionLoading(true);
            const newStatus = !paramToToggle.is_active;
            await laboratorioConfiguracoesService.toggleParamStatus(paramToToggle.id, newStatus);
            showFeedback('success', `Parâmetro ${newStatus ? 'ativado' : 'inativado'} com sucesso.`);
            await loadParametros();
            await loadDashboardCards();
            setShowConfirmToggleParam(false);
            setParamToToggle(null);
        } catch (error) {
            showFeedback('error', 'Erro ao alterar status do parâmetro.');
        } finally {
            setActionLoading(false);
        }
    };

    const kpis = [
        { label: 'Exames ativos', value: cards.examesAtivos, icon: FileSignature, color: '#3b82f6' },
        { label: 'Setores ativos', value: cards.setoresAtivos, icon: Layers, color: '#10b981' },
        { label: 'Parâmetros ativos', value: cards.parametrosAtivos, icon: Activity, color: '#f59e0b' },
        { label: 'Usuários vinculados', value: cards.usuariosVinculados, icon: Users, color: '#64748b' },
    ];

    const tabs = [
        { id: 'exames', label: 'Exames' },
        { id: 'setores', label: 'Setores' },
        { id: 'parametros', label: 'Parâmetros e Referências' },
    ];

    const currentExam = examesList.find(e => e.id === selectedExamId);
    const currentParam = paramsList.find(p => p.id === selectedParamId);

    const translateResultType = (type) => {
        switch (type) {
            case 'NUMERICO': return 'Numérico';
            case 'TEXTO': return 'Texto';
            case 'ESTRUTURADO': return 'Estruturado';
            case 'QUALITATIVO': return 'Qualitativo';
            default: return type || '---';
        }
    };




    return (
        <div className="lab-cfg-container">
            {feedbackMsg && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 110000,
                    background: feedbackMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: feedbackMsg.type === 'success' ? '#047857' : '#b91c1c',
                    border: `1px solid ${feedbackMsg.type === 'success' ? '#10b981' : '#ef4444'}`,
                    padding: '1rem 1.5rem', borderRadius: '8px', fontWeight: '600',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    {feedbackMsg.text}
                </div>
            )}
            
            <div className="lab-warning-banner">
                <AlertTriangle size={16} />
                <span>Usuários da Recepção terão acesso somente para visualização das configurações.</span>
            </div>

            <header className="lab-cfg-header">
                <div>
                    <h1 className="lab-title">Configurações</h1>
                    <p className="lab-subtitle">Parâmetros, cadastros e regras operacionais do laboratório</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline" onClick={handleRefresh}>
                        {loadingCards || loadingExames ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                        Atualizar lista
                    </button>
                    {activeTab === 'exames' && (
                        <button 
                            className="lab-btn lab-btn-primary" 
                            onClick={openNewExamModal}
                        >
                            <Plus size={16} /> Novo exame
                        </button>
                    )}
                    {activeTab === 'setores' && (
                        <button 
                            className="lab-btn lab-btn-primary" 
                            onClick={openNewSectorModal}
                        >
                            <Plus size={16} /> Novo setor
                        </button>
                    )}
                    {activeTab === 'parametros' && (
                        <button className="lab-btn lab-btn-primary" onClick={openNewParamModal}>
                            <Plus size={16} /> Novo parâmetro
                        </button>
                    )}
                </div>
            </header>

            {/* KPIs */}
            <div className="lab-kpis-grid" style={{ marginBottom: '1.25rem' }}>
                {kpis.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-kpi-card">
                            <div className="lab-kpi-header">
                                <span className="lab-kpi-label">{item.label}</span>
                                <div className="lab-kpi-icon-wrapper" style={{ backgroundColor: `${item.color}15`, color: item.color, width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="lab-kpi-value" style={{ fontSize: '1.6rem' }}>
                                {loadingCards ? <Loader2 size={24} className="spin text-gray-400" /> : item.value}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Abas */}
            <div className="lab-cfg-tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        className={`lab-cfg-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === 'exames' && (
                <div className="lab-cfg-layout">
                    
                    {/* Lista de Exames */}
                    <div className="lab-cfg-main-col">
                        <div className="lab-card lab-cfg-list-card">
                            <div className="lab-cfg-list-header">
                                <div className="lab-cfg-filters-grid">
                                    <div className="lab-filter-item">
                                        <label>Nome / Código</label>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar exame..." 
                                            value={filters.search}
                                            onChange={e => setFilters({...filters, search: e.target.value})}
                                            onKeyDown={handleFilterKeyDown}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Setor</label>
                                        <select 
                                            value={filters.sector_id}
                                            onChange={e => setFilters({...filters, sector_id: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            {sectorsFilter.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Status</label>
                                        <select 
                                            value={filters.status}
                                            onChange={e => setFilters({...filters, status: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            <option value="ativos">Ativos</option>
                                            <option value="inativos">Inativos</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-actions">
                                        <button className="lab-btn lab-btn-primary" style={{ height: '38px' }} onClick={loadExames}>
                                            <Search size={16} /> Buscar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lab-cfg-table-wrapper">
                                <table className="lab-cfg-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Exame</th>
                                            <th>Setor</th>
                                            <th>Material</th>
                                            <th>Status</th>
                                            <th style={{ width: '90px', textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingExames ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <Loader2 size={32} className="spin text-gray-400" style={{ margin: '0 auto' }} />
                                                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando exames...</p>
                                                </td>
                                            </tr>
                                        ) : examesList.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <p style={{ color: '#64748b' }}>Nenhum exame encontrado com os filtros atuais.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            examesList.map(ex => (
                                                <tr 
                                                    key={ex.id} 
                                                    className={selectedExamId === ex.id ? 'active' : ''}
                                                    onClick={() => setSelectedExamId(ex.id)}
                                                >
                                                    <td className="font-bold text-gray-500" style={{ fontSize: '0.85rem' }}>{ex.code || '---'}</td>
                                                    <td className="font-bold text-primary">{ex.name}</td>
                                                    <td><span className="lab-badge lab-badge-gray" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}>{ex.sector_name}</span></td>
                                                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>{ex.material || '---'}</td>
                                                    <td>
                                                        <span className={`lab-badge ${ex.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`} style={!ex.is_active ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}>
                                                            {ex.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button 
                                                                className="lab-btn lab-btn-outline" 
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#3b82f6' }}
                                                                title="Editar exame"
                                                                onClick={(e) => { e.stopPropagation(); openEditExamModal(ex); }}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button 
                                                                className="lab-btn lab-btn-outline" 
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: ex.is_active ? '#ef4444' : '#10b981' }}
                                                                title={ex.is_active ? 'Inativar exame' : 'Ativar exame'}
                                                                onClick={(e) => { e.stopPropagation(); handleToggleExamStatus(ex); }}
                                                            >
                                                                {ex.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Detalhe do Exame */}
                    <div className="lab-cfg-side-col">
                        {currentExam ? (
                            <div className="lab-cfg-details-panel">
                                <div className="cfg-panel-header">
                                    <div className="cfg-panel-title">
                                        <h2>{currentExam.code} — {currentExam.name}</h2>
                                    </div>
                                    <div className="cfg-panel-badges mt-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span className="lab-badge lab-badge-gray">{currentExam.sector_name}</span>
                                        <span className={`lab-badge ${currentExam.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`}>
                                            {currentExam.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="cfg-panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Código</label>
                                        <span className="font-semibold text-primary">{currentExam.code || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Nome</label>
                                        <span className="font-bold text-gray-900">{currentExam.name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Setor</label>
                                        <span>{currentExam.sector_name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Material</label>
                                        <span>{currentExam.material || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Método</label>
                                        <span>{currentExam.method || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Analisador</label>
                                        <span>{currentExam.analyzer_name || '---'}</span>
                                    </div>
                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Tipo de resultado</label>
                                        <span className="font-semibold">{translateResultType(currentExam.result_type)}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Unidade</label>
                                        <span>{currentExam.unit || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Ordem de impressão</label>
                                        <span>{currentExam.print_order}</span>
                                    </div>
                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Exige conferência?</label>
                                        <span style={{ color: currentExam.requires_conference ? '#10b981' : '#64748b', fontWeight: currentExam.requires_conference ? 'bold' : 'normal' }}>
                                            {currentExam.requires_conference ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Imprime no laudo?</label>
                                        <span style={{ color: currentExam.prints_on_report ? '#10b981' : '#64748b', fontWeight: currentExam.prints_on_report ? 'bold' : 'normal' }}>
                                            {currentExam.prints_on_report ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="lab-cfg-details-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <FileSignature size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>Selecione um exame para visualizar os detalhes.</p>
                                {examesList.length > 0 && <p style={{ fontSize: '0.85rem', marginTop: '1rem', color: '#cbd5e1' }}>Este exame ainda não possui parâmetros cadastrados.</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'setores' && (
                <div className="lab-cfg-layout fade-in">
                    <div className="lab-cfg-main-col">
                        <div className="lab-card lab-cfg-list-card">
                            <div className="lab-cfg-list-header">
                                <div className="lab-cfg-filters-grid lab-cfg-filters-grid--sectors">
                                    <div className="lab-filter-item">
                                        <label>Nome / Código</label>
                                        <input
                                            type="text"
                                            placeholder="Buscar setor (Código ou Nome)"
                                            value={sectorFilters.search}
                                            onChange={e => handleFilterSector('search', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') loadSectors(); }}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        />
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Status</label>
                                        <select
                                            value={sectorFilters.status}
                                            onChange={e => handleFilterSector('status', e.target.value)}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos os status</option>
                                            <option value="ativos">Somente Ativos</option>
                                            <option value="inativos">Somente Inativos</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-actions">
                                        <button className="lab-btn lab-btn-primary" style={{ height: '38px' }} onClick={loadSectors}>
                                            <Search size={16} /> Buscar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lab-cfg-table-wrapper">
                                {loadingSectors ? (
                                    <table className="lab-cfg-table">
                                        <tbody>
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <Loader2 size={32} className="spin text-gray-400" style={{ margin: '0 auto' }} />
                                                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando setores...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : sectorsList.length === 0 ? (
                                    <table className="lab-cfg-table">
                                        <tbody>
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <p style={{ color: '#64748b' }}>Nenhum setor encontrado com os filtros atuais.</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="lab-cfg-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '70px', textAlign: 'center' }}>Ordem</th>
                                                <th style={{ width: '90px' }}>Código</th>
                                                <th style={{ width: '160px' }}>Setor</th>
                                                <th>Descrição</th>
                                                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                                                <th style={{ width: '90px', textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sectorsList.map(sector => (
                                                <tr
                                                    key={sector.id}
                                                    className={selectedSectorId === sector.id ? 'active' : ''}
                                                    onClick={() => setSelectedSectorId(sector.id)}
                                                    style={{ opacity: sector.is_active ? 1 : 0.6 }}
                                                >
                                                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#64748b', fontWeight: '600' }}>
                                                        {sector.print_order !== null ? sector.print_order : '—'}
                                                    </td>
                                                    <td className="font-bold text-gray-500" style={{ fontSize: '0.85rem' }}>
                                                        {sector.code}
                                                    </td>
                                                    <td className="font-bold text-primary">{sector.name}</td>
                                                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>
                                                        <span title={sector.description}>
                                                            {sector.description
                                                                ? sector.description.length > 50
                                                                    ? sector.description.substring(0, 50) + '...'
                                                                    : sector.description
                                                                : '—'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`lab-badge ${sector.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`} style={!sector.is_active ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}>
                                                            {sector.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                className="lab-btn lab-btn-outline"
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#3b82f6' }}
                                                                title="Editar setor"
                                                                onClick={(e) => { e.stopPropagation(); openEditSectorModal(sector); }}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="lab-btn lab-btn-outline"
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: sector.is_active ? '#ef4444' : '#10b981' }}
                                                                title={sector.is_active ? 'Inativar setor' : 'Ativar setor'}
                                                                onClick={(e) => { e.stopPropagation(); requestSectorAction(sector, sector.is_active ? 'inactivate' : 'activate'); }}
                                                            >
                                                                {sector.is_active ? <Ban size={16} /> : <CheckCircle size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lab-cfg-side-col">
                        {(() => {
                            const sel = sectorsList.find(s => s.id === selectedSectorId);
                            return sel ? (
                                <div className="lab-cfg-details-panel fade-in">
                                    <div className="cfg-panel-header">
                                        <div className="cfg-panel-title">
                                            <h2>{sel.code} — {sel.name}</h2>
                                        </div>
                                        <div className="cfg-panel-badges mt-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                            {sel.print_order !== null && (
                                                <span className="lab-badge lab-badge-gray">Ordem: {sel.print_order}</span>
                                            )}
                                            <span className={`lab-badge ${sel.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`} style={!sel.is_active ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}>
                                                {sel.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="cfg-panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                            <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Código</label>
                                            <span className="font-semibold text-primary">{sel.code || '---'}</span>
                                        </div>
                                        <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                            <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Nome</label>
                                            <span className="font-bold">{sel.name}</span>
                                        </div>
                                        <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                            <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Ordem</label>
                                            <span>{sel.print_order !== null ? sel.print_order : '—'}</span>
                                        </div>
                                        <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                                            <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Status</label>
                                            <span style={{ color: sel.is_active ? '#047857' : '#ef4444', fontWeight: '600' }}>
                                                {sel.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />
                                        <div className="cfg-info-box">
                                            <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Descrição</label>
                                            <span style={{ whiteSpace: 'pre-wrap', color: '#334155' }}>{sel.description || '—'}</span>
                                        </div>
                                        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />
                                        <div className="cfg-info-box">
                                            <label style={{ color: '#3b82f6', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <FlaskConical size={14} /> Exames Vinculados
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                <span style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', lineHeight: '1' }}>
                                                    {selectedSectorExamCount !== null ? selectedSectorExamCount : '...'}
                                                </span>
                                                <span style={{ color: '#64748b', fontWeight: '500', fontSize: '0.9rem' }}>exames neste setor</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="lab-cfg-details-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <Layers size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p>Selecione um setor para visualizar os detalhes.</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {activeTab === 'parametros' && (
                <div className="lab-cfg-layout">
                    {/* Lista de Parâmetros */}
                    <div className="lab-cfg-main-col">
                        <div className="lab-card lab-cfg-list-card">
                            <div className="lab-cfg-list-header">
                                <div className="lab-cfg-filters-grid">
                                    <div className="lab-filter-item">
                                        <label>Nome / Código</label>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar parâmetro..." 
                                            value={paramFilters.search}
                                            onChange={e => setParamFilters({...paramFilters, search: e.target.value})}
                                            onKeyDown={handleParamFilterKeyDown}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Exame</label>
                                        <select 
                                            value={paramFilters.exam_id}
                                            onChange={e => setParamFilters({...paramFilters, exam_id: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            {allExamsLookup.map(ex => (
                                                <option key={ex.id} value={ex.id}>{ex.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="lab-filter-item">
                                        <label>Status</label>
                                        <select 
                                            value={paramFilters.status}
                                            onChange={e => setParamFilters({...paramFilters, status: e.target.value})}
                                            style={{ height: '38px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }}
                                        >
                                            <option value="todos">Todos</option>
                                            <option value="ativos">Ativos</option>
                                            <option value="inativos">Inativos</option>
                                        </select>
                                    </div>
                                    <div className="lab-filter-actions">
                                        <button className="lab-btn lab-btn-primary" style={{ height: '38px' }} onClick={() => { setParamPage(1); loadParametros(); }}>
                                            <Search size={16} /> Buscar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lab-cfg-table-wrapper">
                                <table className="lab-cfg-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '8%' }}>Exame</th>
                                            <th style={{ width: '7%', textAlign: 'center' }}>Ordem</th>
                                            <th style={{ width: '18%' }}>Cód</th>
                                            <th style={{ width: '24%' }}>Parâmetro</th>
                                            <th style={{ width: '13%' }}>Tipo</th>
                                            <th style={{ width: '10%' }}>Unid</th>
                                            <th style={{ width: '11%' }}>Status</th>
                                            <th style={{ width: '9%', textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingParams ? (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <Loader2 size={32} className="spin text-gray-400" style={{ margin: '0 auto' }} />
                                                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando parâmetros...</p>
                                                </td>
                                            </tr>
                                        ) : paramsList.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                                                    <p style={{ color: '#64748b' }}>Nenhum parâmetro encontrado com os filtros atuais.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paramsList.map(p => (
                                                <tr 
                                                    key={p.id} 
                                                    className={selectedParamId === p.id ? 'active' : ''}
                                                    onClick={() => setSelectedParamId(p.id)}
                                                    style={{ opacity: p.is_active ? 1 : 0.6 }}
                                                >
                                                    <td>
                                                        <span className="lab-badge lab-badge-gray" style={{ background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 'bold' }} title={p.exam_name}>
                                                            {p.exam_code || '---'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center font-bold text-gray-400">{p.display_order}</td>
                                                    <td className="font-bold text-gray-500" style={{ fontSize: '0.85rem' }}>{p.code || '---'}</td>
                                                    <td className="font-bold text-primary" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.name}</td>
                                                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>{translateResultType(p.result_type)}</td>
                                                    <td style={{ color: '#475569', fontSize: '0.85rem' }}>{p.unit || '—'}</td>
                                                    <td>
                                                        <span className={`lab-badge ${p.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`} style={!p.is_active ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}>
                                                            {p.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button 
                                                                className="lab-btn lab-btn-outline" 
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: '#3b82f6' }}
                                                                title="Editar parâmetro"
                                                                onClick={(e) => { e.stopPropagation(); openEditParamModal(p); }}
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button 
                                                                className="lab-btn lab-btn-outline" 
                                                                style={{ padding: '0.4rem', border: 'none', background: 'transparent', color: p.is_active ? '#ef4444' : '#10b981' }}
                                                                title={p.is_active ? 'Inativar' : 'Ativar'}
                                                                onClick={(e) => { e.stopPropagation(); handleToggleParamStatus(p); }}
                                                            >
                                                                {p.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Paginação da Aba Parâmetros */}
                            {paramTotalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        Total de <strong>{paramTotal}</strong> registros.
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button 
                                            className="lab-btn lab-btn-outline" 
                                            style={{ padding: '0.4rem 0.75rem', height: 'auto', gap: '0.25rem' }}
                                            disabled={paramPage === 1}
                                            onClick={() => setParamPage(prev => Math.max(1, prev - 1))}
                                        >
                                            <ChevronLeft size={16} /> Anterior
                                        </button>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                                            Página {paramPage} de {paramTotalPages}
                                        </span>
                                        <button 
                                            className="lab-btn lab-btn-outline" 
                                            style={{ padding: '0.4rem 0.75rem', height: 'auto', gap: '0.25rem' }}
                                            disabled={paramPage === paramTotalPages}
                                            onClick={() => setParamPage(prev => Math.min(paramTotalPages, prev + 1))}
                                        >
                                            Próxima <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalhe do Parâmetro (Painel Lateral) */}
                    <div className="lab-cfg-side-col">
                        {currentParam ? (
                            <div className="lab-cfg-details-panel">
                                <div className="cfg-panel-header">
                                    <div className="cfg-panel-title">
                                        <h2>{currentParam.exam_code} — {currentParam.exam_name}</h2>
                                    </div>
                                    <div className="cfg-panel-badges mt-2" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span className="lab-badge lab-badge-gray" style={{ fontWeight: 'bold', color: '#1e293b' }}>{currentParam.code}</span>
                                        <span className={`lab-badge ${currentParam.is_active ? 'lab-badge-success' : 'lab-badge-gray'}`} style={!currentParam.is_active ? { background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' } : {}}>
                                            {currentParam.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                        <span className="lab-badge lab-badge-gray">Ordem: {currentParam.display_order}</span>
                                    </div>
                                </div>
                                <div className="cfg-panel-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                                    
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' }}>Parâmetro</h4>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Código</label>
                                        <span className="font-bold text-gray-900">{currentParam.code || '---'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Nome</label>
                                        <span className="font-semibold text-primary">{currentParam.name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Tipo de resultado</label>
                                        <span className="font-semibold">{translateResultType(currentParam.result_type)}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Unidade</label>
                                        <span>{currentParam.unit || '—'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Valor mínimo</label>
                                        <span>{currentParam.min_value !== null ? currentParam.min_value : '—'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Valor máximo</label>
                                        <span>{currentParam.max_value !== null ? currentParam.max_value : '—'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Ordem de exibição</label>
                                        <span>{currentParam.display_order}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Obrigatório na digitação</label>
                                        <span style={{ color: currentParam.is_required ? '#10b981' : '#64748b', fontWeight: currentParam.is_required ? '600' : 'normal' }}>
                                            {currentParam.is_required ? 'Sim' : 'Não'}
                                        </span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Status</label>
                                        <span>{currentParam.is_active ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    
                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' }}>Texto de Referência</h4>
                                    <div className="cfg-info-box">
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#334155', fontFamily: 'monospace' }}>
                                            {(currentParam.reference_text && currentParam.reference_text.trim() !== '') ? currentParam.reference_text : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontFamily: 'inherit' }}>Nenhuma referência cadastrada.</span>}
                                        </div>
                                    </div>

                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' }}>Exame Vinculado</h4>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Exame</label>
                                        <span>{currentParam.exam_code} - {currentParam.exam_name}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Material</label>
                                        <span>{currentParam.exam_material || '—'}</span>
                                    </div>
                                    <div className="cfg-info-box" style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Método</label>
                                        <span>{currentParam.exam_method || '—'}</span>
                                    </div>

                                    <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
                                    
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-0.5rem' }}>Histórico</h4>
                                    <div className="cfg-info-box">
                                        {historyLoading ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                <Loader2 size={16} className="spin" /> Verificando histórico...
                                            </div>
                                        ) : selectedParamHistory ? (
                                            <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: '600' }}>Possui resultados registrados</span>
                                        ) : (
                                            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '600' }}>Ainda não utilizado</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="lab-cfg-details-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>Selecione um parâmetro para visualizar os detalhes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ---------------- MODAIS DE PARÂMETROS ---------------- */}

            {/* Modal Novo/Editar Parâmetro */}
            {showParamModal && (
                <div className="lab-modal-overlay" onClick={handleCloseParamModal} style={{ zIndex: 10000 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="lab-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSignature size={20} color="#3b82f6" /> 
                                {editingParam ? 'Editar Parâmetro' : 'Novo Parâmetro'}
                            </h2>
                            <button onClick={handleCloseParamModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '0 1.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                            {editingParam ? 'Edite as informações principais do parâmetro.' : 'Cadastre as informações principais do parâmetro.'}
                        </div>
                        <div className="lab-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                
                                {/* 1. Vínculo com Exame */}
                                <div>
                                    <LabCombobox
                                        label="Exame Vinculado"
                                        required
                                        inputId="param-exam"
                                        name="exam_id"
                                        disabled={!!editingParam}
                                        value={(() => {
                                            if (!paramForm.exam_id) return '';
                                            const ex = allExamsLookup.find(e => e.id === paramForm.exam_id);
                                            return ex ? `${ex.code} - ${ex.name}` : '';
                                        })()}
                                        onChange={(val) => {
                                            const ex = allExamsLookup.find(e => `${e.code} - ${e.name}` === val);
                                            if (ex) setParamForm({...paramForm, exam_id: ex.id});
                                            else setParamForm({...paramForm, exam_id: ''});
                                        }}
                                        options={allExamsLookup.map(ex => `${ex.code} - ${ex.name}`)}
                                        allowCustomValue={false}
                                        searchable={true}
                                        emptyMessage="Nenhum exame encontrado."
                                        placeholder="Buscar ou selecionar exame..."
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Código <span style={{color:'red'}}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={paramForm.code} 
                                            onChange={e => setParamForm({...paramForm, code: e.target.value.toUpperCase()})}
                                            placeholder="Ex: GLI"
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', textTransform: 'uppercase' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Nome / Descrição <span style={{color:'red'}}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={paramForm.name} 
                                            onChange={e => setParamForm({...paramForm, name: e.target.value})}
                                            placeholder="Ex: Glicose Basal"
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Tipo de Resultado <span style={{color:'red'}}>*</span></label>
                                        <select 
                                            value={paramForm.result_type} 
                                            onChange={e => setParamForm({...paramForm, result_type: e.target.value})}
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', background: (editingParam && selectedParamHistory) ? '#f1f5f9' : '#fff' }}
                                            disabled={editingParam && selectedParamHistory}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="NUMERICO">Numérico</option>
                                            <option value="TEXTO">Texto Livre</option>
                                            <option value="ESTRUTURADO">Estruturado</option>
                                            <option value="QUALITATIVO">Qualitativo</option>
                                        </select>
                                        {editingParam && selectedParamHistory && (
                                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Lock size={12} /> Bloqueado (possui histórico)
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Unidade</label>
                                        <input 
                                            type="text" 
                                            list="units-datalist"
                                            value={paramForm.unit} 
                                            onChange={e => setParamForm({...paramForm, unit: e.target.value})}
                                            placeholder="Ex: mg/dL"
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                        <datalist id="units-datalist">
                                            {distinctUnits.map((u, i) => <option key={i} value={u} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Ordem <span style={{color:'red'}}>*</span></label>
                                        <input 
                                            type="number" 
                                            value={paramForm.display_order} 
                                            onChange={e => setParamForm({...paramForm, display_order: e.target.value})}
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Valor Mínimo</label>
                                        <input 
                                            type="text" 
                                            value={paramForm.min_value} 
                                            onChange={e => setParamForm({...paramForm, min_value: e.target.value})}
                                            placeholder="Ex: 60,5"
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Valor Máximo</label>
                                        <input 
                                            type="text" 
                                            value={paramForm.max_value} 
                                            onChange={e => setParamForm({...paramForm, max_value: e.target.value})}
                                            placeholder="Ex: 99.9"
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Valores de Referência (Laudo)</label>
                                    <textarea 
                                        value={paramForm.reference_text}
                                        onChange={e => setParamForm({...paramForm, reference_text: e.target.value})}
                                        rows={5}
                                        placeholder="Digite as faixas de referência...\nEx:\nHomens: 60 a 100 mg/dL\nMulheres: 60 a 95 mg/dL"
                                        style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '10px', resize: 'vertical', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>A quebra de linha será respeitada na impressão do laudo.</span>
                                </div>

                                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                            type="checkbox" 
                                            id="param-is-required"
                                            checked={paramForm.is_required}
                                            onChange={e => setParamForm({...paramForm, is_required: e.target.checked})}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <label htmlFor="param-is-required" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', cursor: 'pointer' }}>
                                            Preenchimento obrigatório
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                            type="checkbox" 
                                            id="param-is-active"
                                            checked={paramForm.is_active}
                                            onChange={e => setParamForm({...paramForm, is_active: e.target.checked})}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <label htmlFor="param-is-active" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', cursor: 'pointer' }}>
                                            Parâmetro ativo
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="lab-modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                            <button className="lab-btn lab-btn-outline" onClick={handleCloseParamModal} disabled={actionLoading}>
                                Cancelar
                            </button>
                            <button className="lab-btn lab-btn-primary" onClick={handleSaveParam} disabled={actionLoading}>
                                {actionLoading ? <Loader2 size={16} className="spin" /> : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de descarte de edição de Parâmetro */}
            {showUnsavedParamModal && (
                <div className="lab-modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>Descartar alterações?</h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                                Você tem alterações não salvas. Deseja realmente fechar e perder as edições?
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setShowUnsavedParamModal(false)}>
                                    Continuar editando
                                </button>
                                <button className="lab-btn lab-btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDiscardParamChanges}>
                                    Descartar e fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de inativação/ativação de Parâmetro */}
            {showConfirmToggleParam && paramToToggle && (
                <div className="lab-modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>Confirmar alteração de status</h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                                Deseja realmente {paramToToggle.is_active ? 'inativar' : 'ativar'} o parâmetro <strong>{paramToToggle.code} - {paramToToggle.name}</strong>?
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setShowConfirmToggleParam(false)} disabled={actionLoading}>
                                    Cancelar
                                </button>
                                <button className="lab-btn lab-btn-primary" onClick={confirmToggleParamStatus} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 size={16} className="spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal Editar Exame */}
            {showExamModal && (
                <div className="lab-modal-overlay" onClick={handleCloseExamModal} style={{ zIndex: 10000 }}>
                    
                    <div className="lab-modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="lab-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSignature size={20} color="#3b82f6" /> 
                                {editingExam ? 'Editar Exame' : 'Novo Exame'}
                            </h2>
                            <button onClick={handleCloseExamModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '0 1.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                            {editingExam ? 'Edite as informações principais do exame laboratorial.' : 'Cadastre as informações principais do exame laboratorial.'}
                        </div>
                        <div className="lab-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Identificação</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Código <span style={{color:'red'}}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={examForm.code} 
                                            onChange={e => setExamForm({...examForm, code: e.target.value.toUpperCase()})}
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', textTransform: 'uppercase' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Nome do exame <span style={{color:'red'}}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={examForm.name} 
                                            onChange={e => setExamForm({...examForm, name: e.target.value})}
                                            style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <LabCombobox
                                        label="Setor"
                                        required
                                        inputId="exam-sector"
                                        name="sector_id"
                                        value={sectorsFilter.find(s => s.id === examForm.sector_id)?.name || ''}
                                        onChange={(val) => {
                                            const sec = sectorsFilter.find(s => s.name === val);
                                            if (sec) setExamForm({...examForm, sector_id: sec.id});
                                        }}
                                        options={sectorsFilter.map(s => s.name)}
                                        allowCustomValue={false}
                                        placeholder="Selecione o setor"
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                                        <input 
                                            type="checkbox" 
                                            id="exam-is-active"
                                            checked={examForm.is_active}
                                            onChange={e => setExamForm({...examForm, is_active: e.target.checked})}
                                            style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}
                                        />
                                        <label htmlFor="exam-is-active" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', cursor: 'pointer' }}>Exame ativo</label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Processamento</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <LabCombobox 
                                        label="Material"
                                        inputId="exam-material"
                                        name="material"
                                        value={examForm.material} 
                                        onChange={val => setExamForm({...examForm, material: val})}
                                        options={distinctMaterials}
                                        placeholder="Buscar ou digitar material..."
                                    />
                                    <LabCombobox 
                                        label="Método"
                                        inputId="exam-method"
                                        name="method"
                                        value={examForm.method} 
                                        onChange={val => setExamForm({...examForm, method: val})}
                                        options={distinctMethods}
                                        placeholder="Buscar ou digitar método..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <LabCombobox 
                                        label="Tipo de resultado"
                                        required
                                        inputId="exam-result-type"
                                        name="result_type"
                                        value={examForm.result_type ? ({
                                            'ESTRUTURADO': 'Estruturado',
                                            'NUMERICO': 'Numérico',
                                            'QUALITATIVO': 'Qualitativo',
                                            'TEXTO': 'Texto'
                                        }[examForm.result_type] || '') : ''}
                                        onChange={(val) => {
                                            const map = {
                                                'Estruturado': 'ESTRUTURADO',
                                                'Numérico': 'NUMERICO',
                                                'Qualitativo': 'QUALITATIVO',
                                                'Texto': 'TEXTO'
                                            };
                                            if (map[val]) setExamForm({...examForm, result_type: map[val]});
                                        }}
                                        options={['Estruturado', 'Numérico', 'Qualitativo', 'Texto']}
                                        allowCustomValue={false}
                                        placeholder="Selecione o tipo"
                                    />
                                    <LabCombobox 
                                        label="Unidade"
                                        inputId="exam-unit"
                                        name="unit"
                                        value={examForm.unit} 
                                        onChange={val => setExamForm({...examForm, unit: val})}
                                        options={distinctUnits}
                                        placeholder="Buscar ou digitar unidade..."
                                    />
                                </div>
                                <LabCombobox 
                                    label="Analisador"
                                    inputId="exam-analyzer"
                                    name="analyzer_name"
                                    value={examForm.analyzer_name} 
                                    onChange={val => setExamForm({...examForm, analyzer_name: val})}
                                    options={distinctAnalyzers}
                                    placeholder="Buscar ou digitar analisador..."
                                />
                            </div>
                            
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Impressão e Fluxo</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Ordem de impressão</label>
                                        <input 
                                            type="number" 
                                            value={examForm.print_order} 
                                            onChange={e => setExamForm({...examForm, print_order: e.target.value})}
                                            style={{ width: '100%', maxWidth: '200px', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                id="exam-req-conf"
                                                checked={examForm.requires_conference}
                                                onChange={e => setExamForm({...examForm, requires_conference: e.target.checked})}
                                                style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}
                                            />
                                            <label htmlFor="exam-req-conf" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', cursor: 'pointer' }}>Exige conferência</label>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                id="exam-print-report"
                                                checked={examForm.prints_on_report}
                                                onChange={e => setExamForm({...examForm, prints_on_report: e.target.checked})}
                                                style={{ width: '16px', height: '16px', marginRight: '0.5rem' }}
                                            />
                                            <label htmlFor="exam-print-report" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', cursor: 'pointer' }}>Imprime no laudo</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lab-modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                            <button className="lab-btn lab-btn-outline" onClick={handleCloseExamModal} disabled={actionLoading}>
                                Cancelar
                            </button>
                            <button className="lab-btn lab-btn-primary" onClick={handleSaveExam} disabled={actionLoading}>
                                {actionLoading ? <Loader2 size={16} className="spin" /> : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de descarte de edição/cadastro de Exame */}
            {showUnsavedExamModal && (
                <div className="lab-modal-overlay" style={{ zIndex: 10001 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                                {editingExam ? 'Descartar alterações?' : 'Descartar cadastro?'}
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                                {editingExam ? 'As alterações realizadas não foram salvas.' : 'As informações preenchidas não foram salvas.'}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setShowUnsavedExamModal(false)}>
                                    {editingExam ? 'Continuar editando' : 'Continuar preenchendo'}
                                </button>
                                <button className="lab-btn lab-btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDiscardExamChanges}>
                                    {editingExam ? 'Descartar alterações' : 'Descartar cadastro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmação de inativação/ativação de Exame */}
            {/* Modal de Setor */}
            {showSectorModal && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-content" style={{ maxWidth: '600px' }}>
                        <div className="lab-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Layers size={20} color="#3b82f6" /> 
                                {editingSector ? 'Editar setor' : 'Novo setor'}
                            </h2>
                            <button onClick={handleCloseSectorModal} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '0 1.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                            {editingSector ? 'Atualize as informações do setor laboratorial.' : 'Cadastre as informações principais do setor laboratorial.'}
                        </div>
                        <div className="lab-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Código <span style={{color: '#ef4444'}}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={sectorForm.code} 
                                        onChange={e => setSectorForm({...sectorForm, code: e.target.value.toUpperCase()})}
                                        placeholder="Ex: BIOQ"
                                        style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', textTransform: 'uppercase' }} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Nome do setor <span style={{color: '#ef4444'}}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={sectorForm.name} 
                                        onChange={e => setSectorForm({...sectorForm, name: e.target.value})}
                                        placeholder="Ex: Bioquímica"
                                        style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Descrição</label>
                                <textarea 
                                    value={sectorForm.description} 
                                    onChange={e => setSectorForm({...sectorForm, description: e.target.value})}
                                    placeholder="Descrição detalhada do setor..."
                                    style={{ width: '100%', minHeight: '80px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '10px', resize: 'vertical' }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Ordem de impressão</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={sectorForm.print_order} 
                                        onChange={e => setSectorForm({...sectorForm, print_order: e.target.value})}
                                        placeholder="Ex: 1"
                                        style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                                    <label className="lab-checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={sectorForm.is_active} 
                                            onChange={e => setSectorForm({...sectorForm, is_active: e.target.checked})}
                                        />
                                        Setor ativo
                                    </label>
                                </div>
                            </div>

                        </div>
                        <div className="lab-modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
                            <button className="lab-btn lab-btn-outline" onClick={handleCloseSectorModal}>Cancelar</button>
                            <button className="lab-btn lab-btn-primary" onClick={handleSaveSector} disabled={loadingSectors}>
                                {loadingSectors ? 'Salvando...' : 'Salvar setor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Descarte de Setor */}
            {showUnsavedSectorModal && (
                <div className="lab-modal-overlay" style={{ zIndex: 10001 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                                {editingSector ? 'Descartar alterações?' : 'Descartar cadastro?'}
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                                {editingSector ? 'As alterações realizadas no setor não foram salvas.' : 'As informações preenchidas não foram salvas.'}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setShowUnsavedSectorModal(false)}>
                                    Continuar editando
                                </button>
                                <button className="lab-btn lab-btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmDiscardSectorChanges}>
                                    {editingSector ? 'Descartar alterações' : 'Descartar cadastro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ação de Status de Setor */}
            {sectorActionModal.isOpen && (
                <div className="lab-modal-overlay" style={{ zIndex: 10001 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '450px' }}>
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                {sectorActionModal.type === 'activate' ? (
                                    <CheckCircle size={48} color="#10b981" />
                                ) : (
                                    <Ban size={48} color="#ef4444" />
                                )}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '1rem', textAlign: 'center' }}>
                                {sectorActionModal.type === 'activate' ? 'Ativar setor?' : 'Inativar setor?'}
                            </h3>
                            <p style={{ color: '#475569', marginBottom: '1rem', textAlign: 'center', lineHeight: '1.5' }}>
                                {sectorActionModal.type === 'activate' 
                                    ? 'O setor voltará a ficar disponível para novos cadastros de exames.'
                                    : 'O setor deixará de ficar disponível para novos cadastros de exames. Os exames já vinculados serão preservados.'}
                            </p>
                            
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Código</span>
                                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{sectorActionModal.sector?.code}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Nome</span>
                                    <span style={{ fontWeight: '500', color: '#0f172a' }}>{sectorActionModal.sector?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Status atual</span>
                                    <span className={`lab-status-badge ${sectorActionModal.sector?.is_active ? 'active' : 'inactive'}`}>
                                        {sectorActionModal.sector?.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                {sectorActionModal.type === 'inactivate' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '500' }}>Este setor possui {sectorActionModal.examCount} exame(s) vinculado(s). Eles continuarão preservados.</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setSectorActionModal({ isOpen: false, type: '', sector: null, examCount: 0 })} disabled={loadingSectors}>
                                    Cancelar
                                </button>
                                <button 
                                    className="lab-btn lab-btn-primary" 
                                    style={{ background: sectorActionModal.type === 'activate' ? '#10b981' : '#ef4444', borderColor: sectorActionModal.type === 'activate' ? '#10b981' : '#ef4444' }} 
                                    onClick={confirmSectorAction}
                                    disabled={loadingSectors}
                                >
                                    {loadingSectors ? 'Processando...' : (sectorActionModal.type === 'activate' ? 'Ativar setor' : 'Inativar setor')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showConfirmToggleExam && examToToggle && (
                <div className="lab-modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="lab-modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
                        <div style={{ padding: '2rem' }}>
                            <AlertTriangle size={48} color={examToToggle.is_active ? "#ef4444" : "#10b981"} style={{ margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                                {examToToggle.is_active ? 'Inativar exame?' : 'Ativar exame?'}
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                                {examToToggle.is_active 
                                    ? "O exame deixará de ficar disponível para novos atendimentos. Os atendimentos, resultados e laudos anteriores serão preservados." 
                                    : "O exame voltará a ficar disponível para novos atendimentos."}
                            </p>
                            
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '1.5rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#475569' }}>Código:</strong> {examToToggle.code}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#475569' }}>Nome:</strong> {examToToggle.name}</div>
                                <div style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#475569' }}>Setor:</strong> {examToToggle.sector_name}</div>
                                <div><strong style={{ color: '#475569' }}>Status atual:</strong> {examToToggle.is_active ? 'Ativo' : 'Inativo'}</div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="lab-btn lab-btn-outline" onClick={() => setShowConfirmToggleExam(false)} disabled={actionLoading}>
                                    Cancelar
                                </button>
                                <button 
                                    className="lab-btn lab-btn-primary" 
                                    style={examToToggle.is_active ? { background: '#ef4444', borderColor: '#ef4444' } : {}} 
                                    onClick={confirmToggleExamStatus} 
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 size={16} className="spin" /> : (examToToggle.is_active ? 'Inativar exame' : 'Ativar exame')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaboratorioConfiguracoes;
