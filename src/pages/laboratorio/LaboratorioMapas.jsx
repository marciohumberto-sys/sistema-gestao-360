import React, { useState, useEffect } from 'react';
import { 
    FileText, Printer, Search, RefreshCw, Eye,
    Filter, Calendar, Map, CheckCircle2, AlertCircle,
    User, Activity, LayoutDashboard, FileArchive, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

import './LaboratorioMapas.css';

const LaboratorioMapas = () => {
    const todayDate = new Date().toISOString().split('T')[0];

    const { authUser } = useAuth();
    const displayName = authUser?.user_metadata?.full_name
        || authUser?.user_metadata?.name
        || (authUser?.email ? authUser.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Usuário não identificado');

    const [filters, setFilters] = useState({ data: todayDate, setor: 'Todos', protocolo: '', paciente: '' });
    const [mapas, setMapas] = useState([]);
    const [selectedMapId, setSelectedMapId] = useState(null);
    const [sectoresOptions, setSectoresOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const previewRef = React.useRef(null);

    const [resumo, setResumo] = useState([
        { label: 'Mapas gerados', value: '0', icon: FileText, color: '#3b82f6' },
        { label: 'Pacientes', value: '0', icon: User, color: '#8b5cf6' },
        { label: 'Exames', value: '0', icon: Activity, color: '#10b981' },
        { label: 'Setores envolvidos', value: '0', icon: LayoutDashboard, color: '#f59e0b' },
        { label: 'Pendentes de imp.', value: '0', icon: Printer, color: '#ef4444' },
    ]);

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
    };

    useEffect(() => {
        const fetchSectores = async () => {
            const { data } = await supabase.from('lab_exam_sectors').select('name').order('name');
            if (data) setSectoresOptions(data.map(s => s.name));
        };
        fetchSectores();
        fetchMapas(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMapas = async (currentFilters) => {
        if (!currentFilters.data) {
            showToast('Informe uma data para realizar a consulta.', 'warning');
            clearData();
            return;
        }
        setLoading(true);
        try {
            let attQuery = supabase.from('lab_attendances').select('id, protocol_number, patient_id, attendance_date, attendance_time, agreement, delivery_location, requesting_doctor');
            
            if (currentFilters.data) {
                attQuery = attQuery.eq('attendance_date', currentFilters.data);
            }
            if (currentFilters.protocolo.trim()) {
                attQuery = attQuery.ilike('protocol_number', `%${currentFilters.protocolo.trim()}%`);
            }

            const { data: attendances, error: attError } = await attQuery;
            if (attError) throw attError;

            if (!attendances || attendances.length === 0) {
                clearData();
                return;
            }

            const patientIds = [...new Set(attendances.map(a => a.patient_id))];
            let patQuery = supabase.from('lab_patients').select('id, full_name, birth_date, sex, cns, cpf').in('id', patientIds);
            
            if (currentFilters.paciente.trim()) {
                const termo = currentFilters.paciente.trim();
                patQuery = patQuery.or(`full_name.ilike.%${termo}%,cns.ilike.%${termo}%`);
            }

            const { data: patients, error: patError } = await patQuery;
            if (patError) throw patError;

            const pacientesMap = Object.fromEntries((patients || []).map(p => [p.id, p]));
            const validAttendances = attendances.filter(a => pacientesMap[a.patient_id]);
            
            if (validAttendances.length === 0) {
                clearData();
                return;
            }

            const validAttendanceIds = validAttendances.map(a => a.id);

            const { data: attExams, error: attExamsError } = await supabase
                .from('lab_attendance_exams')
                .select(`
                    id, attendance_id, exam_id, sector_id, status,
                    lab_exams ( id, code, name, print_order ),
                    lab_exam_sectors ( id, name )
                `)
                .in('attendance_id', validAttendanceIds);

            if (attExamsError) throw attExamsError;

            let agrupados = {};
            
            (attExams || []).forEach(ae => {
                const sectorName = ae.lab_exam_sectors?.name || 'Diversos';
                if (currentFilters.setor !== 'Todos' && sectorName !== currentFilters.setor) return;

                const att = validAttendances.find(a => a.id === ae.attendance_id);
                const paciente = pacientesMap[att.patient_id];
                const sectorId = ae.sector_id || 'sem-setor';
                const key = `${att.id}_${sectorId}`;

                if (!agrupados[key]) {
                    agrupados[key] = {
                        id: key,
                        protocolo: att.protocol_number,
                        paciente: paciente.full_name || 'Paciente não encontrado',
                        pacienteObj: paciente,
                        atendimentoObj: att,
                        setor: sectorName,
                        exames: [],
                        status: 'Pronto p/ imprimir',
                        statusFull: 'Pronto para imprimir'
                    };
                }
                
                agrupados[key].exames.push({
                    codigo: ae.lab_exams?.code || '-',
                    nome: ae.lab_exams?.name || 'Exame não informado',
                    ordem: ae.lab_exams?.print_order ?? 999
                });
            });

            const finalMapas = Object.values(agrupados).map(m => {
                m.exames.sort((a, b) => {
                    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
                    if (a.codigo !== b.codigo) return String(a.codigo).localeCompare(String(b.codigo));
                    return String(a.nome).localeCompare(String(b.nome));
                });
                m.qtdExames = m.exames.length;
                return m;
            });

            setMapas(finalMapas);
            updateResumo(finalMapas);
            if (finalMapas.length > 0) setSelectedMapId(finalMapas[0].id);
            else setSelectedMapId(null);

        } catch (error) {
            console.error('[LaboratorioMapas] Erro na consulta:', error);
            showToast('Erro ao buscar dados. Tente novamente.', 'error');
            clearData();
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => {
        setMapas([]);
        setSelectedMapId(null);
        updateResumo([]);
    };

    const updateResumo = (lista) => {
        const uniquePacientes = new Set(lista.map(m => m.pacienteObj?.id)).size;
        const totalExames = lista.reduce((acc, m) => acc + m.qtdExames, 0);
        const uniqueSectores = new Set(lista.map(m => m.setor)).size;
        const pendentes = lista.filter(m => m.status === 'Pronto p/ imprimir').length;

        setResumo([
            { label: 'Mapas gerados', value: String(lista.length), icon: FileText, color: '#3b82f6' },
            { label: 'Pacientes', value: String(uniquePacientes), icon: User, color: '#8b5cf6' },
            { label: 'Exames', value: String(totalExames), icon: Activity, color: '#10b981' },
            { label: 'Setores envolvidos', value: String(uniqueSectores), icon: LayoutDashboard, color: '#f59e0b' },
            { label: 'Pendentes de imp.', value: String(pendentes), icon: Printer, color: '#ef4444' },
        ]);
    };

    const handleNovaConsulta = () => {
        const newFilters = { data: todayDate, setor: 'Todos', protocolo: '', paciente: '' };
        setFilters(newFilters);
        fetchMapas(newFilters);
    };

    const handleBuscar = () => {
        fetchMapas(filters);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBuscar();
        }
    };

    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const handlePrintMap = (mapObj) => {
        if (!mapObj) return;

        if (mapObj.status === 'Pendente') {
            showToast('Este mapa ainda não está pronto para impressão.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            showToast('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.', 'error');
            return;
        }

        const dataAtendimento = formatDate(mapObj.atendimentoObj?.attendance_date);
        const horaAtendimento = mapObj.atendimentoObj?.attendance_time?.substring(0, 5) || 'Não informado';
        const paciente = mapObj.paciente;
        const idade = calculateAge(mapObj.pacienteObj?.birth_date);
        const sexo = mapObj.pacienteObj?.sex || 'Não informado';
        const convenio = mapObj.atendimentoObj?.agreement || 'Não informado';
        const local = mapObj.atendimentoObj?.delivery_location || 'Não informado';
        const medico = mapObj.atendimentoObj?.requesting_doctor || 'Não informado';
        const setor = mapObj.setor;
        const protocolo = mapObj.protocolo;
        const dataHoraImpressao = `${formatDate(todayDate)} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        let examsHtml = '';
        mapObj.exames.forEach(ex => {
            examsHtml += `
                <tr>
                    <td class="col-cod">${escapeHtml(ex.codigo)}</td>
                    <td class="col-exame">${escapeHtml(ex.nome)}</td>
                    <td class="col-resultado"><div class="linha-escrita"></div></td>
                </tr>
            `;
        });

        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa de Trabalho - ${escapeHtml(protocolo)} - ${escapeHtml(setor)}</title>
    <style>
        @page { 
            size: A4 portrait; 
            margin: 12mm 15mm; 
        }
        * { box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #333;
            background: #fff;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            width: 100%;
        }
        .lab-paper-header {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .header-text-block {
            flex: 0 0 70%;
            text-align: left;
            padding-right: 15px;
        }
        .header-text-block h3 {
            margin: 0 0 4px 0;
            font-size: 11pt;
            font-weight: bold;
            color: #334155;
            text-transform: uppercase;
        }
        .header-text-block h4 {
            margin: 0;
            font-size: 9pt;
            color: #64748b;
            font-weight: normal;
        }
        .header-divider {
            width: 1px;
            background-color: #e2e8f0;
            align-self: stretch;
            margin: 0 10px;
        }
        .header-logos-stacked {
            flex: 0 0 28%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .header-logos-stacked img {
            height: 30px;
            width: auto;
            max-width: 100%;
            object-fit: contain;
            opacity: 0.9;
        }
        .header-horizontal-line {
            height: 1px;
            background-color: #e2e8f0;
            width: 100%;
            margin-bottom: 15px;
        }
        .header-bottom {
            text-align: center;
            margin-top: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        .header-bottom h2 {
            margin: 0;
            font-size: 14pt;
            font-weight: bold;
            color: #1e293b;
            letter-spacing: 0.5px;
        }
        .lab-paper-sector-badge {
            font-size: 9pt;
            font-weight: bold;
            display: inline-block;
            background: transparent;
            border: 1px solid #e2e8f0;
            color: #64748b;
            padding: 3px 12px;
            border-radius: 4px;
        }
        .lab-paper-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 30px;
            margin-bottom: 25px;
            padding: 10px 0;
            border-top: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10pt;
        }
        .lab-paper-info-item {
            display: flex;
            gap: 6px;
            align-items: baseline;
            color: #334155;
        }
        .full-row { grid-column: 1 / -1; }
        .font-bold { 
            font-weight: bold; 
            color: #475569;
            min-width: 80px;
        }
        
        .lab-paper-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .lab-paper-table th {
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
            padding: 8px 5px;
            font-size: 9pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
        }
        .lab-paper-table td {
            padding: 10px 5px;
            font-size: 10pt;
            color: #1e293b;
            vertical-align: bottom;
            height: 12mm;
            border-bottom: 1px solid #f8fafc;
        }
        .col-cod { width: 12%; }
        .col-exame { width: 43%; }
        .col-resultado { width: 45%; }
        
        .linha-escrita {
            border-bottom: 1px solid #e2e8f0;
            width: 100%;
            height: 100%;
            min-height: 15px;
        }
        
        .lab-paper-table tr { 
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .lab-paper-footer {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 8pt;
            display: flex;
            justify-content: space-between;
            color: #94a3b8;
        }
        thead { display: table-header-group; }
    </style>
</head>
<body>
    <div class="lab-paper-header">
        <div class="header-top">
            <div class="header-text-block">
                <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
            </div>
            <div class="header-divider"></div>
            <div class="header-logos-stacked">
                <img src="${window.location.origin}/logo-prefeitura-pb.jpg" alt="Prefeitura" />
                <img src="${window.location.origin}/logo-laboratorio-pb.jpg" alt="Laboratório" />
            </div>
        </div>
        <div class="header-horizontal-line"></div>
        <div class="header-bottom">
            <h2>MAPA DE TRABALHO</h2>
            <span class="lab-paper-sector-badge">SETOR: ${escapeHtml(setor).toUpperCase()}</span>
        </div>
    </div>

    <div class="lab-paper-info-grid">
        <div class="lab-paper-info-item">
            <label class="font-bold">Protocolo:</label>
            <span>${escapeHtml(protocolo)}</span>
        </div>
        <div class="lab-paper-info-item">
            <label class="font-bold">Data e hora:</label>
            <span>${escapeHtml(dataAtendimento)} - ${escapeHtml(horaAtendimento)}</span>
        </div>
        <div class="lab-paper-info-item">
            <label class="font-bold">Paciente:</label>
            <span class="font-bold">${escapeHtml(paciente)}</span>
        </div>
        <div class="lab-paper-info-item">
            <label class="font-bold">Sexo:</label>
            <span>${escapeHtml(sexo)}</span>
        </div>
        <div class="lab-paper-info-item">
            <label class="font-bold">Idade:</label>
            <span>${escapeHtml(idade)}</span>
        </div>
        <div class="lab-paper-info-item">
            <label class="font-bold">Local:</label>
            <span>${escapeHtml(local)}</span>
        </div>
        <div class="lab-paper-info-item full-row">
            <label class="font-bold">Convênio:</label>
            <span>${escapeHtml(convenio)}</span>
        </div>
        <div class="lab-paper-info-item full-row">
            <label class="font-bold">Médico solicitante:</label>
            <span>${escapeHtml(medico)}</span>
        </div>
    </div>

    <table class="lab-paper-table">
        <thead>
            <tr>
                <th class="col-cod">Cód.</th>
                <th class="col-exame">Exame Solicitado</th>
                <th class="col-resultado">Resultado / Anotação</th>
            </tr>
        </thead>
        <tbody>
            ${examsHtml}
        </tbody>
    </table>

    <div class="lab-paper-footer">
        <p>Impresso por: ${escapeHtml(displayName)} em ${escapeHtml(dataHoraImpressao)}</p>
        <p>Gestão 360 - Módulo Laboratório</p>
    </div>
</body>
</html>`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        let printed = false;
        const doPrint = () => {
            if (printed) return;
            printed = true;
            printWindow.focus();
            printWindow.print();
        };

        printWindow.onafterprint = () => {
            printWindow.close();
        };

        printWindow.onload = () => {
            doPrint();
        };

        setTimeout(() => {
            doPrint();
        }, 500);
    };

    const handleImprimir = () => {
        if (!selectedMapId) {
            showToast('Selecione um mapa para imprimir.', 'warning');
            return;
        }

        const mapObj = mapas.find(m => m.id === selectedMapId);
        if (mapObj) {
            handlePrintMap(mapObj);
        }
    };

    const handleImprimirLote = () => {
        showToast('A impressão em lote será disponibilizada posteriormente.', 'success');
    };

    const handleRegerarMapa = (mapaId = null) => {
        const targetId = typeof mapaId === 'string' ? mapaId : selectedMapId;
        if (!targetId) return;
        fetchMapas(filters);
    };

    const handleVisualizar = (mapaId) => {
        setSelectedMapId(mapaId);
        if (previewRef.current) {
            previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    const calculateAge = (birthDateStr) => {
        if (!birthDateStr) return 'Não informado';
        const today = new Date();
        const birthDate = new Date(birthDateStr);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return `${age} anos`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return dateStr;
        return `${d}/${m}/${y}`;
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pronto p/ imprimir': return 'status-success';
            case 'Pendente': return 'status-warning';
            case 'Regerado': return 'status-info';
            default: return 'status-default';
        }
    };

    const mapSelected = mapas.find(m => m.id === selectedMapId);

    return (
        <div className="lab-mapas-container">
            {toast.visible && (
                <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                    {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="lab-mapas-header">
                <div>
                    <h1 className="lab-title">Mapas</h1>
                    <p className="lab-subtitle">Geração e impressão de mapas de trabalho por paciente e setor</p>
                </div>
                <div className="lab-header-actions">
                    <button className="lab-btn lab-btn-outline" onClick={handleNovaConsulta}><Filter size={16} /> Nova Consulta</button>
                    <button className="lab-btn lab-btn-primary" onClick={handleBuscar} disabled={loading}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Gerar Mapas
                    </button>
                    <button className="lab-btn lab-btn-success" onClick={handleImprimirLote} disabled={mapas.length === 0}><Printer size={16} /> Imprimir Mapas</button>
                </div>
            </header>

            {/* Filtros */}
            <div className="lab-card lab-filters-card">
                <div className="lab-filters-grid">
                    <div className="lab-filter-item">
                        <label>Data</label>
                        <div className="lab-input-with-icon">
                            <Calendar size={16} />
                            <input 
                                type="date" 
                                value={filters.data} 
                                onChange={(e) => setFilters({...filters, data: e.target.value})} 
                                onKeyDown={handleKeyDown} 
                                style={{ paddingLeft: '2.5rem' }} 
                            />
                        </div>
                    </div>
                    <div className="lab-filter-item">
                        <label>Setor / Seção</label>
                        <select value={filters.setor} onChange={(e) => setFilters({...filters, setor: e.target.value})} onKeyDown={handleKeyDown}>
                            <option value="Todos">Todos</option>
                            {sectoresOptions.map((sec, idx) => (
                                <option key={idx} value={sec}>{sec}</option>
                            ))}
                        </select>
                    </div>
                    <div className="lab-filter-item">
                        <label>Protocolo</label>
                        <input type="text" placeholder="Ex: 113443" value={filters.protocolo} onChange={(e) => setFilters({...filters, protocolo: e.target.value})} onKeyDown={handleKeyDown} />
                    </div>
                    <div className="lab-filter-item">
                        <label>Paciente</label>
                        <input type="text" placeholder="Nome ou Cartão SUS" value={filters.paciente} onChange={(e) => setFilters({...filters, paciente: e.target.value})} onKeyDown={handleKeyDown} />
                    </div>
                    <div className="lab-filter-actions">
                        <button className="lab-btn lab-btn-primary" onClick={handleBuscar} disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 
                            Buscar
                        </button>
                    </div>
                </div>
            </div>

            {/* Resumo */}
            <div className="lab-summary-row">
                {resumo.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div key={idx} className="lab-summary-mini-card">
                            <div className="lab-summary-mini-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                                <Icon size={20} />
                            </div>
                            <div className="lab-summary-mini-info">
                                <span className="lab-summary-mini-value">{item.value}</span>
                                <span className="lab-summary-mini-label">{item.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Layout Principal: Lista e Preview */}
            <div className="lab-mapas-layout">
                
                {/* Lista de Mapas */}
                <div className="lab-card lab-mapas-list-card">
                    <div className="lab-card-header">
                        <h3 className="lab-card-title"><Map size={18} /> Mapas Gerados</h3>
                    </div>
                    <div className="lab-table-container">
                        <table className="lab-table">
                            <thead>
                                <tr>
                                    <th>Protocolo</th>
                                    <th className="col-paciente">Paciente</th>
                                    <th>Setor</th>
                                    <th className="text-center">Exames</th>
                                    <th>Status</th>
                                    <th className="text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && mapas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center" style={{ padding: '2rem' }}>
                                            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: '#3b82f6' }} />
                                            <p style={{ marginTop: '0.5rem', color: '#64748b' }}>Carregando dados...</p>
                                        </td>
                                    </tr>
                                ) : mapas.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center" style={{ padding: '2rem', color: '#64748b' }}>
                                            Nenhum mapa encontrado para os filtros informados.
                                        </td>
                                    </tr>
                                ) : (
                                    mapas.map((mapa) => (
                                        <tr key={mapa.id} className={selectedMapId === mapa.id ? 'selected-row' : ''} onClick={() => setSelectedMapId(mapa.id)} style={{ cursor: 'pointer' }}>
                                            <td className="font-semibold">{mapa.protocolo}</td>
                                            <td>{mapa.paciente}</td>
                                            <td><span className="lab-sector-tag">{mapa.setor}</span></td>
                                            <td className="text-center font-semibold">{mapa.qtdExames}</td>
                                            <td>
                                                <span className={`lab-status-tag ${getStatusClass(mapa.status)}`} title={mapa.statusFull}>
                                                    {mapa.status}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="lab-action-group">
                                                    <button 
                                                        className={`lab-icon-btn ${selectedMapId === mapa.id ? 'lab-text-primary' : 'lab-text-gray'}`}
                                                        onClick={(e) => { e.stopPropagation(); handleVisualizar(mapa.id); }}
                                                        title="Visualizar"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="lab-icon-btn lab-text-gray" title="Imprimir" onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setSelectedMapId(mapa.id);
                                                        handlePrintMap(mapa); 
                                                    }}>
                                                        <Printer size={16} />
                                                    </button>
                                                    <button className="lab-icon-btn lab-text-gray" title="Regerar" onClick={(e) => { e.stopPropagation(); handleRegerarMapa(mapa.id); }}>
                                                        <RefreshCw size={16} />
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

                {/* Prévia de Impressão */}
                <div className="lab-print-preview-container" ref={previewRef}>
                    <div className="lab-print-actions">
                        <span className="lab-preview-title">Prévia de Impressão</span>
                        <div className="lab-preview-btn-group">
                            <button className="lab-btn lab-btn-sm lab-btn-primary" disabled={!mapSelected} onClick={() => handleImprimir()}><Printer size={14} /> Imprimir mapa selecionado</button>
                            <button className="lab-btn lab-btn-sm lab-btn-outline" disabled={!mapSelected} onClick={() => handleRegerarMapa()}><RefreshCw size={14} /> Regerar mapa</button>
                        </div>
                    </div>
                    
                    {mapSelected ? (
                        <div className="lab-paper-mock">
                            <div className="lab-paper-header">
                                <div className="header-top">
                                    <div className="header-text-block">
                                        <h3>Secretaria Municipal de Saúde de Bezerros</h3>
                                        <h4>Laboratório Municipal Lindoberg Cândido de Souza</h4>
                                    </div>
                                    <div className="header-divider"></div>
                                    <div className="header-logos-stacked">
                                        <img src="/logo-prefeitura-pb.jpg" alt="Prefeitura" />
                                        <img src="/logo-laboratorio-pb.jpg" alt="Laboratório" />
                                    </div>
                                </div>
                                <div className="header-horizontal-line"></div>
                                <div className="header-bottom">
                                    <h2>MAPA DE TRABALHO</h2>
                                    <span className="lab-paper-sector-badge">SETOR: {mapSelected.setor.toUpperCase()}</span>
                                </div>
                            </div>

                            <div className="lab-paper-info-grid">
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Protocolo:</label>
                                    <span>{mapSelected.protocolo}</span>
                                </div>
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Data e hora:</label>
                                    <span>{formatDate(mapSelected.atendimentoObj?.attendance_date)} - {mapSelected.atendimentoObj?.attendance_time?.substring(0, 5) || 'Não informado'}</span>
                                </div>
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Paciente:</label>
                                    <span className="font-bold">{mapSelected.paciente}</span>
                                </div>
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Sexo:</label>
                                    <span>{mapSelected.pacienteObj?.sex || 'Não informado'}</span>
                                </div>
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Idade:</label>
                                    <span>{calculateAge(mapSelected.pacienteObj?.birth_date)}</span>
                                </div>
                                <div className="lab-paper-info-item">
                                    <label className="font-bold">Local:</label>
                                    <span>{mapSelected.atendimentoObj?.delivery_location || 'Não informado'}</span>
                                </div>
                                <div className="lab-paper-info-item full-row">
                                    <label className="font-bold">Convênio:</label>
                                    <span>{mapSelected.atendimentoObj?.agreement || 'Não informado'}</span>
                                </div>
                                <div className="lab-paper-info-item full-row">
                                    <label className="font-bold">Médico solicitante:</label>
                                    <span>{mapSelected.atendimentoObj?.requesting_doctor || 'Não informado'}</span>
                                </div>
                            </div>

                            <table className="lab-paper-table">
                                <thead>
                                    <tr>
                                        <th className="col-cod">Cód.</th>
                                        <th className="col-exame">Exame Solicitado</th>
                                        <th className="col-resultado">Resultado / Anotação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mapSelected.exames.map((ex, idx) => (
                                        <tr key={idx}>
                                            <td className="col-cod">{ex.codigo}</td>
                                            <td className="col-exame">{ex.nome}</td>
                                            <td className="col-resultado"><div className="linha-escrita"></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="lab-paper-footer">
                                <p>Impresso por: {displayName} em {formatDate(todayDate)} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                <p>Gestão 360 - Módulo Laboratório</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                            <FileArchive size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
                            <p>Selecione um mapa para visualizar a prévia.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default LaboratorioMapas;
