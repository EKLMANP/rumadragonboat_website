// src/pages/app/MyJourneyPage.jsx
// 我的龍舟旅程 - 三個Tab子頁面

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { MapPin, Calendar, Camera, Star, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchActivityRegistrations, postData, fetchTrainingRecords } from '../../api/supabaseApi';
import Swal from 'sweetalert2';
import { useAuth } from '../../contexts/AuthContext';
import { compressImage } from '../../utils/imageUtils';
import { useLanguage } from '../../contexts/LanguageContext';

export default function MyJourneyPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const { t, lang } = useLanguage();

    // 根據 URL 決定當前 Tab
    const getActiveTab = () => {
        if (location.pathname.includes('/upload')) return 'upload';
        if (location.pathname.includes('/points')) return 'points';
        return 'events';
    };

    const [activeTab, setActiveTab] = useState(getActiveTab());
    const [loading, setLoading] = useState(true);

    // 從 API 載入的資料
    const [events, setEvents] = useState({ upcoming: [], past: [] });
    const [trainingRecords, setTrainingRecords] = useState([]);
    const [pointsData, setPointsData] = useState({
        mPoints: 0,
        uCoins: 0,
        history: [],
        products: [
            { id: 1, name: '槳造型鑰匙圈', price: 5, image: null },
            { id: 2, name: 'RUMA限量帽T', price: 50, image: null },
            { id: 3, name: 'RUMA限量棒球帽', price: 25, image: null },
        ]
    });

    const fileInputRef = useRef(null);
    const [uploadForm, setUploadForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: '划船訓練',
        customType: '',
        notes: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // 分頁設定 (自主訓練)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // 即將參加：篩選與分頁
    const [upcomingFilter, setUpcomingFilter] = useState('all');
    const [upcomingPage, setUpcomingPage] = useState(1);

    // 歷史紀錄：篩選與分頁
    const [historyFilter, setHistoryFilter] = useState('all');
    const [historyPage, setHistoryPage] = useState(1);

    // 活動類別選項 - with bilingual support
    const categoryOptions = [
        { value: 'all', label_zh: '全部', label_en: 'All' },
        { value: '訓練', label_zh: '訓練', label_en: 'Training' },
        { value: '團建', label_zh: 'Team Building', label_en: 'Team Building' },
        { value: '比賽', label_zh: '龍舟比賽', label_en: 'Race' },
        { value: '內部', label_zh: '內部競賽', label_en: 'Internal' }
    ];

    // 計算分頁資料 (自主訓練)
    const indexOfLastRecord = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstRecord = indexOfLastRecord - ITEMS_PER_PAGE;
    const currentRecords = trainingRecords.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(trainingRecords.length / ITEMS_PER_PAGE);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // 篩選後的即將參加活動
    const filteredUpcoming = upcomingFilter === 'all'
        ? events.upcoming
        : events.upcoming.filter(e => e.type === upcomingFilter);
    const upcomingTotalPages = Math.ceil(filteredUpcoming.length / ITEMS_PER_PAGE);
    const paginatedUpcoming = filteredUpcoming.slice((upcomingPage - 1) * ITEMS_PER_PAGE, upcomingPage * ITEMS_PER_PAGE);

    // 篩選後的歷史紀錄
    const filteredHistory = historyFilter === 'all'
        ? events.past
        : events.past.filter(e => e.type === historyFilter);
    const historyTotalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);

    // 載入資料
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // 載入活動報名資料與訓練紀錄
                const [regs, training] = await Promise.all([
                    fetchActivityRegistrations(),
                    fetchTrainingRecords() // Assume implemented
                ]);

                setTrainingRecords(training);

                const now = new Date();

                // 分類為即將參加和歷史紀錄
                const upcoming = [];
                const past = [];

                (regs || []).forEach((reg, idx) => {
                    const activity = reg.activities;
                    if (!activity) return;

                    const eventDate = new Date(activity.date);
                    const event = {
                        id: reg.id || idx,
                        title: activity.name,
                        date: activity.date,
                        time: `${activity.start_time || (lang === 'zh' ? '待定' : 'TBD')}`,
                        location: activity.location || (lang === 'zh' ? '待定' : 'TBD'),
                        type: activity.type === 'boat_practice' ? (lang === 'zh' ? '訓練' : 'Training') :
                            activity.type === 'race' ? (lang === 'zh' ? '比賽' : 'Race') :
                                activity.type === 'team_building' ? (lang === 'zh' ? '團建' : 'Team Building') : (lang === 'zh' ? '內部' : 'Internal')
                    };

                    if (eventDate >= now) {
                        upcoming.push(event);
                    } else {
                        past.push({ ...event, attended: true, points: 2 });
                    }
                });

                setEvents({ upcoming, past });
            } catch (error) {
                console.error('Load error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
        loadData();
    }, [userProfile, refreshKey]);

    const handleCancelRegistration = async (regId, title) => {
        const result = await Swal.fire({
            title: lang === 'zh' ? '取消報名?' : 'Cancel Registration?',
            text: lang === 'zh' ? `確定要取消「${title}」的報名嗎？` : `Cancel registration for "${title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: lang === 'zh' ? '取消報名' : 'Yes, Cancel',
            cancelButtonText: lang === 'zh' ? '再想想' : 'Keep it'
        });

        if (result.isConfirmed) {
            setLoading(true);
            const res = await postData('unregisterActivity', { registrationId: regId });
            if (res.success) {
                Swal.fire(lang === 'zh' ? '已取消' : 'Cancelled', lang === 'zh' ? '您已成功取消報名' : 'Registration cancelled successfully', 'success');
                setRefreshKey(prev => prev + 1);
            } else {
                Swal.fire(lang === 'zh' ? '失敗' : 'Failed', res.message || (lang === 'zh' ? '取消失敗' : 'Cancellation failed'), 'error');
            }
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
        }
    };

    const handleSubmitUpload = async () => {
        // 驗證
        if (!uploadForm.date || !uploadForm.type) {
            return Swal.fire('提示', '請填寫日期與訓練類型', 'warning');
        }

        if (uploadForm.type === '其他' && !uploadForm.customType.trim()) {
            return Swal.fire('提示', '請輸入自訂訓練項目', 'warning');
        }

        // 顯示上傳中
        Swal.fire({
            title: '上傳中...',
            text: '正在壓縮並上傳您的訓練紀錄',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            let fileToUpload = selectedFile;

            // 如果有圖片，先進行壓縮
            if (selectedFile) {
                try {
                    const compressedBlob = await compressImage(selectedFile, {
                        maxWidth: 1280, // 限制最大寬度
                        quality: 0.7    // 壓縮品質
                    });
                    // 將 Blob 轉回 File 物件以符合 postData 的預期
                    fileToUpload = new File([compressedBlob], selectedFile.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                } catch (err) {
                    console.warn('圖片壓縮失敗，將使用原圖上傳', err);
                    // 壓縮失敗則使用原圖，不阻擋流程
                }
            }

            const result = await postData('addTrainingRecord', {
                ...uploadForm,
                file: fileToUpload
            });

            if (result.success) {
                Swal.fire('成功', '訓練紀錄已送出', 'success');
                // 重置表單
                setUploadForm({
                    date: new Date().toISOString().split('T')[0],
                    type: '划船訓練',
                    customType: '',
                    notes: ''
                });
                setSelectedFile(null);
                setRefreshKey(prev => prev + 1); // 觸發重新載入
                setCurrentPage(1); // 回到第一頁
            } else {
                Swal.fire('失敗', result.message || '送出失敗', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('失敗', '發生未知錯誤', 'error');
        }
    };

    const tabs = [
        { id: 'events', label: lang === 'zh' ? '已報名的活動' : 'Registered Activities', icon: Calendar },
        { id: 'upload', label: lang === 'zh' ? '自主訓練紀錄上傳' : 'Upload Training', icon: Camera },
        { id: 'points', label: lang === 'zh' ? '我的M點U幣' : 'My M Points', icon: Star },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case '審核中':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1"><AlertCircle size={12} /> 審核中</span>;
            case '已通過':
                return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><CheckCircle size={12} /> 已通過</span>;
            case '已拒絕':
                return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><XCircle size={12} /> 已拒絕</span>;
            default:
                return null;
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            '比賽': 'text-red-600',
            '訓練': 'text-blue-600',
            '團建': 'text-green-600',
            '內部': 'text-purple-600',
        };
        return colors[type] || 'text-gray-600';
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case '比賽': return '🔥';
            case '訓練': return '🚣';
            case '團建': return '🎉';
            case '內部': return '🍻';
            default: return '📅';
        }
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto">
                {/* 頁面標題 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <MapPin className="text-red-600" />
                            {t('journey_title')}
                        </h1>
                        <p className="text-gray-500 mt-1">{lang === 'zh' ? '管理你的活動報名與參與紀錄' : 'Manage your activities and records'}</p>
                    </div>
                    <div className="bg-sky-50 px-4 py-2 rounded-xl">
                        <span className="text-gray-600">{lang === 'zh' ? '已累積 M 點: ' : 'M Points: '}</span>
                        <span className="text-2xl font-bold text-sky-600">{pointsData.mPoints}</span>
                    </div>
                </div>

                {/* Tab 導航 */}
                <div className="bg-white rounded-2xl shadow-lg mb-6">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 min-w-0 px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition border-b-2 ${activeTab === tab.id
                                        ? 'border-red-600 text-red-600 bg-red-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    <span className="text-xs sm:text-sm whitespace-nowrap truncate">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab 內容 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {activeTab === 'events' && (
                        <div>
                            {/* 即將參加 */}
                            <div className="mb-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">{lang === 'zh' ? '即將參加' : 'Upcoming'} ({filteredUpcoming.length})</span>
                                    </h3>
                                    <select
                                        value={upcomingFilter}
                                        onChange={(e) => { setUpcomingFilter(e.target.value); setUpcomingPage(1); }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    >
                                        {categoryOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{lang === 'zh' ? opt.label_zh : opt.label_en}</option>
                                        ))}
                                    </select>
                                </div>
                                {loading ? (
                                    <div className="text-center text-gray-400 py-6">{lang === 'zh' ? '載入中...' : 'Loading...'}</div>
                                ) : paginatedUpcoming.length > 0 ? (
                                    <>
                                        <div className="space-y-3">
                                            {paginatedUpcoming.map((event) => (
                                                <div key={event.id} className="p-4 bg-gray-50 rounded-xl hover:bg-sky-50 transition">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl flex-shrink-0">{getTypeIcon(event.type)}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-gray-800 truncate">{event.title}</div>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                                                                <span className="flex items-center gap-1"><Clock size={14} /> {event.date} {event.time}</span>
                                                                <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full whitespace-nowrap">{lang === 'zh' ? '已報名' : 'Registered'}</span>
                                                            <button
                                                                onClick={() => handleCancelRegistration(event.id, event.title)}
                                                                className="px-3 py-1 border border-red-200 text-red-600 text-xs sm:text-sm rounded-lg hover:bg-red-50 transition whitespace-nowrap"
                                                            >
                                                                {lang === 'zh' ? '取消報名' : 'Cancel'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* 分頁控制 */}
                                        {upcomingTotalPages > 1 && (
                                            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
                                                <span className="text-sm text-gray-500">{lang === 'zh' ? `第 ${upcomingPage} / ${upcomingTotalPages} 頁` : `Page ${upcomingPage} of ${upcomingTotalPages}`}</span>
                                                <button
                                                    onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                                                    disabled={upcomingPage === 1}
                                                    className="px-3 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    {lang === 'zh' ? '← 上一頁' : '← Prev'}
                                                </button>
                                                <button
                                                    onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages, p + 1))}
                                                    disabled={upcomingPage >= upcomingTotalPages}
                                                    className="px-3 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    {lang === 'zh' ? '下一頁 →' : 'Next →'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 py-6">
                                        {upcomingFilter === 'all' ? (lang === 'zh' ? '目前沒有即將參加的活動' : 'No upcoming activities') : (lang === 'zh' ? `沒有符合「${categoryOptions.find(o => o.value === upcomingFilter)?.[lang === 'zh' ? 'label_zh' : 'label_en']}」的活動` : `No ${categoryOptions.find(o => o.value === upcomingFilter)?.label_en} activities`)}
                                    </div>
                                )}
                            </div>

                            {/* 歷史紀錄 */}
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">{lang === 'zh' ? '歷史紀錄' : 'History'} ({filteredHistory.length})</span>
                                    </h3>
                                    <select
                                        value={historyFilter}
                                        onChange={(e) => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    >
                                        {categoryOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{lang === 'zh' ? opt.label_zh : opt.label_en}</option>
                                        ))}
                                    </select>
                                </div>
                                {paginatedHistory.length > 0 ? (
                                    <>
                                        <div className="space-y-3">
                                            {paginatedHistory.map((event) => (
                                                <div key={event.id} className="p-4 bg-gray-50 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl flex-shrink-0">{getTypeIcon(event.type)}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-gray-800 truncate">{event.title}</div>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                                                                <span>{event.date}</span>
                                                                <span>{event.location}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {event.attended && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">{lang === 'zh' ? '已出席' : 'Attended'}</span>
                                                            )}
                                                            {event.points && (
                                                                <span className="text-yellow-600 font-bold whitespace-nowrap">+{event.points} {lang === 'zh' ? 'M點' : 'M Pts'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* 分頁控制 */}
                                        {historyTotalPages > 1 && (
                                            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
                                                <span className="text-sm text-gray-500">{lang === 'zh' ? `第 ${historyPage} / ${historyTotalPages} 頁` : `Page ${historyPage} of ${historyTotalPages}`}</span>
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                                    disabled={historyPage === 1}
                                                    className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    {lang === 'zh' ? '← 上一頁' : '← Prev'}
                                                </button>
                                                <button
                                                    onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                                                    disabled={historyPage >= historyTotalPages}
                                                    className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    {lang === 'zh' ? '下一頁 →' : 'Next →'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 py-6">
                                        {historyFilter === 'all' ? (lang === 'zh' ? '暫無歷史紀錄' : 'No history records') : (lang === 'zh' ? `沒有符合「${categoryOptions.find(o => o.value === historyFilter)?.[lang === 'zh' ? 'label_zh' : 'label_en']}」的紀錄` : `No ${categoryOptions.find(o => o.value === historyFilter)?.label_en} records`)}
                                    </div>
                                )}                           </div>
                        </div>
                    )}

                    {/* 自主訓練紀錄上傳 Tab */}
                    {activeTab === 'upload' && (
                        <div>
                            {/* 上傳區域 */}
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className={`
                                border-2 border-dashed rounded-xl p-8 text-center mb-6 transition cursor-pointer
                                ${selectedFile
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300 hover:border-sky-400 bg-gray-50 hover:bg-sky-50'
                                    }
                            `}
                            >
                                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

                                {selectedFile ? (
                                    <>
                                        <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                                        <p className="text-green-700 font-bold text-lg">{lang === 'zh' ? '照片已選擇' : 'Photo Selected'}</p>
                                        <p className="text-gray-600 font-medium mt-1">{selectedFile.name}</p>
                                        <p className="text-green-600 text-sm mt-3 animate-pulse">{lang === 'zh' ? '✓ 準備就緒，請填寫下方資訊後送出' : '✓ Ready! Fill in details below and submit'}</p>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="mx-auto text-gray-400 mb-3" size={48} />
                                        <p className="text-gray-600 font-medium">{lang === 'zh' ? '點擊或拖曳照片上傳' : 'Click or drag to upload photo'}</p>
                                        <p className="text-gray-400 text-sm mt-1">{lang === 'zh' ? '支援 JPG、PNG 格式，最大 5MB' : 'Supports JPG, PNG, max 5MB'}</p>
                                    </>
                                )}
                            </div>

                            {/* 表單 */}
                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '日期' : 'Date'}</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                        value={uploadForm.date}
                                        onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '訓練類型' : 'Training Type'}</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                        value={uploadForm.type}
                                        onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                    >
                                        <option value="划船訓練">{lang === 'zh' ? '划船訓練' : 'Paddling'}</option>
                                        <option value="重量訓練">{lang === 'zh' ? '重量訓練' : 'Weight Training'}</option>
                                        <option value="核心訓練">{lang === 'zh' ? '核心訓練' : 'Core Training'}</option>
                                        <option value="高強度間歇訓練">{lang === 'zh' ? '高強度間歇訓練' : 'HIIT'}</option>
                                        <option value="其他">{lang === 'zh' ? '其他' : 'Other'}</option>
                                    </select>
                                    {uploadForm.type === '其他' && (
                                        <input
                                            type="text"
                                            className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                            placeholder={lang === 'zh' ? '請輸入訓練項目' : 'Enter training type'}
                                            value={uploadForm.customType}
                                            onChange={(e) => setUploadForm({ ...uploadForm, customType: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '備註' : 'Notes'}</label>
                                <textarea
                                    rows={3}
                                    placeholder={lang === 'zh' ? '輸入您的訓練備註 (例如：內容、強度...)' : 'Enter training notes (e.g. content, intensity...)'}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                    value={uploadForm.notes}
                                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleSubmitUpload}
                                disabled={loading}
                                className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition disabled:opacity-50"
                            >
                                {loading ? (lang === 'zh' ? '送出中...' : 'Submitting...') : (lang === 'zh' ? '送出紀錄' : 'Submit Record')}
                            </button>

                            {/* 我的上傳紀錄 */}
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">{lang === 'zh' ? '我的上傳紀錄' : 'My Upload Records'}</h3>
                                {trainingRecords.length > 0 ? (
                                    <>
                                        <div className="space-y-3">
                                            {currentRecords.map((record) => (
                                                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                            {record.file_url ? (
                                                                <img src={record.file_url} alt={lang === 'zh' ? '訓練照片' : 'Training Photo'} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Camera className="text-gray-400" size={24} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-800">{record.type} {record.custom_type ? `(${record.custom_type})` : ''}</div>
                                                            <div className="text-sm text-gray-500">{record.date}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(record.status)}
                                                        {record.points > 0 && <span className="text-yellow-600 font-bold">+{record.points} M點</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 分頁控制 */}
                                        {totalPages > 1 && (
                                            <div className="flex justify-center items-center gap-6 mt-8">
                                                <button
                                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-3 rounded-full border border-gray-200 text-sky-600 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent transition shadow-sm"
                                                >
                                                    <ChevronLeft size={24} />
                                                </button>
                                                <span className="text-base font-medium text-gray-700">
                                                    {lang === 'zh' ? `第 ${currentPage} 頁 / 共 ${totalPages} 頁` : `Page ${currentPage} of ${totalPages}`}
                                                </span>
                                                <button
                                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-3 rounded-full border border-gray-200 text-sky-600 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent transition shadow-sm"
                                                >
                                                    <ChevronRight size={24} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 py-8">{lang === 'zh' ? '暫無上傳紀錄' : 'No upload records'}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 我的M點及U幣 Tab */}
                    {activeTab === 'points' && (
                        <div>
                            {/* 餘額卡片 */}
                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-6 text-white">
                                    <div className="text-sm opacity-80">{lang === 'zh' ? 'M點餘額' : 'M Points Balance'}</div>
                                    <div className="text-4xl font-bold mt-1">{pointsData.mPoints}</div>
                                    <div className="text-xs opacity-70 mt-2">{lang === 'zh' ? '透過參加活動獲得' : 'Earned by attending activities'}</div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
                                    <div className="text-sm opacity-80">{lang === 'zh' ? 'U幣餘額' : 'U Coins Balance'}</div>
                                    <div className="text-4xl font-bold mt-1">{pointsData.uCoins}</div>
                                    <div className="text-xs opacity-70 mt-2">{lang === 'zh' ? '可兑換商品' : 'Redeemable for items'}</div>
                                </div>
                            </div>

                            {/* M點兌換U幣 */}
                            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                <h3 className="font-bold text-gray-800 mb-4">{lang === 'zh' ? 'M點兌換U幣' : 'M Points to U Coins Exchange'}</h3>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <input
                                        type="number"
                                        placeholder={lang === 'zh' ? '輸入M點數量' : 'Enter M Points amount'}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                                    />
                                    <div className="text-gray-500 whitespace-nowrap">{lang === 'zh' ? '當前匯率：20 M點 = 1 U幣' : 'Exchange Rate: 20 M Pts = 1 U Coin'}</div>
                                    <button className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition whitespace-nowrap">
                                        {lang === 'zh' ? '兌換' : 'Exchange'}
                                    </button>
                                </div>
                            </div>

                            {/* 點數歷史紀錄 */}
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-800 mb-4">{lang === 'zh' ? '點數歷史紀錄' : 'Points History'}</h3>
                                {pointsData.history.length > 0 ? (
                                    <div className="space-y-2">
                                        {pointsData.history.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-gray-800">{item.activity}</div>
                                                    <div className="text-sm text-gray-500">{item.date}</div>
                                                </div>
                                                <span className="text-green-600 font-bold">+{item.points} {lang === 'zh' ? 'M點' : 'M Pts'}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-4">{lang === 'zh' ? '暫無點數紀錄' : 'No points history'}</div>
                                )}
                            </div>

                            {/* U幣商品兌換 */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">{lang === 'zh' ? 'U幣商品兌換' : 'Redeem U Coins'}</h3>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {pointsData.products.map((product) => (
                                        <div key={product.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition">
                                            <div className="h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
                                                🎁
                                            </div>
                                            <div className="font-medium text-gray-800">{product.name}</div>
                                            <div className="text-yellow-600 font-bold mt-1">{product.price} {lang === 'zh' ? 'U幣' : 'U Coins'}</div>
                                            <button className="w-full mt-3 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition">
                                                {lang === 'zh' ? '兌換' : 'Redeem'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </AppLayout >
    );
}
