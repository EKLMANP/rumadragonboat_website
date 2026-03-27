import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Package, ClipboardList } from 'lucide-react';
import { fetchAllData } from '../api/googleSheets';

const EquipmentPage = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAllData();
        if (data) {
          // 確保是陣列，防止 undefined 導致 map 報錯
          setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
          setBorrowRecords(Array.isArray(data.borrowRecords) ? data.borrowRecords : []);
        }
      } catch (error) {
        console.error("載入失敗", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Banner 區塊 */}
      <div className="relative w-full h-48 md:h-64 bg-slate-800 mb-8 overflow-hidden group">
        <img
          src="https://i.ibb.co/mrs7mwBB/DJ-riverpark.png"
          alt="Banner"
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-700"
        />

        {/* 黑色漸層遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">
            公用裝備查詢 / Equipment
          </h1>
          <p className="text-gray-200 text-sm md:text-base font-light drop-shadow">
            裝備數量與借用紀錄 Equipment Status Inquiry
          </p>
        </div>

        {/* Home 按鈕 */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 md:top-6 md:right-8 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-md transition shadow-sm border border-white/30"
        >
          <Home size={18} />
          <span className="font-medium text-sm">Home</span>
        </button>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-8">

        {/* 1. 上半部：裝備數量總覽 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
            <Package className="text-blue-500" /> 裝備數量總覽 (Overview)
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">載入中...</div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-8 text-gray-400">目前沒有裝備資料</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {equipment.map((item, idx) => {
                const getEquipmentImage = (name) => {
                  if (name.includes('救生衣') || name.toLowerCase().includes('life jacket')) return '/Life jacket.png';
                  if (name.includes('木槳') || name.toLowerCase().includes('wooden paddle')) return '/Wooden paddle.png';
                  if (name.includes('碳纖槳') || name.toLowerCase().includes('carbon paddle')) return '/carbon paddle.png';
                  return null;
                };
                const imgUrl = getEquipmentImage(item.Item);

                return (
                  <div key={idx} className="bg-blue-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-blue-100 transition duration-300 group shadow-sm hover:shadow-md border border-blue-100">
                    {imgUrl ? (
                      <div className="w-24 h-24 rounded-full bg-white shadow-inner flex items-center justify-center mb-3 border-4 border-white overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={item.Item}
                          className="w-full h-full object-contain p-2 transform group-hover:scale-110 transition duration-500"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/60 flex items-center justify-center mb-3 text-blue-300">
                        <Package size={32} />
                      </div>
                    )}

                    <span className="text-gray-700 font-bold text-lg mb-1">{item.Item}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-blue-600">{item.Count}</span>
                      <span className="text-xs text-gray-500">庫存</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 下半部：借用紀錄 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
            <ClipboardList className="text-green-500" /> 借用紀錄 (Records)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm text-left">
                  <th className="p-3 rounded-l-lg">姓名</th>
                  <th className="p-3">借用日期</th>
                  <th className="p-3">品項</th>
                  <th className="p-3 rounded-r-lg">數量</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="p-6 text-center text-gray-400">載入中...</td></tr>
                ) : borrowRecords.length === 0 ? (
                  <tr><td colSpan="4" className="p-6 text-center text-gray-400">目前無借用紀錄</td></tr>
                ) : (
                  borrowRecords.map((record, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-800">{record.Name}</td>
                      <td className="p-3 text-gray-600">
                        {/* 防止日期格式錯誤導致白畫面 */}
                        {record.Date ? new Date(record.Date).toLocaleDateString('zh-TW') : '-'}
                      </td>
                      <td className="p-3 text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{record.Item}</span>
                      </td>
                      <td className="p-3 font-bold text-blue-600">{record.Count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EquipmentPage;