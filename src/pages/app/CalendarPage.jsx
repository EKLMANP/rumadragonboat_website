// src/pages/app/CalendarPage.jsx
// 年度日程表頁 - 日曆視圖 + hover活動資訊 + 報名按鈕

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Ship, X } from 'lucide-react';
import { fetchActivities, fetchActivityRegistrations } from '../../api/supabaseApi';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CalendarPage() {
    const navigate = useNavigate();
    const { t, lang } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [activities, setActivities] = useState([]);
    const [registeredEvents, setRegisteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [acts, regs] = await Promise.all([
                fetchActivities(),
                fetchActivityRegistrations()
            ]);
            setActivities(acts || []);
            setRegisteredEvents(regs || []);
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    // 從 API 取得的活動資料
    const getEventType = (type) => {
        const types = {
            'boat_practice': lang === 'zh' ? '船練' : 'Boat Practice',
            'team_building': 'Team Building',
            'race': lang === 'zh' ? '龍舟比賽' : 'Dragon Boat Race',
            'internal_competition': lang === 'zh' ? '內部競賽' : 'Internal Competition'
        };
        return types[type] || type;
    };

    const allEvents = activities.map(a => ({
        id: a.id,
        date: a.date,
        type: getEventType(a.type),
        title: a.name,
        location: a.location || t('type_tbd'),
        time: a.start_time || t('type_tbd'),
        description: a.description
    }));

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getEventTypeColor = (type) => {
        const colors = {
            '龍舟比賽': 'bg-red-500',
            'Dragon Boat Race': 'bg-red-500',
            '船練': 'bg-blue-500',
            'Boat Practice': 'bg-blue-500',
            'Team Building': 'bg-green-500',
            '內部競賽': 'bg-purple-500',
            'Internal Competition': 'bg-purple-500',
        };
        return colors[type] || 'bg-gray-500';
    };

    const getEventsForDate = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return allEvents.filter(e => e.date === dateStr);
    };

    const handleEventClick = (event, e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top
        });
        setSelectedEvent(event);
    };

    const handleClosePopup = () => {
        setSelectedEvent(null);
    };

    const handleRegisterClick = (event) => {
        handleClosePopup();
        // 導向活動報名頁並附帶活動資訊
        navigate('/app/practice', { state: { preselectedActivity: event } });
    };

    const monthNames = t('cal_months');
    const dayNames = t('cal_days');
    const yearSuffix = t('cal_year_suffix');

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto">
                {/* 頁面標題 */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Calendar className="text-sky-600" />
                        {t('cal_title')}
                    </h1>
                    <p className="text-gray-500 mt-1">{t('cal_desc')}</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 日曆視圖 */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 relative">
                        {/* 月份導航 + 年月選擇器 */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex items-center gap-2">
                                {/* 年份選擇 */}
                                <select
                                    value={year}
                                    onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                                >
                                    {Array.from({ length: 10 }, (_, i) => 2024 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>

                                {/* 月份選擇 */}
                                <select
                                    value={month}
                                    onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-800 font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                                >
                                    {monthNames.map((name, idx) => (
                                        <option key={idx} value={idx}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* 星期標題 */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 日期格子 */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, index) => {
                                const events = day ? getEventsForDate(day) : [];
                                const isToday = day === new Date().getDate() &&
                                    month === new Date().getMonth() &&
                                    year === new Date().getFullYear();

                                return (
                                    <div
                                        key={index}
                                        className={`min-h-[80px] p-1 border border-gray-100 rounded-lg ${day ? 'hover:bg-gray-50' : ''} ${isToday ? 'bg-sky-50 border-sky-200' : ''}`}
                                    >
                                        {day && (
                                            <>
                                                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-sky-600' : 'text-gray-700'}`}>
                                                    {day}
                                                </div>
                                                <div className="space-y-1">
                                                    {events.slice(0, 2).map((event, i) => (
                                                        <div
                                                            key={event.id || i}
                                                            onClick={(e) => handleEventClick(event, e)}
                                                            className={`text-xs px-1.5 py-1 rounded text-white truncate cursor-pointer ${getEventTypeColor(event.type)} hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 transition-all`}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {events.length > 2 && (
                                                        <div className="text-xs text-gray-500">+{events.length - 2}</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 圖例 */}
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                            {[
                                lang === 'zh' ? '船練' : 'Boat Practice',
                                'Team Building',
                                lang === 'zh' ? '龍舟比賽' : 'Dragon Boat Race',
                                lang === 'zh' ? '內部競賽' : 'Internal Competition'
                            ].map(type => (
                                <div key={type} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded ${getEventTypeColor(type)}`}></div>
                                    <span className="text-sm text-gray-600">{type}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 開放報名的活動 */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">{t('cal_open_activities')}</h2>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loading ? (
                                <div className="text-center text-gray-400 py-6">{t('cal_loading')}</div>
                            ) : allEvents.length > 0 ? (
                                [...allEvents]
                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                    .filter(event => new Date(event.date) >= new Date(new Date().toDateString()))
                                    .map((event) => {
                                        // 根據類別決定底色
                                        const bgColorMap = {
                                            '龍舟比賽': 'bg-red-50 border-l-4 border-red-500',
                                            'Dragon Boat Race': 'bg-red-50 border-l-4 border-red-500',
                                            '船練': 'bg-blue-50 border-l-4 border-blue-500',
                                            'Boat Practice': 'bg-blue-50 border-l-4 border-blue-500',
                                            'Team Building': 'bg-green-50 border-l-4 border-green-500',
                                            '內部競賽': 'bg-purple-50 border-l-4 border-purple-500',
                                            'Internal Competition': 'bg-purple-50 border-l-4 border-purple-500',
                                        };
                                        const bgClass = bgColorMap[event.type] || 'bg-gray-50 border-l-4 border-gray-400';

                                        return (
                                            <div
                                                key={event.id}
                                                className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition ${bgClass}`}
                                                onClick={(e) => handleEventClick(event, e)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-medium text-gray-800">{event.title}</div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${getEventTypeColor(event.type)}`}>
                                                        {event.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        <span>{event.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        <span>{event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center text-gray-400 py-6">{t('cal_no_activities')}</div>
                            )}
                        </div>

                        <Link
                            to="/app/practice"
                            className="block mt-4 text-center py-3 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition"
                        >
                            <Ship size={16} className="inline mr-2" />
                            {t('cal_go_register')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* 點擊顯示活動資訊卡片 */}
            {selectedEvent && (
                <>
                    {/* 背景遮罩 - 點擊關閉 */}
                    <div
                        className="fixed inset-0 z-40 bg-black/20"
                        onClick={handleClosePopup}
                    />
                    <div
                        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 p-4 transform -translate-x-1/2 -translate-y-full -mt-2"
                        style={{
                            left: Math.min(Math.max(popupPosition.x, 170), window.innerWidth - 170),
                            top: Math.max(popupPosition.y, 220)
                        }}
                    >
                        {/* 關閉按鈕 */}
                        <button
                            onClick={handleClosePopup}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-start justify-between mb-3 pr-6">
                            <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getEventTypeColor(selectedEvent.type)}`}>
                                {selectedEvent.type}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg mb-3">{selectedEvent.title}</h3>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <span>{selectedEvent.date} {selectedEvent.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-gray-400" />
                                <span>{selectedEvent.location}</span>
                            </div>
                            {selectedEvent.description && (
                                <p className="text-gray-500 text-xs mt-2 line-clamp-2">{selectedEvent.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => handleRegisterClick(selectedEvent)}
                            className="w-full py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                            <Ship size={16} />
                            {t('cal_register')}
                        </button>
                    </div>
                </>
            )}
        </AppLayout>
    );
}
