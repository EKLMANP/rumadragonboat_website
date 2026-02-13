// src/pages/app/EquipmentPage.jsx
// 裝備查詢頁面 - 整合新設計系統

import React, { useState, useEffect } from 'react';
import { Package, ClipboardList, RefreshCw } from 'lucide-react';
import { fetchAllData } from '../../api/supabaseApi';
import AppLayout from '../../components/AppLayout';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EquipmentPage() {
    const { lang, t } = useLanguage();
    const [equipment, setEquipment] = useState([]);
    const [borrowRecords, setBorrowRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchAllData();
            if (data) {
                setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
                setBorrowRecords(Array.isArray(data.borrowRecords) ? data.borrowRecords : []);
            }
        } catch (error) {
            console.error("載入失敗", error);
        } finally {
            setLoading(false);
        }
    };

    // 翻譯裝備名稱
    const getTranslatedItemName = (name) => {
        if (!name) return '';
        if (lang === 'zh') return name;

        if (name.includes('救生衣')) return 'Life Jacket';
        if (name.includes('木槳')) return 'Wooden Paddle';
        if (name.includes('碳纖')) return 'Carbon Paddle';
        if (name.includes('帽')) return 'Cap';

        return name;
    };

    // 根據裝備類型顯示不同圖示 (已移除特定項目的圖示)
    const getEquipmentIcon = (item) => {
        const name = item?.Item?.toLowerCase() || '';

        // 用戶要求移除這三項的圖示
        if (name.includes('木槳') || name.includes('碳纖') || name.includes('carbon') || name.includes('救生衣')) {
            return null;
        }

        if (name.includes('帽')) return <span className="text-3xl">🧢</span>;
        return <span className="text-3xl">📦</span>;
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto">
                {/* 頁面標題 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                                🦺 {lang === 'zh' ? '裝備查詢' : 'Equipment'}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {lang === 'zh' ? '查看公用裝備庫存與借用紀錄' : 'View team equipment inventory and borrow records'}
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {lang === 'zh' ? '重新載入' : 'Reload'}
                        </button>
                    </div>
                </div>

                {/* 裝備數量總覽 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <Package className="text-sky-600" /> {lang === 'zh' ? '裝備數量總覽' : 'Equipment Overview'}
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="animate-spin h-8 w-8 border-b-2 border-sky-600 rounded-full mx-auto mb-4"></div>
                            {t('app_loading')}
                        </div>
                    ) : equipment.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">📦</div>
                            {lang === 'zh' ? '目前沒有裝備資料' : 'No equipment data'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {equipment.map((item, idx) => {
                                const getEquipmentImage = (name) => {
                                    if (!name) return null;
                                    const n = name.toLowerCase();
                                    if (n.includes('救生衣') || n.includes('life jacket')) return '/Life jacket.png';
                                    if (n.includes('木槳') || n.includes('wooden paddle')) return '/Wooden paddle.png';
                                    if (n.includes('碳纖') || n.includes('carbon paddle')) return '/carbon paddle.png';
                                    return null;
                                };
                                const imgUrl = getEquipmentImage(item.Item);

                                return (
                                    <div
                                        key={idx}
                                        className="bg-sky-50 p-6 rounded-xl flex flex-col items-center justify-center text-center hover:bg-sky-100 transition border border-sky-100 group"
                                    >
                                        <span className="mb-2 flex items-center justify-center h-24 w-24">
                                            {imgUrl ? (
                                                <div className="w-24 h-24 rounded-full bg-white shadow flex items-center justify-center border-4 border-white overflow-hidden">
                                                    <img
                                                        src={imgUrl}
                                                        alt={item.Item}
                                                        className="w-full h-full object-contain p-2 transform group-hover:scale-110 transition duration-500"
                                                    />
                                                </div>
                                            ) : (
                                                getEquipmentIcon(item)
                                            )}
                                        </span>
                                        <span className="text-gray-600 font-medium mb-1 font-bold text-lg">{getTranslatedItemName(item.Item)}</span>
                                        <span className="text-4xl font-bold text-sky-600">{item.Count}</span>
                                        <span className="text-xs text-gray-400 mt-1">{lang === 'zh' ? '庫存數量' : 'In Stock'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 借用紀錄 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <ClipboardList className="text-green-600" /> {lang === 'zh' ? '借用紀錄' : 'Borrow Records'}
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            {t('app_loading')}
                        </div>
                    ) : borrowRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">✨</div>
                            {lang === 'zh' ? '目前無借用紀錄' : 'No borrow records'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm text-left">
                                        <th className="p-4 rounded-l-xl font-medium">{lang === 'zh' ? '姓名' : 'Name'}</th>
                                        <th className="p-4 font-medium">{lang === 'zh' ? '借用日期' : 'Date'}</th>
                                        <th className="p-4 font-medium">{lang === 'zh' ? '品項' : 'Item'}</th>
                                        <th className="p-4 rounded-r-xl font-medium text-center">{lang === 'zh' ? '數量' : 'Qty'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {borrowRecords.map((record, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition"
                                        >
                                            <td className="p-4">
                                                <span className="font-bold text-gray-800">{record.Name}</span>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {record.Date ? new Date(record.Date).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US') : '-'}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
                                                    {getTranslatedItemName(record.Item)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-bold text-sky-600 text-lg">{record.Count}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
