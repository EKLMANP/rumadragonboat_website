// src/components/AppLayout.jsx
// RUMA 後台佈局包裝器 - 包含側邊欄

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function AppLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { lang, toggleLanguage } = useLanguage();

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="min-h-screen bg-slate-100 flex overflow-x-hidden">
            {/* 側邊欄 */}
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

            {/* 主內容區 */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen max-w-full overflow-x-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="flex items-center">
                        <img
                            src="/Header_Footer_v2.png"
                            alt="RUMA"
                            className="h-5 w-auto"
                        />
                    </Link>
                    <button
                        onClick={toggleLanguage}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                        title={lang === 'zh' ? 'Switch to English' : '切換至中文'}
                    >
                        <Globe size={20} />
                        <span className="text-xs font-bold uppercase">{lang === 'zh' ? 'EN' : '中'}</span>
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
