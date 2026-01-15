// src/pages/app/DashboardPage.jsx
// 會員首頁儀表板

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import { fetchActivities } from '../../api/supabaseApi';

export default function DashboardPage() {
    const { userProfile, userRoles, isManagement, isAdmin } = useAuth();
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
                // 載入活動
                const activities = await fetchActivities();
                const now = new Date();
                const upcoming = (activities || [])
                    .filter(a => new Date(a.date) >= now)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 3)
                    .map(a => ({
                        date: new Date(a.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }),
                        time: a.start_time || '待定',
                        type: a.name,
                        location: a.location || '待定'
                    }));
                setUpcomingActivities(upcoming);
            } catch (error) {
                console.error('Load error:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // 嘗試從 members 表取得真實姓名
    useEffect(() => {
        const fetchMemberName = async () => {
            if (!userProfile?.email) return;

            const { data } = await supabase
                .from('members')
                .select('name, display_name')
                .eq('email', userProfile.email)
                .maybeSingle();

            if (data) {
                setMemberName(data.display_name || data.name);
            }
        };

        fetchMemberName();
    }, [userProfile]);

    // 取得顯示名稱：優先使用 members 表的名字
    const displayName = memberName || userProfile?.name || '划手';

    // 徽章資料（未來可從資料庫讀取）
    const recentBadges = [
        { emoji: '🚣', name: '新手啟航' },
    ];

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
                                    歡迎回來，{displayName}
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    今天也要努力練習！
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
                                            {role === 'admin' ? '管理員' : role === 'management' ? '幹部' : '隊員'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/app/journey/upload"
                                className="px-5 py-3 bg-orange-500 text-white font-bold rounded-xl shadow hover:bg-orange-600 transition text-center flex items-center justify-center gap-2"
                            >
                                📸 上傳自主訓練紀錄
                            </Link>
                            <Link
                                to="/app/practice"
                                className="px-6 py-3 bg-sky-600 text-white font-bold rounded-xl shadow hover:bg-sky-700 transition text-center"
                            >
                                立即報名活動 →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-sky-600">{stats.totalPoints}</div>
                        <div className="text-gray-500 text-sm mt-1">累積M點</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">{stats.monthlyPractices}</div>
                        <div className="text-gray-500 text-sm mt-1">本月練習</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-orange-500">{stats.currentStreak}</div>
                        <div className="text-gray-500 text-sm mt-1">連續週出席</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600">{stats.rank === '-' ? '-' : `#${stats.rank}`}</div>
                        <div className="text-gray-500 text-sm mt-1">月度排名</div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* 近期活動 */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">📅 近期開放報名活動</h2>
                            <Link to="/app/calendar" className="text-sky-600 hover:underline text-sm">
                                查看全部 →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center text-gray-400 py-6">載入中...</div>
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
                                            報名
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-6">目前無開放報名的活動</div>
                            )}
                        </div>
                    </div>

                    {/* 我的M點及U幣 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">🏆 我的M點及U幣</h2>
                            <Link to="/app/points" className="text-sky-600 hover:underline text-sm">
                                查看全部 →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentBadges.length > 0 ? (
                                recentBadges.map((badge, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                                    >
                                        <span className="text-3xl">{badge.emoji}</span>
                                        <span className="font-medium text-gray-700">{badge.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-6">尚無徽章</div>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </AppLayout>
    );
}
