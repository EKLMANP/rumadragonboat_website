// src/components/Navbar.jsx
// 全站導覽列 - 紅黑主題設計，支援淺色/深色背景切換

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { User, Anchor, Calendar, Package, Shield, FileText, Settings, LogOut, ChevronDown, Globe, Menu, X, Home, Megaphone, Ship, MapPin, ClipboardList } from 'lucide-react';

export default function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [memberName, setMemberName] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [currentHash, setCurrentHash] = useState(window.location.hash);
    const dropdownRef = useRef(null);
    const { isAuthenticated, userProfile, signOut, isAdmin, isManagement } = useAuth();
    const { lang, toggleLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // 監聽 hash 變化來更新 active 狀態
    useEffect(() => {
        const handleHashChange = () => setCurrentHash(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        // 也監聽 popstate 以處理瀏覽器返回
        window.addEventListener('popstate', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, []);

    // 當 location 變化時同步 hash 狀態
    useEffect(() => {
        setCurrentHash(window.location.hash);
    }, [location]);

    // 判斷是否在後台頁面
    const isAppPage = location.pathname.startsWith('/app');

    // 嘗試從 members 表取得真實姓名，並從 user_metadata 取得頭像
    useEffect(() => {
        const fetchMemberData = async () => {
            if (!userProfile?.email) return;
            const { data } = await supabase
                .from('members')
                .select('name')
                .eq('email', userProfile.email)
                .maybeSingle();
            if (data) {
                setMemberName(data.name);
            }
            // 嘗試取得頭像 URL
            if (userProfile?.avatar_url) {
                setAvatarUrl(userProfile.avatar_url);
            }
        };
        if (isAuthenticated) fetchMemberData();
    }, [userProfile, isAuthenticated]);

    const displayName = memberName || userProfile?.name || '會員';

    // 點擊外部關閉下拉選單
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 監聽滾動來改變導覽列樣式
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSignOut = async () => {
        try {
            setIsDropdownOpen(false);
            setIsMobileMenuOpen(false);
            await signOut();
            navigate('/');
        } catch (error) {
            console.error('登出失敗:', error);
            // 即使出錯也導航回首頁
            navigate('/');
        }
    };

    // 檢查當前路徑是否活躍
    const isActive = (path) => location.pathname === path;

    // 根據背景決定文字顏色（後台使用淺色背景）
    const isLightBackground = isAppPage;
    const textColor = isLightBackground ? 'text-gray-900' : 'text-white';
    const textColorSecondary = isLightBackground ? 'text-gray-700' : 'text-gray-300';
    const hoverBg = isLightBackground ? 'hover:bg-gray-100' : 'hover:bg-white/10';

    // ========================================
    // 連結定義
    // ========================================

    // 公開頁面連結 (首頁 Header 顯示) - 使用錨點連結
    const publicLinks = [
        { path: '/', label: t('nav_home') },
        { path: '/#about', label: t('nav_about') },
        { path: '/#why-ruma', label: t('nav_why_ruma') },
        { path: '/news', label: t('nav_news') },
        { path: '/#contact', label: t('nav_contact') },
        { path: '/#faq', label: t('nav_faq') },
    ];

    // 會員連結 (後台 Header + 下拉選單)
    const memberLinks = [
        { path: '/app', label: lang === 'zh' ? '總覽' : 'Overview', icon: Home },
        { path: '/app/announcements', label: lang === 'zh' ? '最新公告' : 'Announcement', icon: Megaphone },
        { path: '/app/calendar', label: lang === 'zh' ? '年度日程表' : 'Annual calendar', icon: Calendar },
        { path: '/app/practice', label: lang === 'zh' ? '活動報名' : 'Event registration', icon: Ship },
        { path: '/app/journey', label: lang === 'zh' ? '我的龍舟旅程' : 'My journey', icon: MapPin },
        { path: '/app/equipment', label: lang === 'zh' ? '公用裝備查詢' : 'Team equipment', icon: Package },
        { path: '/app/profile', label: lang === 'zh' ? '個人資料' : 'Personal information', icon: User },
    ];

    // 幹部連結
    const managementLinks = [
        { path: '/app/coach', label: lang === 'zh' ? '幹部專區' : 'Management team', icon: ClipboardList },
    ];

    // 管理員連結
    const adminLinks = [
        { path: '/app/admin', label: lang === 'zh' ? '管理員專區' : 'Admin', icon: Settings },
    ];

    // 組合所有會員可見連結 (依權限)
    const getAllMemberLinks = () => {
        let links = [...memberLinks];
        if (isManagement || isAdmin) {
            links = [...links, ...managementLinks];
        }
        if (isAdmin) {
            links = [...links, ...adminLinks];
        }
        return links;
    };

    const handleDropdownItemClick = (path) => {
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
        navigate(path);
    };

    const handleLinkClick = () => {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? isLightBackground
                ? 'bg-white/95 backdrop-blur-md shadow-lg'
                : 'bg-black/95 backdrop-blur-md shadow-lg border-b border-red-900/30'
            : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center shrink-0 group">
                        <img
                            src="/Header_Footer_v2.png"
                            alt="RUMA Logo"
                            className="h-5 md:h-6 w-auto group-hover:scale-105 transition"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1 flex-nowrap">
                        {/* ========================================
                            情境 A: 首頁 - 只顯示公開連結
                        ======================================== */}
                        {!isAppPage && publicLinks.map(link => {
                            // 判斷當前是否為活躍狀態 (使用 currentHash state 確保重新渲染)
                            const isLinkActive = link.path === '/'
                                ? location.pathname === '/' && !currentHash
                                : link.path.startsWith('/#')
                                    ? location.pathname === '/' && currentHash === link.path.substring(1)
                                    : location.pathname === link.path;

                            return link.path.startsWith('/#') ? (
                                <button
                                    key={link.path}
                                    onClick={() => {
                                        const sectionId = link.path.substring(2); // 移除 '/#'
                                        const hash = `#${sectionId}`;

                                        if (location.pathname !== '/') {
                                            // 非首頁：導航到首頁並帶 hash
                                            navigate(`/${hash}`);
                                        } else {
                                            // 已在首頁：更新 hash 並滾動
                                            window.history.pushState(null, '', hash);
                                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                                            const element = document.getElementById(sectionId);
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }
                                    }}
                                    className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-lg ${isLinkActive
                                        ? 'bg-red-600 text-white'
                                        : `${textColorSecondary} hover:${textColor} ${hoverBg}`
                                        }`}
                                >
                                    {link.label}
                                </button>
                            ) : (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap rounded-lg ${isLinkActive
                                        ? 'bg-red-600 text-white'
                                        : `${textColorSecondary} hover:${textColor} ${hoverBg}`
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* ========================================
                            情境 B: 後台頁面 - 顯示會員連結
                        ======================================== */}
                        {isAppPage && isAuthenticated && (
                            <>
                                {getAllMemberLinks().map(link => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${isActive(link.path)
                                            ? 'bg-sky-600 text-white'
                                            : `${textColorSecondary} ${hoverBg}`
                                            }`}
                                    >
                                        <link.icon size={16} />
                                        {link.label}
                                    </Link>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Right Side - Auth */}
                    <div className="flex items-center gap-2 shrink-0">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                {/* Language Toggle - Authenticated */}
                                <button
                                    onClick={toggleLanguage}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${textColorSecondary} ${hoverBg}`}
                                    title={lang === 'zh' ? 'Switch to English' : '切換為中文'}
                                >
                                    <Globe size={18} />
                                    <span className="hidden sm:inline">{lang === 'zh' ? 'EN' : '中文'}</span>
                                </button>

                                {/* 圓形頭像 - 可點擊展開下拉選單 (桌面版) */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded-full transition ${hoverBg} ${isDropdownOpen ? (isLightBackground ? 'bg-gray-100' : 'bg-white/10') : ''}`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isLightBackground
                                                ? 'bg-sky-100 text-sky-700'
                                                : 'bg-red-600 text-white'
                                                }`}
                                            title={displayName}
                                        >
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <ChevronDown size={16} className={`hidden lg:block ${textColorSecondary} transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* 下拉選單 - 只在桌面版顯示 */}
                                    {isDropdownOpen && (
                                        <div className="hidden lg:block absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                                            {/* 用戶資訊 - 顯示頭像和姓名 */}
                                            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                                                {/* 頭像 */}
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center flex-shrink-0">
                                                    {avatarUrl ? (
                                                        <img src={avatarUrl} alt="頭像" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg font-bold text-sky-700">{displayName.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                {/* 姓名 */}
                                                <p className="font-bold text-gray-800 truncate">{displayName}</p>
                                            </div>

                                            {/* 選單項目 */}
                                            <div className="py-2">
                                                {getAllMemberLinks().map(link => (
                                                    <button
                                                        key={link.path}
                                                        onClick={() => handleDropdownItemClick(link.path)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${isActive(link.path)
                                                            ? 'bg-sky-50 text-sky-700 font-medium'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <link.icon size={18} className={isActive(link.path) ? 'text-sky-600' : 'text-gray-400'} />
                                                        {link.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 登出 */}
                                            <div className="border-t border-gray-100 pt-2">
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition"
                                                >
                                                    <LogOut size={18} />
                                                    {lang === 'zh' ? '登出' : 'Log out'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile 漢堡選單按鈕 - 登入用戶也能看到 */}
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className={`lg:hidden p-2 rounded-lg transition ${hoverBg}`}
                                >
                                    {isMobileMenuOpen ? (
                                        <X size={24} className={textColor} />
                                    ) : (
                                        <Menu size={24} className={textColor} />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Language Toggle */}
                                <button
                                    onClick={toggleLanguage}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${textColorSecondary} ${hoverBg}`}
                                    title={lang === 'zh' ? 'Switch to English' : '切換為中文'}
                                >
                                    <Globe size={18} />
                                    <span className="hidden sm:inline">{lang === 'zh' ? 'EN' : '中文'}</span>
                                </button>

                                {/* Login Button - 只在桌面顯示 */}
                                <Link
                                    to="/login"
                                    className="hidden lg:block px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition whitespace-nowrap"
                                >
                                    {t('btn_login')}
                                </Link>

                                {/* Mobile 漢堡選單按鈕 - 訪客也能看到 */}
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className={`lg:hidden p-2 rounded-lg transition ${hoverBg}`}
                                >
                                    {isMobileMenuOpen ? (
                                        <X size={24} className={textColor} />
                                    ) : (
                                        <Menu size={24} className={textColor} />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Menu - 漢堡選單 (訪客和登入用戶都可用) */}
                {isMobileMenuOpen && (
                    <div className={`lg:hidden max-h-[70vh] overflow-y-auto overscroll-contain pb-4 rounded-b-2xl ${isLightBackground
                        ? 'bg-white/95 backdrop-blur-md'
                        : 'bg-black/95 backdrop-blur-md'
                        }`}>
                        <div className="space-y-1 px-2">
                            {/* 公開頁面連結 */}
                            {!isAppPage && publicLinks.map(link => {
                                const isLinkActive = link.path === '/'
                                    ? location.pathname === '/' && !currentHash
                                    : link.path.startsWith('/#')
                                        ? location.pathname === '/' && currentHash === link.path.substring(1)
                                        : location.pathname === link.path;

                                return link.path.startsWith('/#') ? (
                                    <button
                                        key={link.path}
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            setIsDropdownOpen(false);
                                            const sectionId = link.path.substring(2);
                                            if (sectionId) {
                                                if (location.pathname !== '/') {
                                                    navigate('/');
                                                    setTimeout(() => {
                                                        const element = document.getElementById(sectionId);
                                                        if (element) {
                                                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }
                                                    }, 100);
                                                } else {
                                                    const element = document.getElementById(sectionId);
                                                    if (element) {
                                                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    }
                                                }
                                            }
                                        }}
                                        className={`w-full text-left block px-4 py-3 rounded-lg font-medium ${isLinkActive
                                            ? 'bg-red-600 text-white'
                                            : `${textColorSecondary} ${hoverBg}`
                                            }`}
                                    >
                                        {link.label}
                                    </button>
                                ) : (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`block px-4 py-3 rounded-lg font-medium ${isLinkActive
                                            ? 'bg-red-600 text-white'
                                            : `${textColorSecondary} ${hoverBg}`
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}

                            {/* 訪客登入按鈕 */}
                            {!isAuthenticated && !isAppPage && (
                                <>
                                    <div className={`border-t my-3 ${isLightBackground ? 'border-gray-200' : 'border-gray-700'}`}></div>
                                    <Link
                                        to="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="block px-4 py-3 rounded-lg font-medium text-center bg-red-600 text-white hover:bg-red-700 transition"
                                    >
                                        {t('btn_login')}
                                    </Link>
                                </>
                            )}

                            {/* 登入後顯示會員連結 */}
                            {isAuthenticated && (
                                <>
                                    {!isAppPage && <div className={`border-t my-3 ${isLightBackground ? 'border-gray-200' : 'border-gray-700'}`}></div>}
                                    <div className={`px-4 py-1 text-xs font-semibold uppercase tracking-wider ${isLightBackground ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {lang === 'zh' ? '會員專區' : 'Teammates'}
                                    </div>
                                    {getAllMemberLinks().map(link => (
                                        <button
                                            key={link.path}
                                            onClick={() => handleDropdownItemClick(link.path)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-left ${isActive(link.path)
                                                ? 'bg-sky-600 text-white'
                                                : `${textColorSecondary} ${hoverBg}`
                                                }`}
                                        >
                                            <link.icon size={18} />
                                            {link.label}
                                        </button>
                                    ))}

                                    {/* 登出 */}
                                    <div className={`border-t my-3 ${isLightBackground ? 'border-gray-200' : 'border-gray-700'}`}></div>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-left text-red-500 hover:bg-red-500/10"
                                    >
                                        <LogOut size={18} />
                                        {lang === 'zh' ? '登出' : 'Log out'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
