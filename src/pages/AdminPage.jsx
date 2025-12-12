// src/pages/AdminPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Swal from 'sweetalert2';
import { 
  ChevronDown, ChevronUp, MinusCircle, Edit, Check, X, Plus, Home,
  Settings, Save, FileText, Trash2
} from 'lucide-react';
import { fetchAllData, postData } from '../api/googleSheets';

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
const COUNT_OPTIONS_0_15 = Array.from({length: 16}, (_, i) => i);
const COUNT_OPTIONS_1_10 = Array.from({length: 10}, (_, i) => i + 1);

const AdminPage = () => {
  const navigate = useNavigate();
  
  // 🔒 驗證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✨ 新增：頁籤狀態 ('members' | 'equipment')
  const [activeTab, setActiveTab] = useState('members');

  // 資料狀態
  const [users, setUsers] = useState([]);
  const [equipment, setEquipment] = useState([]); 
  const [borrowRecords, setBorrowRecords] = useState([]); 

  // --- 隊員表單狀態 ---
  const [newFormData, setNewFormData] = useState({
    Name: '', Weight: '', Position: POSITION_OPTIONS[0], Skill_Rating: '1'
  });
  const [expandedId, setExpandedId] = useState(null); 
  const [editingId, setEditingId] = useState(null);   
  const [editFormData, setEditFormData] = useState({}); 

  // --- 裝備表單狀態 ---
  const [equipForm, setEquipForm] = useState({ item: EQUIPMENT_OPTIONS[0], customItem: '', count: 0 });
  const [borrowForm, setBorrowForm] = useState({ name: '', date: '', item: EQUIPMENT_OPTIONS[0], count: 1 });

  // 防止 StrictMode 重複驗證
  const effectRan = useRef(false);

  // ==========================================
  // 1. 安全驗證邏輯
  // ==========================================
  useEffect(() => {
    if (effectRan.current === true) return;
    effectRan.current = true;

    const checkAuth = async () => {
      try {
        const result = await Swal.fire({
          title: '請輸入管理員/Admin 密碼',
          text: 'Please enter the admin password',
          input: 'password', 
          inputPlaceholder: '密碼',
          allowOutsideClick: false,
          allowEscapeKey: false,
          confirmButtonText: '確認',
          preConfirm: (value) => {
            if (!value) Swal.showValidationMessage('請輸入密碼');
            return value;
          }
        });

        const password = result.value;

        if (password && password.trim() === 'ruma_admin') {
          setIsAuthenticated(true);
          loadData(); 
        } else {
          if (!result.isDismissed) {
             await Swal.fire({
                icon: 'error',
                title: 'oops, 不要亂來啦！',
                timer: 2000,
                showConfirmButton: false
             });
             navigate('/'); 
          }
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // 2. 資料讀取
  // ==========================================
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData();
      if (data) {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
        setBorrowRecords(Array.isArray(data.borrowRecords) ? data.borrowRecords : []);
      }
    } catch (e) {
      console.error("載入失敗:", e);
      Swal.fire('載入失敗', '請檢查網路連線', 'error');
    } finally {
      setLoading(false);
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
      setNewFormData({ Name: '', Weight: '', Position: POSITION_OPTIONS[0], Skill_Rating: '1' }); 
      loadData(); 
    } else {
      Swal.fire('新增失敗', res.message, 'error');
    }
  };

  const handleDeleteClick = async (user) => {
    const result = await Swal.fire({
      title: '確定要狠心刪除這個隊友嗎?', 
      text: `將刪除: ${user.Name}`,
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

  if (!isAuthenticated) return <div className="min-h-screen bg-gray-50" />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Banner 區塊 */}
      <div className="relative w-full h-48 md:h-64 bg-slate-800 mb-8 overflow-hidden group">
        <img 
          src="https://i.ibb.co/mrs7mwBB/DJ-riverpark.png" 
          alt="Banner Background" 
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-10">
           {/* ✨ 更新標題文字 */}
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">
             管理員 / Admin
           </h1>
           <p className="text-gray-200 text-sm md:text-base font-light drop-shadow">
             建立隊員資料 & 更新更新公用裝備狀態
           </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 md:top-6 md:right-8 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-md transition shadow-sm border border-white/30"
        >
           <Home size={18} />
           <span className="font-medium text-sm">Home</span>
        </button>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-8">

        {/* ===================================================
            ✨ Navigation Bar (頁籤切換)
        =================================================== */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-full shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                activeTab === 'members' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              建立隊員資料
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                activeTab === 'equipment' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              更新公用裝備狀態
            </button>
          </div>
        </div>

        {/* ===================================================
            TAB CONTENT 1: 隊員資料管理
        =================================================== */}
        {activeTab === 'members' && (
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
                    className="w-full p-2 border rounded focus:border-purple-500 outline-none"
                    placeholder="輸入姓名"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-1 block">體重 (kg)</label>
                  <input 
                    name="Weight" 
                    type="number"
                    value={newFormData.Weight}
                    onChange={handleNewFormChange}
                    className="w-full p-2 border rounded focus:border-purple-500 outline-none"
                    placeholder="輸入體重"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-1 block">划船位置</label>
                  <select 
                    name="Position" 
                    value={newFormData.Position}
                    onChange={handleNewFormChange}
                    className="w-full p-2 border rounded bg-white focus:border-purple-500 outline-none text-sm"
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
                    className="w-full p-2 border rounded bg-white focus:border-purple-500 outline-none"
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
                              {showDetails ? <ChevronUp size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-500"/>}
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
                                          className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">技術評分</label>
                                        <select 
                                          name="Skill_Rating" 
                                          value={editFormData.Skill_Rating} 
                                          onChange={handleEditChange}
                                          className="w-full p-2 border rounded text-sm bg-white"
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
                                        className="w-full p-2 border rounded text-sm bg-white"
                                    >
                                        {POSITION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                  <button 
                                    onClick={handleCancelEdit}
                                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300"
                                  >
                                    <X size={16}/>
                                  </button>
                                  <button 
                                    onClick={handleSaveEdit}
                                    className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-md"
                                  >
                                    <Check size={16}/>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm text-gray-600 pl-8 relative">
                                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
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
        )}

        {/* ===================================================
            TAB CONTENT 2: 更新公用裝備狀態
        =================================================== */}
        {activeTab === 'equipment' && (
          <div className="flex flex-col md:flex-row gap-6 items-start animate-fadeIn">
            
            {/* 左：裝備庫存管理 */}
            <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center gap-2">
                  <Settings size={18}/> 裝備庫存管理
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">選擇裝備</label>
                  <select 
                    className="w-full p-2 border rounded bg-white"
                    value={equipForm.item}
                    onChange={(e) => setEquipForm({...equipForm, item: e.target.value})}
                  >
                    {EQUIPMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {equipForm.item === "新增新裝備品項" && (
                  <input 
                    className="w-full p-2 border rounded focus:border-blue-500"
                    placeholder="請輸入新裝備名稱"
                    value={equipForm.customItem}
                    onChange={(e) => setEquipForm({...equipForm, customItem: e.target.value})}
                  />
                )}

                <div>
                  <label className="block text-sm text-gray-500 mb-1">數量 (0-15)</label>
                  <select 
                    className="w-full p-2 border rounded bg-white"
                    value={equipForm.count}
                    onChange={(e) => setEquipForm({...equipForm, count: parseInt(e.target.value)})}
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
                  <FileText size={18}/> 新增借用紀錄
              </h3>

              <div className="space-y-4">
                  {/* ✨ 借用人姓名：改成下拉搜尋 Input + Datalist */}
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">借用人姓名 (可輸入搜尋)</label>
                    <input 
                      list="user-names" 
                      className="w-full p-2 border rounded"
                      placeholder="請輸入或選擇姓名"
                      value={borrowForm.name}
                      onChange={(e) => setBorrowForm({...borrowForm, name: e.target.value})}
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
                      className="w-full p-2 border rounded bg-white"
                      value={borrowForm.date}
                      onChange={(e) => setBorrowForm({...borrowForm, date: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500 mb-1">借用品項</label>
                      <select 
                        className="w-full p-2 border rounded bg-white"
                        value={borrowForm.item}
                        onChange={(e) => setBorrowForm({...borrowForm, item: e.target.value})}
                      >
                        {EQUIPMENT_OPTIONS.filter(o => o !== "新增新裝備品項").map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm text-gray-500 mb-1">數量 (1-10)</label>
                      <select 
                        className="w-full p-2 border rounded bg-white"
                        value={borrowForm.count}
                        onChange={(e) => setBorrowForm({...borrowForm, count: parseInt(e.target.value)})}
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

      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 flex items-center justify-center z-50">
           <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 border border-purple-100">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent"></div>
              <span className="text-gray-700 font-medium">資料同步中...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;