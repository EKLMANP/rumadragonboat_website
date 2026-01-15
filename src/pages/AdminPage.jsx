// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ChevronDown, ChevronUp, MinusCircle, Edit, Check, X, Plus,
  Users, Package, RefreshCw, Settings, Save, FileText, Mail, Shield
} from 'lucide-react';
import {
  fetchAllData, postData,
  adminCreateUser, adminDeleteUser, adminListUsers, adminUpdateUserRole
} from '../api/supabaseApi';
import AppLayout from '../components/AppLayout';

// --- 選項定義 ---
const POSITION_OPTIONS = [
  "可以划左右槳及擔任舵手",
  "只能划右槳",
  "只能划左槳",
  "可以划左槳及右槳",
  "可以划左槳及擔任舵手",
  "可以划右槳及擔任舵手"
];

const SKILL_OPTIONS = ["1", "2", "3", "4", "5"];

const EQUIPMENT_OPTIONS = ["救生衣", "木槳", "碳纖槳", "新增新裝備品項"];
const COUNT_OPTIONS_0_15 = Array.from({ length: 16 }, (_, i) => i);
const COUNT_OPTIONS_1_10 = Array.from({ length: 10 }, (_, i) => i + 1);

const AdminPage = () => {
  const navigate = useNavigate();


  const [loading, setLoading] = useState(false);

  // ✨ 新增：頁籤狀態 ('members' | 'equipment')
  const [activeTab, setActiveTab] = useState('members');

  // 資料狀態
  const [users, setUsers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);
  const [authUsers, setAuthUsers] = useState([]); // 新增使用者管理狀態

  // --- 隊員表單狀態 ---
  const [newFormData, setNewFormData] = useState({
    Name: '', Email: '', Weight: '', Position: POSITION_OPTIONS[0], Skill_Rating: '1'
  });
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // --- 裝備表單狀態 ---
  const [equipForm, setEquipForm] = useState({ item: EQUIPMENT_OPTIONS[0], customItem: '', count: 0 });
  const [borrowForm, setBorrowForm] = useState({ name: '', date: '', item: EQUIPMENT_OPTIONS[0], count: 1 });

  // --- 使用者管理表單狀態 ---
  const [authForm, setAuthForm] = useState({ email: '', name: '', role: 'member' });

  // --- Email 編輯狀態 (使用者帳號管理頁籤) ---
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [editingEmailValue, setEditingEmailValue] = useState('');

  // 處理儲存 Email 更新
  const handleSaveEmail = async (memberName) => {
    if (!editingEmailValue || !editingEmailValue.includes('@')) {
      return Swal.fire('請輸入有效的 Email', '', 'warning');
    }

    setLoading(true);
    try {
      const res = await postData('updateUser', {
        Name: memberName,
        Email: editingEmailValue
      });

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Email 已更新', timer: 1500, showConfirmButton: false });
        setEditingEmailId(null);
        setEditingEmailValue('');
        await loadData();
      } else {
        Swal.fire('更新失敗', res.message, 'error');
      }
    } catch (e) {
      Swal.fire('更新失敗', e.message, 'error');
    } finally {
      setLoading(false);
    }
  };



  // ==========================================
  // 1. 初始化載入資料
  // ==========================================
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 監聽 Tab 切換，若切換到使用者管理則載入 Auth Users
  useEffect(() => {
    if (activeTab === 'auth_users') {
      loadAuthUsers();
    }
  }, [activeTab]);

  // ==========================================
  // 2. 資料讀取
  // ==========================================
  const loadData = async () => {
    setLoading(true);
    try {
      // 使用輕量查詢取代 fetchAllData，避免超時
      const { supabase } = await import('../lib/supabase');

      const [membersRes, equipmentRes, borrowRes] = await Promise.all([
        supabase.from('members').select('name, email, weight, position, skill_rating').order('name'),
        supabase.from('equipment_inventory').select('item, count'),
        supabase.from('borrow_records').select('member_name, borrow_date, item, count').order('created_at', { ascending: false })
      ]);

      setUsers((membersRes.data || []).map(m => ({
        Name: m.name,
        Email: m.email,
        Weight: m.weight,
        Position: m.position,
        Skill_Rating: m.skill_rating
      })));

      setEquipment((equipmentRes.data || []).map(e => ({
        Item: e.item,
        Count: e.count
      })));

      setBorrowRecords((borrowRes.data || []).map(b => ({
        Name: b.member_name,
        Date: b.borrow_date,
        Item: b.item,
        Count: b.count
      })));
    } catch (e) {
      console.error("載入失敗:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadAuthUsers = async () => {
    setLoading(true);
    try {
      const res = await adminListUsers();
      if (res.success && res.data?.users) {
        setAuthUsers(res.data.users);
      } else {
        setAuthUsers([]);
        console.warn('無法載入使用者列表:', res.message);
      }
    } catch (e) {
      console.error('載入 Auth Users 失敗:', e);
      setAuthUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAuth = async () => {
    if (!authForm.email || !authForm.name) {
      return Swal.fire('請填寫完整資訊', '', 'warning');
    }
    setLoading(true);
    const res = await adminCreateUser(authForm.email, '000000', authForm.name, authForm.role);
    setLoading(false);
    if (res.success) {
      Swal.fire({ icon: 'success', title: '使用者已建立', text: '預設密碼: 000000', timer: 2000 });
      setAuthForm({ email: '', name: '', role: 'member' });
      loadAuthUsers();
    } else {
      Swal.fire('建立失敗', res.message, 'error');
    }
  };

  const handleDeleteAuth = async (userId) => {
    const confirm = await Swal.fire({
      title: '確定刪除此使用者?',
      text: '此操作將無法復原',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '刪除',
      cancelButtonText: '取消'
    });

    if (confirm.isConfirmed) {
      setLoading(true);
      const res = await adminDeleteUser(userId);
      setLoading(false);
      if (res.success) {
        Swal.fire('已刪除', '', 'success');
        loadAuthUsers();
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
    }
  };

  // ==========================================
  // 3. 邏輯處理 - 隊員管理
  // ==========================================
  const handleNewFormChange = (e) => {
    setNewFormData({ ...newFormData, [e.target.name]: e.target.value });
  };

  const handleAddUser = async () => {
    if (!newFormData.Name) return Swal.fire('請輸入姓名', '', 'warning');
    if (users.some(u => u.Name === newFormData.Name)) {
      return Swal.fire('姓名重複', '該隊員已存在', 'warning');
    }

    setLoading(true);
    const res = await postData('addUser', newFormData);
    setLoading(false);

    if (res.success) {
      Swal.fire({ icon: 'success', title: '新增成功', timer: 1500, showConfirmButton: false });
      Swal.fire({ icon: 'success', title: '新增成功', timer: 1500, showConfirmButton: false });
      setNewFormData({ Name: '', Email: '', Weight: '', Position: POSITION_OPTIONS[0], Skill_Rating: '1' });
      loadData();
    } else {
      Swal.fire('新增失敗', res.message, 'error');
    }
  };

  const handleDeleteClick = async (user) => {
    const result = await Swal.fire({
      title: '確定要狠心刪除這個隊友嗎?',
      text: `將刪除: ${user.Name} `,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '確認',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteUser', { Name: user.Name });
      setLoading(false);

      if (res.success) {
        Swal.fire({ icon: 'success', title: '已刪除', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingId(user.Name);
    setExpandedId(null);
    setEditFormData({ ...user });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    const res = await postData('updateUser', editFormData);
    setLoading(false);

    if (res.success) {
      await Swal.fire({ icon: 'success', title: '已更新隊員資料！', timer: 1500, showConfirmButton: false });
      setEditingId(null);
      loadData();
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
  };

  const handleCancelEdit = () => setEditingId(null);

  const toggleExpand = (userName) => {
    if (expandedId === userName) {
      setExpandedId(null);
    } else {
      setExpandedId(userName);
      setEditingId(null);
    }
  };

  // ==========================================
  // 4. 邏輯處理 - 裝備管理
  // ==========================================
  const handleUpdateEquipment = async () => {
    const finalItem = equipForm.item === "新增新裝備品項" ? equipForm.customItem : equipForm.item;
    if (!finalItem) return Swal.fire('請輸入裝備名稱', '', 'warning');

    setLoading(true);
    const res = await postData('updateEquipment', { Item: finalItem, Count: equipForm.count });
    setLoading(false);

    if (res.success) {
      Swal.fire({ icon: 'success', title: '裝備庫存已更新', timer: 1500, showConfirmButton: false });
      setEquipForm({ item: EQUIPMENT_OPTIONS[0], customItem: '', count: 0 });
      loadData();
    } else {
      Swal.fire('失敗', res.message, 'error');
    }
  };

  const handleAddBorrowRecord = async () => {
    if (!borrowForm.name || !borrowForm.date) return Swal.fire('請填寫完整借用資訊', '', 'warning');

    setLoading(true);
    const res = await postData('addBorrowRecord', {
      Name: borrowForm.name,
      Date: borrowForm.date,
      Item: borrowForm.item,
      Count: borrowForm.count
    });
    setLoading(false);

    if (res.success) {
      Swal.fire({ icon: 'success', title: '借用紀錄已新增', timer: 1500, showConfirmButton: false });
      setBorrowForm({ ...borrowForm, name: '', date: '' });
      loadData();
    } else {
      Swal.fire('失敗', res.message, 'error');
    }
  };

  // ✨ 刪除借用紀錄 (點擊紅色 - )
  const handleDeleteBorrow = async (record) => {
    const result = await Swal.fire({
      title: '確定刪除此紀錄?',
      text: `${record.Name} 借用 ${record.Item} (此動作視為已歸還)`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: '取消',
      confirmButtonText: '刪除'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteBorrowRecord', {
        Name: record.Name,
        Date: record.Date,
        Item: record.Item
      });
      setLoading(false);

      if (res.success) {
        Swal.fire({ icon: 'success', title: '紀錄已刪除', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire('刪除失敗', '請確認後端程式碼已更新', 'error');
      }
    }
  };



  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                🔧 管理員後台
              </h1>
              <p className="text-gray-500 mt-1">
                建立隊員資料與更新公用裝備狀態
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



        {/* 頁籤切換 */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap
              ${activeTab === 'members'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } `}
          >
            <Users size={20} />
            隊員資料管理
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap
              ${activeTab === 'equipment'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } `}
          >
            <Package size={20} />
            裝備管理
          </button>
          <button
            onClick={() => setActiveTab('auth_users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all whitespace-nowrap
              ${activeTab === 'auth_users'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              } `}
          >
            <Shield size={20} />
            使用者帳號管理
          </button>
        </div>

        {/* ===================================================
            TAB CONTENT 1: 隊員資料管理
        =================================================== */}
        {
          activeTab === 'members' && (
            <div className="flex flex-col md:flex-row gap-6 items-start animate-fadeIn">

              {/* 左：輸入隊員資料 */}
              <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-4">
                <h2 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">輸入隊員資料</h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">姓名</label>
                    <input
                      name="Name"
                      value={newFormData.Name}
                      onChange={handleNewFormChange}
                      className="w-full p-2 border rounded focus:border-purple-500 outline-none text-gray-800"
                      placeholder="輸入姓名"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Email</label>
                    <input
                      name="Email"
                      type="email"
                      value={newFormData.Email}
                      onChange={handleNewFormChange}
                      className="w-full p-2 border rounded focus:border-purple-500 outline-none text-gray-800"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">體重 (kg)</label>
                    <input
                      name="Weight"
                      type="number"
                      value={newFormData.Weight}
                      onChange={handleNewFormChange}
                      className="w-full p-2 border rounded focus:border-purple-500 outline-none text-gray-800"
                      placeholder="輸入體重"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">划船位置</label>
                    <select
                      name="Position"
                      value={newFormData.Position}
                      onChange={handleNewFormChange}
                      className="w-full p-2 border rounded bg-white focus:border-purple-500 outline-none text-sm text-gray-800"
                    >
                      {POSITION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">技術評分 (1-5)</label>
                    <select
                      name="Skill_Rating"
                      value={newFormData.Skill_Rating}
                      onChange={handleNewFormChange}
                      className="w-full p-2 border rounded bg-white focus:border-purple-500 outline-none text-gray-800"
                    >
                      {SKILL_OPTIONS.map(opt => <option key={opt} value={opt}>Level {opt}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={handleAddUser}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 mt-4 shadow-sm"
                  >
                    <Plus size={20} /> 新增
                  </button>
                </div>
              </div>

              {/* 右：已輸入的隊員資料 */}
              <div className="w-full md:w-2/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-gray-700">已輸入的隊員資料</h2>
                  <span className="text-sm text-gray-400">共 {users.length} 人</span>
                </div>

                <div className="flex flex-col gap-2">
                  {users.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">尚無資料</p>
                  ) : (
                    users.map((user) => {
                      const isEditing = editingId === user.Name;
                      const isExpanded = expandedId === user.Name;
                      const showDetails = isEditing || isExpanded;

                      return (
                        <div key={user.Name} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition bg-white">

                          <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div
                              className="flex items-center gap-3 cursor-pointer select-none flex-1"
                              onClick={() => toggleExpand(user.Name)}
                            >
                              {showDetails ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                              <span className="font-bold text-gray-800">{user.Name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition"
                                title="刪除"
                              >
                                <MinusCircle size={18} />
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-600 hover:text-white transition"
                                title="編輯"
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>

                          {showDetails && (
                            <div className="p-4 bg-white border-t border-gray-100 animate-fadeIn">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <div className="text-sm text-purple-600 font-bold mb-2">正在編輯: {user.Name}</div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-gray-400">體重</label>
                                      <input
                                        name="Weight"
                                        type="number"
                                        value={editFormData.Weight}
                                        onChange={handleEditChange}
                                        className="w-full p-2 border rounded text-sm text-gray-800"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400">技術評分</label>
                                      <select
                                        name="Skill_Rating"
                                        value={editFormData.Skill_Rating}
                                        onChange={handleEditChange}
                                        className="w-full p-2 border rounded text-sm bg-white text-gray-800"
                                      >
                                        {SKILL_OPTIONS.map(o => <option key={o} value={o}>Level {o}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-xs text-gray-400">位置</label>
                                    <select
                                      name="Position"
                                      value={editFormData.Position}
                                      onChange={handleEditChange}
                                      className="w-full p-2 border rounded text-sm bg-white text-gray-800"
                                    >
                                      {POSITION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  </div>

                                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300"
                                    >
                                      <X size={16} />
                                    </button>
                                    <button
                                      onClick={handleSaveEdit}
                                      className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-md"
                                    >
                                      <Check size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 text-sm text-gray-600 pl-8 relative">
                                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                  {user.Email && (
                                    <p><span className="font-semibold text-gray-800 inline-block w-20">Email:</span> {user.Email}</p>
                                  )}
                                  <p><span className="font-semibold text-gray-800 inline-block w-20">體重:</span> {user.Weight} kg</p>
                                  <p><span className="font-semibold text-gray-800 inline-block w-20">技術評分:</span> Level {user.Skill_Rating}</p>
                                  <p>
                                    <span className="font-semibold text-gray-800 inline-block w-20">位置:</span>
                                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs ml-1">
                                      {user.Position}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )
        }

        {/* ===================================================
            TAB CONTENT 2: 更新公用裝備狀態
        =================================================== */}
        {
          activeTab === 'equipment' && (
            <div className="flex flex-col md:flex-row gap-6 items-start animate-fadeIn">

              {/* 左：裝備庫存管理 */}
              <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                  <Settings size={18} /> 裝備庫存管理
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">選擇裝備</label>
                    <select
                      className="w-full p-2 border rounded bg-white text-gray-800"
                      value={equipForm.item}
                      onChange={(e) => setEquipForm({ ...equipForm, item: e.target.value })}
                    >
                      {EQUIPMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  {equipForm.item === "新增新裝備品項" && (
                    <input
                      className="w-full p-2 border rounded focus:border-blue-500 text-gray-800"
                      placeholder="請輸入新裝備名稱"
                      value={equipForm.customItem}
                      onChange={(e) => setEquipForm({ ...equipForm, customItem: e.target.value })}
                    />
                  )}

                  <div>
                    <label className="block text-sm text-gray-500 mb-1">數量 (0-15)</label>
                    <select
                      className="w-full p-2 border rounded bg-white text-gray-800"
                      value={equipForm.count}
                      onChange={(e) => setEquipForm({ ...equipForm, count: parseInt(e.target.value) })}
                    >
                      {COUNT_OPTIONS_0_15.map(num => <option key={num} value={num}>{num}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={handleUpdateEquipment}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> 確認更新庫存
                  </button>

                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-bold text-gray-500 mb-2">目前庫存概覽:</h4>
                    <div className="flex flex-wrap gap-2">
                      {equipment.map((eq, idx) => (
                        <span key={idx} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                          {eq.Item}: {eq.Count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右：新增借用紀錄 */}
              <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-green-100">
                <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                  <FileText size={18} /> 新增借用紀錄
                </h3>

                <div className="space-y-4">
                  {/* ✨ 借用人姓名：改成下拉搜尋 Input + Datalist */}
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">借用人姓名 (可輸入搜尋)</label>
                    <input
                      list="user-names"
                      className="w-full p-2 border rounded text-gray-800"
                      placeholder="請輸入或選擇姓名"
                      value={borrowForm.name}
                      onChange={(e) => setBorrowForm({ ...borrowForm, name: e.target.value })}
                    />
                    <datalist id="user-names">
                      {users.map((u, idx) => (
                        <option key={idx} value={u.Name} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 mb-1">借用日期</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded bg-white text-gray-800"
                      value={borrowForm.date}
                      onChange={(e) => setBorrowForm({ ...borrowForm, date: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (選填)</label>
                      <input
                        type="email"
                        name="Email"
                        value={newFormData.Email}
                        onChange={handleNewFormChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none transition text-gray-800"
                        placeholder="範例: user@ruma.com"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">體重 (kg)</label>
                      <select
                        className="w-full p-2 border rounded bg-white text-gray-800"
                        value={borrowForm.item}
                        onChange={(e) => setBorrowForm({ ...borrowForm, item: e.target.value })}
                      >
                        {EQUIPMENT_OPTIONS.filter(o => o !== "新增新裝備品項").map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm text-gray-500 mb-1">數量 (1-10)</label>
                      <select
                        className="w-full p-2 border rounded bg-white text-gray-800"
                        value={borrowForm.count}
                        onChange={(e) => setBorrowForm({ ...borrowForm, count: parseInt(e.target.value) })}
                      >
                        {COUNT_OPTIONS_1_10.map(num => <option key={num} value={num}>{num}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAddBorrowRecord}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> 新增借用紀錄
                  </button>

                  {/* ✨ 新增：顯示最新借用紀錄 + 刪除功能 */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                      最新借用紀錄 (Records)
                      <span className="text-xs font-normal text-gray-400">點擊紅色按鈕刪除</span>
                    </h4>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                      {borrowRecords.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center">目前無紀錄</p>
                      ) : (
                        // 反轉陣列讓最新的顯示在上面
                        [...borrowRecords].reverse().map((record, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{record.Name}</span>
                              <span className="text-xs text-gray-500">
                                {record.Date ? new Date(record.Date).toLocaleDateString('zh-TW') : '-'} / {record.Item} x {record.Count}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteBorrow(record)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"
                              title="刪除紀錄 (歸還)"
                            >
                              <MinusCircle size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        {/* ===================================================
            TAB CONTENT 3: 使用者帳號管理 (Auth)
        =================================================== */}
        {activeTab === 'auth_users' && (
          <div className="animate-fadeIn">
            {/* 別名列表標題 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Shield size={20} className="text-emerald-600" />
                    權限角色管理
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    從隊員資料中選擇成員並指定權限角色
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">隊員</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">幹部</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">管理員</span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800">
                ℹ️ 此處顯示已在「隊員資料管理」中建立的所有隊員。可為每位隊員指派系統權限角色。
              </div>
            </div>

            {/* 隊員列表與權限指派 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-bold text-gray-700">隊員列表</h2>
                <span className="text-sm text-gray-400">共 {users.length} 人</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left p-3 font-medium">姓名</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">目前權限</th>
                      <th className="text-center p-3 font-medium">權限指派</th>
                      <th className="text-center p-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">
                          請先在「隊員資料管理」中新增隊員
                        </td>
                      </tr>
                    ) : (
                      users.map((member) => {
                        // 查找該隊員是否已有系統帳號
                        const authUser = authUsers.find(a => a.email?.toLowerCase() === member.Email?.toLowerCase());
                        const currentRole = authUser?.role || 'member';

                        return (
                          <tr key={member.Name} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="p-3 font-medium text-gray-800">{member.Name}</td>
                            <td className="p-3">
                              {editingEmailId === member.Name ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="email"
                                    value={editingEmailValue}
                                    onChange={(e) => setEditingEmailValue(e.target.value)}
                                    className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-emerald-200 outline-none text-gray-800"
                                    placeholder="user@example.com"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEmail(member.Name)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="儲存"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingEmailId(null); setEditingEmailValue(''); }}
                                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                    title="取消"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {member.Email ? (
                                    <span className="text-gray-600">{member.Email}</span>
                                  ) : (
                                    <span className="text-gray-400 italic">未設定</span>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingEmailId(member.Name);
                                      setEditingEmailValue(member.Email || '');
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                    title="編輯 Email"
                                  >
                                    <Edit size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${currentRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                                currentRole === 'management' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                {currentRole === 'admin' ? '管理員' : currentRole === 'management' ? '幹部' : '隊員'}
                              </span>
                            </td>
                            <td className="p-3">
                              <select
                                value={currentRole}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  const confirm = await Swal.fire({
                                    title: '確認變更權限?',
                                    html: `將 <b>${member.Name}</b> 的權限設為「<b>${newRole === 'admin' ? '管理員' : newRole === 'management' ? '幹部' : '隊員'}</b>」`,
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonColor: '#10b981',
                                    confirmButtonText: '確認',
                                    cancelButtonText: '取消'
                                  });

                                  if (confirm.isConfirmed) {
                                    if (!member.Email) {
                                      return Swal.fire('需要 Email', '請先在隊員資料中設定 Email', 'warning');
                                    }

                                    setLoading(true);
                                    // 如果尚未有帳號，先建立
                                    if (!authUser) {
                                      const createRes = await adminCreateUser(member.Email, '000000', member.Name, newRole);
                                      if (!createRes.success) {
                                        setLoading(false);
                                        return Swal.fire('建立帳號失敗', createRes.message, 'error');
                                      }
                                    } else {
                                      // 更新現有用戶的權限
                                      const updateRes = await adminUpdateUserRole(authUser.id, newRole);
                                      if (!updateRes.success) {
                                        setLoading(false);
                                        return Swal.fire('更新權限失敗', updateRes.message, 'error');
                                      }
                                    }

                                    await loadAuthUsers();
                                    setLoading(false);
                                    Swal.fire({ icon: 'success', title: '權限已更新', timer: 1500, showConfirmButton: false });
                                  }
                                }}
                                className="px-3 py-1.5 border rounded-lg bg-white text-gray-800 text-sm focus:ring-2 focus:ring-emerald-200"
                                disabled={!member.Email}
                              >
                                <option value="member">隊員 (Member)</option>
                                <option value="management">幹部 (Management)</option>
                                <option value="admin">管理員 (Admin)</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              {authUser && (
                                <button
                                  onClick={async () => {
                                    const confirm = await Swal.fire({
                                      title: '確定刪除此使用者?',
                                      html: `將刪除 <b>${member.Name}</b> 的系統帳號<br/><span class="text-red-500">此操作無法復原</span>`,
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonColor: '#d33',
                                      confirmButtonText: '刪除',
                                      cancelButtonText: '取消'
                                    });

                                    if (confirm.isConfirmed) {
                                      setLoading(true);
                                      const res = await adminDeleteUser(authUser.id);
                                      setLoading(false);
                                      if (res.success) {
                                        Swal.fire({ icon: 'success', title: '已刪除', timer: 1500, showConfirmButton: false });
                                        loadAuthUsers();
                                      } else {
                                        Swal.fire('刪除失敗', res.message, 'error');
                                      }
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                  title="刪除帳號"
                                >
                                  <MinusCircle size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-sky-100">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
              <span className="text-gray-700 font-medium">資料同步中...</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPage;