// src/pages/MemberPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { User, Calendar, CheckCircle, Trash2, MapPin, Home } from 'lucide-react';
import { fetchUsers, fetchDates, fetchRegistrations, postData } from '../api/googleSheets';
import { generateSeating } from '../utils/seatingLogic';
import SeatVisualizer from '../components/SeatVisualizer';

const MemberPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [openDates, setOpenDates] = useState([]);

  // 用來存完整的練習場次資料 (包含 Place 和 Meeting_Time)
  const [practiceSessions, setPracticeSessions] = useState([]);

  const [allRegs, setAllRegs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedName, setSelectedName] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const safeAllRegs = Array.isArray(allRegs) ? allRegs : [];

    if (selectedName && safeAllRegs.length > 0) {
      const myRegs = safeAllRegs.filter(r => r.name === selectedName);
      setMyRegistrations(myRegs);
    } else {
      setMyRegistrations([]);
    }
  }, [selectedName, allRegs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, datesData, regsData] = await Promise.all([
        fetchUsers(),
        fetchDates(),
        fetchRegistrations()
      ]);

      console.log("DEBUG: 後端回傳的資料結構", { usersData, datesData, regsData });

      setUsers(Array.isArray(usersData) ? usersData : []);

      const safeDates = Array.isArray(datesData) ? datesData : [];

      // 儲存完整資料 (為了之後拿 Place 和 Meeting_Time)
      setPracticeSessions(safeDates);

      // 介面顯示用的日期清單
      setOpenDates(safeDates.map(d => d.Confirmed_date || d.Confirmed_Date).filter(Boolean));
      setAllRegs(regsData);
    } catch (error) {
      console.error("載入資料失敗:", error);
      Swal.fire("讀取錯誤", "無法載入資料，請檢查網路或聯繫管理員", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDateCheck = (date) => {
    if (selectedDates.includes(date)) {
      setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedName) {
      Swal.fire('請選擇姓名', '你是誰呢？', 'question');
      return;
    }
    if (selectedDates.length === 0) {
      Swal.fire('請選擇日期', '要勾選想參加的練習喔', 'warning');
      return;
    }

    setLoading(true);
    const res = await postData('register', {
      Name: selectedName,
      Dates: selectedDates
    });
    setLoading(false);

    if (res.success) {
      await Swal.fire('報名成功!', '教練收到你的報名了', 'success');
      setSelectedDates([]);
      loadData();
    } else {
      Swal.fire('報名失敗', res.message, 'error');
    }
  };

  const handleCancel = async (regDate) => {
    const result = await Swal.fire({
      title: `取消 ${regDate} 的練習?`,
      text: "確定不來了嗎 (T_T)",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '殘忍取消',
      cancelButtonText: '再想想',
      confirmButtonColor: '#d33',
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('unregister', {
        Name: selectedName,
        Date: regDate
      });
      setLoading(false);

      if (res.success) {
        Swal.fire('已取消', '', 'success');
        loadData();
      } else {
        Swal.fire('失敗', res.message, 'error');
      }
    }
  };

  const renderSeatingCharts = () => {
    if (!Array.isArray(openDates) || openDates.length === 0) return <div className="text-center text-gray-400">目前沒有練習</div>;

    return openDates.map(date => {
      const safeAllRegs = Array.isArray(allRegs) ? allRegs : [];

      // 取得該日期的完整資訊
      const sessionInfo = practiceSessions.find(s => (s.Confirmed_date || s.Confirmed_Date) === date);

      // 1. 取得地點
      const location = sessionInfo ? (sessionInfo.Place || sessionInfo.Location || '') : '';

      // ✨ 2. 修改：取得集合時間 (Meeting_Time)
      // 注意：這裡的 key 要對應 Google Sheet 標題或 Apps Script 回傳的 key
      const meetingTime = sessionInfo ? (sessionInfo.Meeting_Time || sessionInfo.meeting_time || '') : '';

      const participantsNames = safeAllRegs
        .filter(r => r.practicedates === date)
        .map(r => r.name);

      if (participantsNames.length === 0) return null;

      const participants = users.filter(u => participantsNames.includes(u.Name));
      const boatData = generateSeating(participants);

      return (
        <div key={date} className="mb-8">
          {/* ✨ 修改：將 location 與 time 傳遞給 SeatVisualizer */}
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Banner 區塊 */}
      <div className="relative h-48 md:h-64 w-full shadow-md overflow-hidden bg-sky-600">
        <img
          src="/DJ riverpark.png"
          alt="Banner"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black/20 flex flex-col justify-center px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-2">
            <User size={32} /> 隊員專區 / Member
          </h1>
          <p className="text-white text-lg md:text-xl mt-2 font-light opacity-95 drop-shadow-md">
            船練報名 & 查看槳位 Register & check seat arrangement
          </p>
          <button
            onClick={() => navigate('/')}
            className="absolute top-6 right-6 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition border border-white/30"
          >
            <Home size={20} />
            <span className="hidden md:inline">Home</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-8 mt-6">

        {/* 報名與查詢區 */}
        <div className="flex flex-col lg:flex-row gap-8">

          <div className="w-full lg:w-1/2 bg-white p-6 rounded-xl shadow-lg border border-sky-100">
            <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2 border-b pb-2">
              <User className="text-sky-500" /> 我要報名
            </h3>

            <div className="mb-6">
              <label className="block text-gray-600 font-bold mb-2">我是誰 (Name)</label>
              <select
                className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-sky-300 outline-none text-lg text-gray-800"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
              >
                <option value="">-- 請選擇姓名 --</option>
                {(Array.isArray(users) ? users : []).map(u => (
                  <option key={u.Name} value={u.Name}>{u.Name}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-gray-600 font-bold mb-2">我要參加的日期 (Dates)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openDates.length === 0 ? <p className="text-gray-400 text-sm">教練還沒開放日期喔...</p> :
                  openDates.map(date => (
                    <label key={date}
                      className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition
                      ${selectedDates.includes(date) ? 'bg-sky-50 border-sky-500' : 'bg-white border-gray-200 hover:bg-gray-50'}
                    `}
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                        checked={selectedDates.includes(date)}
                        onChange={() => handleDateCheck(date)}
                      />
                      <span className="font-mono font-bold text-gray-700">{date}</span>
                    </label>
                  ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedName || selectedDates.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition flex justify-center items-center gap-2
                ${(!selectedName || selectedDates.length === 0)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-600 text-white transform hover:scale-[1.02]'
                }`}
            >
              <CheckCircle /> 確定報名 / Submit
            </button>
          </div>

          <div className="w-full lg:w-1/2 bg-white p-6 rounded-xl shadow-lg border border-orange-100">
            <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2 border-b pb-2">
              <Calendar className="text-orange-500" /> 我的練習 (My Schedule)
            </h3>

            {!selectedName ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg text-gray-400">
                請先在左側選擇姓名<br />才能看到你的紀錄喔
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-bold text-xl text-sky-700">{selectedName}</span>
                  <span className="text-gray-500">已報名的場次：</span>
                </div>

                {myRegistrations.length === 0 ? (
                  <p className="text-gray-400">目前沒有報名任何練習</p>
                ) : (
                  myRegistrations.map((reg, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-3">
                        <MapPin size={20} className="text-orange-400" />
                        <span className="font-mono font-bold text-lg text-gray-800">{reg.practicedates}</span>
                      </div>
                      <button
                        onClick={() => handleCancel(reg.practicedates)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                        title="取消報名"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 座位表預覽 */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-l-8 border-sky-500 pl-4">
            📊 練習座位表 / Seating Arrangement
          </h2>
          <p className="text-gray-500 mb-8 ml-6">
            * 這是系統根據目前報名狀況自動預排的結果，實際座位可能由教練現場調整。
          </p>

          <div className="grid grid-cols-1 gap-12">
            {renderSeatingCharts()}
          </div>
        </div>

      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-sky-600 mb-4"></div>
            <p className="font-bold text-sky-800">資料傳輸中...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPage;