// src/pages/app/PracticePage.jsx
// 活動報名頁面 - 整合新設計系統

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Ship, Calendar, CheckCircle, Trash2, MapPin, Clock, Filter, ChevronDown } from 'lucide-react';
import { fetchAllData, postData, fetchActivities, fetchActivityRegistrations, fetchSeatingArrangements } from '../../api/supabaseApi';
import { generateSeating } from '../../utils/seatingLogic';
import SeatVisualizer from '../../components/SeatVisualizer';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

// 活動類別定義
const ACTIVITY_CATEGORIES = [
    { value: 'all', label_zh: 'All', label_en: 'All', color: 'bg-gray-500' },
    { value: 'boat_practice', label_zh: '船練', label_en: 'Boat Practice', color: 'bg-blue-500' },
    { value: 'team_building', label_zh: 'Team Building', label_en: 'Team Building', color: 'bg-green-500' },
    { value: 'race', label_zh: '龍舟比賽', label_en: 'Race', color: 'bg-red-500' },
    { value: 'internal_competition', label_zh: '內部競賽', label_en: 'Internal', color: 'bg-purple-500' }
];

export default function PracticePage() {
    const { userProfile, user } = useAuth();
    const location = useLocation();
    const { t, lang } = useLanguage();

    // 狀態
    const [users, setUsers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activityPage, setActivityPage] = useState(1); // Add pagination state

    // 表單狀態
    const [selectedCategory, setSelectedCategory] = useState('all'); // Default to All
    const [selectedActivities, setSelectedActivities] = useState([]);

    // Legacy data for seating chart
    const [practiceSessions, setPracticeSessions] = useState([]);
    const [allRegs, setAllRegs] = useState([]); // Raw registration data for auto-generation
    const [openDates, setOpenDates] = useState([]);

    // Seating Chart State
    const [seatingDate, setSeatingDate] = useState('');
    const [seatingData, setSeatingData] = useState(null);
    const [seatingLoading, setSeatingLoading] = useState(false);
    const [availableSeatingDates, setAvailableSeatingDates] = useState([]);

    // Load seating data when date changes
    useEffect(() => {
        if (seatingDate) {
            loadSeatingForDate(seatingDate);
        }
    }, [seatingDate]);

    const loadSeatingForDate = async (date) => {
        setSeatingLoading(true);
        try {
            const cleanDate = date.split('(')[0].replace(/\//g, '-').trim();

            // 1. Find the activity for this date
            const { data: activity } = await supabase
                .from('activities')
                .select('id')
                .eq('date', cleanDate)
                .eq('type', 'boat_practice')
                .maybeSingle();

            let participants = [];

            if (activity?.id) {
                // 2. Get all registrations for this activity
                const { data: regs } = await supabase
                    .from('activity_registrations')
                    .select('user_id')
                    .eq('activity_id', activity.id);

                if (regs && regs.length > 0) {
                    // 3. Get participant details from members table
                    const userIds = regs.map(r => r.user_id).filter(Boolean);

                    // Step A: Try to find members by user_id
                    const { data: membersByUserId } = userIds.length > 0
                        ? await supabase.from('members')
                            .select('name, email, weight, position, skill_rating, user_id')
                            .in('user_id', userIds)
                        : { data: [] };

                    const foundUserIds = new Set((membersByUserId || []).map(m => m.user_id));
                    const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

                    // Step B: For missing user_ids, look up their email from auth then match in members
                    let membersByEmail = [];
                    if (missingUserIds.length > 0) {
                        const { data: allAuthUsers } = await supabase.rpc('admin_list_users_with_roles');
                        const missingEmails = (allAuthUsers || [])
                            .filter(u => missingUserIds.includes(u.user_id) && u.email)
                            .map(u => u.email.toLowerCase());

                        if (missingEmails.length > 0) {
                            const { data: emailMatches } = await supabase.from('members')
                                .select('name, email, weight, position, skill_rating');
                            membersByEmail = (emailMatches || []).filter(m =>
                                m.email && missingEmails.includes(m.email.toLowerCase())
                            );
                        }
                    }

                    const allMembers = [...(membersByUserId || []), ...membersByEmail];
                    participants = allMembers.map(m => ({
                        Name: m.name || m.email || 'Unknown',
                        Weight: m.weight || 0,
                        Position: m.position || '左右',
                        Skill_Rating: m.skill_rating || 1,
                    }));
                }
            }

            // 4. Try to fetch saved arrangement snapshot
            const { data: savedData } = await supabase
                .from('seating_arrangements')
                .select('boat_data')
                .eq('practice_date', cleanDate)
                .maybeSingle();

            if (savedData?.boat_data) {
                // Validate saved data actually has paddlers
                const bd = savedData.boat_data;
                const hasLeftPaddlers = Array.isArray(bd.left) && bd.left.some(p => p !== null);
                const hasRightPaddlers = Array.isArray(bd.right) && bd.right.some(p => p !== null);
                
                if (hasLeftPaddlers || hasRightPaddlers) {
                    // Post-process: resolve any email-as-Name entries to proper member names
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    let allPaddlers = [
                        ...(bd.left || []),
                        ...(bd.right || []),
                        ...(bd.reserve || []),
                        bd.steer, bd.drummer
                    ].filter(Boolean);
                    
                    const emailNames = allPaddlers
                        .map(p => p.Name || p.name)
                        .filter(n => n && emailPattern.test(n));

                    if (emailNames.length > 0) {
                        const { data: memberLookup } = await supabase
                            .from('members')
                            .select('name, email');
                        const emailToName = {};
                        (memberLookup || []).forEach(m => {
                            if (m.email) emailToName[m.email.toLowerCase()] = m.name;
                        });

                        const fixName = (paddler) => {
                            if (!paddler) return paddler;
                            const pName = paddler.Name || paddler.name;
                            if (pName && emailPattern.test(pName)) {
                                const resolved = emailToName[pName.toLowerCase()];
                                if (resolved) {
                                    return { ...paddler, Name: resolved, name: resolved };
                                }
                            }
                            return paddler;
                        };

                        if (bd.left) bd.left = bd.left.map(fixName);
                        if (bd.right) bd.right = bd.right.map(fixName);
                        if (bd.reserve) bd.reserve = bd.reserve.map(fixName);
                        if (bd.steer) bd.steer = fixName(bd.steer);
                        if (bd.drummer) bd.drummer = fixName(bd.drummer);
                        
                        // Rebuild allPaddlers after name fixes
                        allPaddlers = [
                            ...(bd.left || []),
                            ...(bd.right || []),
                            ...(bd.reserve || []),
                            bd.steer, bd.drummer
                        ].filter(Boolean);
                    }

                    // 👉 CORE FIX: Merge late registrants into empty seats or reserve list!
                    if (!bd.reserve) bd.reserve = [];
                    const seatedNames = new Set(allPaddlers.map(p => p.Name || p.name));
                    
                    participants.forEach(participant => {
                        if (!seatedNames.has(participant.Name)) {
                            let seated = false;
                            
                            // 1. Try Steer
                            if (!bd.steer && participant.Position && participant.Position.includes('舵手')) {
                                bd.steer = participant;
                                seated = true;
                            } 
                            // 2. Try Drummer
                            else if (!bd.drummer && participant.Position && participant.Position.includes('鼓手')) {
                                bd.drummer = participant;
                                seated = true;
                            }
                            
                            // 3. Try Left
                            if (!seated && participant.Position && (participant.Position.includes('左') || participant.Position.includes('左右'))) {
                                const emptyLeftIdx = bd.left.findIndex(seat => seat === null);
                                if (emptyLeftIdx !== -1) {
                                    bd.left[emptyLeftIdx] = participant;
                                    seated = true;
                                }
                            }
                            
                            // 4. Try Right (if Left failed or only canRight)
                            if (!seated && participant.Position && (participant.Position.includes('右') || participant.Position.includes('左右'))) {
                                const emptyRightIdx = bd.right.findIndex(seat => seat === null);
                                if (emptyRightIdx !== -1) {
                                    bd.right[emptyRightIdx] = participant;
                                    seated = true;
                                }
                            }
                            
                            // 5. Fallback to Reserve
                            if (!seated && !bd.reserve.some(r => (r.Name || r.name) === participant.Name)) {
                                bd.reserve.push(participant);
                            }
                        }
                    });

                    setSeatingData(bd);
                    return;
                }
            }

            // 5. If NO saved snapshot or empty snapshot, generate brand new seating from participants!
            setSeatingData(generateSeating(participants));
        } catch (error) {
            console.error("Error loading seating:", error);
            setSeatingData(generateSeating([]));
        } finally {
            setSeatingLoading(false);
        }
    };

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
            // 只載入核心活動資料
            const [acts, regs] = await Promise.all([
                fetchActivities(true),
                fetchActivityRegistrations(false, true)
            ]);

            setActivities(acts || []);
            setRegistrations(regs || []);

            // 座位表資料只在使用者需要時才載入 (不影響主頁面載入)
            // 改為輕量查詢，避免 fetchAllData 的 5 個並行請求
            setTimeout(async () => {
                try {
                    const { data: members } = await supabase
                        .from('members')
                        .select('name, email, weight, position, skill_rating, user_id')
                        .order('name'); // Remove limit to ensure all members are loaded

                    const { data: dates } = await supabase
                        .from('practice_dates')
                        .select('display_date, place, meeting_time')
                        .order('confirmed_date', { ascending: false })
                        .limit(10);

                    const recentDates = dates ? dates.map(d => d.display_date) : [];
                    let practiceRegsQuery = supabase
                        .from('practice_registrations')
                        .select('member_name, practice_date');

                    if (recentDates.length > 0) {
                        practiceRegsQuery = practiceRegsQuery.in('practice_date', recentDates);
                    }

                    const { data: practiceRegs } = await practiceRegsQuery;

                    if (members) {
                        setUsers(members.map(m => ({
                            id: m.user_id, // Add user_id for better matching
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
                    const newSeatingDates = boatActivities
                        .map(a => `${a.date.replace(/-/g, '/')}(${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(a.date).getDay()]})`)
                        .sort(); // Sort dates

                    setAvailableSeatingDates(newSeatingDates);

                    // Set default date if available
                    if (newSeatingDates.length > 0 && !seatingDate) {
                        // Find closest upcoming date or just the first one
                        setSeatingDate(newSeatingDates[0]);
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
        if (selectedCategory && selectedCategory !== 'all') {
            if (act.type !== selectedCategory) return false;
        }

        // 檢查是否已過截止日 (截止日當天 23:59:59 前都算有效)
        if (act.deadline) {
            const deadline = new Date(act.deadline);
            deadline.setHours(23, 59, 59, 999);
            if (deadline < new Date()) return false;
        }
        return true;
    });

    // Pagination Logic
    const itemsPerPage = 5;
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const displayedActivities = filteredActivities.slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage);

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
        return lang === 'zh' ? cat?.label_zh : cat?.label_en || type;
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
            return <div className="text-center text-gray-400 py-8">{lang === 'zh' ? '目前沒有船練座位資料' : 'No seating data available'}</div>;
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
                                <Ship className="text-sky-600" /> {t('prac_title')}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {lang === 'zh' ? '報名活動以及查看槳位安排' : 'Register for activities and view seating'}
                                <span className="text-sm text-gray-400 ml-2">
                                    ({lang === 'zh' ? '船練、Team Building、龍舟比賽以及內部競賽' : 'Practice, Team Building, Races, Internal'})
                                </span>
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                        >
                            🔄 {lang === 'zh' ? '重新載入' : 'Reload'}
                        </button>
                    </div>
                </div>

                {/* 報名與已報名活動 */}
                <div className="grid lg:grid-cols-2 gap-8 mb-8">
                    {/* 報名區塊 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                            <Filter className="text-sky-600" /> {lang === 'zh' ? '我要報名' : 'Register'}
                        </h2>

                        {/* 活動類別選擇 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {lang === 'zh' ? '活動類別' : 'Activity Type'}
                            </label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition outline-none text-gray-900"
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setSelectedActivities([]);
                                    setActivityPage(1); // Reset page
                                }}
                            >
                                {ACTIVITY_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{lang === 'zh' ? cat.label_zh : cat.label_en}</option>
                                ))}
                            </select>
                        </div>

                        {/* 活動選擇 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {lang === 'zh' ? '活動' : 'Activities'}
                            </label>
                            <div className="space-y-2 min-h-[300px]">
                                {filteredActivities.length === 0 ? (
                                    <p className="text-gray-400 text-sm py-4 text-center">
                                        {lang === 'zh' ? `目前沒有開放報名的活動` : `No activities available`}
                                    </p>
                                ) : (
                                    <>
                                        {displayedActivities.map(activity => {
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
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{lang === 'zh' ? '已報名' : 'Registered'}</span>
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
                                        })}

                                        {/* Pagination Controls */}
                                        {filteredActivities.length > itemsPerPage && (
                                            <div className="flex items-center justify-end gap-3 mt-4 pt-2">
                                                <button
                                                    onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                                    disabled={activityPage === 1}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    &lt;
                                                </button>
                                                <span className="text-sm text-gray-500">
                                                    {activityPage} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={activityPage >= totalPages}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    &gt;
                                                </button>
                                            </div>
                                        )}
                                    </>
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
                            <CheckCircle size={20} /> {lang === 'zh' ? '確定報名' : 'Confirm Registration'}
                        </button>
                    </div>

                    {/* 已報名的活動區塊 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                            <Calendar className="text-orange-500" /> {lang === 'zh' ? '已報名的活動' : 'Registered Activities'}
                        </h2>

                        {!user ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
                                <div className="text-4xl mb-3">🔐</div>
                                {lang === 'zh' ? <>請先登入<br />才能看到你的報名紀錄</> : <>Please login<br />to view your registrations</>}
                            </div>
                        ) : myRegistrations.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
                                <div className="text-3xl mb-2">🏃‍♂️</div>
                                {lang === 'zh' ? '目前沒有報名任何活動' : 'No registered activities'}
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                📊 {lang === 'zh' ? '船練座位表' : 'Seating Chart'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {lang === 'zh' ? '* 這是系統根據目前報名狀況自動預排或教練已確認的結果。' : '* This is an auto-generated preview or a confirmed arrangement by coaches.'}
                            </p>
                        </div>

                        {/* 日期選擇器 */}
                        <div className="relative">
                            <select
                                value={seatingDate}
                                onChange={(e) => setSeatingDate(e.target.value)}
                                className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 pr-8"
                            >
                                {availableSeatingDates.length === 0 && <option value="">{lang === 'zh' ? '暫無船練' : 'No Practice'}</option>}
                                {availableSeatingDates.map(date => (
                                    <option key={date} value={date}>{date}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {seatingLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                            <p className="text-gray-500">{lang === 'zh' ? '載入座位表中...' : 'Loading chart...'}</p>
                        </div>
                    ) : (
                        <SeatVisualizer
                            boatData={seatingData}
                            date={seatingDate}
                            isEditable={false}
                        />
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-sky-100">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-sky-600 mb-4"></div>
                        <p className="font-bold text-sky-800">{lang === 'zh' ? '資料同步中...' : 'Loading...'}</p>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
