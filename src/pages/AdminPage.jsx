import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Users, Trash2, Edit, Plus, Save, X } from 'lucide-react';
// 1. 修改 Import：改用 fetchAllData
import { fetchAllData, postData } from '../api/googleSheets';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  // 雖然目前畫面沒用到 registrations，但先存起來也許之後要顯示統計數據
  const [registrations, setRegistrations] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    Name: '',
    Weight: '' ,
    Position: 'Left',
    Skill_Rating: '1'
  });

  useEffect(() => {
    loadData();
  }, []);

  // 2. 優化：改用 fetchAllData 一次抓取
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData(); // 只發送 1 次請求
      
      // 安全檢查
      if (data) {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
      }
    } catch (e) {
      console.error("載入失敗:", e);
      Swal.fire('載入失敗', '無法讀取資料，請檢查網路', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 重置表單的輔助函式
  const resetForm = () => {
    setFormData({ Name: '', Weight: '', Position: 'Left', Skill_Rating: '1' });
    setIsEditing(false);
  };

  const handleAddUser = async () => {
    if (!formData.Name) return Swal.fire('請輸入姓名', '', 'warning');
    
    // 檢查是否重複 (前端先擋，節省後端資源)
    if (users.some(u => u.Name === formData.Name)) {
        return Swal.fire('姓名重複', '該隊員已經存在', 'warning');
    }

    setLoading(true);
    const res = await postData('addUser', formData);
    setLoading(false);
    
    if (res.success) {
      Swal.fire('新增成功', '', 'success');
      resetForm();
      loadData();
    } else {
      Swal.fire('失敗', res.message, 'error');
    }
  };

  const handleDeleteUser = async (name) => {
    const result = await Swal.fire({
      title: `刪除 ${name}?`,
      text: "此動作無法復原，且會影響歷史報名紀錄！", // 提醒使用者嚴重性
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: '確認刪除',
      cancelButtonText: '取消'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteUser', { Name: name });
      setLoading(false);
      if (res.success) {
        Swal.fire('已刪除', '', 'success');
        loadData();
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
    }
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setFormData({
      Name: user.Name,
      Weight: user.Weight,
      Position: user.Position,
      Skill_Rating: user.Skill_Rating
    });
    // 滾動到最上方，讓使用者看到編輯框
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    const res = await postData('updateUser', formData);
    setLoading(false);
    if (res.success) {
      Swal.fire('更新成功', '', 'success');
      resetForm();
      loadData();
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <Users className="text-purple-600" /> 人員管理 / Admin
      </h1>

      {/* 編輯/新增區塊 */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8 border-l-8 border-purple-500">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          {isEditing ? <Edit size={20}/> : <Plus size={20}/>} 
          {isEditing ? `編輯隊員: ${formData.Name}` : '新增隊員'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input 
            name="Name" 
            placeholder="姓名 Name" 
            value={formData.Name} 
            onChange={handleChange}
            disabled={isEditing} 
            className={`p-2 border rounded ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          <input 
            name="Weight" 
            placeholder="體重 Weight (kg)" 
            type="number"
            value={formData.Weight} 
            onChange={handleChange}
            className="p-2 border rounded"
          />
          <select 
            name="Position" 
            value={formData.Position} 
            onChange={handleChange}
            className="p-2 border rounded bg-white"
          >
            <option value="Left">Left (左槳)</option>
            <option value="Right">Right (右槳)</option>
          </select>
          <select 
            name="Skill_Rating" 
            value={formData.Skill_Rating} 
            onChange={handleChange}
            className="p-2 border rounded bg-white"
          >
            <option value="1">Level 1 (新手)</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5 (選手)</option>
          </select>
        </div>

        <div className="flex gap-2">
            {isEditing ? (
                <>
                    <button onClick={handleUpdateUser} className="bg-green-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-green-700 shadow">
                        <Save size={18}/> 儲存更新
                    </button>
                    <button onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-600 shadow">
                        <X size={18}/> 取消
                    </button>
                </>
            ) : (
                <button onClick={handleAddUser} className="bg-purple-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 hover:bg-purple-700 shadow">
                    <Save size={18}/> 新增隊員
                </button>
            )}
        </div>
      </div>

      {/* 列表區塊 */}
      <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
         <div className="flex justify-between items-end mb-4 border-b pb-2">
            <h3 className="font-bold text-gray-700 text-lg">隊員列表 ({users.length}人)</h3>
            {/* 這裡示範如何用到 registrations 的數據 */}
            <span className="text-xs text-gray-500">
               總報名紀錄: {registrations.length} 筆
            </span>
         </div>
         
         <table className="w-full min-w-[600px]">
            <thead>
                <tr className="bg-gray-100 text-gray-600 text-left">
                    <th className="p-3 rounded-l-lg">姓名</th>
                    <th className="p-3">體重</th>
                    <th className="p-3">慣用邊</th>
                    <th className="p-3">等級</th>
                    <th className="p-3 rounded-r-lg text-center">操作</th>
                </tr>
            </thead>
            <tbody>
                {users.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">目前沒有隊員資料...</td></tr>
                ) : (
                    // 3. 優化：Key 改用 u.Name (假設名字不重複)
                    users.map((u) => (
                        <tr key={u.Name} className="border-b hover:bg-gray-50 transition group">
                            <td className="p-3 font-bold text-gray-800">{u.Name}</td>
                            <td className="p-3 text-gray-600">{u.Weight} kg</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.Position === 'Left' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    {u.Position}
                                </span>
                            </td>
                            <td className="p-3 text-gray-600">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                    Lv.{u.Skill_Rating}
                                </span>
                            </td>
                            <td className="p-3 flex justify-center gap-2">
                                <button 
                                    onClick={() => handleEditClick(u)} 
                                    className="text-blue-500 hover:bg-blue-100 p-2 rounded transition"
                                    title="編輯"
                                >
                                    <Edit size={18}/>
                                </button>
                                <button 
                                    onClick={() => handleDeleteUser(u.Name)} 
                                    className="text-red-400 hover:bg-red-100 p-2 rounded transition"
                                    title="刪除"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
         </table>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-purple-600"></div>
              <span className="font-bold text-gray-700">資料同步中...</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;