// src/pages/app/AnnouncementsNewsPage.jsx
// 最新公告頁 - 本月風雲榜（主要） + 最新消息（次要）

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { Megaphone, Crown, Search, Pin, ChevronRight, Loader2, Trophy, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchAnnouncements, fetchAttendance, fetchAllData, fetchMemberBasicInfo, fetchMPointLeaderboard } from '../../api/supabaseApi';
import { supabase } from '../../lib/supabase';

export default function AnnouncementsNewsPage() {
    const { lang } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // Real Data State
    const [announcements, setAnnouncements] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPageData();
    }, []);

    const loadPageData = async () => {
        setLoading(true);
        try {
            // 出席紀錄僅撈當月（排行榜只需本月）
            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const [newsData, attData, mPointLeaderboard] = await Promise.all([
                fetchAnnouncements(),
                fetchAttendance({ startDate: monthStart }),
                fetchMPointLeaderboard()
            ]);

            setAnnouncements(newsData || []);

            // Fetch members with avatar_url safely
            const members = await fetchMemberBasicInfo();

            processLeaderboard(attData, members || [], mPointLeaderboard || []);

        } catch (error) {
            console.error("Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    const processLeaderboard = (attendanceData, membersList, mPointData) => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Count monthly attendance
        const monthlyStats = {};
        attendanceData.forEach(record => {
            const dateStr = record.Date.split('(')[0].replace(/\//g, '-');
            const d = new Date(dateStr);
            if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                const name = record.Name;
                monthlyStats[name] = (monthlyStats[name] || 0) + 1;
            }
        });

        // Create M-point lookup from real data
        const mPointLookup = {};
        mPointData.forEach(m => {
            mPointLookup[m.name] = m.points || 0;
        });

        // Create member lookup for avatar
        const memberLookup = {};
        membersList.forEach(m => {
            memberLookup[m.name] = m.avatar_url || null;
        });

        // Merge: use real M-points, fall back to attendance-based if no M-point data
        const allNames = new Set([
            ...Object.keys(monthlyStats),
            ...Object.keys(mPointLookup)
        ]);

        const sorted = Array.from(allNames)
            .map(name => {
                const count = monthlyStats[name] || 0;
                const points = mPointLookup[name] || count; // Use real M-points, fallback to attendance count
                return {
                    name,
                    count,
                    points,
                    rank: 0,
                    avatar: memberLookup[name] || null
                };
            })
            .filter(item => item.points > 0 || item.count > 0)
            .sort((a, b) => b.points - a.points || b.count - a.count);

        let currentRank = 1;
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i].points < sorted[i - 1].points) {
                currentRank = i + 1;
            }
            sorted[i].rank = currentRank;
        }

        setLeaderboard(sorted.slice(0, 5));
    };

    const categories = ['all', '活動', '比賽', '裝勤', '榮譽', '其他'];

    const getTranslatedCategory = (cat) => {
        if (lang === 'zh') return cat;
        if (cat === 'all') return 'All';
        const map = {
            '活動': 'Activity',
            '比賽': 'Race',
            '裝勤': 'Equipment',
            '榮譽': 'Honor',
            '其他': 'Other'
        };
        return map[cat] || cat;
    };

    const getCategoryColor = (category) => {
        const colors = {
            '活動': 'bg-blue-100 text-blue-700',
            '比賽': 'bg-red-100 text-red-700',
            '裝勤': 'bg-green-100 text-green-700',
            '榮譽': 'bg-purple-100 text-purple-700',
        };
        return colors[category] || 'bg-gray-100 text-gray-700';
    };

    const filteredAnnouncements = announcements
        .filter(n => {
            const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    // Avatar Component
    const Avatar = ({ name, avatar, size = 'md', className = '' }) => {
        const sizes = {
            sm: 'w-8 h-8 text-xs',
            md: 'w-12 h-12 text-sm',
            lg: 'w-16 h-16 text-lg',
            xl: 'w-20 h-20 text-xl'
        };

        if (avatar) {
            return (
                <img
                    src={avatar}
                    alt={name}
                    className={`${sizes[size]} rounded-full object-cover ${className}`}
                />
            );
        }

        return (
            <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600 ${className}`}>
                {name?.[0] || '?'}
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                {/* 頁面標題 */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Megaphone className="text-red-600" />
                        {lang === 'zh' ? '最新公告' : 'Latest Announcements'}
                    </h1>
                    <p className="text-gray-500 mt-1">{lang === 'zh' ? '本月風雲榜與隊伍最新消息' : 'Monthly Leaderboard and Team News'}</p>
                </div>

                {/* 主要區域 - 風雲榜優先 */}
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* 本月風雲榜 - 佔據 3/5 寬度 */}
                    <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-8 bg-gradient-to-b from-white via-amber-50/30 to-white">
                        <h2 className="text-xl font-bold text-gray-800 mb-14 flex items-center gap-3 justify-center">
                            <Trophy className="text-yellow-500" size={28} />
                            {lang === 'zh' ? '本月風雲榜' : 'Monthly Leaderboard'}
                            <span className="text-sm font-normal text-gray-400 ml-2">
                                {new Date().getMonth() + 1}{lang === 'zh' ? '月' : ' Month'}
                            </span>
                        </h2>

                        {loading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="animate-spin text-gray-300" size={40} />
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center text-gray-400 py-16">
                                <Trophy className="mx-auto mb-4 text-gray-200" size={60} />
                                <p>{lang === 'zh' ? '本月尚無出席紀錄' : 'No attendance record this month'}</p>
                            </div>
                        ) : (
                            <>
                                {/* Podium - 凸台形式 */}
                                <div className="flex justify-center items-end gap-4 mb-10 h-64 px-4">
                                    {/* Rank 2 - 銀牌 */}
                                    {leaderboard[1] && (
                                        <div className="flex flex-col items-center animate-fade-in">
                                            <Avatar
                                                name={leaderboard[1].name}
                                                avatar={leaderboard[1].avatar}
                                                size="md"
                                                className="border-4 border-gray-300 shadow-lg mb-3"
                                            />
                                            <div className="h-24 w-20 bg-gradient-to-b from-gray-200 to-gray-400 rounded-t-xl flex flex-col items-center justify-end pb-3 shadow-lg relative">
                                                <div className="absolute -top-3 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold shadow">
                                                    🥈
                                                </div>
                                                <span className="text-3xl font-bold text-white drop-shadow">2</span>
                                            </div>
                                            <div className="text-center mt-3">
                                                <span className="text-sm font-bold text-gray-700 block">{leaderboard[1].name}</span>
                                                <span className="text-xs text-gray-500">{leaderboard[1].points} {lang === 'zh' ? 'M點' : 'M Pts'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 1 - 金牌 */}
                                    {leaderboard[0] && (
                                        <div className="flex flex-col items-center animate-fade-in z-10">
                                            <Crown size={28} className="text-yellow-500 mb-1 animate-bounce" />
                                            <Avatar
                                                name={leaderboard[0].name}
                                                avatar={leaderboard[0].avatar}
                                                size="lg"
                                                className="border-4 border-yellow-400 shadow-xl mb-3 ring-4 ring-yellow-200"
                                            />
                                            <div className="h-32 w-24 bg-gradient-to-b from-yellow-300 via-yellow-400 to-amber-500 rounded-t-xl flex flex-col items-center justify-end pb-4 shadow-xl relative">
                                                <div className="absolute -top-3 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                                                    🥇
                                                </div>
                                                <span className="text-4xl font-bold text-white drop-shadow-lg">1</span>
                                            </div>
                                            <div className="text-center mt-3">
                                                <span className="text-base font-bold text-gray-800 block">{leaderboard[0].name}</span>
                                                <span className="text-sm font-semibold text-yellow-600">{leaderboard[0].points} {lang === 'zh' ? 'M點' : 'M Pts'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 3 - 銅牌 */}
                                    {leaderboard[2] && (
                                        <div className="flex flex-col items-center animate-fade-in">
                                            <Avatar
                                                name={leaderboard[2].name}
                                                avatar={leaderboard[2].avatar}
                                                size="md"
                                                className="border-4 border-orange-300 shadow-lg mb-3"
                                            />
                                            <div className="h-20 w-20 bg-gradient-to-b from-orange-200 to-orange-400 rounded-t-xl flex flex-col items-center justify-end pb-3 shadow-lg relative">
                                                <div className="absolute -top-3 w-8 h-8 bg-orange-300 rounded-full flex items-center justify-center text-white font-bold shadow">
                                                    🥉
                                                </div>
                                                <span className="text-3xl font-bold text-white drop-shadow">3</span>
                                            </div>
                                            <div className="text-center mt-3">
                                                <span className="text-sm font-bold text-gray-700 block">{leaderboard[2].name}</span>
                                                <span className="text-xs text-gray-500">{leaderboard[2].points} {lang === 'zh' ? 'M點' : 'M Pts'}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Rank 4-5 */}
                                {leaderboard.length > 3 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-2 sm:px-8">
                                        {leaderboard.slice(3).map((item, index) => (
                                            <div key={item.name} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                                                <span className="text-lg font-bold text-gray-400 w-8">{index + 4}</span>
                                                <Avatar name={item.name} avatar={item.avatar} size="sm" className="shadow" />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-700">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.count} {lang === 'zh' ? '次出席' : (item.count === 1 ? 'Attendance' : 'Attendances')}</div>
                                                </div>
                                                <div className="text-sm font-bold text-red-500">{item.points} {lang === 'zh' ? 'M點' : 'M Pts'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* 最新消息 - 佔據 2/5 寬度 */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 flex flex-col max-h-[700px]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-800">📢 {lang === 'zh' ? '最新消息' : 'Latest News'}</h2>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 bg-white text-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                            >
                                <option value="all">{lang === 'zh' ? '所有類別' : 'All Categories'}</option>
                                {categories.slice(1).map(cat => (
                                    <option key={cat} value={cat}>{getTranslatedCategory(cat)}</option>
                                ))}
                            </select>
                        </div>

                        {/* 搜尋 */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder={lang === 'zh' ? '搜尋公告...' : 'Search announcements...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                        </div>

                        {/* 公告列表 */}
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {loading ? (
                                <div className="text-center py-10">
                                    <Loader2 className="animate-spin inline text-gray-300" />
                                </div>
                            ) : filteredAnnouncements.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">{lang === 'zh' ? '目前沒有公告' : 'No announcements found'}</div>
                            ) : (
                                filteredAnnouncements.map((news) => (
                                    <div
                                        key={news.id}
                                        onClick={() => setSelectedAnnouncement(news)}
                                        className="p-4 bg-gray-50 rounded-xl hover:bg-sky-50 transition cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    {news.pinned && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium flex items-center gap-1">
                                                            <Pin size={10} /> {lang === 'zh' ? '置頂' : 'Pinned'}
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(news.category)}`}>
                                                        {getTranslatedCategory(news.category || '一般')}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-gray-800 group-hover:text-sky-600 transition truncate">
                                                    {news.title}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(news.created_at || news.date).toLocaleDateString('zh-TW')}
                                                </p>
                                            </div>
                                            <ChevronRight className="text-gray-400 group-hover:text-sky-600 transition flex-shrink-0" size={18} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 公告詳情 Modal */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-start flex-shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    {selectedAnnouncement.pinned && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium">{lang === 'zh' ? '置頂' : 'Pinned'}</span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(selectedAnnouncement.category)}`}>
                                        {getTranslatedCategory(selectedAnnouncement.category || '一般')}
                                    </span>
                                </div>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 break-words">{selectedAnnouncement.title}</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    {new Date(selectedAnnouncement.created_at || selectedAnnouncement.date).toLocaleDateString('zh-TW')}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAnnouncement(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">
                                {selectedAnnouncement.content ? (
                                    selectedAnnouncement.content.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                                        if (part.match(/https?:\/\/[^\s]+/)) {
                                            return (
                                                <a
                                                    key={index}
                                                    href={part}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                                                >
                                                    {part}
                                                </a>
                                            );
                                        }
                                        return part;
                                    })
                                ) : (lang === 'zh' ? '無內容' : 'No content')}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-6 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                            >
                                {lang === 'zh' ? '關閉' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
