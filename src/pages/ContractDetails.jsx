import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    MoreVertical,
    FileText,
    DollarSign,
    Clock,
    Calendar,
    AlertCircle,
    CheckCircle,
    Landmark,
    Trash2,
    Plus,
    Edit2,
    ShieldAlert,
    AlertTriangle,
    UploadCloud,
    ExternalLink,
    Download,
    FileWarning,
    X
} from 'lucide-react';
import { contractsService } from '../services/api/contracts.service';
import { empenhosService } from '../services/api/empenhos.service';
import { contractItemsService } from '../services/api/contractItems.service';
import { secretariatsService } from '../services/api/secretariats.service';
import { allocationsService } from '../services/api/allocations.service';
import { filesService } from '../services/api/files.service';
import { ofsService } from '../services/api/ofs.service';
import { useTenant } from '../context/TenantContext';
import { formatLocalDate, getDaysDiffFromToday, parseLocalDate, getTodayLocalDateString } from '../utils/dateUtils';
import './ContractDetails.css';

const ContractDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tenantId } = useTenant();

    const [contract, setContract] = useState(null);
    const [empenhos, setEmpenhos] = useState([]);
    const [contractHistory, setContractHistory] = useState([]);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [isLoadingEmpenhos, setIsLoadingEmpenhos] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isLoadingOfs, setIsLoadingOfs] = useState(true);
    const [error, setError] = useState(false);

    const [contractOfs, setContractOfs] = useState([]);
    const [reservedAmount, setReservedAmount] = useState(0);
    const [reservedQuantityPerItem, setReservedQuantityPerItem] = useState({}); // { itemId: reservedQty }
    const [reservedQuantityPerItemPerSec, setReservedQuantityPerItemPerSec] = useState({}); // { itemId: { secId: qty } }

    const [activeTab, setActiveTab] = useState('geral');
    const [showAlerts, setShowAlerts] = useState(true);

    // Itens & Rateio State
    const [items, setItems] = useState([]);
    const [globalItemsCount, setGlobalItemsCount] = useState(0);
    const [secretariats, setSecretariats] = useState([]);
    const [allocationsSummaryByItemId, setAllocationsSummaryByItemId] = useState({}); // { itemId: sumAllocated }
    const [itemAllocations, setItemAllocations] = useState({}); // Mapping from itemId -> allocations list
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    // UI State for Items
    const [expandedItemId, setExpandedItemId] = useState(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isSubmittingItem, setIsSubmittingItem] = useState(false);
    const [itemFormData, setItemFormData] = useState({
        item_number: '', description: '', unit: '', unit_price: '', total_quantity: ''
    });
    const [editingItemId, setEditingItemId] = useState(null);

    // Rateio UI State
    const [allocationForm, setAllocationForm] = useState({}); // { secretariatId: quantity }
    const [rateioSelect, setRateioSelect] = useState('');
    const [rateioAmount, setRateioAmount] = useState('');
    const [isSavingAllocations, setIsSavingAllocations] = useState(false);
    const rateioAmountRef = useRef(null);

    // Delete Confirmation State
    const [itemToDelete, setItemToDelete] = useState(null);

    // Contract Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        number: '',
        code: '',
        title: '',
        supplierName: '',
        totalValue: '',
        startDate: '',
        endDate: '',
        secretariat_id: '',
        biddingProcess: '',
        electronicAuction: '',
        notes: '',
        contract_object: '',
        cnpj: '',
        address: '',
        managerName: '',
        manager_registration: '',
        technical_fiscal_name: '',
        technical_fiscal_registration: '',
        administrative_fiscal_name: '',
        administrative_fiscal_registration: '',
        contract_pdf_url: '',
        rescinded_at: '',
        rescission_notes: '',
        rescission_pdf_url: ''
    });

    // OF Creation State
    const [isOfOfModalOpen, setIsOfOfModalOpen] = useState(false);
    const [selectedOfSecretariat, setSelectedOfSecretariat] = useState('');
    const [isCreatingOf, setIsCreatingOf] = useState(false);

    // Toast State
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    // Força a exibição da barra de rolagem (evita layout shift ao trocar de abas)
    useEffect(() => {
        document.body.style.overflowY = 'scroll';
        return () => {
            document.body.style.overflowY = 'auto';
        };
    }, []);

    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    const [isRescissionActive, setIsRescissionActive] = useState(false);
    const [isPdfSectionExpanded, setIsPdfSectionExpanded] = useState(false);
    const [contractFile, setContractFile] = useState(null);
    const [rescissionFile, setRescissionFile] = useState(null);

    const formatCnpj = (val) => {
        const v = val.replace(/\D/g, '').slice(0, 14);
        if (v.length <= 2) return v;
        if (v.length <= 5) return v.replace(/^(\d{2})(\d)/, '$1.$2');
        if (v.length <= 8) return v.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2.$3');
        if (v.length <= 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
        return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5');
    };

    const sanitizeFilename = (name) => {
        if (!name) return '';
        const ext = name.split('.').pop();
        const base = name.substring(0, name.lastIndexOf('.'));
        const clean = base
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return `${clean}.${ext}`;
    };

    const getFilenameFromUrl = (url) => {
        if (!url) return '';
        try {
            const decoded = decodeURIComponent(url);
            const parts = decoded.split('/');
            const lastPart = parts[parts.length - 1];
            return lastPart.includes('_') ? lastPart.split('_').slice(1).join('_') : lastPart;
        } catch (e) {
            return 'arquivo_pdf';
        }
    };

    const handleUpdateContract = async (e) => {
        e.preventDefault();
        if (!tenantId) return;

        setIsSubmittingEdit(true);
        try {
            let finalContract_pdf_url = contractFormData.contract_pdf_url;
            let finalRescission_pdf_url = contractFormData.rescission_pdf_url;

            // Handle file uploads
            if (contractFile) {
                const sanitizedName = sanitizeFilename(contractFile.name);
                const path = `${tenantId}/${Date.now()}_${sanitizedName}`;
                const { publicUrl, error: uploadError } = await filesService.uploadFile(contractFile, 'contracts_files', path);
                if (uploadError) throw new Error("Erro no upload do arquivo do contrato.");
                finalContract_pdf_url = publicUrl;
            }

            if (isRescissionActive && rescissionFile) {
                const sanitizedName = sanitizeFilename(rescissionFile.name);
                const path = `${tenantId}/${Date.now()}_${sanitizedName}`;
                const { publicUrl, error: uploadError } = await filesService.uploadFile(rescissionFile, 'contracts_files', path);
                if (uploadError) throw new Error("Erro no upload do arquivo de rescisão.");
                finalRescission_pdf_url = publicUrl;
            }

            const payload = {
                number: contractFormData.number,
                code: contractFormData.code,
                title: contractFormData.title,
                supplierName: contractFormData.supplierName,
                totalValue: parseFloat(contractFormData.totalValue) || 0,
                dateRange: {
                    startDate: contractFormData.startDate,
                    endDate: contractFormData.endDate
                },
                secretariat_id: contractFormData.secretariat_id,
                biddingProcess: contractFormData.biddingProcess,
                electronicAuction: contractFormData.electronicAuction,
                notes: contractFormData.notes,
                contract_object: contractFormData.contract_object,
                cnpj: contractFormData.cnpj,
                address: contractFormData.address,
                managerName: contractFormData.managerName,
                manager_registration: contractFormData.manager_registration,
                technical_fiscal_name: contractFormData.technical_fiscal_name,
                technical_fiscal_registration: contractFormData.technical_fiscal_registration,
                administrative_fiscal_name: contractFormData.administrative_fiscal_name,
                administrative_fiscal_registration: contractFormData.administrative_fiscal_registration,
                contract_pdf_url: finalContract_pdf_url,
                status: isRescissionActive ? 'RESCINDIDO' : (contract.status === 'RESCINDIDO' ? 'ATIVO' : contract.status),
                ...(isRescissionActive && {
                    rescinded_at: contractFormData.rescinded_at,
                    rescission_notes: contractFormData.rescission_notes,
                    rescission_pdf_url: finalRescission_pdf_url
                }),
                ...(!isRescissionActive && contract.rescinded_at && {
                    rescinded_at: null,
                    rescission_notes: null,
                    rescission_pdf_url: null
                })
            };

            await contractsService.update(id, payload);
            showToast("Contrato atualizado com sucesso!");
            setIsEditModalOpen(false);

            // Reload contract data
            const updated = await contractsService.getById(id);
            setContract(updated);

            // Reload history
            await fetchHistory();

        } catch (error) {
            console.error("Erro ao atualizar contrato:", error);
            showToast("Erro ao atualizar contrato: " + error.message, 'error');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handleEditClick = () => {
        if (!contract) return;

        // Se a rescisão estiver sendo ativada agora e não tiver data, sugerir a data de hoje
        const today = getTodayLocalDateString();

        setContractFormData({
            number: contract.number || '',
            code: contract.code || '',
            title: contract.title || '',
            supplierName: contract.supplierName || '',
            totalValue: contract.totalValue || '',
            startDate: contract.dateRange?.startDate || '',
            endDate: contract.dateRange?.endDate || '',
            secretariat_id: contract.secretariat_id || '',
            biddingProcess: contract.biddingProcess || '',
            electronicAuction: contract.electronicAuction || '',
            notes: contract.notes || '',
            contract_object: contract.contract_object || '',
            cnpj: contract.cnpj || '',
            address: contract.address || '',
            managerName: contract.managerName || '',
            manager_registration: contract.manager_registration || '',
            technical_fiscal_name: contract.technical_fiscal_name || '',
            technical_fiscal_registration: contract.technical_fiscal_registration || '',
            administrative_fiscal_name: contract.administrative_fiscal_name || '',
            administrative_fiscal_registration: contract.administrative_fiscal_registration || '',
            contract_pdf_url: contract.contract_pdf_url || '',
            rescinded_at: contract.rescinded_at || today,
            rescission_notes: contract.rescission_notes || '',
            rescission_pdf_url: contract.rescission_pdf_url || ''
        });
        setIsRescissionActive(!!contract.rescinded_at);
        setContractFile(null);
        setRescissionFile(null);
        setIsEditModalOpen(true);
    };

    const handleContractCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            setContractFormData({ ...contractFormData, totalValue: "" });
            return;
        }
        const floatValue = parseInt(value, 10) / 100;
        setContractFormData({ ...contractFormData, totalValue: floatValue });
    };

    const getMaskedContractCurrencyValue = (numValue) => {
        if (numValue === "" || numValue === undefined || numValue === null) return "";
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    const loadSecretariats = async () => {
        if (!tenantId) return;
        try {
            const data = await secretariatsService.listSecretariats(tenantId);
            setSecretariats(data);
        } catch (error) {
            console.error("Erro ao carregar secretarias:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            setIsLoadingHistory(true);
            const hst = await contractsService.getHistory(id);
            setContractHistory(hst);
        } catch (err) {
            console.error("Erro ao carregar histórico do contrato:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchContract = async () => {
            try {
                setIsLoadingContract(true);
                setError(false);
                const contractData = await contractsService.getById(id);
                if (isMounted) {
                    setContract(contractData);
                }
            } catch (err) {
                console.error("Erro ao detalhar contrato:", err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setIsLoadingContract(false);
            }
        };

        const fetchEmpenhos = async () => {
            try {
                setIsLoadingEmpenhos(true);
                console.log('contractId (route):', id);
                const empenhosData = await empenhosService.listByContract(id);
                console.log('empenhos raw response:', empenhosData);
                if (isMounted) {
                    setEmpenhos(empenhosData);
                }
            } catch (err) {
                console.error("Erro ao carregar empenhos:", err);
            } finally {
                if (isMounted) setIsLoadingEmpenhos(false);
            }
        };

        const fetchOfs = async () => {
            try {
                setIsLoadingOfs(true);
                const ofsData = await ofsService.listByContract(id);
                if (isMounted) {
                    const issuedOfs = ofsData.filter(o => o.status === 'ISSUED');
                    setContractOfs(ofsData);
                    
                    // Calcular montante reservado
                    const totalReserved = issuedOfs.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                    setReservedAmount(totalReserved);

                    // Calcular quantidades reservadas por item
                    const qtyMap = {};
                    const secQtyMap = {}; // { itemId: { secId: qty } }

                    issuedOfs.forEach(of => {
                        const sid = of.secretariat_id;
                        (of.items || []).forEach(item => {
                            const iid = item.contract_item_id;
                            if (iid) {
                                qtyMap[iid] = (qtyMap[iid] || 0) + (item.quantity || 0);
                                if (!secQtyMap[iid]) secQtyMap[iid] = {};
                                if (sid) {
                                    secQtyMap[iid][sid] = (secQtyMap[iid][sid] || 0) + (item.quantity || 0);
                                }
                            }
                        });
                    });
                    setReservedQuantityPerItem(qtyMap);
                    setReservedQuantityPerItemPerSec(secQtyMap);
                }
            } catch (err) {
                console.error("Erro ao carregar OFs do contrato:", err);
            } finally {
                if (isMounted) setIsLoadingOfs(false);
            }
        };

        const fetchItemsCount = async () => {
            if (!tenantId || !id) return;
            try {
                const count = await contractItemsService.countContractItems(id, tenantId);
                if (isMounted) setGlobalItemsCount(count);
            } catch (err) {
                console.error("Erro ao carregar contagem de itens:", err);
            }
        };

        if (id) {
            fetchContract();
            fetchEmpenhos();
            fetchOfs();
            fetchHistory();
            loadSecretariats();
            fetchItemsCount();
        }

        return () => { isMounted = false; };
    }, [id, tenantId]);

    const fetchItemsTab = async () => {
        if (!tenantId || !id || activeTab !== 'itens') return;
        try {
            setIsLoadingItems(true);
            const itemsData = await contractItemsService.listContractItems(id, tenantId);
            const secretariatsData = await secretariatsService.listSecretariats(tenantId);

            const itemIds = itemsData.map(i => i.id);
            const contractAllocations = itemIds.length > 0
                ? await allocationsService.listAllocationsByItemIds(itemIds, tenantId)
                : [];

            setItems(itemsData);
            setSecretariats(secretariatsData);

            // Build summary map for badge display:
            const summary = {};
            contractAllocations.forEach(alloc => {
                const iid = alloc.contract_item_id;
                if (!summary[iid]) summary[iid] = 0;
                summary[iid] += (alloc.quantity_allocated || 0);
            });
            setAllocationsSummaryByItemId(summary);
        } catch (err) {
            console.error("Erro ao carregar itens/secretarias:", err);
        } finally {
            setIsLoadingItems(false);
        }
    };


    useEffect(() => {
        fetchItemsTab();
    }, [id, tenantId, activeTab]);

    const loadAllocationsForItem = async (itemId) => {
        if (!tenantId) return;
        try {
            const allocs = await allocationsService.listAllocationsByItem(itemId, tenantId);
            setItemAllocations(prev => ({ ...prev, [itemId]: allocs }));

            // Initialize form for this item (only active allocations)
            const initialForm = {};
            allocs.forEach(a => {
                if (a.quantity_allocated > 0) {
                    initialForm[a.secretariat_id] = a.quantity_allocated;
                }
            });
            setAllocationForm(initialForm);
            setRateioSelect('');
            setRateioAmount('');
        } catch (err) {
            console.error("Erro ao carregar rateio:", err);
        }
    };

    const handleExpandItem = (itemId) => {
        if (expandedItemId === itemId) {
            setExpandedItemId(null);
            return;
        }
        setExpandedItemId(itemId);
        loadAllocationsForItem(itemId);
    };

    const handleSaveAllocations = async (item) => {
        if (!tenantId) return;
        setIsSavingAllocations(true);
        try {
            const operations = secretariats.map(async (sec) => {
                const qty = parseFloat(allocationForm[sec.id]) || 0;
                // If it is > 0 or existing allocation could be reduced to 0
                if (qty >= 0) {
                    const existingAlloc = itemAllocations[item.id]?.find(a => a.secretariat_id === sec.id);
                    if (qty === 0 && !existingAlloc) {
                        return; // No need to create 0 entries. Optional: cleanup.
                    }
                    if (qty === 0 && existingAlloc) {
                        await allocationsService.deleteAllocation(item.id, sec.id, tenantId);
                    } else {
                        await allocationsService.upsertAllocation({
                            contract_item_id: item.id,
                            secretariat_id: sec.id,
                            quantity_allocated: qty
                        }, tenantId);
                    }
                }
            });

            await Promise.all(operations);
            await loadAllocationsForItem(item.id); // reload fresh allocations

            // Updates the global summary purely locally:
            let freshTotal = 0;
            secretariats.forEach(sec => {
                const qty = parseFloat(allocationForm[sec.id]) || 0;
                freshTotal += qty;
            });
            setAllocationsSummaryByItemId(prev => ({
                ...prev,
                [item.id]: freshTotal
            }));

            // Auto-collapse accordion
            setExpandedItemId(null);

            // Toast feedback
            showToast("Rateio salvo com sucesso!", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao salvar rateio.", "error");
        } finally {
            setIsSavingAllocations(false);
        }
    };

    const submitItemModal = async (e) => {
        e.preventDefault();
        if (!tenantId || !id) return;
        setIsSubmittingItem(true);
        try {
            const payload = {
                contract_id: id,
                item_number: itemFormData.item_number,
                description: itemFormData.description,
                unit: itemFormData.unit,
                unit_price: parseFloat(itemFormData.unit_price) || 0,
                total_quantity: parseFloat(itemFormData.total_quantity) || 0
            };

            if (editingItemId) {
                await contractItemsService.updateContractItem(editingItemId, payload, tenantId);
            } else {
                await contractItemsService.createContractItem(payload, tenantId);
            }

            setGlobalItemsCount(prev => editingItemId ? prev : prev + 1); // update count purely visually 

            // Reload list internally without removing UI interactions 
            fetchItemsTab();

            setIsItemModalOpen(false);
            setEditingItemId(null);
            showToast("Item salvo com sucesso!", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao salvar item", "error");
        } finally {
            setIsSubmittingItem(false);
        }
    };

    const handleQuickAddItem = () => {
        setActiveTab('itens');
        setItemFormData({ item_number: '', description: '', unit: '', unit_price: '', total_quantity: '' });
        setEditingItemId(null);
        setIsItemModalOpen(true);
    };

    const handleCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Keep only digits

        if (value === "") {
            setItemFormData({ ...itemFormData, unit_price: "" });
            return;
        }

        // Convert the string of numbers back into a float currency 
        const floatValue = parseInt(value, 10) / 100;

        setItemFormData({ ...itemFormData, unit_price: floatValue });
    };

    // Helper to extract value since unit_price stores actual float
    const getMaskedCurrencyValue = (numValue) => {
        if (numValue === "" || numValue === undefined) return "";
        // Just format string value back to pt-BR without symbol 
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValue);
    };

    const deleteItem = async (itemId) => {
        if (!tenantId) return;
        try {
            // Primeiro removemos as alocações para evitar erros de restrição de chave estrangeira
            const existingAllocations = await allocationsService.listAllocationsByItem(itemId, tenantId);
            if (existingAllocations && existingAllocations.length > 0) {
                for (const alloc of existingAllocations) {
                    await allocationsService.deleteAllocation(itemId, alloc.secretariat_id, tenantId);
                }
            }

            await contractItemsService.deleteContractItem(itemId, tenantId);

            // Recalcula e atualiza a lista dinamicamente
            setGlobalItemsCount(prev => Math.max(0, prev - 1));
            const updatedItems = await contractItemsService.listContractItems(id, tenantId);
            setItems(updatedItems);
            showToast("Item removido", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao remover item", "error");
        }
    };

    const handleGenerateOfClick = async () => {
        if (!contract || isCreatingOf) return;

        // Se o contrato já tem uma secretaria definida, usamos ela direto
        if (contract.secretariat_id) {
            handleConfirmCreateOf(contract.secretariat_id);
            return;
        }

        // Se houver apenas uma secretaria cadastrada no sistema, usamos ela
        if (secretariats.length === 1) {
            handleConfirmCreateOf(secretariats[0].id);
            return;
        }

        // Caso contrário, abrimos o modal para seleção
        setSelectedOfSecretariat('');
        setIsOfOfModalOpen(true);
    };

    const handleConfirmCreateOf = async (secId) => {
        const secretariatId = secId || selectedOfSecretariat;
        if (!secretariatId) {
            showToast("Por favor, selecione uma secretaria.", "error");
            return;
        }

        setIsCreatingOf(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const newOf = await ofsService.createOf(tenantId, id, secretariatId, today);
            
            showToast("Ordem de Fornecimento criada com sucesso!", "success");
            
            // Pequeno delay para o usuário ver o feedback antes de redirecionar
            setTimeout(() => {
                navigate(`/compras/ordens-fornecimento/${newOf.id}`);
            }, 800);
        } catch (err) {
            console.error("Erro ao criar OF:", err);
            showToast("Erro ao criar OF: " + (err.message || "Tente novamente mais tarde."), 'error');
            setIsCreatingOf(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    const formatExactCurrency = (value) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    };

    const formatDate = (isoString) => {
        return formatLocalDate(isoString);
    };

    const getDaysLeft = (endDateISO) => {
        return getDaysDiffFromToday(endDateISO);
    };

    // Alert Logic for Details
    const getContractAlerts = () => {
        if (!contract) return [];
        const alerts = [];
        const daysDiff = getDaysDiffFromToday(contract.dateRange?.endDate);

        if (contract.status === 'RESCINDIDO') {
            alerts.push({ id: 'rescinded', type: 'danger', icon: <AlertCircle size={18} />, title: 'Contrato Rescindido', description: 'Este contrato foi rescindido e não admite novas operações.' });
        } else if (daysDiff !== null) {
            if (daysDiff < 0) {
                alerts.push({ id: 'expired', type: 'danger', icon: <Clock size={18} />, title: 'Vigência Encerrada', description: `O contrato venceu há ${Math.abs(daysDiff)} dias (${formatDate(contract.dateRange?.endDate)}).` });
            } else if (daysDiff <= 30) {
                const expirationWarning = daysDiff === 0
                    ? 'vence hoje'
                    : (daysDiff === 1 ? 'vence em 1 dia' : `vence em ${daysDiff} dias`);
                alerts.push({ id: 'expiring', type: 'warning', icon: <Clock size={18} />, title: 'Vigência Próxima do Fim', description: `Este contrato ${expirationWarning} (${formatDate(contract.dateRange?.endDate)}). Verifique a necessidade de aditivo.` });
            }
        }

        if (!contract.contract_pdf_url) {
            alerts.push({ id: 'no-pdf', type: 'info', icon: <FileWarning size={18} />, title: 'Documento Ausente', description: 'Não há uma cópia digital (PDF) do contrato vinculada a este registro.' });
        }

        // Check for incomplete critical data
        if (!contract.managerName || !contract.technical_fiscal_name) {
            alerts.push({ id: 'incomplete', type: 'info', icon: <AlertTriangle size={18} />, title: 'Dados Incompletos', description: 'Informações de responsáveis (Gestor ou Fiscal) não foram totalmente preenchidas.' });
        }

        return alerts;
    };

    // Calculate specific stats based on rules
    let commitValue = 0;
    let balanceValue = 0; // Saldo para OF (Empenhado - OFs)
    let contractBalanceValue = 0; // Saldo do Contrato (Total - Empenhado)
    let daysLeft = null;
    let isUrgent = false;

    if (contract) {
        // 1. Empenhado = soma de todos os empenhos vinculados
        commitValue = empenhos.reduce((sum, e) => sum + (e.value || 0), 0);
        
        // 2. Saldo Contrato = valor total - valor empenhado
        contractBalanceValue = contract.totalValue - commitValue;
        
        // 3. Saldo para OF = valor empenhado - total das OFs
        // reservedAmount já é a soma das OFs emitidas (calculado no side effect de fetchOfs)
        balanceValue = commitValue - reservedAmount;

        daysLeft = getDaysLeft(contract.dateRange?.endDate);
        if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) isUrgent = true;
    }

    if (isLoadingContract) {
        return (
            <div className="cd-container">
                <div className="cd-loading-state">
                    <div className="skeleton sk-header"></div>
                    <div className="cd-kpi-grid">
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                        <div className="skeleton sk-card"></div>
                    </div>
                    <div className="skeleton sk-content-block"></div>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="cd-container">
                <div className="cd-error-state">
                    <AlertCircle size={48} className="cd-error-icon" />
                    <h2>Contrato não encontrado</h2>
                    <p>O registro que você tenta acessar não existe ou foi removido.</p>
                    <button className="cd-btn-secondary" onClick={() => navigate('/compras/contratos')}>
                        <ChevronLeft size={18} />
                        Voltar para Contratos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="cd-container">
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 9999,
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.message}
                </div>
            )}

            {/* Context Navigation */}
            <nav className="cd-breadcrumb">
                <button className="cd-back-link" onClick={() => navigate('/compras/contratos')}>
                    <ChevronLeft size={16} /> Contratos
                </button>
                <span className="cd-crumb-separator">/</span>
                <span className="cd-crumb-current">{contract.number}</span>
            </nav>

            {/* Alerta de Pendência Operacional */}
            {contract.isPending && (
                <div className="cd-pendency-banner">
                    <div className="cd-pendency-banner-content">
                        <ShieldAlert size={20} />
                        <div>
                            <strong>Pendência Operacional Identificada:</strong>
                            <span>Este contrato está ATIVO mas não possui itens cadastrados.</span>
                        </div>
                    </div>
                    <button
                        className="cd-pendency-banner-action"
                        onClick={handleQuickAddItem}
                    >
                        Adicionar itens agora
                    </button>
                </div>
            )}

            {/* Header Section (Compact) */}
            <header className="cd-header">
                <div className="cd-header-main" style={{ alignItems: 'center' }}>
                    <div>
                        <div className="cd-title-group" style={{ marginBottom: '0.25rem' }}>
                            <h1 className="cd-title" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{contract.number} — {contract.title}</h1>
                            <span className={`status-badge-lg ${contract.status.toLowerCase()}`}>
                                {contract.status}
                            </span>
                        </div>
                        <p className="cd-supplier-name" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{contract.supplierName}</p>
                    </div>

                    <div className="cd-header-actions">
                        <button className="cd-btn-secondary" onClick={handleEditClick}>Editar</button>

                        <div className="cd-actions-dropdown-wrapper">
                            <button
                                className={`cd-btn-primary ${contract.isPending || isCreatingOf ? 'is-blocked' : ''}`}
                                disabled={contract.isPending || isCreatingOf}
                                title={contract.isPending ? "Para gerar OF, cadastre pelo menos 1 item." : "Gerar Ordem de Fornecimento"}
                                onClick={handleGenerateOfClick}
                            >
                                {isCreatingOf ? 'Gerando...' : 'Gerar OF'}
                            </button>
                        </div>

                        {/* Functional Alert Indicator Toggle with Premium Tooltip */}
                        {getContractAlerts().length > 0 && (
                            <div className="cd-alert-indicator-wrapper">
                                <button
                                    className={`cd-alert-indicator ${showAlerts ? 'is-panel-open' : ''}`}
                                    onClick={() => setShowAlerts(!showAlerts)}
                                    title={`${getContractAlerts().length} alertas ativos no contrato. Clique para ${showAlerts ? 'fechar' : 'visualizar'}.`}
                                >
                                    <AlertTriangle size={16} />
                                    <span>{getContractAlerts().length}</span>
                                </button>
                                <span className="cd-alert-tooltip">
                                    {getContractAlerts().length} alertas ativos no contrato. Clique para {showAlerts ? 'fechar' : 'visualizar'}.
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Unified Operational Alerts Panel */}
            {showAlerts && getContractAlerts().length > 0 && (
                <section className="cd-alerts-panel">
                    <div className="cd-alerts-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertTriangle size={20} className="cd-alerts-main-icon" />
                            <span>Alertas do Contrato</span>
                        </div>
                        <button
                            className="cd-alerts-close-btn"
                            onClick={() => setShowAlerts(false)}
                            title="Ocultar alertas"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="cd-alerts-panel-content">
                        {getContractAlerts().map(alert => (
                            <div key={alert.id} className={`cd-alert-list-item ${alert.type}`}>
                                <span className="cd-alert-bullet">•</span>
                                <div className="cd-alert-text">
                                    <strong>{alert.title}:</strong> {alert.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}


            {/* KPI Row */}
            <section className="cd-kpi-grid">
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon"><DollarSign size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Valor global</span>
                        <span className="cd-kpi-value">{formatCurrency(contract.totalValue)}</span>
                    </div>
                </div>
                <div className={`cd-kpi-card ${activeTab === 'empenhos' ? 'is-highlighted' : ''}`}>
                    <div className="cd-kpi-icon warning"><FileText size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Empenhado</span>
                        <span className="cd-kpi-value warning" style={{ color: '#b45309' }}>{formatCurrency(commitValue)}</span>
                    </div>
                </div>
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}><Clock size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Reservado em OFs</span>
                        <span className="cd-kpi-value" style={{ color: '#1d4ed8' }}>{formatCurrency(reservedAmount)}</span>
                    </div>
                </div>
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon success"><DollarSign size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Saldo do contrato</span>
                        <span className="cd-kpi-value success">{formatCurrency(contractBalanceValue)}</span>
                    </div>
                </div>
                <div className="cd-kpi-card">
                    <div className="cd-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><DollarSign size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Saldo disponível (OF)</span>
                        <span className="cd-kpi-value" style={{ color: '#16a34a' }}>{formatCurrency(balanceValue)}</span>
                    </div>
                </div>
                <div className={`cd-kpi-card ${isUrgent ? 'urgent' : ''}`}>
                    <div className={`cd-kpi-icon ${isUrgent ? 'urgent' : ''}`}><Clock size={20} /></div>
                    <div className="cd-kpi-data">
                        <span className="cd-kpi-label">Vigência até</span>
                        <div className="cd-kpi-value-group">
                            <span className="cd-kpi-value date">{formatDate(contract.dateRange?.endDate)}</span>
                            {daysLeft !== null && (
                                <span className={`cd-kpi-badge ${isUrgent || daysLeft < 0 ? 'danger' : 'neutral'}`}>
                                    {daysLeft < 0
                                        ? (daysLeft === -1 ? 'Vencido há 1 dia' : `Vencido há ${Math.abs(daysLeft)} dias`)
                                        : (daysLeft === 0 ? 'Vence hoje' : (daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`))
                                    }
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Depth Tabs */}
            <section className="cd-tabs-container">
                <div className="cd-tabs-header">
                    <button
                        className={`cd-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
                        onClick={() => setActiveTab('geral')}
                    >
                        Visão Geral
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'empenhos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('empenhos')}
                    >
                        Empenhos <span className="cd-tab-count">{empenhos.length}</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'itens' ? 'active' : ''}`}
                        onClick={() => setActiveTab('itens')}
                    >
                        Itens <span className="cd-tab-count">{globalItemsCount}</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'aditivos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('aditivos')}
                    >
                        Aditivos <span className="cd-tab-count">0</span>
                    </button>
                    <button
                        className={`cd-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
                        onClick={() => setActiveTab('historico')}
                    >
                        Histórico
                    </button>
                </div>

                <div className="cd-tabs-content">
                    {/* VISÃO GERAL TAB */}
                    {activeTab === 'geral' && (
                        <div className="cd-grid-details">
                            <div className="cd-detail-group full" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Objeto do Contrato</label>
                                <div style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    {contract.contract_object || contract.title}
                                </div>
                            </div>

                            <div className="cd-detail-group">
                                <label>Fornecedor (Razão Social)</label>
                                <span>{contract.supplierName}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>CNPJ</label>
                                <span>{contract.cnpj || 'Não informado'}</span>
                            </div>

                            <div className="cd-detail-group full">
                                <label>Endereço</label>
                                <span>{contract.address || 'Não informado'}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>Secretaria Responsável</label>
                                <span>{secretariats.find(s => s.id === contract.secretariat_id)?.name || 'Não informada'}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>Período de Vigência</label>
                                <span>{formatDate(contract.dateRange?.startDate)} até {formatDate(contract.dateRange?.endDate)}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>Processo Licitatório</label>
                                <span>{contract.biddingProcess || 'Não informado'}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>Pregão Eletrônico</label>
                                <span>{contract.electronicAuction || 'Não informado'}</span>
                            </div>

                            <div className="cd-detail-group">
                                <label>Código / Referência</label>
                                <span>{contract.code || 'Não informado'}</span>
                            </div>

                            {contract.contract_pdf_url && (
                                <div className="cd-detail-group full" style={{ margin: '1rem 0' }}>
                                    <label>Arquivo do Contrato</label>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <a href={contract.contract_pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', padding: '0.75rem 1.25rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', transition: 'all 0.2s' }}>
                                            <FileText size={20} /> Visualizar Contrato (PDF)
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="cd-detail-group full" style={{ marginTop: '0.5rem' }}>
                                <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', fontSize: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', fontWeight: 600 }}>Responsáveis pelo Contrato</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', padding: '1rem', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gestor do Contrato</label>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>{contract.managerName || 'Não informado'}</div>
                                        {contract.manager_registration && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Matrícula: {contract.manager_registration}</div>}
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fiscal Técnico</label>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>{contract.technical_fiscal_name || 'Não informado'}</div>
                                        {contract.technical_fiscal_registration && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Matrícula: {contract.technical_fiscal_registration}</div>}
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fiscal Administrativo</label>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>{contract.administrative_fiscal_name || 'Não informado'}</div>
                                        {contract.administrative_fiscal_registration && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Matrícula: {contract.administrative_fiscal_registration}</div>}
                                    </div>
                                </div>
                            </div>

                            {contract.rescinded_at && (
                                <div className="cd-detail-group full" style={{ marginTop: '0.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '1.25rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-color, #d92d20)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                        <AlertTriangle size={18} /> CONTRATO RESCINDIDO
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#9f1239', textTransform: 'uppercase', fontWeight: 700 }}>Data da Rescisão</label>
                                            <div style={{ fontWeight: 700, color: '#881337', marginTop: '0.25rem' }}>{formatDate(contract.rescinded_at)}</div>
                                        </div>
                                        {contract.rescission_notes && (
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#9f1239', textTransform: 'uppercase', fontWeight: 700 }}>Observação</label>
                                                <div style={{ color: '#881337', marginTop: '0.25rem', fontSize: '0.9rem', lineHeight: '1.5' }}>{contract.rescission_notes}</div>
                                            </div>
                                        )}
                                        {contract.rescission_pdf_url && (
                                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                                <a href={contract.rescission_pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fff', backgroundColor: '#e11d48', fontWeight: 600, textDecoration: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.875rem', boxShadow: '0 2px 4px rgba(225, 29, 72, 0.2)' }}>
                                                    <FileText size={18} /> Visualizar Termo de Rescisão (PDF)
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="cd-detail-group full" style={{ marginTop: '1rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Observações Gerais</label>
                                <div style={{ background: '#ffffff', border: '1px solid var(--border-light)', padding: '1.25rem', borderRadius: '12px', minHeight: '80px' }}>
                                    {contract.notes ? (
                                        <span style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: '1.6' }}>{contract.notes}</span>
                                    ) : (
                                        <span className="empty-value" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Nenhuma observação informada.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EMPENHOS TAB (Real Data) */}
                    {activeTab === 'empenhos' && (
                        <div className="cd-tab-panel">
                            <div className="cd-tab-panel-header">
                                <h3>Relação de Empenhos</h3>
                                <div className="cd-info-chip">
                                    <span className="cd-info-chip-label">Total empenhado:</span>
                                    <span className="cd-info-chip-value">{formatCurrency(commitValue)}</span>
                                </div>
                            </div>

                            <div className="table-section" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                                <div className="cd-data-table-wrapper" style={{ boxShadow: 'none' }}>
                                    <table className="cd-data-table">
                                        <thead>
                                            <tr>
                                                <th>Nº Empenho</th>
                                                <th>Descrição / Objeto</th>
                                                <th>Datas</th>
                                                <th>Valor</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoadingEmpenhos ? (
                                                <tr>
                                                    <td colSpan="5" className="loading-state">
                                                        <div className="loading-state-content" style={{ padding: '2rem 1rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                            <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: '4px' }}></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : empenhos.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="empty-state">
                                                        <div className="empty-state-content" style={{ padding: '3rem 0' }}>
                                                            <FileText size={40} style={{ color: 'var(--border-light)', marginBottom: '1rem' }} />
                                                            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Nenhum empenho vinculado a este contrato</h4>
                                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>As notas de empenho reservadas para este contrato aparecerão aqui.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                empenhos.map(emp => (
                                                    <tr key={emp.id}>
                                                        <td>
                                                            <span className="td-number" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.number}</span>
                                                        </td>
                                                        <td>
                                                            <span className="title-text" style={{ color: 'var(--text-secondary)' }} title={emp.description}>{emp.description}</span>
                                                        </td>
                                                        <td className="td-dates">
                                                            <div>
                                                                <span className="date-start">
                                                                    Emissão: {formatDate(emp.issueDate)}
                                                                </span>
                                                                {emp.paymentDate && (
                                                                    <span className="date-end" style={{ color: 'var(--success-color-dark, #0f8b4d)' }}>
                                                                        Pg: {formatDate(emp.paymentDate)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="td-values">
                                                            <span className="val-total" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(emp.value)}</span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${emp.status.toLowerCase()}`}>
                                                                {emp.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADITIVOS TAB (Placeholder) */}
                    {activeTab === 'aditivos' && (
                        <div className="cd-placeholder-tab">
                            <Calendar size={40} />
                            <h4>Sem termos aditivos</h4>
                            <p>Qualquer prorrogação de prazo ou acréscimo de valor será listado nesta aba.</p>
                        </div>
                    )}

                    {/* HISTORICO TAB (Real Timeline) */}
                    {activeTab === 'historico' && (
                        <div className="cd-timeline-wrapper">
                            {isLoadingHistory ? (
                                <div className="cd-timeline-loading">Carregando histórico...</div>
                            ) : (() => {
                                // Ordenar eventos vindos do banco
                                let allEvents = [...contractHistory]
                                    .sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at));

                                // Se o contrato estiver rescindido, ocultar o evento de 'vigency_end'
                                if (contract.status === 'RESCINDIDO') {
                                    allEvents = allEvents.filter(evt => evt.event_type !== 'vigency_end');
                                }

                                if (allEvents.length === 0) {
                                    return (
                                        <div className="cd-timeline-empty">
                                            <Clock size={32} />
                                            <p>Nenhum histórico registrado para este contrato.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="cd-timeline">
                                        {allEvents.map((evt, idx) => (
                                            <div className={`cd-timeline-item ${evt.event_type}`} key={evt.id}>
                                                <div className="cd-timeline-marker">
                                                    <div className="cd-timeline-bullet"></div>
                                                    {idx !== allEvents.length - 1 && <div className="cd-timeline-line"></div>}
                                                </div>
                                                <div className="cd-timeline-content">
                                                    <div className="cd-timeline-header">
                                                        <span className="cd-timeline-title">{evt.event_title}</span>
                                                        <span className="cd-timeline-date">{formatDate(evt.event_date || evt.created_at)}</span>
                                                    </div>

                                                    {evt.event_type === 'value_changed' && (
                                                        <div className="cd-timeline-detail value-change">
                                                            <div className="cd-value-comparison">
                                                                <div className="cd-value-node">
                                                                    <span className="label">Anterior</span>
                                                                    <span className="amount old">{formatCurrency(evt.old_value)}</span>
                                                                </div>
                                                                <div className="cd-value-arrow">→</div>
                                                                <div className="cd-value-node">
                                                                    <span className="label">Novo Valor</span>
                                                                    <span className="amount new">{formatCurrency(evt.new_value)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {evt.event_type === 'rescinded' && (
                                                        <div className="cd-timeline-detail rescission">
                                                            <div className="cd-rescission-notes">
                                                                <AlertTriangle size={14} style={{ marginRight: '6px', color: '#e11d48' }} />
                                                                {evt.event_description || 'Contrato rescindido.'}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {evt.event_type !== 'value_changed' && evt.event_type !== 'rescinded' && evt.event_description && (
                                                        <p className="cd-timeline-description">{evt.event_description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ITENS TAB */}
                    {activeTab === 'itens' && (
                        <div className="cd-tab-panel">
                            <div className="cd-tab-panel-header">
                                <h3>Itens do Contrato</h3>
                                <button className="cd-btn-primary" onClick={() => {
                                    setItemFormData({ item_number: '', description: '', unit: '', unit_price: '', total_quantity: '' });
                                    setEditingItemId(null);
                                    setIsItemModalOpen(true);
                                }}>
                                    + Adicionar Item
                                </button>
                            </div>

                            <div className="table-section" style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                                <div className="cd-data-table-wrapper" style={{ boxShadow: 'none' }}>
                                    <table className="cd-data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'left', paddingLeft: '1.5rem' }}>Nº</th>
                                                <th style={{ textAlign: 'left', minWidth: '200px' }}>Descrição</th>
                                                <th style={{ textAlign: 'right', width: '110px' }}>Qtd. Total</th>
                                                <th style={{ textAlign: 'right', width: '110px' }}>Reservado</th>
                                                <th style={{ textAlign: 'right', width: '120px' }}>Disponível</th>
                                                <th style={{ textAlign: 'center', width: '60px' }}>Und</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>Val. Unitário</th>
                                                <th style={{ textAlign: 'right', width: '130px' }}>Subtotal</th>
                                                <th style={{ textAlign: 'center', width: '90px' }}>Rateio</th>
                                                <th style={{ textAlign: 'right', width: '120px', paddingRight: '1.5rem' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoadingItems ? (
                                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Carregando itens...</td></tr>
                                            ) : items.length === 0 ? (
                                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum item adicionado a este contrato yet.</td></tr>
                                            ) : (
                                                items.map(item => {
                                                    const allocSum = allocationsSummaryByItemId[item.id] || 0;
                                                    const qTotal = item.total_quantity || 0;
                                                    const diff = qTotal - allocSum;
                                                    const isPending = qTotal > 0 && diff !== 0;

                                                    const qReserved = reservedQuantityPerItem[item.id] || 0;
                                                    const qAvailable = qTotal - qReserved;

                                                    return (
                                                        <React.Fragment key={item.id}>
                                                            <tr
                                                                onClick={() => handleExpandItem(item.id)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    borderLeft: isPending ? '4px solid #f59e0b' : '4px solid transparent',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                className={expandedItemId === item.id ? 'active-row' : ''}
                                                            >
                                                                <td style={{ width: '60px', fontWeight: 600, textAlign: 'left', paddingLeft: '1.5rem' }}>
                                                                    <span>{item.item_number || '-'}</span>
                                                                </td>
                                                                <td style={{ textAlign: 'left' }}>
                                                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.4' }} title={item.description}>
                                                                        {item.description}
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{item.total_quantity}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{qReserved > 0 ? qReserved : '-'}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 700, color: qAvailable > 0 ? '#16a34a' : (qAvailable < 0 ? '#dc2626' : 'var(--text-muted)') }}>{qAvailable}</td>
                                                                <td style={{ textAlign: 'center', textTransform: 'uppercase', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.unit || '-'}</td>
                                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 500 }}>{formatExactCurrency(item.unit_price)}</td>
                                                                <td style={{ fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatExactCurrency((item.total_quantity || 0) * (item.unit_price || 0))}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <span
                                                                        className={`cd-kpi-badge ${isPending ? 'warning' : 'success'}`}
                                                                        style={{
                                                                            background: isPending ? '#fff4e5' : '#e6f6ec',
                                                                            color: isPending ? '#b75c00' : '#0f8b4d',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '9999px',
                                                                            fontSize: '0.6rem',
                                                                            fontWeight: 700
                                                                        }}
                                                                    >
                                                                        {isPending ? 'PENDENTE' : 'OK'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ width: '100px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setItemFormData({
                                                                                    item_number: item.item_number || '',
                                                                                    description: item.description,
                                                                                    unit: item.unit || '',
                                                                                    unit_price: item.unit_price || '',
                                                                                    total_quantity: item.total_quantity || ''
                                                                                });
                                                                                setEditingItemId(item.id);
                                                                                setIsItemModalOpen(true);
                                                                            }}
                                                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                                                                            title="Editar"
                                                                        >
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setItemToDelete(item.id);
                                                                            }}
                                                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.375rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                            title="Remover"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section >

            {/* Modal Rateio */}
            {
                expandedItemId && (() => {
                    const item = items.find(i => i.id === expandedItemId);
                    if (!item) return null;

                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={() => setExpandedItemId(null)}>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', maxWidth: '720px', maxHeight: '90vh', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 40px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ background: '#e0f2fe', padding: '0.5rem', borderRadius: '8px', color: '#0284c7' }}>
                                                    <Landmark size={20} />
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.125rem 0', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Rateio Institucional — Item {item.item_number || 'X'}</h4>
                                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Distribua as quantidades do item pelas secretarias beneficiadas</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setExpandedItemId(null)}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                                                title="Fechar"
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    </div>


                                    <div style={{ padding: '0.75rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                        {secretariats.length > 0 && (() => {
                                            let totalAlocado = 0;
                                            secretariats.forEach(sec => {
                                                const val = parseInt(allocationForm[sec.id], 10);
                                                totalAlocado += isNaN(val) ? 0 : val;
                                            });
                                            const diff = Math.round(((item.total_quantity || 0) - totalAlocado) * 100) / 100;

                                            return (
                                                <div style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '0.75rem', flexShrink: 0 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total do Item</span>
                                                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.total_quantity || 0}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Soma Alocada</span>
                                                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalAlocado}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diferença</span>
                                                        <div style={{
                                                            display: 'inline-flex', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 700,
                                                            background: diff === 0 ? '#e6f6ec' : (diff > 0 ? '#fff4e5' : '#fef2f2'),
                                                            color: diff === 0 ? '#0f8b4d' : (diff > 0 ? '#b75c00' : '#dc2626'),
                                                            border: `1px solid ${diff === 0 ? '#d1f2e1' : (diff > 0 ? '#ffedcc' : '#fecaca')}`
                                                        }}>
                                                            {diff > 0 ? `Falta ratear ${diff} unidades` : diff < 0 ? `Excedeu ${Math.abs(diff)} unidades` : 'Rateio completo'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {secretariats.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                                <Landmark size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
                                                <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nenhuma secretaria cadastrada no sistema.</h5>
                                            </div>
                                        ) : (() => {
                                            let totalAlocado = 0;
                                            const addedSecretariatsList = [];
                                            const availableSecretariats = [];

                                            secretariats.forEach(sec => {
                                                const val = allocationForm[sec.id];
                                                if (val !== undefined && val !== '' && parseFloat(val) > 0) {
                                                    totalAlocado += parseFloat(val) || 0;
                                                    addedSecretariatsList.push({ ...sec, allocated: val });
                                                } else {
                                                    availableSecretariats.push(sec);
                                                }
                                            });

                                            const diff = (item.total_quantity || 0) - totalAlocado;
                                            const isSaveDisabled = (item.total_quantity > 0 && diff !== 0) || isSavingAllocations;

                                            const handleAddAllocation = () => {
                                                const parsedVal = parseInt(rateioAmount, 10);
                                                if (!rateioSelect || isNaN(parsedVal) || parsedVal <= 0) return;
                                                setAllocationForm(prev => ({ ...prev, [rateioSelect]: parsedVal }));
                                                setRateioSelect('');
                                                setRateioAmount('');
                                            };

                                            const handleRemoveAllocation = (secId) => {
                                                const newMap = { ...allocationForm };
                                                delete newMap[secId];
                                                setAllocationForm(newMap);
                                            };

                                            return (
                                                <>
                                                    <div style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', flexShrink: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Selecionar Secretaria</label>
                                                                <select
                                                                    value={rateioSelect}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setRateioSelect(val);
                                                                        if (val) {
                                                                            setTimeout(() => rateioAmountRef.current?.focus(), 0);
                                                                        }
                                                                    }}
                                                                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: 'var(--text-primary)', outline: 'none', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                    onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                    onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                                                >
                                                                    <option value="">Selecione uma opção...</option>
                                                                    {availableSecretariats.map(sec => (
                                                                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div style={{ width: '120px' }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Quantidade</label>
                                                                <input
                                                                    ref={rateioAmountRef}
                                                                    type="number"
                                                                    value={rateioAmount || ''}
                                                                    onChange={(e) => setRateioAmount(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleAddAllocation();
                                                                    }}
                                                                    min={1} step="1"
                                                                    style={{ width: '100%', height: '38px', padding: '0 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', color: 'var(--text-primary)', outline: 'none', background: '#f8fafc', transition: 'all 0.2s', textAlign: 'center' }}
                                                                    onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                    onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleAddAllocation}
                                                                disabled={!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0}
                                                                style={{ height: '38px', padding: '0 1rem', borderRadius: '6px', background: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? '#f1f5f9' : '#0f172a', color: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? '#94a3b8' : '#ffffff', fontWeight: 600, fontSize: '0.8125rem', border: 'none', cursor: (!rateioSelect || !rateioAmount || parseInt(rateioAmount, 10) <= 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                                            >
                                                                <Plus size={16} /> Adicionar
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '0.25rem', paddingBottom: '0.5rem' }}>

                                                        {addedSecretariatsList.length > 0 && (
                                                            <div style={{ marginBottom: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff' }} className="cd-rateio-scrollbox">
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                                                                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                                                        <tr>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Secretaria Alocada</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '100px', borderBottom: '1px solid #e2e8f0' }}>Alocado</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '100px', borderBottom: '1px solid #e2e8f0' }}>Reservado</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '100px', borderBottom: '1px solid #e2e8f0' }}>Saldo</th>
                                                                            <th style={{ padding: '0.4rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', width: '60px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Ações</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {addedSecretariatsList.map((sec, index) => {
                                                                            const secReserved = (reservedQuantityPerItemPerSec[item.id] || {})[sec.id] || 0;
                                                                            const secBalance = (parseFloat(sec.allocated) || 0) - secReserved;

                                                                            return (
                                                                                <tr key={sec.id} style={{ borderBottom: index === addedSecretariatsList.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                                    <td style={{ padding: '0.4rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{sec.name}</td>
                                                                                    <td style={{ padding: '0.4rem 1rem' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={sec.allocated}
                                                                                                onChange={(e) => {
                                                                                                    const val = parseInt(e.target.value, 10);
                                                                                                    if (!isNaN(val) && val < 0) return;
                                                                                                    setAllocationForm({ ...allocationForm, [sec.id]: isNaN(val) ? '' : val });
                                                                                                }}
                                                                                                style={{ width: '70px', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#ffffff', textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.8rem', outline: 'none' }}
                                                                                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 2px rgba(10,37,64,0.05)'; }}
                                                                                                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                                                                                min="0" step="1"
                                                                                            />
                                                                                        </div>
                                                                                    </td>
                                                                                    <td style={{ padding: '0.4rem 1rem', color: '#1d4ed8', fontWeight: 600 }}>{secReserved > 0 ? secReserved : '-'}</td>
                                                                                    <td style={{ padding: '0.4rem 1rem', color: secBalance > 0 ? '#16a34a' : (secBalance < 0 ? '#dc2626' : 'var(--text-muted)'), fontWeight: 700 }}>{secBalance}</td>
                                                                                    <td style={{ padding: '0.4rem 1rem', textAlign: 'right' }}>
                                                                                        <button
                                                                                            onClick={() => handleRemoveAllocation(sec.id)}
                                                                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                                                                                            title="Remover"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}

                                                        {(!item.total_quantity || item.total_quantity === 0) && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fffbeb', color: '#b45309', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                                                                <AlertCircle size={16} />
                                                                <span>Nenhuma quantidade total definida para validação estrita. Rateio será salvo como definido.</span>
                                                            </div>
                                                        )}

                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexShrink: 0 }}>
                                    <button className="cd-btn-secondary" onClick={() => setExpandedItemId(null)} style={{ padding: '0 1.5rem', height: '44px', borderRadius: '10px' }}>Cancelar</button>
                                    {(() => {
                                        let totalAlocado = 0;
                                        Object.values(allocationForm).forEach(val => totalAlocado += (parseInt(val, 10) || 0));
                                        const diff = Math.round(((item.total_quantity || 0) - totalAlocado) * 100) / 100;
                                        const isSaveDisabled = (item.total_quantity > 0 && diff !== 0) || isSavingAllocations;
                                        return (
                                            <button
                                                className="cd-btn-primary"
                                                onClick={() => handleSaveAllocations(item)}
                                                disabled={isSaveDisabled}
                                                style={{
                                                    padding: '0 2rem',
                                                    height: '44px',
                                                    borderRadius: '10px',
                                                    background: isSaveDisabled ? '#cbd5e1' : 'var(--color-primary)',
                                                    color: isSaveDisabled ? '#94a3b8' : '#ffffff',
                                                    border: 'none',
                                                    opacity: 1,
                                                    transition: 'all 0.2s',
                                                    cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {isSavingAllocations ? 'Salvando...' : 'Salvar Rateio'}
                                            </button>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Modal de Confirmação de Exclusão */}
            {
                itemToDelete && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setItemToDelete(null)}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ background: '#fef2f2', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                                    <Trash2 size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Excluir Item</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className="cd-btn-secondary"
                                    onClick={() => setItemToDelete(null)}
                                    style={{ flex: 1, height: '44px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="cd-btn-primary"
                                    onClick={() => {
                                        deleteItem(itemToDelete);
                                        setItemToDelete(null);
                                    }}
                                    style={{ flex: 1, height: '44px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Item */}
            {
                isItemModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,37,64,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsItemModalOpen(false)}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{editingItemId ? 'Editar Item' : 'Novo Item'}</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsItemModalOpen(false)}
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                                    title="Fechar"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <form onSubmit={submitItemModal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Nº do Item (opcional)</label>
                                    <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)' }} type="number" step="1" min="0" value={itemFormData.item_number} onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        setItemFormData({ ...itemFormData, item_number: isNaN(val) ? '' : val });
                                    }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Descrição (obrigatório)</label>
                                    <textarea
                                        style={{ width: '100%', minHeight: '100px', padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit' }}
                                        required
                                        value={itemFormData.description}
                                        onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
                                        placeholder="Detalhes completos do item..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Unidade (obrigatório)</label>
                                        <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center' }} required type="text" placeholder="Ex: UN, KG" value={itemFormData.unit} onChange={e => setItemFormData({ ...itemFormData, unit: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Qtd Total (obrigatório)</label>
                                        <input style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'center' }} required type="number" step="1" min="0" value={itemFormData.total_quantity} onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            setItemFormData({ ...itemFormData, total_quantity: isNaN(val) ? '' : val });
                                        }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Val. Unit. (R$) (obrigatório)</label>
                                        <input
                                            style={{ width: '100%', height: '40px', padding: '0 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', color: 'var(--text-primary)', textAlign: 'right' }}
                                            type="text"
                                            required
                                            value={getMaskedCurrencyValue(itemFormData.unit_price)}
                                            onChange={handleCurrencyInput}
                                        />
                                    </div>
                                </div>
                                <div style={{ margin: '0.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total estimado:</span>
                                    <span style={{ fontSize: '1.125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {formatExactCurrency((parseFloat(itemFormData.total_quantity) || 0) * (parseFloat(itemFormData.unit_price) || 0))}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="cd-btn-secondary" onClick={() => setIsItemModalOpen(false)}>Cancelar</button>
                                    <button
                                        type="submit"
                                        className="cd-btn-primary"
                                        disabled={isSubmittingItem || !itemFormData.description?.trim() || !itemFormData.unit?.trim() || !itemFormData.total_quantity || parseFloat(itemFormData.total_quantity) <= 0 || !itemFormData.unit_price || parseFloat(itemFormData.unit_price) <= 0}
                                        style={{ opacity: (isSubmittingItem || !itemFormData.description?.trim() || !itemFormData.unit?.trim() || !itemFormData.total_quantity || parseFloat(itemFormData.total_quantity) <= 0 || !itemFormData.unit_price || parseFloat(itemFormData.unit_price) <= 0) ? 0.6 : 1 }}
                                    >
                                        {isSubmittingItem ? 'Salvando...' : 'Salvar Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {isEditModalOpen && (
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                        <div className="modal-header">
                            <h2>Editar Contrato</h2>
                            <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form id="editContractForm" onSubmit={handleUpdateContract}>
                                {/* Identificação */}
                                <div className="contract-form-section">
                                    <div className="section-title">Identificação</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group">
                                            <label>Número do Contrato *</label>
                                            <input required type="text" placeholder="Ex: 001/2026" value={contractFormData.number} onChange={e => setContractFormData({ ...contractFormData, number: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Código / Ref</label>
                                            <input type="text" placeholder="Ex: CT-001" value={contractFormData.code} onChange={e => setContractFormData({ ...contractFormData, code: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Fornecedor *</label>
                                            <input required type="text" placeholder="Nome da empresa" value={contractFormData.supplierName} onChange={e => setContractFormData({ ...contractFormData, supplierName: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Secretaria Responsável *</label>
                                            <select
                                                required
                                                className="form-select"
                                                value={contractFormData.secretariat_id}
                                                onChange={e => setContractFormData({ ...contractFormData, secretariat_id: e.target.value })}
                                            >
                                                <option value="">Selecione uma secretaria</option>
                                                {secretariats.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ height: '44px' }}>
                                            <label>Processo Licitatório</label>
                                            <input style={{ height: '44px', borderRadius: '10px' }} type="text" placeholder="Ex: 010/2025" value={contractFormData.biddingProcess} onChange={e => setContractFormData({ ...contractFormData, biddingProcess: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ height: '44px' }}>
                                            <label>Pregão Eletrônico</label>
                                            <input style={{ height: '44px', borderRadius: '10px' }} type="text" placeholder="Ex: 005/2025" value={contractFormData.electronicAuction} onChange={e => setContractFormData({ ...contractFormData, electronicAuction: e.target.value })} />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Título *</label>
                                            <input required style={{ height: '44px', borderRadius: '10px' }} type="text" placeholder="Nome curto do contrato" value={contractFormData.title} onChange={e => setContractFormData({ ...contractFormData, title: e.target.value })} />
                                        </div>
                                        <div className="form-group full-width" style={{ marginTop: '1.25rem' }}>
                                            <label>Objeto do Contrato</label>
                                            <input
                                                style={{ height: '44px', borderRadius: '10px' }}
                                                type="text"
                                                placeholder="Descrição resumida do objeto do contrato"
                                                value={contractFormData.contract_object}
                                                onChange={e => setContractFormData({ ...contractFormData, contract_object: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>CNPJ</label>
                                            <input
                                                style={{ height: '44px', borderRadius: '10px' }}
                                                type="text"
                                                placeholder="00.000.000/0000-00"
                                                value={contractFormData.cnpj}
                                                onChange={e => setContractFormData({ ...contractFormData, cnpj: formatCnpj(e.target.value) })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Endereço</label>
                                            <input style={{ height: '44px', borderRadius: '10px' }} type="text" placeholder="Rua, Número, Bairro, Cidade" value={contractFormData.address} onChange={e => setContractFormData({ ...contractFormData, address: e.target.value })} />
                                        </div>

                                        {/* PDF Section */}
                                        <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                                            <div
                                                className={`collapsible-header ${isPdfSectionExpanded ? 'expanded' : ''}`}
                                                onClick={() => setIsPdfSectionExpanded(!isPdfSectionExpanded)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: isPdfSectionExpanded ? '8px 8px 0 0' : '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    marginBottom: isPdfSectionExpanded ? '0' : '1rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                                                    <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                                                    Documento do Contrato (PDF)
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '10px' }}>
                                                    {isPdfSectionExpanded ? '▼' : '◀'}
                                                </div>
                                            </div>

                                            {isPdfSectionExpanded && (
                                                <div className="collapsible-content" style={{ padding: '15px', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#fff', marginBottom: '1rem' }}>
                                                    <label htmlFor="contract-pdf-upload-edit" className={`upload-card ${contractFile ? 'has-file' : ''}`}>
                                                        <div className="upload-icon-wrapper">
                                                            {contractFile ? <FileText size={24} /> : <UploadCloud size={24} />}
                                                        </div>
                                                        <div className="upload-info">
                                                            <p className="upload-text-main">
                                                                {contractFile ? 'Arquivo selecionado' : 'Clique para anexar o PDF do contrato'}
                                                            </p>
                                                            <p className="upload-text-sub">ou arraste o arquivo aqui</p>
                                                        </div>

                                                        {contractFile ? (
                                                            <div className="file-name-display">
                                                                <FileText size={14} /> {contractFile.name}
                                                            </div>
                                                        ) : contractFormData.contract_pdf_url ? (
                                                            <div className="existing-file-info" style={{ width: '100%', marginBottom: '10px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', color: '#15803d', marginBottom: '12px' }}>
                                                                    <FileText size={18} />
                                                                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{getFilenameFromUrl(contractFormData.contract_pdf_url)}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(contractFormData.contract_pdf_url, '_blank'); }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                                                                    >
                                                                        <ExternalLink size={14} /> Visualizar
                                                                    </button>
                                                                    <a
                                                                        href={contractFormData.contract_pdf_url}
                                                                        download={getFilenameFromUrl(contractFormData.contract_pdf_url)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit', height: '32px' }}
                                                                    >
                                                                        <Download size={14} /> Baixar
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={async (e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            if (window.confirm("Tem certeza que deseja remover o documento PDF deste contrato? Esta ação é irreversível.")) {
                                                                                try {
                                                                                    // Extract path from URL
                                                                                    const url = contractFormData.contract_pdf_url;
                                                                                    const pathMatch = url.match(/\/storage\/v1\/object\/public\/contracts_files\/(.+)$/);
                                                                                    const path = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

                                                                                    if (path) {
                                                                                        await filesService.deleteFile('contracts_files', path);
                                                                                    }

                                                                                    await contractsService.update(id, { ...contract, contract_pdf_url: null });

                                                                                    setContractFormData({ ...contractFormData, contract_pdf_url: null });
                                                                                    setContractFile(null);

                                                                                    // Refetch contract and history
                                                                                    const updated = await contractsService.getById(id);
                                                                                    setContract(updated);
                                                                                    await fetchHistory();
                                                                                    showToast("PDF removido com sucesso!");
                                                                                } catch (err) {
                                                                                    console.error("Erro ao remover PDF:", err);
                                                                                    showToast("Erro ao remover arquivo: " + err.message, 'error');
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="btn-action-small"
                                                                        style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px', color: '#d92d20' }}
                                                                    >
                                                                        <Trash2 size={14} /> Remover
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        <div className="upload-btn-styled" style={contractFormData.contract_pdf_url && !contractFile ? { marginTop: '8px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', height: '32px', padding: '0 12px', fontSize: '12px' } : {}}>
                                                            {contractFile || contractFormData.contract_pdf_url ? 'Substituir PDF' : 'Selecionar PDF'}
                                                        </div>

                                                        <input
                                                            id="contract-pdf-upload-edit"
                                                            type="file"
                                                            accept="application/pdf"
                                                            onChange={e => setContractFile(e.target.files[0])}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Responsáveis */}
                                <div className="contract-form-section">
                                    <div className="section-title">Responsáveis pelo contrato</div>
                                    <div className="contract-form-grid" style={{ gap: '0.75rem' }}>
                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Gestor do Contrato</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3, height: '44px', borderRadius: '10px' }} type="text" placeholder="Nome" value={contractFormData.managerName} onChange={e => setContractFormData({ ...contractFormData, managerName: e.target.value })} />
                                                <input style={{ flex: 1, height: '44px', borderRadius: '10px' }} type="text" placeholder="Ex: 123456" value={contractFormData.manager_registration} onChange={e => setContractFormData({ ...contractFormData, manager_registration: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Fiscal Técnico</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3, height: '44px', borderRadius: '10px' }} type="text" placeholder="Nome" value={contractFormData.technical_fiscal_name} onChange={e => setContractFormData({ ...contractFormData, technical_fiscal_name: e.target.value })} />
                                                <input style={{ flex: 1, height: '44px', borderRadius: '10px' }} type="text" placeholder="Ex: 123456" value={contractFormData.technical_fiscal_registration} onChange={e => setContractFormData({ ...contractFormData, technical_fiscal_registration: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="form-group full-width" style={{ marginBottom: '0.25rem' }}>
                                            <label>Fiscal Administrativo</label>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <input style={{ flex: 3, height: '44px', borderRadius: '10px' }} type="text" placeholder="Nome" value={contractFormData.administrative_fiscal_name} onChange={e => setContractFormData({ ...contractFormData, administrative_fiscal_name: e.target.value })} />
                                                <input style={{ flex: 1, height: '44px', borderRadius: '10px' }} type="text" placeholder="Ex: 123456" value={contractFormData.administrative_fiscal_registration} onChange={e => setContractFormData({ ...contractFormData, administrative_fiscal_registration: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Valores */}
                                <div className="contract-form-section">
                                    <div className="section-title">Valores e Observações</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group">
                                            <label>Valor Total (R$) *</label>
                                            <input
                                                required
                                                style={{ height: '44px', borderRadius: '10px' }}
                                                type="text"
                                                placeholder="R$ 0,00"
                                                value={getMaskedContractCurrencyValue(contractFormData.totalValue)}
                                                onChange={handleContractCurrencyInput}
                                            />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Observações</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Notas adicionais sobre o contrato..."
                                                value={contractFormData.notes}
                                                onChange={e => setContractFormData({ ...contractFormData, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Vigência */}
                                <div className="contract-form-section">
                                    <div className="section-title">Vigência</div>
                                    <div className="contract-form-grid">
                                        <div className="form-group" style={{ height: '44px' }}>
                                            <label>Data de Início</label>
                                            <input required style={{ height: '44px', borderRadius: '10px' }} type="date" value={contractFormData.startDate} onChange={e => setContractFormData({ ...contractFormData, startDate: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ height: '44px' }}>
                                            <label>Data de Vencimento</label>
                                            <input required style={{ height: '44px', borderRadius: '10px' }} type="date" value={contractFormData.endDate} onChange={e => setContractFormData({ ...contractFormData, endDate: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Rescisão */}
                                <div className="contract-form-section" style={{ background: isRescissionActive ? '#fff1f2' : 'transparent', border: isRescissionActive ? '1px solid #fecdd3' : '1px solid var(--border-light)', transition: 'all 0.3s', borderRadius: '8px', padding: '1.5rem', marginTop: '1rem' }}>
                                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                                        <input
                                            type="checkbox"
                                            id="chkRescisaoEdit"
                                            checked={isRescissionActive}
                                            onChange={e => setIsRescissionActive(e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="chkRescisaoEdit" style={{ cursor: 'pointer', color: 'var(--danger-color, #d92d20)', fontWeight: 600, margin: 0 }}>Rescisão do contrato</label>
                                    </div>

                                    {isRescissionActive && (
                                        <div className="contract-form-grid" style={{ marginTop: '1.5rem' }}>
                                            <div className="form-group" style={{ height: '44px' }}>
                                                <label>Data da rescisão *</label>
                                                <input required={isRescissionActive} style={{ height: '44px', borderRadius: '10px' }} type="date" value={contractFormData.rescinded_at} onChange={e => setContractFormData({ ...contractFormData, rescinded_at: e.target.value })} />
                                            </div>
                                            <div className="form-group full-width">
                                                <label>Observação</label>
                                                <textarea
                                                    rows="2"
                                                    placeholder="Motivos ou observações sobre a rescisão..."
                                                    value={contractFormData.rescission_notes}
                                                    onChange={e => setContractFormData({ ...contractFormData, rescission_notes: e.target.value })}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecdd3', fontFamily: 'inherit' }}
                                                />
                                            </div>
                                            <div className="form-group full-width">
                                                <label>PDF da rescisão</label>
                                                <label htmlFor="rescission-pdf-upload-edit" className={`upload-card ${rescissionFile ? 'has-file' : ''}`} style={{ borderColor: isRescissionActive ? '#fecdd3' : '#cbd5e1' }}>
                                                    <div className="upload-icon-wrapper" style={{ color: '#d92d20', background: '#fef2f2' }}>
                                                        {rescissionFile ? <FileText size={24} /> : <UploadCloud size={24} />}
                                                    </div>
                                                    <div className="upload-info">
                                                        <p className="upload-text-main">
                                                            {rescissionFile ? 'Arquivo selecionado' : 'Clique para anexar o PDF da rescisão'}
                                                        </p>
                                                        <p className="upload-text-sub">ou arraste o arquivo aqui</p>
                                                    </div>

                                                    {rescissionFile ? (
                                                        <div className="file-name-display" style={{ background: '#fecdd3', color: '#991b1b' }}>
                                                            <FileText size={14} /> {rescissionFile.name}
                                                        </div>
                                                    ) : contractFormData.rescission_pdf_url ? (
                                                        <div className="existing-file-info" style={{ width: '100%', marginBottom: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: '#fff1f2', borderRadius: '8px', border: '1px solid #fecdd3', color: '#d92d20', marginBottom: '12px' }}>
                                                                <FileText size={18} />
                                                                <span style={{ fontWeight: 500, fontSize: '13px' }}>{getFilenameFromUrl(contractFormData.rescission_pdf_url)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(contractFormData.rescission_pdf_url, '_blank'); }}
                                                                    className="btn-action-small"
                                                                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}
                                                                >
                                                                    <ExternalLink size={14} /> Visualizar
                                                                </button>
                                                                <a
                                                                    href={contractFormData.rescission_pdf_url}
                                                                    download={getFilenameFromUrl(contractFormData.rescission_pdf_url)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit', height: '32px' }}
                                                                >
                                                                    <Download size={14} /> Baixar
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.preventDefault(); e.stopPropagation();
                                                                        if (window.confirm("Tem certeza que deseja remover o PDF da rescisão? Esta ação é irreversível.")) {
                                                                            try {
                                                                                // Extract path from URL
                                                                                const url = contractFormData.rescission_pdf_url;
                                                                                const pathMatch = url.match(/\/storage\/v1\/object\/public\/contracts_files\/(.+)$/);
                                                                                const path = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

                                                                                if (path) {
                                                                                    await filesService.deleteFile('contracts_files', path);
                                                                                }

                                                                                await contractsService.update(id, { ...contract, rescission_pdf_url: null });

                                                                                setContractFormData({ ...contractFormData, rescission_pdf_url: null });
                                                                                setRescissionFile(null);

                                                                                // Refetch contract and history
                                                                                const updated = await contractsService.getById(id);
                                                                                setContract(updated);
                                                                                await fetchHistory();
                                                                                showToast("PDF da rescisão removido com sucesso!");
                                                                            } catch (err) {
                                                                                console.error("Erro ao remover PDF da rescisão:", err);
                                                                                showToast("Erro ao remover arquivo: " + err.message, 'error');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="btn-action-small"
                                                                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', height: '32px', color: '#d92d20' }}
                                                                >
                                                                    <Trash2 size={14} /> Remover
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    <div className="upload-btn-styled" style={contractFormData.rescission_pdf_url && !rescissionFile ? { marginTop: '8px', background: '#fff1f2', color: '#d92d20', border: '1px solid #fecdd3', height: '32px', padding: '0 12px', fontSize: '12px' } : {}}>
                                                        {rescissionFile || contractFormData.rescission_pdf_url ? 'Substituir PDF' : 'Selecionar PDF'}
                                                    </div>

                                                    <input
                                                        id="rescission-pdf-upload-edit"
                                                        type="file"
                                                        accept="application/pdf"
                                                        onChange={e => setRescissionFile(e.target.files[0])}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </form>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button type="button" className="cd-btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                            <button type="submit" form="editContractForm" className="cd-btn-primary" disabled={isSubmittingEdit}>
                                {isSubmittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Secretaria para OF */}
            {isOfOfModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Selecionar Secretaria</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Escolha a secretaria responsável por esta OF</p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setIsOfOfModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem 2rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>Secretaria *</label>
                                <select 
                                    value={selectedOfSecretariat} 
                                    onChange={e => setSelectedOfSecretariat(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                    required
                                >
                                    <option value="">Selecione uma secretaria...</option>
                                    {secretariats.map(sec => (
                                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="cd-btn-secondary" onClick={() => setIsOfOfModalOpen(false)}>Cancelar</button>
                            <button 
                                className="cd-btn-primary" 
                                onClick={() => {
                                    handleConfirmCreateOf();
                                    setIsOfOfModalOpen(false);
                                }}
                                disabled={!selectedOfSecretariat || isCreatingOf}
                            >
                                {isCreatingOf ? 'Gerando...' : 'Confirmar e Gerar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ContractDetails;
