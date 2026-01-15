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

export default function MyJourneyPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile } = useAuth();

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

    // 分頁設定
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // 計算分頁資料
    const indexOfLastRecord = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstRecord = indexOfLastRecord - ITEMS_PER_PAGE;
    const currentRecords = trainingRecords.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(trainingRecords.length / ITEMS_PER_PAGE);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

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
                        time: `${activity.start_time || '待定'}`,
                        location: activity.location || '待定',
                        type: activity.type === 'boat_practice' ? '訓練' :
                            activity.type === 'race' ? '比賽' :
                                activity.type === 'team_building' ? '團建' : '內部'
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
            title: '取消報名?',
            text: `確定要取消「${title}」的報名嗎？`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: '取消報名',
            cancelButtonText: '再想想'
        });

        if (result.isConfirmed) {
            setLoading(true);
            const res = await postData('unregisterActivity', { registrationId: regId });
            if (res.success) {
                Swal.fire('已取消', '您已成功取消報名', 'success');
                setRefreshKey(prev => prev + 1);
            } else {
                Swal.fire('失敗', res.message || '取消失敗', 'error');
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
        { id: 'events', label: '已報名的活動', icon: Calendar },
        { id: 'upload', label: '自主訓練紀錄上傳', icon: Camera },
        { id: 'points', label: '我的M點及U幣', icon: Star },
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
                            我的龍舟旅程
                        </h1>
                        <p className="text-gray-500 mt-1">管理你的活動報名與參與紀錄</p>
                    </div>
                    <div className="bg-sky-50 px-4 py-2 rounded-xl">
                        <span className="text-gray-600">已累積 M 點: </span>
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
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">即將參加 ({events.upcoming.length})</span>
                                </h3>
                                {loading ? (
                                    <div className="text-center text-gray-400 py-6">載入中...</div>
                                ) : events.upcoming.length > 0 ? (
                                    <div className="space-y-3">
                                        {events.upcoming.map((event) => (
                                            <div key={event.id} className="p-4 bg-gray-50 rounded-xl hover:bg-sky-50 transition">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl flex-shrink-0">{getTypeIcon(event.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">{event.title}</div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                                                            <span className="flex items-center gap-1"><Clock size={14} /> {event.date} {event.time}</span>
                                                            <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已報名</span>
                                                    <button
                                                        onClick={() => handleCancelRegistration(event.id, event.title)}
                                                        className="px-3 py-1 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition"
                                                    >
                                                        取消報名
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-6">目前沒有即將參加的活動</div>
                                )}
                            </div>

                            {/* 歷史紀錄 */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">歷史紀錄 ({events.past.length})</span>
                                </h3>
                                {events.past.length > 0 ? (
                                    <div className="space-y-3">
                                        {events.past.map((event) => (
                                            <div key={event.id} className="p-4 bg-gray-50 rounded-xl">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl flex-shrink-0">{getTypeIcon(event.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">{event.title}</div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                                                            <span>{event.date}</span>
                                                            <span>{event.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                                                    {event.attended && (
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已出席</span>
                                                    )}
                                                    {event.points && (
                                                        <span className="text-yellow-600 font-bold">+{event.points} M點</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-6">暫無歷史紀錄</div>
                                )}
                            </div>
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
                                        <p className="text-green-700 font-bold text-lg">照片已選擇</p>
                                        <p className="text-gray-600 font-medium mt-1">{selectedFile.name}</p>
                                        <p className="text-green-600 text-sm mt-3 animate-pulse">✓ 準備就緒，請填寫下方資訊後送出</p>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="mx-auto text-gray-400 mb-3" size={48} />
                                        <p className="text-gray-600 font-medium">點擊或拖曳照片上傳</p>
                                        <p className="text-gray-400 text-sm mt-1">支援 JPG、PNG 格式，最大 5MB</p>
                                    </>
                                )}
                            </div>

                            {/* 表單 */}
                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                        value={uploadForm.date}
                                        onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">訓練類型</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                        value={uploadForm.type}
                                        onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                    >
                                        <option value="划船訓練">划船訓練</option>
                                        <option value="重量訓練">重量訓練</option>
                                        <option value="核心訓練">核心訓練</option>
                                        <option value="高強度間歇訓練">高強度間歇訓練</option>
                                        <option value="其他">其他</option>
                                    </select>
                                    {uploadForm.type === '其他' && (
                                        <input
                                            type="text"
                                            className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 text-gray-900"
                                            placeholder="請輸入訓練項目"
                                            value={uploadForm.customType}
                                            onChange={(e) => setUploadForm({ ...uploadForm, customType: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">備註</label>
                                <textarea
                                    rows={3}
                                    placeholder="輸入您的訓練備註 (例如：內容、強度...)"
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
                                {loading ? '送出中...' : '送出紀錄'}
                            </button>

                            {/* 我的上傳紀錄 */}
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">我的上傳紀錄</h3>
                                {trainingRecords.length > 0 ? (
                                    <>
                                        <div className="space-y-3">
                                            {currentRecords.map((record) => (
                                                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                                            {record.file_url ? (
                                                                <img src={record.file_url} alt="訓練照片" className="w-full h-full object-cover" />
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
                                                    第 <span className="text-sky-600 font-bold">{currentPage}</span> 頁 / 共 {totalPages} 頁
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
                                    <div className="text-center text-gray-400 py-8">暫無上傳紀錄</div>
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
                                    <div className="text-sm opacity-80">M點餘額</div>
                                    <div className="text-4xl font-bold mt-1">{pointsData.mPoints}</div>
                                    <div className="text-xs opacity-70 mt-2">透過參加活動獲得</div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
                                    <div className="text-sm opacity-80">U幣餘額</div>
                                    <div className="text-4xl font-bold mt-1">{pointsData.uCoins}</div>
                                    <div className="text-xs opacity-70 mt-2">可兑換商品</div>
                                </div>
                            </div>

                            {/* M點兌換U幣 */}
                            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                <h3 className="font-bold text-gray-800 mb-4">M點兌換U幣</h3>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <input
                                        type="number"
                                        placeholder="輸入M點數量"
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500"
                                    />
                                    <div className="text-gray-500 whitespace-nowrap">當前匯率：20 M點 = 1 U幣</div>
                                    <button className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition whitespace-nowrap">
                                        兌換
                                    </button>
                                </div>
                            </div>

                            {/* 點數歷史紀錄 */}
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-800 mb-4">點數歷史紀錄</h3>
                                {pointsData.history.length > 0 ? (
                                    <div className="space-y-2">
                                        {pointsData.history.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-gray-800">{item.activity}</div>
                                                    <div className="text-sm text-gray-500">{item.date}</div>
                                                </div>
                                                <span className="text-green-600 font-bold">+{item.points} M點</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-4">暫無點數紀錄</div>
                                )}
                            </div>

                            {/* U幣商品兌換 */}
                            <div>
                                <h3 className="font-bold text-gray-800 mb-4">U幣商品兌換</h3>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {pointsData.products.map((product) => (
                                        <div key={product.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition">
                                            <div className="h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
                                                🎁
                                            </div>
                                            <div className="font-medium text-gray-800">{product.name}</div>
                                            <div className="text-yellow-600 font-bold mt-1">{product.price} U幣</div>
                                            <button className="w-full mt-3 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition">
                                                兌換
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
