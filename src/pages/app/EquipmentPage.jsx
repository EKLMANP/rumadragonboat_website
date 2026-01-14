// src/pages/app/EquipmentPage.jsx
// 裝備查詢頁面 - 整合新設計系統

import React, { useState, useEffect } from 'react';
import { Package, ClipboardList, RefreshCw } from 'lucide-react';
import { fetchAllData } from '../../api/supabaseApi';
import AppLayout from '../../components/AppLayout';

export default function EquipmentPage() {
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

    // 根據裝備類型顯示不同圖示
    const getEquipmentIcon = (item) => {
        const name = item?.Item?.toLowerCase() || '';

        // 木槳 - 棕色槳葉
        if (name.includes('木槳')) {
            return (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-amber-700" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V12C12 12 16 13 16 17C16 20.5 14.5 22 12 22C9.5 22 8 20.5 8 17C8 13 12 12 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.4" />
                </svg>
            );
        }

        // 碳纖槳 - 黑色實心
        if (name.includes('碳纖') || name.includes('carbon')) {
            return (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-800" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V12C12 12 16 13 16 17C16 20.5 14.5 22 12 22C9.5 22 8 20.5 8 17C8 13 12 12 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
                </svg>
            );
        }

        if (name.includes('救生衣')) return <span className="text-3xl">🦺</span>;
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
                                🦺 裝備查詢
                            </h1>
                            <p className="text-gray-500 mt-1">
                                查看公用裝備庫存與借用紀錄
                            </p>
                        </div>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            重新載入
                        </button>
                    </div>
                </div>

                {/* 裝備數量總覽 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <Package className="text-sky-600" /> 裝備數量總覽
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="animate-spin h-8 w-8 border-b-2 border-sky-600 rounded-full mx-auto mb-4"></div>
                            載入中...
                        </div>
                    ) : equipment.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">📦</div>
                            目前沒有裝備資料
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {equipment.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="bg-sky-50 p-6 rounded-xl flex flex-col items-center justify-center text-center hover:bg-sky-100 transition border border-sky-100"
                                >
                                    <span className="mb-2 flex items-center justify-center h-12">{getEquipmentIcon(item)}</span>
                                    <span className="text-gray-600 font-medium mb-1">{item.Item}</span>
                                    <span className="text-4xl font-bold text-sky-600">{item.Count}</span>
                                    <span className="text-xs text-gray-400 mt-1">庫存數量</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 借用紀錄 */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                        <ClipboardList className="text-green-600" /> 借用紀錄
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">
                            載入中...
                        </div>
                    ) : borrowRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <div className="text-4xl mb-3">✨</div>
                            目前無借用紀錄
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm text-left">
                                        <th className="p-4 rounded-l-xl font-medium">姓名</th>
                                        <th className="p-4 font-medium">借用日期</th>
                                        <th className="p-4 font-medium">品項</th>
                                        <th className="p-4 rounded-r-xl font-medium text-center">數量</th>
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
                                                {record.Date ? new Date(record.Date).toLocaleDateString('zh-TW') : '-'}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
                                                    {record.Item}
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
