import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    LayoutDashboard,
    ShoppingCart,
    FileText,
    Briefcase,
    FileBadge,
    Files,
    BarChart2,
    AlertTriangle,
    Users,
    Settings,
    Menu,
    ChevronLeft,
    Plus,
    FilePlus,
    HelpCircle,
    Package,
    PackagePlus,
    PackageMinus,
    ArrowLeftRight,
    SlidersHorizontal,
    Pill,
    Target,
    Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccessFarmacia } from '../../utils/farmaciaAcl';
import './Sidebar.css';

const MENU_ITEMS = [
    {
        section: 'Principal',
        items: [
            { path: '/compras/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
        ]
    },
    {
        section: 'Gestão',
        items: [
            { path: '/compras/contratos', icon: Briefcase, label: 'Contratos' },
            { path: '/compras/empenhos', icon: FileBadge, label: 'Empenhos' },
            { path: '/compras/ordens-fornecimento', icon: ShoppingCart, label: 'Ordens de Fornecimento' }
        ]
    },
    {
        section: 'Execução',
        items: [
            { path: '/compras/notas-fiscais', icon: FileText, label: 'Notas Fiscais' }
        ]
    },
    {
        section: 'Análise',
        items: [
            { path: '/compras/relatorios', icon: BarChart2, label: 'Relatórios' },
            { path: '/compras/alertas', icon: AlertTriangle, label: 'Alertas' }
        ]
    },
    {
        section: 'Administração',
        items: [
            { path: '/compras/usuarios', icon: Users, label: 'Usuários' }
        ]
    }
];

// Menu contextual do módulo Farmácia (3 grupos)
const FARMACIA_MENU_ITEMS = [
    {
        section: 'Principal',
        items: [
            { path: '/farmacia/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/farmacia/estoque',   icon: Package,          label: 'Estoque' },
        ]
    },
    {
        section: 'Operações',
        items: [
            { path: '/farmacia/entradas',      icon: PackagePlus,       label: 'Entradas' },
            { path: '/farmacia/saidas',        icon: PackageMinus,      label: 'Saídas' },
            { path: '/farmacia/movimentacoes', icon: ArrowLeftRight,    label: 'Movimentações' },
            { path: '/farmacia/ajustes',       icon: SlidersHorizontal, label: 'Ajustes' },
        ]
    },
    {
        section: 'Análises',
        items: [
            { path: '/farmacia/relatorios', icon: BarChart2, label: 'Relatórios' },
        ]
    },
    {
        section: 'Administração',
        items: [
            { path: '/farmacia/usuarios', icon: Users, label: 'Usuários' }
        ]
    }
];

// Menu contextual do módulo Planejamento
const PLANEJAMENTO_MENU_ITEMS = [
    {
        section: 'Principal',
        items: [
            { path: '/planejamento/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
        ]
    },
    {
        section: 'Monitoramento',
        items: [
            { path: '/planejamento/acoes', icon: Target, label: 'Ações' },
            { path: '/planejamento/atualizacoes', icon: Activity, label: 'Atualizações' },
            { path: '/planejamento/entraves', icon: AlertTriangle, label: 'Entraves' }
        ]
    },
    {
        section: 'Administração',
        items: [
            { path: '/planejamento/usuarios', icon: Users, label: 'Usuários' }
        ]
    }
];

const Sidebar = ({ isPinned, togglePin }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { tenantLink, isSuperAdmin, accessibleModules = [] } = useAuth();
    
    const isFarmacia = location.pathname.startsWith('/farmacia');
    const isPlanejamento = location.pathname.startsWith('/planejamento');
    const activeMenu = isFarmacia ? FARMACIA_MENU_ITEMS : (isPlanejamento ? PLANEJAMENTO_MENU_ITEMS : MENU_ITEMS);
    
    const role = isSuperAdmin ? 'SUPERADMIN' : (tenantLink?.role || 'VISUALIZADOR');

    const filteredMenu = activeMenu.map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (isFarmacia) {
                return canAccessFarmacia(role, item.path);
            }
            return true;
        })
    })).filter(group => group.items.length > 0);

    return (
        <aside className={`sidebar ${isPinned ? 'pinned' : 'compact'}`}>
            <div className="sidebar-header">
                {isFarmacia && isPinned && (
                    <span className="sidebar-module-label" style={{ color: '#059669', background: 'rgba(5, 150, 105, 0.1)' }}>
                        <Pill size={13} strokeWidth={2} />
                        Farmácia
                    </span>
                )}
                {isPlanejamento && isPinned && (
                    <span className="sidebar-module-label" style={{ color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)' }}>
                        <Target size={13} strokeWidth={2} />
                        Planejamento
                    </span>
                )}
                <button
                    className="pin-toggle-btn"
                    onClick={togglePin}
                    aria-label={isPinned ? "Recolher menu" : "Expandir menu"}
                >
                    {isPinned ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>
            <div className="sidebar-content">
                {filteredMenu.map((group, index) => (
                    <div key={index} className="sidebar-section">
                        <div className="sidebar-section-title">
                            {group.section}
                        </div>
                        
                        {/* Inserir Home se for SuperAdmin ou tiver múltiplos módulos */}
                        {group.section === 'Principal' && (isSuperAdmin || accessibleModules.length >= 2) && (
                            <NavLink
                                to="/home"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isPinned ? 'has-flyout' : ''}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Home 
                                            className="nav-icon" 
                                            size={20} 
                                            strokeWidth={isActive ? 2.5 : 2.0} 
                                            style={{ opacity: isActive ? 1.0 : 0.65 }}
                                        />
                                        <span className="nav-label">Home</span>
                                        {!isPinned && (
                                            <div className="flyout">
                                                <span className="flyout-section">{group.section}</span>
                                                <span className="flyout-label">Home</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )}

                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${!isPinned ? 'has-flyout' : ''}`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            className="nav-icon"
                                            size={20}
                                            strokeWidth={isActive ? 2.5 : 2.0}
                                            style={{
                                                opacity: isActive ? 1.0 : 0.65
                                            }}
                                            aria-hidden="true"
                                        />
                                        <span className="nav-label">
                                            {item.label}
                                        </span>

                                        {!isPinned && (
                                            <div className="flyout">
                                                <span className="flyout-section">{group.section}</span>
                                                <span className="flyout-label">{item.label}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </div>

            {!isFarmacia && !isPlanejamento && (
            <div className="sidebar-footer">
                <div className="footer-actions">
                    <button className="footer-btn btn-primary" title={!isPinned ? "Nova Ordem de Fornecimento" : ""} onClick={() => navigate('/compras/ordens-fornecimento', { state: { openModal: 'nova-of' } })}>
                        <Plus size={18} strokeWidth={2.5} className="footer-icon" />
                        <span className="footer-btn-label">Nova OF</span>
                    </button>
                    <button className="footer-btn btn-secondary" title={!isPinned ? "Registrar Nota Fiscal" : ""} onClick={() => navigate('/compras/notas-fiscais', { state: { openModal: 'nova-nf' } })}>
                        <FilePlus size={18} strokeWidth={2} className="footer-icon" />
                        <span className="footer-btn-label">Registrar NF</span>
                    </button>
                </div>
            </div>
            )}
        </aside>
    );
};

export default Sidebar;
