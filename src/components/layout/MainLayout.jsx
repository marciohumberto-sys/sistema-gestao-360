import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import './MainLayout.css';

const MainLayout = () => {
    const location = useLocation();
    
    const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
        const saved = localStorage.getItem('sidebarPinned');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        localStorage.setItem('sidebarPinned', isSidebarPinned);
    }, [isSidebarPinned]);

    // Persistir o contexto do módulo atual para fallbacks futuros
    useEffect(() => {
        if (location.pathname.startsWith('/farmacia')) {
            localStorage.setItem('last_module', 'FARMACIA');
        } else if (location.pathname.startsWith('/compras')) {
            localStorage.setItem('last_module', 'COMPRAS');
        }
    }, [location.pathname]);

    const toggleSidebar = () => setIsSidebarPinned(prev => !prev);

    return (
        <div className="app-container">
            <Topbar />
            <Sidebar isPinned={isSidebarPinned} togglePin={toggleSidebar} />
            <main className={`main-content ${isSidebarPinned ? 'sidebar-pinned' : 'sidebar-compact'}`}>
                <div className="page-wrapper">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
