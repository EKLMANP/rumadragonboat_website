// src/pages/CoachPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Trash2, Calendar, Users, Zap, Home, MapPin, Clock } from 'lucide-react';
import { fetchAllData, postData, fetchUsers, fetchRegistrations } from '../api/googleSheets'; 
import { generateSeating } from '../utils/seatingLogic';
import SeatVisualizer from '../components/SeatVisualizer';

const CoachPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('碧潭 Bitan');
  const [selectedTime, setSelectedTime] = useState('07:30'); 
  const [openDates, setOpenDates] = useState([]);
  const [dbDates, setDbDates] = useState([]);
  const [seatingCharts, setSeatingCharts] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedAuth = useRef(false);

  const placeOptions = [
    "碧潭 Bitan",
    "百齡橋 Bailing Bridge",
    "蘆洲微風運河 Luzhou Breeze Canal",
    "大直龍舟碼頭 Dazhi Dragon Boat Pier"
  ];

  const generateTimeOptions = () => {
    const options = [];
    for (let i = 5; i < 20; i++) {
      for (let j = 0; j < 60; j += 15) {
        const h = i.toString().padStart(2, '0');
        const m = j.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
        const { value: inputVal, isDismissed } = await Swal.fire({
            title: '請輸入教練密碼',
            input: 'password',
            confirmButtonText: '確認',
            allowOutsideClick: false,
            allowEscapeKey: false,
            backdrop: true
        });

        if (isDismissed) {
             navigate('/');
             return;
        }
        if (inputVal && inputVal.toLowerCase().trim() === 'open') {
            setIsAuthenticated(true);
            loadServerData();
        } else {
            if (inputVal !== undefined) await Swal.fire('密碼錯誤', '無法進入教練頁面', 'error');
            navigate('/');
        }
    } catch (e) {
        console.error("Auth Error", e);
        navigate('/');
    }
  };

  const loadServerData = async () => {
    setLoading(true);
    // 🚀 效能優化：一次讀取所有資料
    const bigData = await fetchAllData();
    const dates = Array.isArray(bigData.dates) ? bigData.dates : [];
    
    const dateList = dates.map(d => ({
        date: d.Confirmed_date || d.Confirmed_Date,
        place: d.Place || '',
        time: d.Meeting_Time || ''
    })).filter(d => d.date); 
    
    setDbDates(dateList);
    setLoading(false);
  };

  const formatDateWithDay = (dateString) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateString);
    const dayName = days[d.getDay()];
    return `${dateString.replace(/-/g, '/')}(${dayName})`;
  };

  const handleAddDate = () => {
    if (!selectedDate) return;
    const formattedDate = formatDateWithDay(selectedDate);
    const isDuplicateLocal = openDates.some(d => d.date === formattedDate);
    const isDuplicateDB = dbDates.some(d => d.date === formattedDate);

    if (isDuplicateLocal || isDuplicateDB) {
      Swal.fire('日期已存在', '這個日期已經在清單上了', 'warning');
      return;
    }
    setOpenDates([...openDates, { 
        date: formattedDate, 
        place: selectedPlace,
        time: selectedTime 
    }]);
    setSelectedDate('');
  };

  const handleSubmitDates = async () => {
    if (openDates.length === 0) return;
    setLoading(true);
    let successCount = 0;
    for (const item of openDates) {
      const res = await postData('addDate', { 
          Confirmed_date: item.date,
          Place: item.place,
          Meeting_Time: item.time
      });
      if (res.success) successCount++;
    }
    setLoading(false);
    if (successCount > 0) {
      await Swal.fire('成功開放船練日期!', `已新增 ${successCount} 個日期`, 'success');
      setOpenDates([]);
      loadServerData();
    } else {
      Swal.fire('失敗', '新增日期失敗，請檢查網路', 'error');
    }
  };

  const handleClearPast = async () => {
    const result = await Swal.fire({
      title: '確定要清除過期資料嗎?',
      text: "這將會刪除今天以前的所有日期與報名紀錄",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '確認清除',
      cancelButtonText: '取消'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('clearPastData', {});
      setLoading(false);
      if (res.success) {
        Swal.fire('清除成功', '過期資料已移除', 'success');
        loadServerData();
      } else {
        Swal.fire('清除失敗', res.message, 'error');
      }
    }
  };

  const handleDeleteDbDate = async (dateStr) => {
    const result = await Swal.fire({
        title: '刪除此日期?',
        text: `確定要取消 ${dateStr} 的練習嗎？`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: '刪除',
        cancelButtonText: '取消'
    });
    if(result.isConfirmed) {
        setLoading(true);
        const res = await postData('deleteDate', { Confirmed_date: dateStr });
        setLoading(false);
        if(res.success) {
            loadServerData();
            Swal.fire('已刪除', '', 'success');
        }
    }
  };

  const handleGenerateSeating = async () => {
    setLoading(true);
    const allUsers = await fetchUsers();
    const allRegs = await fetchRegistrations();
    if (allRegs.length === 0) {
      setLoading(false);
      Swal.fire('還沒有隊友報名喔!', '目前沒有任何報名資料', 'info');
      return;
    }
    const newCharts = {};
    dbDates.forEach(item => {
      const registeredNames = allRegs.filter(r => r.practicedates === item.date).map(r => r.name);
      if (registeredNames.length === 0) return;
      const participants = allUsers.filter(u => registeredNames.includes(u.Name));
      
      // 這裡假設 generateSeating 回傳 { left:[], right:[], steer:Obj, drummer:Obj }
      // 如果原本 generateSeating 沒回傳 drummer，這裡可以手動補上
      let boatData = generateSeating(participants);
      if (!boatData.drummer) boatData.drummer = null; // 確保有 drummer 欄位

      newCharts[item.date] = boatData;
    });
    setSeatingCharts(newCharts);
    setLoading(false);
    setTimeout(() => {
        const section = document.getElementById('seating-section');
        if(section) section.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ✨ 修正後的交換邏輯：支援鼓手 (drummer)
  const handleSwapSeat = (date, pos1, pos2) => {
    console.log("CoachPage Swapping:", pos1, pos2);

    // 深拷貝以避免直接修改 state
    const newCharts = JSON.parse(JSON.stringify(seatingCharts));
    const boat = newCharts[date];
    if (!boat) return;

    // 確保陣列長度足夠 (針對左右排)
    const ensureArrayLength = (side, index) => {
        if (side === 'steer' || side === 'drummer') return;
        if (!boat[side]) boat[side] = [];
        while (boat[side].length <= index) {
            boat[side].push(null);
        }
    };

    ensureArrayLength(pos1.side, pos1.index);
    ensureArrayLength(pos2.side, pos2.index);

    // 取得人員資料
    const getPerson = (pos) => {
        if (pos.side === 'steer') return boat.steer;
        if (pos.side === 'drummer') return boat.drummer; // 新增鼓手處理
        return boat[pos.side][pos.index];
    };

    // 設定人員資料
    const setPerson = (pos, person) => {
        if (pos.side === 'steer') {
            boat.steer = person || null;
        } else if (pos.side === 'drummer') {
            boat.drummer = person || null; // 新增鼓手處理
        } else {
            boat[pos.side][pos.index] = person || null;
        }
    };

    // 執行交換
    const person1 = getPerson(pos1);
    const person2 = getPerson(pos2);

    setPerson(pos1, person2);
    setPerson(pos2, person1);

    setSeatingCharts(newCharts);
  };

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-50"></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="relative h-48 md:h-64 w-full shadow-md overflow-hidden bg-orange-600">
         <img src="/Liyu Lake.png" alt="Coach Banner" className="w-full h-full object-cover opacity-70" />
         <div className="absolute inset-0 bg-black/30 flex flex-col justify-center px-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-2">
              <Calendar size={32}/> 教練控制台
            </h1>
            <p className="text-white text-lg md:text-xl mt-2 font-light opacity-95 drop-shadow-md">
              設定練習日期與生成座位表
            </p>
            <button onClick={() => navigate('/')} className="absolute top-6 right-6 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition border border-white/30">
                <Home size={20} /> <span className="hidden md:inline">Home</span>
            </button>
         </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">1</span> 新增開放日期與地點
            </h3>
            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">日期 / Date</label>
                    <input type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">練習地點 / Place</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 text-gray-400" size={20}/>
                        <select className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white appearance-none" value={selectedPlace} onChange={(e) => setSelectedPlace(e.target.value)}>
                            {placeOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">集合時間 / Meeting Time</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-3.5 text-gray-400" size={20}/>
                        <select className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white appearance-none" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                            {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleAddDate} className="bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition font-bold mt-2">加入待送出列表</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
               <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">2</span> 待送出清單
            </h3>
            <div className="flex-1 min-h-[100px] bg-gray-50 rounded-lg p-4 mb-4 space-y-2 overflow-y-auto max-h-60">
              {openDates.length === 0 ? <span className="text-gray-400">尚未選擇新日期...</span> : openDates.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border">
                    <div className="flex flex-col">
                        <span className="font-mono font-bold text-gray-700">{item.date}</span>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {item.place}</span>
                            <span className="flex items-center gap-1 text-orange-600 font-bold"><Clock size={12}/> {item.time}</span>
                        </div>
                    </div>
                    <button onClick={() => setOpenDates(openDates.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                  </div>
              ))}
            </div>
            <button onClick={handleSubmitDates} disabled={openDates.length === 0} className={`w-full py-3 rounded-xl font-bold shadow-md transition ${openDates.length > 0 ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>送出並儲存日期</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">📅 目前已開放報名的日期 (Database)</h3>
            <div className="flex flex-wrap gap-3">
                {dbDates.length === 0 ? "目前沒有開放的日期" : dbDates.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full border border-blue-200">
                        <div className="flex flex-col">
                            <span className="font-mono font-bold">{item.date}</span>
                            <div className="flex gap-2 text-[10px] opacity-80">
                                <span>{item.place}</span>
                                {item.time && <span className="font-bold text-orange-700 bg-orange-100 px-1 rounded">{item.time}</span>}
                            </div>
                        </div>
                        <button onClick={() => handleDeleteDbDate(item.date)} className="text-blue-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
        <hr className="border-gray-200" />
        <div id="seating-section" className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-orange-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-orange-500"/> 槳位生成中心</h2>
            <div className="flex gap-4">
              <button onClick={handleClearPast} className="px-6 py-2 border-2 border-red-100 text-red-500 rounded-full hover:bg-red-50 font-bold transition">清除過期資料</button>
              <button onClick={handleGenerateSeating} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition font-bold flex items-center gap-2"><Zap size={20} fill="currentColor"/> 安排槳位 (Generate)</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-12">
            {Object.keys(seatingCharts).length === 0 ? <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300"><p className="text-gray-400">點擊上方「安排槳位」按鈕開始計算...</p></div> : 
              Object.entries(seatingCharts).map(([date, boatData]) => {
                const targetDateInfo = dbDates.find(d => d.date === date);
                const placeInfo = targetDateInfo ? targetDateInfo.place : '';
                const timeInfo = targetDateInfo ? targetDateInfo.time : ''; 
                return (
                    <div key={date} className="flex flex-col items-center">
                    <SeatVisualizer 
                        boatData={boatData} 
                        date={date} 
                        place={placeInfo} 
                        time={timeInfo}
                        isEditable={true}
                        showStats={true}
                        onSwap={(pos1, pos2) => handleSwapSeat(date, pos1, pos2)}
                    />
                    </div>
                );
              })
            }
          </div>
        </div>
      </div>
      {loading && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div><p className="font-bold text-gray-700">處理中...</p></div></div>}
    </div>
  );
};

export default CoachPage;