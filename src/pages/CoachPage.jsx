// src/pages/CoachPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
// Icons
import {
  Trash2, Calendar, Users, Zap, Home, MapPin, Clock,
  ClipboardCheck, Trophy, Plus, Save, ChevronRight, ChevronDown,
  Filter, PieChart, BarChart3, ListChecks, Loader2, Info, Megaphone, Newspaper, Edit, X
} from 'lucide-react';
// API
import { fetchAllData, postData, saveAttendance, fetchAttendance, fetchActivities, fetchActivityRegistrations, fetchAnnouncements, fetchDates, adminListUsers, saveSeatingArrangement } from '../api/supabaseApi';
import { generateSeating } from '../utils/seatingLogic';
import SeatVisualizer from '../components/SeatVisualizer';
import AppLayout from '../components/AppLayout';
import NewsManager from '../components/NewsManager';

const CoachPage = () => {
  const navigate = useNavigate();

  // --- 頁籤控制 State ---
  const [activeTab, setActiveTab] = useState('dates');

  // --- 基礎設定 State ---
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'boat_practice',
    date: '',
    start_time: '07:30',
    end_time: '11:30',
    location: '碧潭 Bitan',
    customLocation: '',
    deadline: '',
    description: ''
  });

  // --- 公告管理 State ---
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    category: '活動',
    pinned: false
  });
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // Legacy states (kept for transitional logic if needed, but primary is activities now)
  const [dbDates, setDbDates] = useState([]); // Still used for compatibility until full refactor
  const [seatingCharts, setSeatingCharts] = useState({});

  // Loading 狀態管理
  const [loading, setLoading] = useState(false); // 全頁遮罩
  const [backgroundLoading, setBackgroundLoading] = useState(false); // 背景載入



  // --- 點名系統 State ---
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [rollCallDate, setRollCallDate] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [activityRegistrations, setActivityRegistrations] = useState([]); // New state for raw activity regs
  const [adminMembers, setAdminMembers] = useState([]);

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
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 15) {
        const h = i.toString().padStart(2, '0');
        const m = j.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  };

  useEffect(() => {
    loadPriorityData();
  }, []);

  useEffect(() => {
    if (rawAttendanceHistory.length > 0) {
      calculateStats();
    }
  }, [rawAttendanceHistory, reportType, targetYear, targetMonth, targetDay]);



  const loadPriorityData = async () => {
    setLoading(true);
    try {
      // Phase 1: 優先載入活動和公告 (最常用的資料) - 快速載入
      const [activitiesData, announcementsData, adminUsersData] = await Promise.all([
        fetchActivities(),
        fetchAnnouncements(),
        adminListUsers()
      ]);

      setActivities(activitiesData || []);
      setAnnouncements(announcementsData || []);
      if (adminUsersData?.success && adminUsersData.data?.users) {
        setAdminMembers(adminUsersData.data.users);
      }

      // Legacy Date Handling (Map boat_practice activities to dbDates for seating chart compatibility)
      const practiceActivities = (activitiesData || []).filter(a => a.type === 'boat_practice');
      const mappedDates = practiceActivities.map(a => ({
        date: formatDateWithDay(a.date),
        place: a.location,
        time: a.start_time
      }));
      setDbDates(mappedDates);

      // 初始日期設定
      if (mappedDates.length > 0) {
        setTargetDay(mappedDates[0].date.split('(')[0].replace(/\//g, '-'));
      } else {
        setTargetDay(new Date().toISOString().split('T')[0]);
      }

      // 關閉主 Loading，讓使用者可以開始操作
      setLoading(false);

      // Phase 2: 背景延遲載入剩餘資料 (輕量查詢，不阻塞 UI)
      setBackgroundLoading(true);

      // 延遲 100ms 讓 UI 有時間渲染
      await new Promise(resolve => setTimeout(resolve, 100));

      // 分開載入，避免一次請求太多
      const [attData, actRegsData] = await Promise.all([
        fetchAttendance(),
        fetchActivityRegistrations()
      ]);

      setActivityRegistrations(actRegsData || []);

      // 單獨輕量請求 members (不用 fetchAllData)
      const { data: membersData } = await import('../lib/supabase').then(m =>
        m.supabase.from('members').select('name, email, weight, position, skill_rating').order('name')
      );

      const allUsersData = (membersData || []).map(m => ({
        Name: m.name,
        Email: m.email,
        Weight: m.weight,
        Position: m.position,
        Skill_Rating: m.skill_rating
      }));
      setAllUsers(allUsersData);

      const newRegsMapped = (actRegsData || []).map(r => {
        // 嘗試從 adminUsersData (已載入的完整成員列表) 查找使用者資訊
        // 解決 API 回傳 registrations 時缺少 users 關聯導致名字為 Unknown 的問題
        const userInfo = adminUsersData?.data?.users?.find(u => u.id === r.user_id);
        const resolvedName = userInfo?.memberName || userInfo?.email || r.users?.name || 'Unknown';

        return {
          name: resolvedName,
          practicedates: r.activities?.date ? formatDateWithDay(r.activities.date) : '',
          activityId: r.activity_id
        };
      }).filter(r => r.practicedates);

      setRegistrations(newRegsMapped);
      setRawAttendanceHistory(attData);

    } catch (error) {
      console.error("Load Error", error);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

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

  // --- 操作邏輯 (New Activity System) ---
  const handleCreateActivity = async () => {
    // Validation
    if (!newActivity.name || !newActivity.date || !newActivity.type) {
      Swal.fire('欄位未填', '請填寫活動名稱、類型與日期', 'warning');
      return;
    }

    // 處理自訂地點
    const finalLocation = newActivity.location === 'Other'
      ? (newActivity.customLocation || '其他')
      : newActivity.location;

    // 處理「待定」時間 - 轉為 null 避免 DB 錯誤
    const finalStartTime = newActivity.start_time === 'Pending' ? null : newActivity.start_time;
    const finalEndTime = newActivity.end_time === 'Pending' ? null : newActivity.end_time;

    // Confirmation
    const result = await Swal.fire({
      title: '確定建立活動?',
      html: `
            <div class="text-left">
                <p><strong>名稱:</strong> ${newActivity.name}</p>
                <p><strong>類型:</strong> ${newActivity.type}</p>
                <p><strong>日期:</strong> ${newActivity.date}</p>
                <p><strong>地點:</strong> ${finalLocation}</p>
            </div>
        `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '建立',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const activityToCreate = {
        ...newActivity,
        location: finalLocation,
        start_time: finalStartTime,
        end_time: finalEndTime
      };
      const res = await postData('addActivity', activityToCreate);

      if (res.success) {
        // Refresh
        const updatedActivities = await fetchActivities();
        setActivities(updatedActivities || []);

        // Allow legacy logic refresh too
        const practiceActivities = (updatedActivities || []).filter(a => a.type === 'boat_practice');
        setDbDates(practiceActivities.map(a => ({
          date: formatDateWithDay(a.date),
          place: a.location,
          time: a.start_time
        })));

        setNewActivity(prev => ({ ...prev, name: '', date: '', deadline: '', customLocation: '' })); // Reset non-defaults
        Swal.fire('成功', '活動已建立', 'success');
      } else {
        Swal.fire('失敗', res.message || '建立失敗', 'error');
      }
      setLoading(false);
    }
  };


  const handleDeleteActivity = async (id, name) => {
    const result = await Swal.fire({
      title: '刪除活動?',
      text: `確定要刪除 ${name} 嗎？這將會刪除所有相關報名紀錄。`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteActivity', { id });
      if (res.success) {
        setActivities(prev => prev.filter(a => a.id !== id));
        Swal.fire('已刪除', '', 'success');
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
      setLoading(false);
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

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.date) {
      Swal.fire('欄位未填', '請填寫標題、內容與日期', 'warning');
      return;
    }

    setLoading(true);
    const res = await postData('addAnnouncement', newAnnouncement);
    if (res.success) {
      const updated = await fetchAnnouncements();
      setAnnouncements(updated || []);
      setNewAnnouncement({
        title: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        category: '活動',
        pinned: false
      });
      Swal.fire('發布成功', '', 'success');
    } else {
      Swal.fire('發布失敗', res.message, 'error');
    }
    setLoading(false);
  };

  const handleDeleteAnnouncement = async (id) => {
    const result = await Swal.fire({
      title: '刪除公告?',
      text: '確定要刪除此公告嗎？',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteAnnouncement', { id });
      if (res.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        Swal.fire('已刪除', '', 'success');
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
      setLoading(false);
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    setLoading(true);
    const res = await postData('updateAnnouncement', editingAnnouncement);
    if (res.success) {
      const updated = await fetchAnnouncements();
      setAnnouncements(updated || []);
      setEditingAnnouncement(null);
      Swal.fire('更新成功', '', 'success');
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
    setLoading(false);
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
    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteDate', { Confirmed_date: dateStr });

      if (res.success) {
        setDbDates(prev => prev.filter(d => d.date !== dateStr));
        setLoading(false);
        Swal.fire('已刪除', '', 'success');
      } else {
        setLoading(false);
      }
    }
  };

  const handleGenerateSeating = async () => {
    if (backgroundLoading) {
      Swal.fire('資料同步中', '請稍候 2-3 秒等待隊員資料同步...', 'info');
      return;
    }

    if (registrations.length === 0) {
      Swal.fire('還沒有隊友報名喔!', '目前沒有任何報名資料', 'info');
      return;
    }

    const newCharts = {};
    dbDates.forEach(item => {
      const registeredNames = registrations.filter(r => r.practicedates === item.date).map(r => r.name);
      if (registeredNames.length === 0) return;
      const participants = allUsers.filter(u => registeredNames.includes(u.Name));

      if (!boatData.drummer) boatData.drummer = null;
      newCharts[item.date] = boatData;

      // 🔥 Sync to DB Immediately
      saveSeatingArrangement(item.date, boatData).catch(err => console.error('Auto-save failed:', err));
    });
    setSeatingCharts(newCharts);

    Swal.fire({
      icon: 'success',
      title: '槳位已生成',
      text: '座位表已自動同步至前台',
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => {
      const section = document.getElementById('seating-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
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

    // 🔥 Sync to DB on Swap
    saveSeatingArrangement(date, newCharts[date]).catch(err => console.error('Swap save failed:', err));
  };

  // --- 點名邏輯 ---
  const openRollCall = (specificDate = null) => {
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

  // ✨✨✨ 點名優化：樂觀更新 (Optimistic UI Update) ✨✨✨
  const updateLocalHistoryOptimistically = (dateStr, names) => {
    // 1. 標準化日期格式：將 "2026/01/07(Wed)" 轉為 "2026-01-07"
    // 這樣本地數據格式會跟資料庫讀回來的格式一致
    const cleanDate = dateStr.split('(')[0].replace(/\//g, '-');

    setRawAttendanceHistory(prev => {
      // 2. 先移除該日期原本的舊紀錄 (以免重複或沒更新到移除的人)
      const filtered = prev.filter(r => {
        const rDate = r.Date.split('(')[0].replace(/\//g, '-');
        return rDate !== cleanDate;
      });

      // 3. 塞入新的紀錄
      const newRecords = names.map(name => ({
        Date: cleanDate,
        Name: name
      }));

      // 4. 回傳合併後的數據 -> 這會直接觸發 useEffect 重新計算排行榜
      return [...filtered, ...newRecords];
    });
  };

  const submitAttendance = async () => {
    if (!rollCallDate) return;

    // 1. 啟動 Loading 遮罩
    setLoading(true);

    // 2. 呼叫後端儲存 (這個動作需要 1-2 秒，是唯一的等待時間)
    const result = await saveAttendance(rollCallDate, attendanceList);

    // 3. 請求完成，**立刻**關閉 Loading
    // 我們不需要等待 fetchAttendance (因為那個很慢)，這裡直接讓使用者覺得完成了
    setLoading(false);

    if (result.success) {
      setShowAttendanceModal(false);

      // 4. 顯示成功訊息 (設定 timer 自動關閉，且隱藏確認按鈕，讓流程更順)
      Swal.fire({
        icon: 'success',
        title: '點名完成!',
        text: `已儲存 ${rollCallDate} 的紀錄`,
        timer: 1500,
        showConfirmButton: false
      });

      // 5. 【關鍵】直接在本地端更新排行榜資料 (Optimistic Update)
      // 這樣使用者切換到「出席報表」時，數據已經是新的了，不用等網路下載
      updateLocalHistoryOptimistically(rollCallDate, attendanceList);

    } else {
      Swal.fire('失敗', '儲存點名失敗', 'error');
    }
  };



  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            📝 幹部專區
          </h1>
          <p className="text-gray-500 mt-1">
            設定練習日期、生成座位表、點名與出席統計
          </p>
        </div>

        {/* 📌 Tab Navigation (頁籤導航) */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap md:flex-nowrap gap-2 mb-6">
          {[
            { id: 'dates', icon: Calendar, label: '活動管理' },
            { id: 'announcements', icon: Megaphone, label: '建立公告' },
            { id: 'news', icon: Newspaper, label: '最新消息' },
            { id: 'seating', icon: Zap, label: '槳位生成' },
            { id: 'rollcall', icon: ListChecks, label: '點名系統' },
            { id: 'report', icon: BarChart3, label: '出席報表' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all relative
                ${activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <tab.icon size={20} />
              <span className="text-sm md:text-base">{tab.label}</span>
              {backgroundLoading && tab.id !== 'dates' && (
                <span className="absolute top-1 right-1">
                  <Loader2 size={12} className="animate-spin text-sky-400" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-6">

          {/* ==================== (a) 活動管理 Tab (Activity Management) ==================== */}
          {activeTab === 'dates' && (
            <div className="space-y-6 animate-fade-in-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. 建立活動區塊 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Plus size={24} className="text-orange-500" /> 建立新活動
                  </h3>
                  <div className="flex flex-col gap-4">
                    {/* 活動名稱 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">活動名稱</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none text-gray-900"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                        placeholder="例如：平日夜練、端午競賽..."
                      />
                    </div>

                    {/* 活動類別 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">活動類別</label>
                      <select
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-300 outline-none text-gray-900"
                        value={newActivity.type}
                        onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                      >
                        <option value="boat_practice">船練 (Boat Practice)</option>
                        <option value="team_building">Team Building</option>
                        <option value="race">龍舟比賽 (Race)</option>
                        <option value="internal_competition">內部競賽 (Internal Comp)</option>
                      </select>
                    </div>

                    {/* 日期與截止日 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">活動日期</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newActivity.date}
                          onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">報名截止日</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newActivity.deadline}
                          onChange={(e) => setNewActivity({ ...newActivity, deadline: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 地點與時間 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">地點</label>
                        {/* 根據活動類別顯示不同選項 */}
                        {(newActivity.type === 'boat_practice' || newActivity.type === 'race') ? (
                          <>
                            <select
                              className="w-full p-2 border rounded-lg text-gray-900"
                              value={newActivity.location}
                              onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value, customLocation: '' })}
                            >
                              <option value="碧潭 Bitan">碧潭 Bitan</option>
                              <option value="百齡橋 Bailing Bridge">百齡橋 Bailing Bridge</option>
                              <option value="蘆洲微風運河 Luzhou">蘆洲微風運河 Luzhou</option>
                              <option value="大直龍舟碼頭 Dazhi">大直龍舟碼頭 Dazhi</option>
                              <option value="Other">其他 (自行輸入)</option>
                            </select>
                            {newActivity.location === 'Other' && (
                              <input
                                type="text"
                                className="w-full p-2 border rounded-lg text-gray-900 mt-2"
                                value={newActivity.customLocation}
                                onChange={(e) => setNewActivity({ ...newActivity, customLocation: e.target.value })}
                                placeholder="請輸入自訂地點..."
                              />
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            className="w-full p-2 border rounded-lg text-gray-900"
                            value={newActivity.location}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            placeholder="輸入地點..."
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">時間 (起訖)</label>
                        <div className="flex items-center gap-1 h-[38px]">
                          <select
                            className="w-full p-2 border rounded-lg text-sm text-gray-900"
                            value={newActivity.start_time}
                            onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                          >
                            <option value="Pending">待定</option>
                            {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-gray-500">-</span>
                          <select
                            className="w-full p-2 border rounded-lg text-sm text-gray-900"
                            value={newActivity.end_time}
                            onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                          >
                            <option value="Pending">待定</option>
                            {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>


                    <button
                      onClick={handleCreateActivity}
                      className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition font-bold mt-4 shadow-md flex items-center justify-center gap-2"
                    >
                      建立活動 <Save size={18} />
                    </button>
                  </div>
                </div>

                {/* 2. 已建立活動清單 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <ListChecks size={24} className="text-blue-500" /> 已建立活動 ({activities.length})
                  </h3>
                  <div className="flex-1 min-h-[300px] bg-gray-50 rounded-lg p-2 space-y-2 overflow-y-auto max-h-[500px]">
                    {activities.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">目前沒有已建立的活動</div>
                    ) : (
                      activities.map((activity) => (
                        <div key={activity.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2 hover:border-blue-300 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold
                                                ${activity.type === 'boat_practice' ? 'bg-blue-500' :
                                    activity.type === 'race' ? 'bg-red-500' :
                                      activity.type === 'team_building' ? 'bg-green-500' : 'bg-purple-500'}
                                            `}>
                                  {activity.type === 'boat_practice' ? '船練' :
                                    activity.type === 'race' ? '比賽' :
                                      activity.type === 'team_building' ? '團建' : '內賽'}
                                </span>
                                <span className="font-bold text-gray-800">{activity.name}</span>
                              </div>
                              <div className="flex flex-col text-xs text-gray-500 mt-1 gap-1">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {activity.date}</span>
                                <span className="flex items-center gap-1"><MapPin size={12} /> {activity.location}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteActivity(activity.id, activity.name)}
                              className="text-gray-300 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 3. 活動報名統計區塊 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                  <BarChart3 size={20} /> 活動報名統計
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm">
                        <th className="p-3 rounded-l-lg">活動名稱</th>
                        <th className="p-3">日期</th>
                        <th className="p-3">類別</th>
                        <th className="p-3 rounded-r-lg">已報名人數</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {activities.map(activity => {
                        const count = activityRegistrations.filter(r => r.activity_id === activity.id).length;
                        return (
                          <tr key={activity.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                            <td className="p-3 font-bold text-gray-800">{activity.name}</td>
                            <td className="p-3 text-gray-600">{activity.date}</td>
                            <td className="p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold
                                                ${activity.type === 'boat_practice' ? 'bg-blue-500' :
                                  activity.type === 'race' ? 'bg-red-500' :
                                    activity.type === 'team_building' ? 'bg-green-500' : 'bg-purple-500'}
                                            `}>
                                {activity.type === 'boat_practice' ? '船練' : activity.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <button
                                className="text-blue-600 font-bold hover:underline"
                                onClick={() => {
                                  const registrationList = activityRegistrations
                                    .filter(r => r.activity_id === activity.id)
                                    .map((r, idx) => {
                                      const userInfo = adminMembers.find(u => u.id === r.user_id);
                                      return {
                                        regNo: `REG-${activity.id.toString().slice(0, 4).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
                                        name: userInfo?.memberName || userInfo?.email || r.users?.name || 'Unknown',
                                        email: userInfo?.email || r.users?.email || '-'
                                      };
                                    });

                                  if (registrationList.length === 0) {
                                    return Swal.fire({
                                      title: `${activity.name} 報名名單`,
                                      text: '尚無人報名',
                                      icon: 'info'
                                    });
                                  }

                                  // 生成表格 HTML
                                  const tableHtml = `
                                    <div style="max-height: 300px; overflow-y: auto;">
                                      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                        <thead>
                                          <tr style="background: #f3f4f6;">
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">報名編號</th>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">姓名</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${registrationList.map(r => `
                                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                              <td style="padding: 10px; font-family: monospace; color: #6b7280;">${r.regNo}</td>
                                              <td style="padding: 10px; font-weight: 500;">${r.name}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>
                                  `;

                                  Swal.fire({
                                    title: `${activity.name} 報名名單 (${count})`,
                                    html: tableHtml,
                                    width: 500,
                                    showCancelButton: true,
                                    confirmButtonText: '📥 下載 Excel',
                                    confirmButtonColor: '#10b981',
                                    cancelButtonText: '關閉',
                                    showCloseButton: true
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      // 生成 CSV 格式 (Excel 可開啟)
                                      const BOM = '\uFEFF'; // UTF-8 BOM for Excel
                                      const csvContent = BOM + '報名編號,姓名,Email\n' +
                                        registrationList.map(r => `${r.regNo},${r.name},${r.email}`).join('\n');

                                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                      const url = URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = `${activity.name}_報名名單_${activity.date}.csv`;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      URL.revokeObjectURL(url);

                                      Swal.fire({
                                        icon: 'success',
                                        title: '下載成功',
                                        text: '報名名單已下載為 CSV 檔案 (可用 Excel 開啟)',
                                        timer: 2000,
                                        showConfirmButton: false
                                      });
                                    }
                                  });
                                }}
                              >
                                {count} 人 (查看名單)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {activities.length === 0 && <div className="p-4 text-center text-gray-400">尚無活動資料</div>}
                </div>
              </div>
            </div>
          )}

          {/* ==================== (c) 公告管理 Tab (Announcements) ==================== */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 animate-fade-in-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. 建立公告 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Megaphone size={24} className="text-red-500" /> 發布新公告
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">公告標題</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none text-gray-900"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        placeholder="輸入標題..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">日期</label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newAnnouncement.date}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">分類</label>
                        <select
                          className="w-full p-2 border rounded-lg text-gray-900"
                          value={newAnnouncement.category}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                        >
                          <option value="活動">活動</option>
                          <option value="比賽">比賽</option>
                          <option value="裝勤">裝勤</option>
                          <option value="榮譽">榮譽</option>
                          <option value="其他">其他</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">內容</label>
                      <textarea
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none h-32 text-gray-900"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        placeholder="輸入公告詳細內容..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pinned"
                        checked={newAnnouncement.pinned}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, pinned: e.target.checked })}
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <label htmlFor="pinned" className="text-sm font-medium text-gray-700 select-none cursor-pointer">置頂此公告</label>
                    </div>
                    <button
                      onClick={handleCreateAnnouncement}
                      className="w-full py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold shadow-md flex items-center justify-center gap-2"
                    >
                      發布公告 <Save size={18} />
                    </button>
                  </div>
                </div>

                {/* 2. 公告列表 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <ListChecks size={24} className="text-gray-500" /> 已發布公告 ({announcements.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 bg-gray-50 p-3 rounded-lg">
                    {announcements.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">尚無公告</div>
                    ) : (
                      announcements.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-red-200 transition">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {item.pinned && <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded font-bold">置頂</span>}
                                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold">{item.category}</span>
                                <span className="text-xs text-gray-400">{item.date}</span>
                              </div>
                              <h4 className="font-bold text-gray-800">{item.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                            </div>
                            <button
                              onClick={() => handleEditAnnouncement(item)}
                              className="text-gray-300 hover:text-blue-500 p-1 mr-1"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(item.id)}
                              className="text-gray-300 hover:text-red-500 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== (b) 槳位生成 Tab ==================== */}
          {activeTab === 'news' && (
            <NewsManager />
          )}

          {/* ==================== (c) 槳位生成 Tab ==================== */}
          {activeTab === 'seating' && (
            <div id="seating-section" className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-orange-500 animate-fade-in-down">
              {/* 顯示背景同步提示 */}
              {backgroundLoading && (
                <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-blue-100">
                  <Loader2 className="animate-spin" size={16} /> 正在同步最新隊員資料與報名紀錄，請稍候...
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Zap className="text-orange-500" /> 槳位生成中心</h2>
                <div className="flex gap-4">
                  <button onClick={handleClearPast} className="px-6 py-2 border-2 border-red-100 text-red-500 rounded-full hover:bg-red-50 font-bold transition">清除過期資料</button>
                  <button onClick={handleGenerateSeating} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition font-bold flex items-center gap-2">
                    <Zap size={20} fill="currentColor" /> 生成槳位
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
                  <Loader2 className="animate-spin" size={16} /> 正在同步報名名單，請稍候...
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
                          <span className="flex items-center gap-1"><Clock size={14} /> {item.time}</span>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {item.place.split(' ')[0]}</span>
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
                  <Loader2 className="animate-spin" size={16} /> 正在統計最新數據...
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
                    <button onClick={() => setReportType('year')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'year' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>年</button>
                    <button onClick={() => setReportType('month')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'month' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>月</button>
                    <button onClick={() => setReportType('day')} className={`px-3 py-1 rounded text-xs font-bold transition ${reportType === 'day' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>日</button>
                  </div>

                  <div className="flex items-center gap-2">
                    {reportType !== 'day' && (
                      <select
                        value={targetYear}
                        onChange={(e) => setTargetYear(e.target.value)}
                        className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
                      >
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                          <option key={y} value={y}>{y} 年</option>
                        ))}
                      </select>
                    )}
                    {reportType === 'month' && (
                      <select
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="pl-2 pr-6 py-1.5 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m} 月</option>
                        ))}
                      </select>
                    )}
                    {reportType === 'day' && (
                      <input
                        type="date"
                        value={targetDay}
                        onChange={(e) => setTargetDay(e.target.value)}
                        className="pl-2 pr-2 py-1 bg-white border border-gray-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 text-gray-800"
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
                            className={`h-full rounded-full transition-all duration-500 ${stat.rate >= 80 ? 'bg-green-500' :
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
                    <PieChart size={48} className="mb-2 opacity-20" />
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
                        className="appearance-none bg-transparent font-bold text-lg text-gray-800 outline-none cursor-pointer pr-6 border-b border-transparent hover:border-green-500 transition"
                      >
                        {dbDates.map(d => (
                          <option key={d.date} value={d.date}>{d.date}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-0 top-1.5 text-green-700 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-800 font-bold p-1 rounded-full hover:bg-gray-100 transition">
                  <Trash2 size={20} className="rotate-45" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                <p className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-1"><Users size={14} /> 預約報名名單：</p>

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
                        {attendanceList.includes(reg.name) && <Zap size={16} className="text-green-600 fill-green-600" />}
                      </div>
                    ))}
                  {registrations.filter(r => r.practicedates === rollCallDate).length === 0 && (
                    <div className="col-span-2 text-center text-gray-400 py-4 bg-white rounded border border-dashed">此日期無人報名</div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><Plus size={14} /> 新增空降 (沒報名但有來)：</p>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-300 outline-none text-gray-800"
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
                          <button onClick={() => toggleAttendance(name)} className="hover:text-red-600 bg-white rounded-full p-0.5 ml-1"><Trash2 size={12} /></button>
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

        {/* Edit Announcement Modal */}
        {editingAnnouncement && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
              <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Edit size={20} className="text-blue-600" /> 編輯公告
                </h3>
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-200 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">公告標題</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-900"
                    value={editingAnnouncement.title}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">日期</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg text-gray-900"
                      value={editingAnnouncement.date}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">分類</label>
                    <select
                      className="w-full p-2 border rounded-lg text-gray-900"
                      value={editingAnnouncement.category}
                      onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, category: e.target.value })}
                    >
                      <option value="活動">活動</option>
                      <option value="比賽">比賽</option>
                      <option value="裝勤">裝勤</option>
                      <option value="榮譽">榮譽</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">內容</label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none h-32 text-gray-900"
                    value={editingAnnouncement.content}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-pinned"
                    checked={editingAnnouncement.pinned}
                    onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, pinned: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="edit-pinned" className="text-sm font-medium text-gray-700 select-none cursor-pointer">置頂此公告</label>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateAnnouncement}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow flex items-center gap-2"
                >
                  <Save size={18} /> 儲存更新
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-sky-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
              <p className="font-bold text-gray-700">處理中...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CoachPage;