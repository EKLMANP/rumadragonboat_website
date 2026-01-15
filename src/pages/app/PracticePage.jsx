// src/pages/app/PracticePage.jsx
// 活動報名頁面 - 整合新設計系統

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Ship, Calendar, CheckCircle, Trash2, MapPin, Clock, Filter } from 'lucide-react';
import { fetchAllData, postData, fetchActivities, fetchActivityRegistrations, fetchSeatingArrangements } from '../../api/supabaseApi';
import { generateSeating } from '../../utils/seatingLogic';
import SeatVisualizer from '../../components/SeatVisualizer';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// 活動類別定義
const ACTIVITY_CATEGORIES = [
    { value: 'boat_practice', label: '船練', color: 'bg-blue-500' },
    { value: 'team_building', label: 'Team Building', color: 'bg-green-500' },
    { value: 'race', label: '龍舟比賽', color: 'bg-red-500' },
    { value: 'internal_competition', label: '內部競賽', color: 'bg-purple-500' }
];

export default function PracticePage() {
    const { userProfile, user } = useAuth();
    const location = useLocation();

    // 狀態
    const [users, setUsers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);

    // 表單狀態
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedActivities, setSelectedActivities] = useState([]);

    // Legacy data for seating chart
    const [practiceSessions, setPracticeSessions] = useState([]);
    const [allRegs, setAllRegs] = useState([]);
    const [openDates, setOpenDates] = useState([]);
    const [seatingCharts, setSeatingCharts] = useState({}); // 🔥 Synced Seating Data

    // 從 Calendar 頁面導航過來時的預選活動
    useEffect(() => {
        if (location.state?.preselectedActivity) {
            const activity = location.state.preselectedActivity;
            // Map type to category
            const typeMap = {
                '船練': 'boat_practice',
                'Team Building': 'team_building',
                '龍舟比賽': 'race',
                '內部競賽': 'internal_competition'
            };
            setSelectedCategory(typeMap[activity.type] || 'boat_practice');
        }
    }, [location.state]);

    // 初始載入
    useEffect(() => {
        loadData();
    }, []);

    // 更新我的報名紀錄
    useEffect(() => {
        if (user && registrations.length > 0) {
            const myRegs = registrations.filter(r => r.user_id === user.id);
            setMyRegistrations(myRegs);
        }
    }, [user, registrations]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 超時保護
            const withQuickTimeout = (promise, ms = 3000, fallback = []) => {
                return Promise.race([
                    promise,
                    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
                ]);
            };

            // 只載入核心活動資料 (帶快速超時)
            const [acts, regs] = await Promise.all([
                withQuickTimeout(fetchActivities(), 3000, []),
                withQuickTimeout(fetchActivityRegistrations(), 3000, [])
            ]);

            setActivities(acts || []);
            setRegistrations(regs || []);

            // 座位表資料只在使用者需要時才載入 (不影響主頁面載入)
            // 改為輕量查詢，避免 fetchAllData 的 5 個並行請求
            setTimeout(async () => {
                try {
                    const { data: members } = await supabase
                        .from('members')
                        .select('name, email, weight, position, skill_rating')
                        .limit(50);

                    const { data: dates } = await supabase
                        .from('practice_dates')
                        .select('display_date, place, meeting_time')
                        .order('confirmed_date', { ascending: false })
                        .limit(10);

                    const { data: practiceRegs } = await supabase
                        .from('practice_registrations')
                        .select('member_name, practice_date');

                    if (members) {
                        setUsers(members.map(m => ({
                            Name: m.name,
                            Email: m.email,
                            Weight: m.weight,
                            Position: m.position,
                            Skill_Rating: m.skill_rating
                        })));
                    }

                    if (dates) {
                        const safeDates = dates.map(d => ({
                            Confirmed_date: d.display_date,
                            Confirmed_Date: d.display_date,
                            Place: d.place,
                            Meeting_Time: d.meeting_time
                        }));
                        setPracticeSessions(safeDates);
                        setOpenDates(safeDates.map(d => d.Confirmed_date).filter(Boolean));
                    }

                    setAllRegs(practiceRegs.map(r => ({
                        name: r.member_name,
                        practicedates: r.practice_date
                    })));

                    // 🔥 Fetch Synced Seating Charts (from both old practice_dates and new activities)
                    const allSeatingDates = [];

                    // Old system dates
                    if (dates && dates.length > 0) {
                        dates.forEach(d => {
                            if (d.display_date) allSeatingDates.push(d.display_date);
                        });
                    }

                    // New activities system dates (boat_practice)
                    const boatActivities = (acts || []).filter(a => a.type === 'boat_practice');
                    boatActivities.forEach(a => {
                        const formattedDate = `${a.date.replace(/-/g, '/')}(${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(a.date).getDay()]})`;
                        if (!allSeatingDates.includes(formattedDate)) {
                            allSeatingDates.push(formattedDate);
                        }
                    });

                    if (allSeatingDates.length > 0) {
                        const seatingData = await fetchSeatingArrangements(allSeatingDates);
                        setSeatingCharts(seatingData || {});
                    }

                } catch (e) {
                    console.warn('座位表資料載入失敗:', e.message);
                }
            }, 500); // 延遲 500ms 讓主要資料先顯示

        } catch (error) {
            console.error("載入資料失敗:", error);
            // 不顯示錯誤，讓頁面可以正常渲染
        } finally {
            setLoading(false);
        }
    };

    // 篩選可報名的活動 (根據選擇的類別，且未過報名截止日)
    const filteredActivities = activities.filter(act => {
        if (!selectedCategory) return false;
        if (act.type !== selectedCategory) return false;
        // 檢查是否已過截止日 (截止日當天 23:59:59 前都算有效)
        if (act.deadline) {
            const deadline = new Date(act.deadline);
            deadline.setHours(23, 59, 59, 999);
            if (deadline < new Date()) return false;
        }
        return true;
    });

    const handleActivityCheck = (activityId) => {
        if (selectedActivities.includes(activityId)) {
            setSelectedActivities(selectedActivities.filter(id => id !== activityId));
        } else {
            setSelectedActivities([...selectedActivities, activityId]);
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            Swal.fire('請先登入', '需要登入才能報名活動', 'warning');
            return;
        }
        if (selectedActivities.length === 0) {
            Swal.fire('請選擇活動', '要勾選想參加的活動喔', 'warning');
            return;
        }

        // 確認報名視窗
        const selectedActNames = activities
            .filter(a => selectedActivities.includes(a.id))
            .map(a => a.name)
            .join('\n• ');

        const result = await Swal.fire({
            title: '確認報名',
            html: `<p>您即將報名以下活動：</p><p style="text-align:left; margin-top:10px;">• ${selectedActNames}</p>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '確認報名',
            cancelButtonText: '再想想',
            confirmButtonColor: '#0ea5e9'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            // 批次報名
            for (const activityId of selectedActivities) {
                const { error } = await supabase
                    .from('activity_registrations')
                    .insert({ activity_id: activityId, user_id: user.id });

                if (error) {
                    console.error('Registration error:', error);
                }
            }

            await Swal.fire('報名成功!', '已成功報名選擇的活動', 'success');
            setSelectedActivities([]);
            loadData();
        } catch (error) {
            console.error('Submit error:', error);
            Swal.fire('報名失敗', '請稍後再試', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (registrationId, activityName) => {
        const result = await Swal.fire({
            title: `取消報名?`,
            text: `確定要取消「${activityName}」嗎？`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '確定取消',
            cancelButtonText: '再想想',
            confirmButtonColor: '#d33',
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('activity_registrations')
                    .delete()
                    .eq('id', registrationId);

                if (error) throw error;

                Swal.fire('已取消', '', 'success');
                loadData();
            } catch (error) {
                console.error('Cancel error:', error);
                Swal.fire('取消失敗', '請稍後再試', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const getCategoryLabel = (type) => {
        const cat = ACTIVITY_CATEGORIES.find(c => c.value === type);
        return cat?.label || type;
    };

    const getCategoryColor = (type) => {
        const cat = ACTIVITY_CATEGORIES.find(c => c.value === type);
        return cat?.color || 'bg-gray-500';
    };

    // 依類別分組已報名活動
    const groupedRegistrations = myRegistrations.reduce((acc, reg) => {
        const type = reg.activities?.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(reg);
        return acc;
    }, {});

    // Seating chart (for boat practice only)
    const renderSeatingCharts = () => {
        // Get boat practice activities from new system
        const boatActivities = (activities || []).filter(a => a.type === 'boat_practice');

        // Convert registrations to lookup
        const regsByActivityId = (myRegistrations || []).reduce((acc, reg) => {
            if (reg.activity_id) acc[reg.activity_id] = true;
            return acc;
        }, {});

        // Filter to only show activities user registered for
        const myBoatActivities = boatActivities.filter(a => regsByActivityId[a.id]);

        if (myBoatActivities.length === 0 && (!Array.isArray(openDates) || openDates.length === 0)) {
            return <div className="text-center text-gray-400 py-8">目前沒有船練座位資料</div>;
        }

        // Render from new activities system
        const renderedFromActivities = myBoatActivities.slice(0, 3).map(activity => {
            const formattedDate = `${activity.date.replace(/-/g, '/')}(${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(activity.date).getDay()]})`;

            // Look up synced seating chart
            const boatData = seatingCharts[formattedDate];

            if (!boatData) return null;

            return (
                <div key={activity.id} className="mb-8">
                    <SeatVisualizer
                        boatData={boatData}
                        date={formattedDate}
                        location={activity.location || ''}
                        time={activity.start_time || ''}
                    />
                </div>
            );
        }).filter(Boolean);

        if (renderedFromActivities.length > 0) {
            return renderedFromActivities;
        }

        // Fallback to old system
        return openDates.slice(0, 3).map(date => {
            const safeAllRegs = Array.isArray(allRegs) ? allRegs : [];
            const sessionInfo = practiceSessions.find(s => (s.Confirmed_date || s.Confirmed_Date) === date);
            const location = sessionInfo ? (sessionInfo.Place || sessionInfo.Location || '') : '';
            const meetingTime = sessionInfo ? (sessionInfo.Meeting_Time || sessionInfo.meeting_time || '') : '';

            const participantsNames = safeAllRegs
                .filter(r => r.practicedates === date)
                .map(r => r.name);

            if (participantsNames.length === 0) return null;

            // 🔥 Use Synced Data if available, otherwise generate locally
            const boatData = seatingCharts[date] || generateSeating(users.filter(u => participantsNames.includes(u.Name)));

            return (
                <div key={date} className="mb-8">
                    <SeatVisualizer
                        boatData={boatData}
                        date={date}
                        location={location}
                        time={meetingTime}
                    />
                </div>
            );
        });
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto">
                {/* 頁面標題 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                <Ship className="text-sky-600" /> 活動報名
                            </h1>
                            <p className="text-gray-500 mt-1">
                                報名活動以及查看槳位安排
                                <span className="text-sm text-gray-400 ml-2">
                                    (船練、Team Building、龍舟比賽以及內部競賽)
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                        >
                            🔄 重新載入
                        </button>
                    </div>
                </div>

                {/* 報名與已報名活動 */}
                <div className="grid lg:grid-cols-2 gap-8 mb-8">
                    {/* 報名區塊 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                            <Filter className="text-sky-600" /> 我要報名
                        </h2>

                        {/* 活動類別選擇 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                活動類別
                            </label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition outline-none text-gray-900"
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setSelectedActivities([]);
                                }}
                            >
                                <option value="">-- 請選擇活動類別 --</option>
                                {ACTIVITY_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* 活動選擇 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                活動
                            </label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {!selectedCategory ? (
                                    <p className="text-gray-400 text-sm py-4 text-center">
                                        請先選擇活動類別
                                    </p>
                                ) : filteredActivities.length === 0 ? (
                                    <p className="text-gray-400 text-sm py-4 text-center">
                                        目前沒有開放報名的{getCategoryLabel(selectedCategory)}活動
                                    </p>
                                ) : (
                                    filteredActivities.map(activity => {
                                        const isSelected = selectedActivities.includes(activity.id);
                                        const isAlreadyRegistered = myRegistrations.some(r => r.activity_id === activity.id);

                                        return (
                                            <label
                                                key={activity.id}
                                                className={`
                                                    flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition
                                                    ${isAlreadyRegistered
                                                        ? 'bg-green-50 border-green-300 opacity-60'
                                                        : isSelected
                                                            ? 'bg-sky-50 border-sky-500 shadow-sm'
                                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                    }
                                                `}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                                                    checked={isSelected}
                                                    disabled={isAlreadyRegistered}
                                                    onChange={() => handleActivityCheck(activity.id)}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                                        {activity.name}
                                                        {isAlreadyRegistered && (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">已報名</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} /> {activity.date}
                                                        </span>
                                                        {activity.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} /> {activity.location}
                                                            </span>
                                                        )}
                                                        {activity.start_time && (
                                                            <span className="flex items-center gap-1 text-sky-600 font-medium">
                                                                <Clock size={12} /> {activity.start_time}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* 送出按鈕 */}
                        <button
                            onClick={handleSubmit}
                            disabled={selectedActivities.length === 0}
                            className={`
                                w-full py-4 rounded-xl font-bold text-lg shadow-md transition flex justify-center items-center gap-2
                                ${selectedActivities.length === 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-sky-600 hover:bg-sky-700 text-white transform hover:scale-[1.02]'
                                }
                            `}
                        >
                            <CheckCircle size={20} /> 確定報名
                        </button>
                    </div>

                    {/* 已報名的活動區塊 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                            <Calendar className="text-orange-500" /> 已報名的活動
                        </h2>

                        {!user ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
                                <div className="text-4xl mb-3">🔐</div>
                                請先登入<br />才能看到你的報名紀錄
                            </div>
                        ) : myRegistrations.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
                                <div className="text-3xl mb-2">🏃‍♂️</div>
                                目前沒有報名任何活動
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedRegistrations).map(([type, regs]) => (
                                    <div key={type}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`w-3 h-3 rounded-full ${getCategoryColor(type)}`}></span>
                                            <span className="font-medium text-gray-700">{getCategoryLabel(type)}</span>
                                            <span className="text-xs text-gray-400">({regs.length})</span>
                                        </div>
                                        <div className="space-y-2">
                                            {regs.map((reg) => (
                                                <div
                                                    key={reg.id}
                                                    className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-200"
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-800">{reg.activities?.name}</div>
                                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={12} /> {reg.activities?.date}
                                                            </span>
                                                            {reg.activities?.location && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin size={12} /> {reg.activities.location}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCancel(reg.id, reg.activities?.name)}
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                                        title="取消報名"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 船練座位表 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        📊 船練座位表
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">
                        * 這是系統根據目前報名狀況自動預排的結果，實際座位可能由教練現場調整。
                    </p>

                    <div className="space-y-8">
                        {renderSeatingCharts()}
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-sky-100">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-sky-600 mb-4"></div>
                        <p className="font-bold text-sky-800">資料同步中...</p>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
