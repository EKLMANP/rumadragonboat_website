// src/pages/CoachPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
// Icons
import { 
  Trash2, Calendar, Users, Zap, Home, MapPin, Clock, 
  ClipboardCheck, Trophy, Plus, Save, ChevronRight, ChevronDown, 
  Filter, PieChart, BarChart3, ListChecks, Loader2 // 新增 Loader2 icon
} from 'lucide-react';
// API
import { fetchAllData, postData, saveAttendance, fetchAttendance, fetchDates } from '../api/googleSheets'; 
import { generateSeating } from '../utils/seatingLogic';
import SeatVisualizer from '../components/SeatVisualizer';

const CoachPage = () => {
  const navigate = useNavigate();
  
  // --- 頁籤控制 State ---
  const [activeTab, setActiveTab] = useState('dates'); 

  // --- 基礎設定 State ---
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('碧潭 Bitan');
  const [selectedTime, setSelectedTime] = useState('07:30'); 
  const [openDates, setOpenDates] = useState([]);
  const [dbDates, setDbDates] = useState([]);
  const [seatingCharts, setSeatingCharts] = useState({});
  
  // 🚀 優化 Loading 狀態管理
  const [loading, setLoading] = useState(false); // 控制全頁遮罩 (只在初期載入日期時顯示)
  const [backgroundLoading, setBackgroundLoading] = useState(false); // 控制背景資料載入 (不擋畫面)
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedAuth = useRef(false);

  // --- 點名系統 State ---
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [rollCallDate, setRollCallDate] = useState(''); 
  const [attendanceList, setAttendanceList] = useState([]); 
  const [allUsers, setAllUsers] = useState([]); 
  const [registrations, setRegistrations] = useState([]); 
  
  // --- 排行榜進階篩選 State ---
  const [rawAttendanceHistory, setRawAttendanceHistory] = useState([]); 
  const [leaderboardData, setLeaderboardData] = useState([]); 
  const [totalSessionsInPeriod, setTotalSessionsInPeriod] = useState(0); 

  // 篩選條件
  const [reportType, setReportType] = useState('month'); 
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetDay, setTargetDay] = useState(''); 

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

  useEffect(() => {
    if (rawAttendanceHistory.length > 0) {
        calculateStats();
    }
  }, [rawAttendanceHistory, reportType, targetYear, targetMonth, targetDay]);

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
            loadPriorityData(); // 🚀 登入成功後，只載入最優先的資料
        } else {
            if (inputVal !== undefined) await Swal.fire('密碼錯誤', '無法進入教練頁面', 'error');
            navigate('/');
        }
    } catch (e) {
        console.error("Auth Error", e);
        navigate('/');
    }
  };

  // 🚀 第一階段：極速載入 (只抓日期)
  const loadPriorityData = async () => {
    setLoading(true);
    try {
      // 1. 只呼叫 fetchDates (這非常快)
      const datesData = await fetchDates();
      
      const dates = Array.isArray(datesData) ? datesData : [];
      const dateList = dates.map(d => ({
          date: d.Confirmed_date || d.Confirmed_Date,
          place: d.Place || '',
          time: d.Meeting_Time || ''
      })).filter(d => d.date); 
      
      setDbDates(dateList);
      
      // 設定預設篩選日期
      if (dateList.length > 0) {
          const lastDateStr = dateList[0].date.split('(')[0].replace(/\//g, '-');
          setTargetDay(lastDateStr);
      } else {
          setTargetDay(new Date().toISOString().split('T')[0]);
      }

    } catch (error) {
      console.error("Priority Load Error", error);
    } finally {
      // 🚀 關鍵：日期拿到後立刻解除鎖定，讓使用者看到畫面
      setLoading(false);
      // 接著在背景偷偷載入剩下的重資料
      loadBackgroundData();
    }
  };

  // 🚀 第二階段：背景載入 (抓大資料)
  const loadBackgroundData = async () => {
    setBackgroundLoading(true);
    try {
      // 平行下載所有詳細資料
      const [bigData, attData] = await Promise.all([
        fetchAllData(),
        fetchAttendance()
      ]);

      setAllUsers(bigData.users || []);
      setRegistrations(bigData.registrations || []);
      setRawAttendanceHistory(attData);
      
    } catch (error) {
      console.error("Background Load Error", error);
    } finally {
      setBackgroundLoading(false);
    }
  };

  // --- 統計計算邏輯 ---
  const calculateStats = () => {
    if (!Array.isArray(rawAttendanceHistory)) return;

    const filteredRecords = rawAttendanceHistory.filter(record => {
        const recDate = new Date(record.Date); 
        const recYear = recDate.getFullYear();
        const recMonth = recDate.getMonth() + 1;
        const recDateStr = record.Date.split('(')[0].replace(/\//g, '-');

        if (reportType === 'year') {
            return recYear === parseInt(targetYear);
        } else if (reportType === 'month') {
            return recYear === parseInt(targetYear) && recMonth === parseInt(targetMonth);
        } else if (reportType === 'day') {
            return recDateStr === targetDay;
        }
        return false;
    });

    const uniqueDates = new Set(filteredRecords.map(r => r.Date));
    const totalSessions = uniqueDates.size;
    setTotalSessionsInPeriod(totalSessions);

    const stats = {};
    filteredRecords.forEach(record => {
        const name = record.Name;
        stats[name] = (stats[name] || 0) + 1;
    });

    const result = Object.entries(stats)
      .map(([name, count]) => {
          const rate = totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0;
          return { name, count, rate };
      })
      .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.name.localeCompare(b.name);
      });

    setLeaderboardData(result);
  };

  const formatDateWithDay = (dateString) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateString);
    const dayName = days[d.getDay()];
    return `${dateString.replace(/-/g, '/')}(${dayName})`;
  };

  // --- 操作邏輯 ---
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
    
    // 重新載入日期就好，不需要全部重載
    const datesData = await fetchDates();
    const dates = Array.isArray(datesData) ? datesData : [];
    const dateList = dates.map(d => ({
        date: d.Confirmed_date || d.Confirmed_Date,
        place: d.Place || '',
        time: d.Meeting_Time || ''
    })).filter(d => d.date); 
    setDbDates(dateList);

    setLoading(false);
    if (successCount > 0) {
      await Swal.fire('成功開放船練日期!', `已新增 ${successCount} 個日期`, 'success');
      setOpenDates([]);
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
      confirmButtonText: '確認清除',
      cancelButtonText: '取消'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('clearPastData', {});
      
      // 這裡也只重抓日期即可
      const datesData = await fetchDates();
      const dateList = datesData.map(d => ({
          date: d.Confirmed_date || d.Confirmed_Date,
          place: d.Place || '',
          time: d.Meeting_Time || ''
      })).filter(d => d.date); 
      setDbDates(dateList);

      setLoading(false);
      if (res.success) {
        Swal.fire('清除成功', '過期資料已移除', 'success');
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
        
        // 局部更新 UI，不需要全頁重載
        if(res.success) {
            setDbDates(prev => prev.filter(d => d.date !== dateStr));
            setLoading(false);
            Swal.fire('已刪除', '', 'success');
        } else {
            setLoading(false);
        }
    }
  };

  const handleGenerateSeating = async () => {
    // 這裡不需要 setLoading(true) 因為資料可能已經在背景載好了
    // 檢查背景資料是否載入完成
    if (backgroundLoading) {
        Swal.fire('資料同步中', '請稍候 2-3 秒等待隊員資料同步...', 'info');
        return;
    }

    if (registrations.length === 0) {
      Swal.fire('還沒有隊友報名喔!', '目前沒有任何報名資料', 'info');
      return;
    }
    
    // 開始計算 (這是純前端運算，非常快，不需要 loading spinner)
    const newCharts = {};
    dbDates.forEach(item => {
      const registeredNames = registrations.filter(r => r.practicedates === item.date).map(r => r.name);
      if (registeredNames.length === 0) return;
      const participants = allUsers.filter(u => registeredNames.includes(u.Name));
      
      let boatData = generateSeating(participants);
      if (!boatData.drummer) boatData.drummer = null; 

      newCharts[item.date] = boatData;
    });
    setSeatingCharts(newCharts);
    
    setTimeout(() => {
        const section = document.getElementById('seating-section');
        if(section) section.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSwapSeat = (date, pos1, pos2) => {
    const newCharts = JSON.parse(JSON.stringify(seatingCharts));
    const boat = newCharts[date];
    if (!boat) return;

    const ensureArrayLength = (side, index) => {
        if (side === 'steer' || side === 'drummer') return;
        if (!boat[side]) boat[side] = [];
        while (boat[side].length <= index) {
            boat[side].push(null);
        }
    };

    ensureArrayLength(pos1.side, pos1.index);
    ensureArrayLength(pos2.side, pos2.index);

    const getPerson = (pos) => {
        if (pos.side === 'steer') return boat.steer;
        if (pos.side === 'drummer') return boat.drummer;
        return boat[pos.side][pos.index];
    };

    const setPerson = (pos, person) => {
        if (pos.side === 'steer') {
            boat.steer = person || null;
        } else if (pos.side === 'drummer') {
            boat.drummer = person || null;
        } else {
            boat[pos.side][pos.index] = person || null;
        }
    };

    const person1 = getPerson(pos1);
    const person2 = getPerson(pos2);
    setPerson(pos1, person2);
    setPerson(pos2, person1);
    setSeatingCharts(newCharts);
  };

  // 點名邏輯
  const openRollCall = (specificDate = null) => {
    // 檢查背景資料
    if (backgroundLoading) {
        Swal.fire('資料同步中', '請稍候，正在下載最新報名名單...', 'info');
        return;
    }

    let target = specificDate;
    if (!target) {
        if (dbDates.length > 0) {
            target = dbDates[0].date;
        } else {
            Swal.fire('無日期', '目前沒有任何已開放的練習日期', 'warning');
            return;
        }
    }
    setRollCallDate(target); 
    updateRollCallList(target);
    setShowAttendanceModal(true);
  };

  const updateRollCallList = (date) => {
    const signedUpUsers = registrations
      .filter(r => r.practicedates === date)
      .map(r => r.name);
    setAttendanceList(signedUpUsers);
  };

  const toggleAttendance = (name) => {
    if (attendanceList.includes(name)) {
      setAttendanceList(attendanceList.filter(n => n !== name));
    } else {
      setAttendanceList([...attendanceList, name]);
    }
  };

  const submitAttendance = async () => {
    if (!rollCallDate) return;
    setLoading(true);
    const result = await saveAttendance(rollCallDate, attendanceList);
    setLoading(false);
    if (result.success) {
      setShowAttendanceModal(false);
      Swal.fire('點名完成!', `已儲存 ${rollCallDate} 的點名紀錄`, 'success');
      
      // 更新出席資料 (背景更新即可)
      const attData = await fetchAttendance();
      setRawAttendanceHistory(attData); 
    } else {
      Swal.fire('失敗', '儲存點名失敗', 'error');
    }
  };

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-50"></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      {/* Banner */}
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

      {/* 📌 Tab Navigation (頁籤導航) */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-xl shadow-lg p-2 flex flex-wrap md:flex-nowrap gap-2 border border-gray-100">
            {[
                { id: 'dates', icon: Calendar, label: '日期管理' },
                { id: 'seating', icon: Zap, label: '槳位生成' },
                { id: 'rollcall', icon: ListChecks, label: '點名系統' },
                { id: 'report', icon: BarChart3, label: '出席報表' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-all relative
                        ${activeTab === tab.id 
                            ? 'bg-orange-500 text-white shadow-md' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }
                    `}
                >
                    <tab.icon size={20} />
                    <span className="text-sm md:text-base">{tab.label}</span>
                    
                    {/* 如果背景正在載入資料，且不是第一個 Tab，顯示小轉圈 */}
                    {backgroundLoading && tab.id !== 'dates' && (
                        <span className="absolute top-1 right-1">
                            <Loader2 size={12} className="animate-spin text-orange-400" />
                        </span>
                    )}
                </button>
            ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-4">

        {/* ==================== (a) 新增船練日期 Tab ==================== */}
        {activeTab === 'dates' && (
            <div className="space-y-6 animate-fade-in-down">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 左側：表單 */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Plus size={24} className="text-orange-500"/> 新增開放日期
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">日期 / Date</label>
                                <input type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">地點 / Place</label>
                                    <select className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white" value={selectedPlace} onChange={(e) => setSelectedPlace(e.target.value)}>
                                        {placeOptions.map(p => <option key={p} value={p}>{p.split(' ')[0]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">時間 / Time</label>
                                    <select className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none bg-white" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                                        {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleAddDate} className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition font-bold mt-2 flex items-center justify-center gap-2">
                                加入待送出列表 <ChevronRight size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* 右側：待送出清單 */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Save size={24} className="text-orange-500"/> 待送出清單
                        </h3>
                        <div className="flex-1 min-h-[100px] bg-gray-50 rounded-lg p-4 mb-4 space-y-2 overflow-y-auto max-h-60">
                            {openDates.length === 0 ? <span className="text-gray-400">尚未選擇新日期...</span> : openDates.map((item, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border">
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-gray-700">{item.date}</span>
                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><MapPin size={12}/> {item.place.split(' ')[0]}</span>
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

                {/* 下方：DB 日期列表 (方便刪除) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">📅 目前已開放的練習場次 (Database)</h3>
                    <div className="flex flex-wrap gap-3">
                        {dbDates.length === 0 ? "目前沒有開放的日期" : dbDates.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full border border-blue-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-mono font-bold">{item.date}</span>
                                    <div className="flex gap-2 text-[10px] opacity-80">
                                        <span>{item.place.split(' ')[0]}</span>
                                        {item.time && <span className="font-bold text-orange-700 bg-orange-100 px-1 rounded">{item.time}</span>}
                                    </div>
                                </div>
                                <div className="w-[1px] h-6 bg-blue-200 mx-1"></div>
                                <button onClick={() => handleDeleteDbDate(item.date)} className="text-gray-400 hover:text-red-500 p-1" title="刪除">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ==================== (b) 槳位生成 Tab ==================== */}
        {activeTab === 'seating' && (
            <div id="seating-section" className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-orange-500 animate-fade-in-down">
                {/* 顯示背景同步提示 */}
                {backgroundLoading && (
                    <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                        <Loader2 className="animate-spin" size={16}/> 正在同步最新隊員資料與報名紀錄，請稍候...
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Zap className="text-orange-500"/> 槳位生成中心</h2>
                    <div className="flex gap-4">
                        <button onClick={handleClearPast} className="px-6 py-2 border-2 border-red-100 text-red-500 rounded-full hover:bg-red-50 font-bold transition">清除過期資料</button>
                        <button onClick={handleGenerateSeating} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition font-bold flex items-center gap-2">
                            <Zap size={20} fill="currentColor"/> 重新計算 (Regenerate)
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-12">
                    {Object.keys(seatingCharts).length === 0 ? <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300"><p className="text-gray-400">尚未生成，請點擊上方按鈕...</p></div> : 
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
        )}

        {/* ==================== (c) 點名系統 Tab ==================== */}
        {activeTab === 'rollcall' && (
            <div className="animate-fade-in-down">
                {backgroundLoading && (
                    <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                        <Loader2 className="animate-spin" size={16}/> 正在同步報名名單，請稍候...
                    </div>
                )}

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <div className="mb-6 flex items-center justify-between">
                         <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ClipboardCheck className="text-green-600" /> 選擇場次進行點名
                        </h3>
                    </div>
                    
                    {dbDates.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                            目前沒有任何練習場次，請先至「日期管理」新增。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dbDates.map((item) => (
                                <div key={item.date} 
                                     onClick={() => openRollCall(item.date)}
                                     className="group cursor-pointer bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-green-400 transition-all flex flex-col gap-3 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                                        <ClipboardCheck size={48} className="text-green-500" />
                                    </div>
                                    <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                                        <Calendar size={20} /> {item.date.split('(')[0]}
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                                        <span className="flex items-center gap-1"><Clock size={14}/> {item.time}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14}/> {item.place.split(' ')[0]}</span>
                                    </div>
                                    <button className="mt-2 w-full py-2 bg-green-50 text-green-700 font-bold rounded-lg group-hover:bg-green-600 group-hover:text-white transition">
                                        開始點名
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ==================== (d) 出席報表 Tab ==================== */}
        {activeTab === 'report' && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-100 animate-fade-in-down">
            {backgroundLoading && (
                <div className="mb-4 bg-yellow-50 text-yellow-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-yellow-100">
                    <Loader2 className="animate-spin" size={16}/> 正在統計最新數據...
                </div>
            )}

            {/* 標題與篩選控制列 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">出席率排行榜</h3>
                        <p className="text-xs text-gray-500">Total Sessions: <span className="font-bold text-blue-600 text-sm">{totalSessionsInPeriod}</span> 次練習</p>
                    </div>
                </div>
                
                {/* 篩選器群組 */}
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <div className="flex bg-white rounded-md shadow-sm p-1 border border-gray-200">
                        <button onClick={() => setReportType('year')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType==='year' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>年</button>
                        <button onClick={() => setReportType('month')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType==='month' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>月</button>
                        <button onClick={() => setReportType('day')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType==='day' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>日</button>
                    </div>

                    <div className="flex items-center gap-2">
                        {reportType !== 'day' && (
                            <select 
                                value={targetYear} 
                                onChange={(e) => setTargetYear(e.target.value)}
                                className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {Array.from({length: 3}, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                    <option key={y} value={y}>{y} 年</option>
                                ))}
                            </select>
                        )}
                        {reportType === 'month' && (
                            <select 
                                value={targetMonth} 
                                onChange={(e) => setTargetMonth(e.target.value)}
                                className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{m} 月</option>
                                ))}
                            </select>
                        )}
                        {reportType === 'day' && (
                            <input 
                                type="date" 
                                value={targetDay}
                                onChange={(e) => setTargetDay(e.target.value)}
                                className="pl-2 pr-2 py-1 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 排行榜列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaderboardData.map((stat, index) => (
                <div key={stat.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border hover:bg-yellow-50 transition group">
                  <div className="flex items-center gap-3 w-full">
                    {/* 排名 Icon (前三名 Emoji) */}
                    <div className="shrink-0 w-10 text-center">
                        {index === 0 ? <span className="text-3xl drop-shadow-sm">🥇</span> :
                         index === 1 ? <span className="text-3xl drop-shadow-sm">🥈</span> :
                         index === 2 ? <span className="text-3xl drop-shadow-sm">🥉</span> :
                         <span className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 font-bold flex items-center justify-center mx-auto shadow-sm">
                            {index + 1}
                         </span>
                        }
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                            <span className="font-bold text-gray-700">{stat.name}</span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{stat.count} 次</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    stat.rate >= 80 ? 'bg-green-500' : 
                                    stat.rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${stat.rate}%` }}
                             ></div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-right mt-0.5">{stat.rate}% 出席率</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {leaderboardData.length === 0 && (
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                    <PieChart size={48} className="mb-2 opacity-20"/>
                    <p>該區間尚無點名紀錄</p>
                 </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 點名 Modal (共用元件) */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="text-green-800" /> 
                <div className="flex flex-col">
                    <span className="text-xs text-green-700 font-bold uppercase tracking-wider">ROLL CALL</span>
                    <div className="relative group cursor-pointer">
                        <select 
                            value={rollCallDate} 
                            onChange={(e) => {
                                setRollCallDate(e.target.value);
                                updateRollCallList(e.target.value);
                            }}
                            className="appearance-none bg-transparent font-bold text-lg text-green-900 outline-none cursor-pointer pr-6 border-b border-transparent hover:border-green-500 transition"
                        >
                            {dbDates.map(d => (
                                <option key={d.date} value={d.date}>{d.date}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-0 top-1.5 text-green-700 pointer-events-none"/>
                    </div>
                </div>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-800 font-bold p-1 rounded-full hover:bg-gray-100 transition">
                <Trash2 size={20} className="rotate-45" /> 
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
              <p className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-1"><Users size={14}/> 預約報名名單：</p>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                {registrations
                  .filter(r => r.practicedates === rollCallDate)
                  .map(reg => (
                    <div 
                      key={reg.name} 
                      onClick={() => toggleAttendance(reg.name)}
                      className={`
                        p-3 rounded-lg border cursor-pointer flex items-center justify-between transition select-none shadow-sm
                        ${attendanceList.includes(reg.name) 
                          ? 'bg-green-100 border-green-500 text-green-900 shadow-md' 
                          : 'bg-white border-gray-200 text-gray-400 grayscale opacity-70'}
                      `}
                    >
                      <span className="font-bold">{reg.name}</span>
                      {attendanceList.includes(reg.name) && <Zap size={16} className="text-green-600 fill-green-600"/>}
                    </div>
                ))}
                {registrations.filter(r => r.practicedates === rollCallDate).length === 0 && (
                    <div className="col-span-2 text-center text-gray-400 py-4 bg-white rounded border border-dashed">此日期無人報名</div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><Plus size={14}/> 新增空降 (沒報名但有來)：</p>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-300 outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleAttendance(e.target.value);
                      e.target.value = ''; // Reset
                    }
                  }}
                >
                  <option value="">-- 選擇隊員加入 --</option>
                  {allUsers
                    .filter(u => {
                        const isRegistered = registrations.some(r => r.practicedates === rollCallDate && r.name === u.Name);
                        return !isRegistered;
                    })
                    .filter(u => !attendanceList.includes(u.Name)) 
                    .map(u => (
                      <option key={u.Name} value={u.Name}>{u.Name}</option>
                    ))
                  }
                </select>

                <div className="mt-3 flex flex-wrap gap-2">
                   {attendanceList
                     .filter(name => {
                        return !registrations.some(r => r.practicedates === rollCallDate && r.name === name);
                     })
                     .map(name => (
                       <span key={name} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-sm border border-yellow-200">
                         {name} 
                         <button onClick={() => toggleAttendance(name)} className="hover:text-red-600 bg-white rounded-full p-0.5 ml-1"><Trash2 size={12}/></button>
                       </span>
                     ))
                   }
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white flex gap-3">
              <button onClick={() => setShowAttendanceModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition">取消</button>
              <button onClick={submitAttendance} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 transition">
                <Save size={18} /> 確認送出 ({attendanceList.length}人)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全頁 Loading 遮罩 - 只有在初始載入「日期」時會出現 */}
      {loading && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl flex flex-col items-center gap-4"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div><p className="font-bold text-gray-700">處理中...</p></div></div>}
    </div>
  );
};

export default CoachPage;