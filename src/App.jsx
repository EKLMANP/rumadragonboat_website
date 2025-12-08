// src/App.jsx
import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import CoachPage from './pages/CoachPage';
import MemberPage from './pages/MemberPage';
import AdminPage from './pages/AdminPage';

function Home() {
  const navigate = useNavigate();

  // 處理按鈕點擊與密碼驗證邏輯
  const handleNavigation = async (path, passwordRequired = false, password = '') => {
    if (passwordRequired) {
      const { value: inputVal } = await Swal.fire({
        title: '請輸入通關密碼',
        text: 'Please enter the password',
        input: 'password',
        showCancelButton: true,
        confirmButtonText: '確認',
        cancelButtonText: '取消',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#d33',
      });

      if (inputVal === password) {
        navigate(path);
      } else if (inputVal) { 
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: '不要亂來啦!',
          timer: 2000,
          showConfirmButton: false,
          showCloseButton: true, 
        });
      }
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 font-sans flex flex-col">
      {/* Banner 區塊 */}
      <div className="relative w-full shadow-md bg-sky-200">
        <img 
          src="/banner.jpg" 
          alt="Dragon Boat Banner" 
          style={{ width: '100%', height: '250px', objectFit: 'cover' }} 
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center flex-col">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center drop-shadow-lg px-4 leading-tight">
            龍舟練習槳位產生器
          </h1>
          <p className="text-white text-lg md:text-2xl mt-2 opacity-90 font-light text-center">
            Generator of seat arrangement on the dragon boat
          </p>
        </div>
      </div>

      {/* 三大功能按鈕區塊 (已調整順序) */}
      <div className="flex-grow flex flex-col items-center justify-center gap-6 p-8 w-full max-w-4xl mx-auto">
        
        {/* 1. 隊員按鈕 (Member) - 最上方 */}
        <button
          onClick={() => handleNavigation('/member')}
          className="w-full md:w-2/3 bg-sky-600 hover:bg-sky-700 text-white text-xl font-bold py-5 px-8 rounded-2xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
        >
          <span>🐉</span> 
          <div className="flex flex-col items-start text-left">
            <span>船練報名 & 槳位查詢</span>
            <span className="text-sm font-normal opacity-80">Practice registration & Check seating</span>
          </div>
        </button>

        {/* 2. 教練按鈕 (Coach) - 中間 */}
        <button
          onClick={() => handleNavigation('/coach')} 
          className="w-full md:w-2/3 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-5 px-8 rounded-2xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
        >
          <span>📋</span> 船練開放日期 & 槳位生成
        </button>

        {/* 3. 管理員按鈕 (Admin) - 最下方 */}
        <button
          onClick={() => handleNavigation('/admin', true, 'ruma_admin')}
          className="w-full md:w-2/3 bg-gray-700 hover:bg-gray-800 text-white text-xl font-bold py-5 px-8 rounded-2xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
        >
          <span>🔧</span> 管理員 / Admin
        </button>

      </div>

      {/* Footer */}
      <footer className="bg-sky-800 text-white text-center py-4 mt-auto">
        <p>
          Designed by{' '}
          <a 
            href="https://www.instagram.com/ruma_dragonboat" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-yellow-300 font-bold"
          >
            RUMA dragon boat
          </a>
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/coach" element={<CoachPage />} />
      <Route path="/member" element={<MemberPage />} />
    </Routes>
  );
}

export default App;