import React from 'react';
import { NavLink } from 'react-router-dom';
import {
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
    HelpCircle
} from 'lucide-react';
import './Sidebar.css';

const MENU_ITEMS = [
    {
        section: 'Principal',
        items: [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' }
        ]
    },
    {
        section: 'Operacional',
        items: [
            { path: '/ordens-fornecimento', icon: ShoppingCart, label: 'Ordens de Fornecimento' },
            { path: '/notas-fiscais', icon: FileText, label: 'Notas Fiscais' }
        ]
    },
    {
        section: 'Gestão',
        items: [
            { path: '/contratos', icon: Briefcase, label: 'Contratos' },
            { path: '/empenhos', icon: FileBadge, label: 'Empenhos' },
            { path: '/aditivos', icon: Files, label: 'Aditivos' }
        ]
    },
    {
        section: 'Análise',
        items: [
            { path: '/relatorios', icon: BarChart2, label: 'Relatórios' },
            { path: '/alertas', icon: AlertTriangle, label: 'Alertas' }
        ]
    },
    {
        section: 'Administração',
        items: [
            { path: '/cadastros', icon: Users, label: 'Cadastros' },
            { path: '/configuracoes', icon: Settings, label: 'Configurações' }
        ]
    }
];

const Sidebar = ({ isPinned, togglePin }) => {
    return (
        <aside className={`sidebar ${isPinned ? 'pinned' : 'compact'}`}>
            <div className="sidebar-header">
                <button
                    className="pin-toggle-btn"
                    onClick={togglePin}
                    aria-label={isPinned ? "Recolher menu" : "Expandir menu"}
                >
                    {isPinned ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
            </div>
            <div className="sidebar-content">
                {MENU_ITEMS.map((group, index) => (
                    <div key={index} className="sidebar-section">
                        <div className="sidebar-section-title">
                            {group.section}
                        </div>
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

            <div className="sidebar-footer">
                <div className="footer-actions">
                    <button className="footer-btn btn-primary" title={!isPinned ? "Nova Ordem de Fornecimento" : ""}>
                        <Plus size={18} strokeWidth={2.5} className="footer-icon" />
                        <span className="footer-btn-label">Nova OF</span>
                    </button>
                    <button className="footer-btn btn-secondary" title={!isPinned ? "Registrar Nota Fiscal" : ""}>
                        <FilePlus size={18} strokeWidth={2} className="footer-icon" />
                        <span className="footer-btn-label">Registrar NF</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
