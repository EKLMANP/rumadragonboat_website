// src/pages/app/AnnouncementsPage.jsx
// RUMA 最新公告與賽程頁面

import React, { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    ChevronLeft,
    ChevronRight,
    Trophy,
    Clock,
    MapPin,
    Info,
    CheckCircle,
    X,
    Users
} from 'lucide-react';

// 活動類型配置
const eventTypes = {
    race: {
        color: 'bg-red-50 text-red-700 border-l-4 border-red-600',
        icon: '🏁',
        label: '主要賽事',
        points: 2,
        dotColor: 'bg-red-600',
        badge: 'bg-red-100 text-red-700',
        headerBg: 'bg-red-50'
    },
    training: {
        color: 'bg-slate-50 text-slate-700 border-l-4 border-slate-600',
        icon: '💪',
        label: '訓練計劃',
        points: 2,
        dotColor: 'bg-slate-600',
        badge: 'bg-slate-100 text-slate-700',
        headerBg: 'bg-slate-100'
    },
    social: {
        color: 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-500',
        icon: '🎉',
        label: 'Team Building',
        points: 1,
        dotColor: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700',
        headerBg: 'bg-emerald-50'
    },
    campaign: {
        color: 'bg-violet-50 text-violet-700 border-l-4 border-violet-500',
        icon: '🔥',
        label: '內部競賽',
        points: 1,
        dotColor: 'bg-violet-500',
        badge: 'bg-violet-100 text-violet-700',
        headerBg: 'bg-violet-50'
    },
    recruiting: {
        color: 'bg-amber-50 text-amber-700 border-l-4 border-amber-500',
        icon: '📢',
        label: '招募活動',
        points: 0,
        dotColor: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-700',
        headerBg: 'bg-amber-50'
    }
};

// Mock 資料
const initialEvents = [
    {
        id: 1,
        date: '2026-01-10',
        title: '船練',
        type: 'training',
        time: '08:00 - 11:00',
        location: '碧潭東岸',
        description: '針對新進隊員的基礎划頻調整，請穿著隊服。',
        registered: false
    },
    {
        id: 2,
        date: '2026-01-11',
        title: '龍舟體驗日 (招募)',
        type: 'recruiting',
        time: '09:00 - 16:00',
        location: '大佳河濱公園',
        description: '2026年度首場公開招募，請隊員協助轉發 IG 限動。',
        registered: false
    },
    {
        id: 3,
        date: '2026-01-17',
        title: '減脂大賽: 初始測量',
        type: 'campaign',
        time: '10:00 - 12:00',
        location: 'RUMA 基地',
        description: '為期三個月的減脂挑戰開始！現場測量 InBody。',
        registered: false
    },
    {
        id: 4,
        date: '2026-01-24',
        title: '冬季長距離耐力練',
        type: 'training',
        time: '07:30 - 11:30',
        location: '碧潭',
        description: '備戰城市盃，今日課表為 500m x 10 趟。',
        registered: false
    },
    {
        id: 5,
        date: '2026-01-31',
        title: 'RUMA 年度春酒',
        type: 'social',
        time: '18:00 - 21:30',
        location: '金色三麥 信義店',
        description: '辛苦了一年，大家一起來吃喝！當天有抽獎活動。',
        registered: false
    },
    {
        id: 6,
        date: '2026-02-14',
        title: '情人節特訓',
        type: 'training',
        time: '08:00 - 11:00',
        location: '碧潭',
        description: '一起在水上度過浪漫的情人節！',
        registered: false
    }
];

const leaderboardData = [
    { id: 1, name: 'Sarah Chen', points: 42 },
    { id: 2, name: 'Mike Wang', points: 38 },
    { id: 3, name: 'David Li', points: 35 },
    { id: 4, name: 'Jenny Wu', points: 28 },
    { id: 5, name: 'Tom Lin', points: 22 }
];

export default function AnnouncementsPage() {
    const { lang } = useLanguage();
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
    const [events, setEvents] = useState(initialEvents);
    const [userRegisteredEvents, setUserRegisteredEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, event: null });

    // 導航函數
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
    };

    // 報名邏輯
    const initiateAction = (event) => {
        if (event.registered) {
            setSelectedEvent(null);
            setConfirmModal({ isOpen: true, type: 'cancel', event });
        } else {
            setSelectedEvent(null);
            setConfirmModal({ isOpen: true, type: 'register', event });
        }
    };

    const executeAction = () => {
        const { type, event } = confirmModal;
        const isRegistering = type === 'register';

        const updatedEvents = events.map(e =>
            e.id === event.id ? { ...e, registered: isRegistering } : e
        );
        setEvents(updatedEvents);

        if (isRegistering) {
            setUserRegisteredEvents([...userRegisteredEvents, { ...event, registered: true }]);
        } else {
            setUserRegisteredEvents(userRegisteredEvents.filter(e => e.id !== event.id));
        }
        setConfirmModal({ isOpen: false, type: null, event: null });
    };

    // 渲染日曆格子
    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/50 border-b border-r border-gray-100"></div>
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);

            days.push(
                <div
                    key={day}
                    className="h-24 md:h-32 bg-white border-b border-r border-gray-100 p-2 relative hover:bg-slate-50 transition-colors"
                >
                    <span className={`text-sm font-bold ${dayEvents.some(e => e.type === 'race') ? 'text-red-600' : 'text-slate-500'}`}>
                        {day}
                    </span>
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[65px] md:max-h-[85px]">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`
                                    text-xs p-1.5 rounded cursor-pointer truncate shadow-sm hover:shadow-md transition-all
                                    ${eventTypes[event.type].color}
                                    flex items-center justify-between font-medium
                                `}
                            >
                                <span className="truncate">{event.title}</span>
                                {event.registered && <CheckCircle size={12} className="text-emerald-600 ml-1 flex-shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    // 渲染年度總覽
    const renderYearGrid = () => {
        const year = currentDate.getFullYear();
        const months = lang === 'zh'
            ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
                {months.map((m, idx) => {
                    const monthEvents = events.filter(e => {
                        const d = new Date(e.date);
                        return d.getFullYear() === year && d.getMonth() === idx;
                    });

                    return (
                        <div
                            key={idx}
                            onClick={() => { setCurrentDate(new Date(year, idx, 1)); setViewMode('month'); }}
                            className="border border-slate-200 rounded-lg p-4 hover:shadow-lg hover:border-red-200 cursor-pointer bg-white transition-all group"
                        >
                            <div className="font-bold text-slate-700 mb-3 group-hover:text-red-600 transition-colors">{m}</div>
                            <div className="flex flex-wrap gap-1.5">
                                {monthEvents.map(e => (
                                    <div key={e.id} className={`w-2.5 h-2.5 rounded-full ${eventTypes[e.type].dotColor}`}></div>
                                ))}
                                {monthEvents.length === 0 && <span className="text-xs text-gray-300">-</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                {/* 日曆主區域 */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {/* 日曆 Header */}
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between bg-white gap-2">
                        <div className="flex items-center space-x-3">
                            {viewMode === 'month' && (
                                <>
                                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-xl md:text-2xl font-extrabold text-slate-900 w-36 md:w-44 text-center tracking-tight">
                                        {lang === 'zh' ? `${currentDate.getFullYear()} 年 ${currentDate.getMonth() + 1} 月` : `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`}
                                    </span>
                                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                            {viewMode === 'year' && (
                                <div className="flex items-center space-x-4">
                                    <span className="text-xl md:text-2xl font-extrabold text-slate-900">
                                        {lang === 'zh' ? `${currentDate.getFullYear()} 年度總覽` : `${currentDate.getFullYear()} Overview`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-3 items-center">
                            <select
                                value={currentDate.getFullYear()}
                                onChange={handleYearChange}
                                className="text-sm font-medium text-slate-700 border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 bg-white py-2 px-3"
                            >
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                            </select>

                            <div className="bg-slate-100 rounded-lg p-1 flex border border-slate-200">
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`px-4 py-1.5 text-sm rounded-md transition-all font-bold ${viewMode === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {lang === 'zh' ? '月' : 'Month'}
                                </button>
                                <button
                                    onClick={() => setViewMode('year')}
                                    className={`px-4 py-1.5 text-sm rounded-md transition-all font-bold ${viewMode === 'year' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {lang === 'zh' ? '年' : 'Year'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 圖例 */}
                    {viewMode === 'year' && (
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4">
                            {Object.entries(eventTypes).map(([key, value]) => (
                                <div key={key} className="flex items-center text-xs font-medium text-slate-600">
                                    <div className={`w-2.5 h-2.5 rounded-full mr-1.5 ${value.dotColor}`}></div>
                                    {value.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'month' ? (
                        <>
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                                {(lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(day => (
                                    <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 bg-slate-50/50 gap-px border-b border-slate-200 flex-1">
                                {renderCalendarGrid()}
                            </div>
                        </>
                    ) : (
                        renderYearGrid()
                    )}
                </div>

                {/* 右側欄 */}
                <div className="space-y-6">
                    {/* 本月風雲榜 */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 flex items-center">
                                <Trophy size={18} className="text-amber-500 mr-2" />
                                {lang === 'zh' ? '本月風雲榜' : 'Monthly Leaderboard'}
                            </h3>
                            <span className="text-xs text-slate-500 font-bold cursor-pointer hover:text-red-600 transition-colors">
                                {lang === 'zh' ? '查看全部' : 'View All'}
                            </span>
                        </div>
                        <ul className="divide-y divide-slate-50">
                            {leaderboardData.map((user, index) => (
                                <li key={user.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm
                                            ${index === 0 ? 'bg-amber-400' :
                                                index === 1 ? 'bg-slate-400' :
                                                    index === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-600'}`}
                                        >
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-red-600">{user.points} M</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 我的近期報名 */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-900 mb-3 text-sm flex items-center">
                            <Users size={16} className="mr-2 text-slate-500" />
                            {lang === 'zh' ? '我的近期報名' : 'My Recent Registrations'}
                        </h3>
                        <div className="space-y-2 mb-4">
                            {userRegisteredEvents.slice(0, 3).map(e => (
                                <div key={e.id} className="text-xs p-2.5 bg-slate-50 rounded border border-slate-100 truncate flex items-center text-slate-700">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${eventTypes[e.type].dotColor}`}></div>
                                    {e.date} {e.title}
                                </div>
                            ))}
                            {userRegisteredEvents.length === 0 && (
                                <span className="text-xs text-slate-400 block text-center py-2">{lang === 'zh' ? '尚無報名' : 'No registrations'}</span>
                            )}
                        </div>
                        <a
                            href="/app/journey"
                            className="w-full py-2.5 text-xs font-bold text-center text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors block"
                        >
                            {lang === 'zh' ? '前往「我的龍舟旅程」' : 'Go to My Journey'}
                        </a>
                    </div>
                </div>
            </div>

            {/* 活動詳情 Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative ring-1 ring-slate-900/5">
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-slate-100 rounded-full transition-colors shadow-sm cursor-pointer text-slate-500 hover:text-slate-800"
                        >
                            <X size={20} />
                        </button>

                        <div className={`p-6 ${eventTypes[selectedEvent.type].headerBg} relative border-b border-slate-100`}>
                            <div className="flex items-center space-x-2 mb-3 mt-2">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${eventTypes[selectedEvent.type].badge}`}>
                                    {eventTypes[selectedEvent.type].label}
                                </span>
                                {eventTypes[selectedEvent.type].points > 0 && (
                                    <span className="text-xs font-bold px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-md flex items-center shadow-sm">
                                        <Trophy size={12} className="mr-1" />
                                        +{eventTypes[selectedEvent.type].points} {lang === 'zh' ? 'M 點' : 'M Pts'}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight pr-8">
                                {selectedEvent.title}
                            </h2>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex items-start space-x-4 text-slate-600">
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm mb-0.5">{lang === 'zh' ? '時間' : 'Time'}</p>
                                    <p className="text-sm font-medium">{selectedEvent.date}</p>
                                    <p className="text-sm font-medium">{selectedEvent.time}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 text-slate-600">
                                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm mb-0.5">{lang === 'zh' ? '地點' : 'Location'}</p>
                                    <p className="text-sm font-medium">{selectedEvent.location}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-start space-x-2">
                                    <Info size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                        {selectedEvent.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors text-sm"
                            >
                                {lang === 'zh' ? '關閉' : 'Close'}
                            </button>

                            {selectedEvent.type !== 'recruiting' && (
                                <button
                                    onClick={() => initiateAction(selectedEvent)}
                                    className={`
                                        px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center transition-all
                                        ${selectedEvent.registered
                                            ? 'bg-white text-red-600 border-2 border-red-100 hover:border-red-200 hover:bg-red-50'
                                            : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
                                        }
                                    `}
                                >
                                    {selectedEvent.registered ? (
                                        <><X size={16} className="mr-2" /> {lang === 'zh' ? '取消報名' : 'Cancel Registration'}</>
                                    ) : (
                                        <><CheckCircle size={16} className="mr-2" /> {lang === 'zh' ? '立即報名' : 'Register Now'}</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 確認 Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
                        <div className="p-6 text-center">
                            <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${confirmModal.type === 'cancel' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {confirmModal.type === 'cancel' ? <X size={28} /> : <CheckCircle size={28} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {confirmModal.type === 'cancel'
                                    ? (lang === 'zh' ? '確定要取消報名嗎？' : 'Cancel Registration?')
                                    : (lang === 'zh' ? '確認報名此活動？' : 'Confirm Registration?')
                                }
                            </h3>
                            <p className="text-sm text-slate-500 font-medium px-4">
                                {confirmModal.type === 'cancel'
                                    ? (lang === 'zh'
                                        ? `您正在取消「${confirmModal.event?.title}」。取消後可能無法獲得 M 點獎勵。`
                                        : `You are cancelling "${confirmModal.event?.title}". You may lose M Points.`)
                                    : (lang === 'zh'
                                        ? `您即將報名「${confirmModal.event?.title}」。`
                                        : `You are registering for "${confirmModal.event?.title}".`)
                                }
                            </p>
                        </div>
                        <div className="bg-slate-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-100">
                            <button
                                type="button"
                                onClick={executeAction}
                                className={`w-full inline-flex justify-center rounded-lg shadow-sm px-4 py-2.5 text-sm font-bold text-white sm:ml-3 sm:w-auto transition-all ${confirmModal.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {confirmModal.type === 'cancel'
                                    ? (lang === 'zh' ? '確認取消' : 'Confirm')
                                    : (lang === 'zh' ? '確認報名' : 'Confirm')
                                }
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2.5 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 sm:mt-0 sm:ml-3 sm:w-auto"
                            >
                                {lang === 'zh' ? '再想想' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
