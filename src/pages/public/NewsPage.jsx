// src/pages/public/NewsPage.jsx
// RUMA 龍舟隊最新消息列表頁

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchNews } from '../../api/supabaseApi';
import { Search, ChevronRight, ChevronLeft, Pin, Loader2 } from 'lucide-react';

// 分類標籤配置
const CATEGORIES = [
    { id: 'all', label: '全部', labelEn: 'All' },
    { id: '體驗招募', label: '體驗招募', labelEn: 'Recruitment' },
    { id: '比賽消息', label: '比賽消息', labelEn: 'Race' },
    { id: '團隊活動', label: '團隊活動', labelEn: 'Team Activity' },
    { id: '運動相關', label: '運動相關', labelEn: 'Training' },
    { id: '其他', label: '其他', labelEn: 'Others' }
];

export default function NewsPage() {
    const { lang } = useLanguage();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 3; // 3x3 grid

    // Debounce 搜尋
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 載入最新消息
    useEffect(() => {
        setCurrentPage(1); // Reset page when filters change
        loadNews();
    }, [selectedCategory, debouncedSearch]);

    const loadNews = async () => {
        setLoading(true);
        const data = await fetchNews({
            category: selectedCategory,
            search: debouncedSearch
        });
        setNews(data);
        setLoading(false);
    };

    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // 分離置頂和普通文章
    const pinnedNews = news.filter(n => n.is_pinned);
    const regularNews = news.filter(n => !n.is_pinned);

    // Pagination logic for regular news
    const totalPages = Math.ceil(regularNews.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedNews = regularNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const goToPage = (page) => {
        const totalPages = Math.ceil(news.length / ITEMS_PER_PAGE);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Scroll to top of news section
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] font-sans">
            <Navbar />

            {/* Hero Banner */}
            <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/Landing page 1.jpg"
                        alt="RUMA Dragon Boat"
                        className="w-full h-full object-cover"
                        style={{ filter: 'brightness(0.3)' }}
                        onError={(e) => { e.target.src = '/banner.jpg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#0a0a0a]" />
                </div>

                {/* Title */}
                <div className="relative z-10 text-center px-4">
                    <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl uppercase tracking-tighter text-white mb-4">
                        {lang === 'zh' ? '最新消息' : 'LATEST NEWS'}
                    </h1>
                    <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                        {lang === 'zh'
                            ? '掌握 RUMA 龍舟隊的最新動態與精彩回顧'
                            : 'Stay updated with RUMA Dragon Boat Team'
                        }
                    </p>
                </div>
            </section>

            {/* Filter & Search Bar */}
            <section className="sticky top-16 md:top-20 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Category Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    {lang === 'zh' ? cat.label : cat.labelEn}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-72">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={lang === 'zh' ? '搜尋消息...' : 'Search news...'}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* News Grid */}
            <section className="py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={40} className="animate-spin text-red-500" />
                        </div>
                    ) : news.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-400">
                                {lang === 'zh' ? '目前沒有相關消息' : 'No news found'}
                            </h3>
                        </div>
                    ) : (
                        <>
                            {/* Unified News Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {news.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(item => (
                                    <NewsCard
                                        key={item.id}
                                        item={item}
                                        lang={lang}
                                        formatDate={formatDate}
                                        isPinned={item.is_pinned}
                                    />
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {Math.ceil(news.length / ITEMS_PER_PAGE) > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-12">
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${currentPage === 1
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-800 text-white hover:bg-gray-700'
                                            }`}
                                    >
                                        <ChevronLeft size={18} />
                                        {lang === 'zh' ? '上一頁' : 'Previous'}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: Math.ceil(news.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${currentPage === page
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === Math.ceil(news.length / ITEMS_PER_PAGE)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${currentPage === Math.ceil(news.length / ITEMS_PER_PAGE)
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-800 text-white hover:bg-gray-700'
                                            }`}
                                    >
                                        {lang === 'zh' ? '下一頁' : 'Next'}
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#0a0a0a] text-white py-8 px-4 border-t border-gray-800">
                <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} RUMA Dragon Boat Team. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

// 新聞卡片元件
function NewsCard({ item, lang, formatDate, isPinned }) {
    const displayTitle = (lang === 'en' && item.title_en) ? item.title_en : item.title;
    const displayExcerpt = (lang === 'en' && item.excerpt_en) ? item.excerpt_en : item.excerpt;

    const categoryObj = CATEGORIES.find(c => c.id === item.category);
    const displayCategory = categoryObj ? (lang === 'zh' ? categoryObj.label : categoryObj.labelEn) : item.category;

    return (
        <Link
            to={`/news/${item.slug}`}
            className="group block bg-[#171717] rounded-xl overflow-hidden border border-gray-800 hover:border-red-600/50 transition-all duration-300 hover:-translate-y-1"
        >
            {/* Cover Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {item.cover_image ? (
                    <img
                        src={item.cover_image}
                        alt={displayTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <span className="text-4xl opacity-30">🚣</span>
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase rounded">
                        {displayCategory}
                    </span>
                </div>

                {/* Pinned Badge */}
                {isPinned && (
                    <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded flex items-center gap-1">
                            <Pin size={12} />
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="font-display font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                    {displayTitle}
                </h3>

                {displayExcerpt && (
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                        {displayExcerpt}
                    </p>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">
                        {formatDate(item.published_at)}
                    </span>
                    <span className="text-red-500 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        {lang === 'zh' ? '閱讀更多' : 'Read More'}
                        <ChevronRight size={16} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
