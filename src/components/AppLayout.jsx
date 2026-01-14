// src/components/AppLayout.jsx
// RUMA 後台佈局包裝器 - 包含側邊欄

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AppLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* 側邊欄 */}
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

            {/* 主內容區 */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold">
                            R
                        </div>
                        <span className="font-extrabold text-slate-900">RUMA</span>
                    </Link>
                    <div className="w-10" /> {/* Spacer for centering */}
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
