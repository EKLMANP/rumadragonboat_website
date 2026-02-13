// src/pages/app/DashboardPage.jsx
// 會員首頁儀表板

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import { fetchActivities, fetchAttendance, fetchUserPoints } from '../../api/supabaseApi';

export default function DashboardPage() {
    const { userProfile, userRoles, isManagement, isAdmin } = useAuth();
    const { lang, t } = useLanguage();
    const navigate = useNavigate();
    const [memberName, setMemberName] = useState(null);
    const [stats, setStats] = useState({ totalPoints: 0, monthlyPractices: 0, currentStreak: 0, rank: '-' });
    const [upcomingActivities, setUpcomingActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    // 載入資料
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. 載入活動 (近期活動)
                const activities = await fetchActivities();
                const now = new Date();
                const upcoming = (activities || [])
                    .filter(a => new Date(a.date) >= now)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 3)
                    .map(a => ({
                        date: new Date(a.date).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'numeric', day: 'numeric', weekday: 'short' }),
                        time: a.start_time || t('app_tbd'),
                        type: a.name,
                        location: a.location || t('app_tbd')
                    }));
                setUpcomingActivities(upcoming);

            } catch (error) {
                console.error('Load error:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [lang]);

    // 計算 User 統計數據 (同步 MyJourney 與 CoachPage 邏輯)
    useEffect(() => {
        const calculateStats = async () => {
            if (!userProfile?.email || !userProfile?.name) return;

            try {
                // 1. 取得 M 點 (同步 My Journey)
                const { totalPoints } = await fetchUserPoints();

                // 2. 取得出席紀錄 & 活動 (用於計算本月練習、排名、連續出席)
                // 必須載入所有人的出席紀錄以計算排名
                const [allAttendance, allActivities] = await Promise.all([
                    fetchAttendance(),
                    fetchActivities()
                ]);

                // 準備數據
                const userName = userProfile.name; // 注意：attendance table 存的是 display_name 還是 name? 通常是 member.name
                // 如果 attendance table 存的是中文名，而 userProfile.name 是英文，會對不上。
                // 這裡假設系統一致性：CoachPage 使用 member.name 進行點名。
                // 我們嘗試用 member table 的 name 來確保一致
                let targetName = userName;
                const { data: memberData } = await supabase
                    .from('members')
                    .select('name')
                    .eq('email', userProfile.email)
                    .maybeSingle();

                if (memberData) targetName = memberData.name;

                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;

                // (A) 本月練習次數
                // 邏輯：出席紀錄中，日期在當前的次數
                const myRecords = allAttendance.filter(r => r.Name === targetName);
                const monthlyRecords = myRecords.filter(r => {
                    // Date format in DB: YYYY-MM-DD or YYYY/MM/DD
                    const d = new Date(r.Date.replace(/\//g, '-'));
                    return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
                });
                const monthlyCount = monthlyRecords.length;

                // (B) 本月排名
                // 邏輯：計算所有人在本月的出席次數，排序
                const boardMap = {};
                allAttendance.forEach(r => {
                    const d = new Date(r.Date.replace(/\//g, '-'));
                    if (d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth) {
                        boardMap[r.Name] = (boardMap[r.Name] || 0) + 1;
                    }
                });

                const sortedBoard = Object.entries(boardMap)
                    .sort(([, countA], [, countB]) => countB - countA) // Count Desc
                    .map(([name, count]) => ({ name, count }));

                const myRankIndex = sortedBoard.findIndex(item => item.name === targetName);
                // 如果沒有出席紀錄，則名次為 -
                const myRank = (myRankIndex !== -1 && monthlyCount > 0) ? myRankIndex + 1 : '-';


                // (C) 連續出席 (Consecutive Attendance)
                // 邏輯：找出所有已發生的 "船練" (boat_practice) 日期，倒序檢查使用者是否出席
                // 這比單純檢查 user attendance 更嚴謹，因為能偵測缺席
                const pastPractices = allActivities
                    .filter(a => a.type === 'boat_practice' && new Date(a.date) < now) // 只看過去的船練
                    .map(a => a.date.split('(')[0].replace(/\//g, '-')) // YYYY-MM-DD
                    .sort((a, b) => new Date(b) - new Date(a)); // Descending (Latest first)

                const myAttendedDates = new Set(myRecords.map(r => r.Date.split('(')[0].replace(/\//g, '-')));

                let streak = 0;
                for (const practiceDate of pastPractices) {
                    if (myAttendedDates.has(practiceDate)) {
                        streak++;
                    } else {
                        // 斷掉了
                        break;
                    }
                }

                // (D) 總出席次數 (Total Practices) for Badge System
                const totalPractices = myRecords.length;

                setStats({
                    totalPoints: totalPoints || 0,
                    monthlyPractices: monthlyCount,
                    currentStreak: streak,
                    rank: myRank,
                    totalPractices: totalPractices
                });

            } catch (err) {
                console.error("Dashboard stats error:", err);
            }
        };

        calculateStats();
    }, [userProfile]);

    // 取得顯示名稱：優先使用 members 表的名字
    const displayName = memberName || userProfile?.name || (lang === 'zh' ? '划手' : 'Paddler');

    // 徽章系統邏輯 (Badge System Logic)
    const getBadgeInfo = (count) => {
        const isEn = lang !== 'zh';
        if (count <= 10) {
            return {
                img: '/L1.png',
                title: isEn ? 'Chill Ambassador' : '',
                text: isEn
                    ? "\"Showing up to paddle is fate. Staying home is 'spiritual practice.' My attendance vibe is chill, but my love for RUMA is REAL. 💖\""
                    : '來划船是緣分，沒來是修行，出席率隨緣，但對RUMA的愛是真的💖'
            };
        } else if (count <= 20) {
            return {
                img: '/L2.png',
                title: isEn ? 'The Accidental Hero' : '',
                text: isEn
                    ? "\"Blistered palms, raw butt... It's too late to turn back now. I'm finishing this session even if I have to do it on my knees. 💪\""
                    : '就算屁股磨破皮、手掌起水泡，回頭已經太遠，跪著也要划完💪'
            };
        } else if (count < 30) {
            return {
                img: '/L3.png',
                title: isEn ? 'Hardcore Addict' : '',
                text: isEn
                    ? "\"My hands shake on rest days. I get the urge to paddle in any body of water I see. There's no cure. Lactic acid is my only therapy now. 🔥\""
                    : '一天不划船手會抖，看到水池就想插槳，沒藥醫了，只好繼續用乳酸來治療我的熱血🔥'
            };
        } else {
            return {
                img: '/L4.png',
                title: isEn ? 'The Cyborg' : '',
                text: isEn
                    ? "\"Pain receptors: Offline. River water flows through my veins now. Maximum respect dude. 🙇‍♂️\""
                    : '酸痛神經元已麻痺，血液裡流的是碧潭的水，請受小的一拜🙇‍♂️'
            };
        }
    };

    const currentBadge = getBadgeInfo(stats.totalPractices || 0);

    // 徽章資料（未來可從資料庫讀取）
    const recentBadges = [
        { emoji: '🚣', name: t('dash_badge_newbie') },
    ];

    // Role display helper
    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return t('role_admin');
            case 'management': return t('role_management');
            default: return t('role_member');
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto">
                {/* Welcome Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* 用戶頭像 */}
                            {userProfile?.avatar_url ? (
                                <img
                                    src={userProfile.avatar_url}
                                    alt={displayName}
                                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-sky-100 shadow-lg flex-shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold border-4 border-sky-100 shadow-lg flex-shrink-0">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* 歡迎文字 */}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                    {t('dash_welcome')}{displayName}
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    {t('dash_today_msg')}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {userRoles.map(role => (
                                        <span
                                            key={role}
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${role === 'admin'
                                                ? 'bg-gray-800 text-white'
                                                : role === 'management'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-sky-100 text-sky-700'
                                                }`}
                                        >
                                            {getRoleLabel(role)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/app/journey/upload"
                                className="px-4 py-3 bg-orange-500 text-white font-bold rounded-xl shadow hover:bg-orange-600 transition text-center flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap"
                            >
                                {t('dash_upload_training')}
                            </Link>
                            <Link
                                to="/app/practice"
                                className="px-4 py-3 bg-sky-600 text-white font-bold rounded-xl shadow hover:bg-sky-700 transition text-center text-sm md:text-base whitespace-nowrap"
                            >
                                {t('dash_register_now')}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Link to="/app/points" className="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow cursor-pointer block">
                        <div className="text-3xl font-bold text-sky-600">{stats.totalPoints}</div>
                        <div className="text-gray-500 text-sm mt-1">{t('dash_total_points')}</div>
                    </Link>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{stats.monthlyPractices}</div>
                        <div className="text-gray-500 text-sm mt-1">{t('dash_monthly_practice')}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-orange-500">{stats.currentStreak}</div>
                        <div className="text-gray-500 text-sm mt-1">{t('dash_streak')}</div>
                    </div>
                    <Link to="/app/announcements" className="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow cursor-pointer block">
                        <div className="text-3xl font-bold text-purple-600">{stats.rank === '-' ? '-' : `#${stats.rank}`}</div>
                        <div className="text-gray-500 text-sm mt-1">{lang === 'zh' ? '本月風雲榜排名' : 'Monthly Billboard Rank'}</div>
                    </Link>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* 近期活動 */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{t('dash_upcoming')}</h2>
                            <Link to="/app/calendar" className="text-sky-600 hover:underline text-sm">
                                {t('app_view_all')}
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center text-gray-400 py-6">{t('app_loading')}</div>
                            ) : upcomingActivities.length > 0 ? (
                                upcomingActivities.map((practice, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-sky-50 transition"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gray-800">{practice.date}</div>
                                                <div className="text-sm text-gray-500">{practice.time}</div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-800">{practice.type}</div>
                                                <div className="text-sm text-gray-500">{practice.location}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate('/app/practice')}
                                            className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
                                        >
                                            {t('app_register')}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-6">{t('dash_no_activities')}</div>
                            )}
                        </div>
                    </div>

                    {/* 我的龍舟界稱號 (My RUMA Titles) */}

                    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col h-full">
                        <div className="flex justify-center items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{lang === 'zh' ? '我的龍舟界稱號' : 'My RUMA Titles'}</h2>
                        </div>

                        {/* 稱號徽章展示區 */}
                        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                            <div className="mb-6">
                                <img
                                    src={currentBadge.img}
                                    alt="User Badge"
                                    className="w-48 h-48 object-contain mx-auto transform hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            {currentBadge.title && (
                                <h3 className="text-2xl font-bold text-gray-800 mb-3 font-outfit">{currentBadge.title}</h3>
                            )}
                            <p className="text-gray-600 text-base font-medium leading-relaxed px-2 whitespace-pre-line">
                                {currentBadge.text}
                            </p>
                        </div>
                    </div>
                </div>


            </div>
        </AppLayout>
    );
}

