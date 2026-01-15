// src/components/Sidebar.jsx
// RUMA 後台左側導覽列組件

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Megaphone,
    Calendar,
    Home,
    Ship,
    Shirt,
    Star,
    MapPin,
    ClipboardList,
    Settings,
    LogOut,
    X,
    MessageSquareWarning
} from 'lucide-react';
import BugReportModal from './BugReportModal';

export default function Sidebar({ isOpen, onToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile, userRoles, logout } = useAuth();
    const { lang } = useLanguage();
    const [showBugModal, setShowBugModal] = useState(false);

    // 直接從 userRoles 陣列計算權限，避免派生狀態延遲
    const computedIsAdmin = Array.isArray(userRoles) && userRoles.includes('admin');
    const computedIsManagement = computedIsAdmin || (Array.isArray(userRoles) && userRoles.includes('management'));

    // Debug: 輸出角色資訊
    console.log('[Sidebar] userRoles:', userRoles, 'isAdmin:', computedIsAdmin, 'isManagement:', computedIsManagement);

    // 取得使用者名稱
    const displayName = userProfile?.name || '隊員';
    const avatarLetter = displayName.charAt(0).toUpperCase();

    // 處理登出
    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // 導覽項目配置 - 按照用戶要求順序排列
    const navItems = [
        // ===== 1. 總覽 =====
        {
            path: '/app',
            icon: Home,
            label: lang === 'zh' ? '總覽' : 'Overview',
            exact: true,
            highlight: true,
            visible: true
        },
        // ===== 2. 最新公告 =====
        {
            path: '/app/announcements',
            icon: Megaphone,
            label: lang === 'zh' ? '最新公告' : 'Announcement',
            visible: true
        },
        // ===== 3. 年度日程表 =====
        {
            path: '/app/calendar',
            icon: Calendar,
            label: lang === 'zh' ? '年度日程表' : 'Annual calendar',
            visible: true
        },
        // ===== 4. 活動報名 =====
        {
            path: '/app/practice',
            icon: Ship,
            label: lang === 'zh' ? '活動報名' : 'Event registration',
            visible: true
        },
        // ===== 5. 我的龍舟旅程 =====
        {
            path: '/app/journey',
            icon: MapPin,
            label: lang === 'zh' ? '我的龍舟旅程' : 'My journey',
            visible: true
        },
        // ===== 6. 公用裝備查詢 =====
        {
            path: '/app/equipment',
            icon: Shirt,
            label: lang === 'zh' ? '公用裝備查詢' : 'Team equipment',
            visible: true
        },
        // ===== 8. 幹部專區 =====
        {
            path: '/app/coach',
            icon: ClipboardList,
            label: lang === 'zh' ? '幹部專區' : 'Management team',
            visible: computedIsManagement,
            dividerBefore: true
        },
        // ===== 9. 管理員專區 =====
        {
            path: '/app/admin',
            icon: Settings,
            label: lang === 'zh' ? '管理員專區' : 'Admin',
            visible: computedIsAdmin,
            dividerBefore: !computedIsManagement
        }
    ];

    // 檢查是否為當前路徑
    const isActive = (path, exact = false) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed top-0 left-0 w-64 bg-[#0F172A] z-50
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    flex flex-col
                    h-[100dvh] max-h-[100dvh] overflow-hidden
                `}
            >
                {/* Logo 區 - 使用 logo_website.png + RUMA 文字 */}
                <div className="flex-shrink-0 p-6 border-b border-slate-700/50 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-3 group">
                        <img
                            src="/logo_website.png"
                            alt="RUMA"
                            className="h-10 w-auto group-hover:scale-105 transition-transform"
                        />
                        <span
                            className="text-white font-extrabold italic text-2xl tracking-wide"
                            style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
                        >
                            RUMA<span className="text-red-500">.</span>
                        </span>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onToggle}
                        className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 導覽列表 - 可滾動區域 */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain min-h-0">
                    {navItems.map((item, index) => {
                        if (!item.visible) return null;

                        const Icon = item.icon;
                        const active = isActive(item.path, item.exact);

                        return (
                            <React.Fragment key={item.path}>
                                {/* 分隔線 */}
                                {item.dividerBefore && (
                                    <div className="my-4 border-t border-slate-700/50" />
                                )}

                                <Link
                                    to={item.path}
                                    onClick={() => {
                                        // Mobile: 點擊後關閉側邊欄
                                        if (window.innerWidth < 1024) {
                                            onToggle?.();
                                        }
                                    }}
                                    className={`
                                        flex items-center px-4 py-3 rounded-lg transition-all duration-200
                                        ${item.highlight && active
                                            ? 'bg-red-600 text-white font-bold shadow-lg'
                                            : active
                                                ? 'bg-slate-800 text-white font-medium'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon size={18} className="mr-3 flex-shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            </React.Fragment>
                        );
                    })}
                </nav>

                {/* Bug Report Button */}
                <div className="px-4 pb-2">
                    <button
                        onClick={() => setShowBugModal(true)}
                        className="w-full flex items-center px-4 py-3 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all font-bold group"
                    >
                        <MessageSquareWarning size={18} className="mr-3" />
                        <span>Bug 回報</span>
                    </button>
                </div>

                {/* 用戶資訊區 - 固定在底部 */}
                <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-[#0B1120]">
                    <div className="flex items-center space-x-3">
                        {/* Avatar - 顯示用戶上傳的頭像或預設字母 */}
                        {userProfile?.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt={displayName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-500"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold border-2 border-slate-500">
                                {avatarLetter}
                            </div>
                        )}

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                                {displayName}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-1">
                            <Link
                                to="/app/profile"
                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                                title="個人設定"
                            >
                                <Settings size={16} />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                                title="登出"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
            <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} />
        </>
    );
}
