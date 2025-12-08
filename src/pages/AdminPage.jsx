// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 新增這行
import Swal from 'sweetalert2';
import { UserPlus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp, Users, Home } from 'lucide-react'; // 新增 Home icon
import { fetchUsers, postData } from '../api/googleSheets';

const AdminPage = () => {
  const navigate = useNavigate(); // 初始化導航功能
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    Name: '',
    Weight: '',
    Position: '可以划左槳及右槳',
    Skill_Rating: '3'
  });

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const positionOptions = [
    "可以划左右槳及擔任舵手",
    "只能划右槳",
    "只能划左槳",
    "可以划左槳及右槳",
    "可以划左槳及擔任舵手",
    "可以划右槳及擔任舵手"
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!formData.Name || !formData.Weight) {
      Swal.fire('欄位未填', '姓名與體重為必填欄位', 'warning');
      return;
    }

    setLoading(true);
    const res = await postData('addUser', formData);
    setLoading(false);

    if (res.success) {
      Swal.fire('成功', '已新增隊員資料!', 'success');
      setFormData({ ...formData, Name: '', Weight: '' });
      loadUsers();
    } else {
      Swal.fire('失敗', res.message, 'error');
    }
  };

  const handleDeleteUser = async (name) => {
    const result = await Swal.fire({
      title: '確定要狠心刪除這個隊友嗎?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確認',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await postData('deleteUser', { Name: name });
      setLoading(false);
      
      if (res.success) {
        Swal.fire('已刪除', '', 'success');
        loadUsers();
      } else {
        Swal.fire('刪除失敗', res.message, 'error');
      }
    }
  };

  const startEdit = (user) => {
    setEditingId(user.Name);
    setExpandedId(user.Name);
    setEditFormData({ ...user });
  };

  const saveEdit = async () => {
    setLoading(true);
    const res = await postData('updateUser', editFormData);
    setLoading(false);

    if (res.success) {
      Swal.fire('已更新隊員資料!', '', 'success');
      setEditingId(null);
      loadUsers();
    } else {
      Swal.fire('更新失敗', res.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 標題區 (已修改：加入 Home 按鈕) */}
      <div className="bg-gray-800 p-6 text-white shadow-md flex justify-between items-center sticky top-0 z-10">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
            🔧 管理員後台 / Admin
            </h1>
            <p className="opacity-70 mt-1">建立與管理隊員基本資料</p>
        </div>
        <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition border border-gray-600"
        >
            <Home size={20} />
            <span className="hidden md:inline">回首頁</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-8 mt-6">
        {/* 左側：輸入隊員資料 */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-fit">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2 border-b pb-2">
            <UserPlus className="text-blue-500" /> 輸入隊員資料
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">姓名 / Name</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
                placeholder="Ex. 姜姜"
                value={formData.Name}
                onChange={e => setFormData({...formData, Name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">體重 / Weight (kg)</label>
              <input 
                type="number" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none"
                placeholder="Ex. 65"
                value={formData.Weight}
                onChange={e => setFormData({...formData, Weight: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">划船位置 / Position</label>
              <select 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white"
                value={formData.Position}
                onChange={e => setFormData({...formData, Position: e.target.value})}
              >
                {positionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">技術評分 / Rating (1-5)</label>
              <select 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none bg-white"
                value={formData.Skill_Rating}
                onChange={e => setFormData({...formData, Skill_Rating: e.target.value})}
              >
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} 分 {r===5 && "(最強)"}</option>)}
              </select>
            </div>

            <button 
              onClick={handleAddUser}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition flex justify-center items-center gap-2"
            >
              <UserPlus size={20} /> 新增 Add
            </button>
          </div>
        </div>

        {/* 右側：已輸入的隊員資料 */}
        <div className="w-full lg:w-2/3 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2 border-b pb-2">
            <Users size={24} className="text-green-500" /> 已輸入的隊員資料 ({users.length}人)
          </h3>

          <div className="space-y-3">
            {users.length === 0 ? <p className="text-gray-400 text-center py-10">資料庫還是空的...</p> : 
             users.map((user, idx) => (
              <div key={idx} className="border rounded-lg p-3 hover:shadow-md transition bg-gray-50">
                <div className="flex justify-between items-center">
                  <div 
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => setExpandedId(expandedId === user.Name ? null : user.Name)}
                  >
                    <button className="text-gray-400">
                      {expandedId === user.Name ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                    <span className="font-bold text-lg text-gray-800">{user.Name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{user.Position.substring(0, 4)}...</span>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => startEdit(user)}
                      className="p-2 bg-yellow-100 text-yellow-600 rounded-full hover:bg-yellow-200 transition"
                      title="編輯"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.Name)}
                      className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                      title="刪除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {(expandedId === user.Name) && (
                  <div className="mt-4 p-4 bg-white rounded border border-gray-200 animate-fadeIn">
                    {editingId === user.Name ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500">體重</label>
                          <input type="number" className="w-full border p-1 rounded" 
                            value={editFormData.Weight} 
                            onChange={e => setEditFormData({...editFormData, Weight: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">評分</label>
                          <select className="w-full border p-1 rounded" 
                            value={editFormData.Skill_Rating} 
                            onChange={e => setEditFormData({...editFormData, Skill_Rating: e.target.value})}
                          >
                            {[5,4,3,2,1].map(r=><option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-gray-500">位置</label>
                          <select className="w-full border p-1 rounded" 
                            value={editFormData.Position} 
                            onChange={e => setEditFormData({...editFormData, Position: e.target.value})}
                          >
                            {positionOptions.map(o=><option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1 rounded border hover:bg-gray-100">
                             <X size={16}/> 取消
                          </button>
                          <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600">
                             <Check size={16}/> 儲存更新 (v)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="block text-xs text-gray-400">體重</span>
                          <span className="font-bold">{user.Weight} kg</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-400">技術</span>
                          <span className="font-bold">{user.Skill_Rating} 分</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-xs text-gray-400">位置</span>
                          <span className="font-bold">{user.Position}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-full shadow-lg">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;