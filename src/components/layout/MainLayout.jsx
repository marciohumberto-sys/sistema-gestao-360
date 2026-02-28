import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import './MainLayout.css';

const MainLayout = () => {
    const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
        const saved = localStorage.getItem('sidebarPinned');
        return saved !== null ? saved === 'true' : true;
    });

    useEffect(() => {
        localStorage.setItem('sidebarPinned', isSidebarPinned);
    }, [isSidebarPinned]);

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
