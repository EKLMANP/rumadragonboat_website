// src/components/SeatVisualizer.jsx
import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Scale, MapPin, Clock } from 'lucide-react';

// --- 獨立的 Seat 元件 (移到外面以避免 Re-mount 問題) ---
const Seat = ({ user, side, index, isSelected, isEditable, onClick }) => {
  return (
    <div 
      onClick={() => onClick(side, index)}
      className={`
        flex flex-col items-center justify-center 
        w-20 h-20 md:w-24 md:h-24 
        border-2 rounded-lg shadow-sm m-1 transition-all relative
        ${side === 'left' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}
        ${user?.weight > 80 ? 'border-red-400 border-4' : ''}
        ${isSelected ? 'ring-4 ring-orange-500 scale-110 z-20 shadow-lg' : ''} 
        ${isEditable ? 'cursor-pointer hover:brightness-95 hover:scale-105' : ''}
      `}
      style={{ minWidth: '80px' }}
    >
      <span className="font-bold text-gray-800 text-sm md:text-base truncate max-w-full px-1">
        {user ? user.Name : "空"}
      </span>
      {/* 顯示座位號碼的輔助標記 (可選) */}
      <span className="absolute top-0 right-1 text-[10px] text-gray-400 opacity-50">
        {side === 'left' ? 'L' : 'R'}{index + 1}
      </span>
    </div>
  );
};

// --- 主元件 ---
const SeatVisualizer = ({ boatData, date, location, place, time, onSwap, isEditable = false, showStats = false }) => {
  const boatRef = useRef(null);
  const [selectedSeat, setSelectedSeat] = useState(null);

  const displayPlace = location || place;

  const downloadImage = async () => {
    if (!boatRef.current) return;
    try {
      const canvas = await html2canvas(boatRef.current, { scale: 3, useCORS: true });
      const link = document.createElement('a');
      link.download = `RUMA_Seating_${date || 'Date'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Image generation failed", err);
      alert("圖片生成失敗，請稍後再試");
    }
  };

  const handleSeatClick = (side, index) => {
    if (!isEditable || !onSwap) return;

    console.log(`Clicked: ${side} ${index}`); // Debug 用

    if (selectedSeat) {
      // 如果點擊的是同一個位置，取消選取
      if (selectedSeat.side === side && selectedSeat.index === index) {
        setSelectedSeat(null);
        return;
      }

      // 如果已經選了一個人，且點的是不同位置 -> 進行交換
      console.log('Swapping:', selectedSeat, 'with', { side, index });
      onSwap(selectedSeat, { side, index });
      setSelectedSeat(null); // 交換後清空選取
    } else {
      // 還沒選人，就選中當前這個
      setSelectedSeat({ side, index });
    }
  };

  // 計算重量邏輯
  const calculateStats = () => {
    if (!boatData) return { left: 0, right: 0, diff: 0 };
    const sumWeight = (arr) => arr.reduce((acc, user) => acc + (user ? (parseFloat(user.weight) || 0) : 0), 0);
    const leftTotal = sumWeight(boatData.left);
    const rightTotal = sumWeight(boatData.right);
    const diff = Math.abs(leftTotal - rightTotal);
    return { leftTotal, rightTotal, diff };
  };

  const stats = calculateStats();

  if (!boatData) return <div className="text-gray-400 text-center py-4">尚無資料</div>;

  // 判斷舵手是否被選中
  const isSteerSelected = selectedSeat?.side === 'steer';

  return (
    <div className="flex flex-col items-center w-full my-6">
      
      {/* 頂部數據列 */}
      <div className="flex flex-col items-center gap-2 mb-4">
        {showStats && (
            <div className="flex gap-4 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-md border border-gray-600">
                <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Left Total</div>
                    <div className="font-mono font-bold text-xl text-blue-300">{stats.leftTotal} <span className="text-sm">kg</span></div>
                </div>
                <div className="w-px bg-gray-600 mx-2"></div>
                <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Diff (差)</div>
                    <div className={`font-mono font-bold text-xl flex items-center gap-1 ${stats.diff > 20 ? 'text-red-400' : 'text-green-400'}`}>
                        <Scale size={16}/> {stats.diff}
                    </div>
                </div>
                <div className="w-px bg-gray-600 mx-2"></div>
                <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Right Total</div>
                    <div className="font-mono font-bold text-xl text-green-300">{stats.rightTotal} <span className="text-sm">kg</span></div>
                </div>
            </div>
        )}

        {isEditable && (
            <div className={`
              px-4 py-1 rounded-full border text-sm font-bold transition-colors
              ${selectedSeat 
                ? 'bg-orange-500 text-white border-orange-600 animate-pulse' 
                : 'bg-orange-50 text-orange-600 border-orange-200'}
            `}>
             {selectedSeat ? "👇 請點擊第二個位置進行交換" : "👆 點擊任意兩個位置 (含舵手) 可交換位置"}
            </div>
        )}
      </div>

      {/* --- 生成圖片的核心區域 --- */}
      <div 
        ref={boatRef} 
        className="p-8 bg-white rounded-[2rem] shadow-xl border-4 border-sky-100 flex flex-col items-center w-full max-w-2xl relative overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle at center, white 0%, #f0f9ff 100%)' }}
      >
        <img src="/logo.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 opacity-[0.03] pointer-events-none" alt="" />

        <div className="flex justify-between items-center w-full mb-6 border-b-2 border-sky-100 pb-4 z-10 flex-col md:flex-row gap-4">
          <div className="flex flex-col items-start w-full md:w-auto">
             <h2 className="text-2xl font-extrabold text-sky-800 tracking-tight">{date} 訓練槳位</h2>
             
             {displayPlace && (
                <div className="flex items-center gap-1 text-sky-600 font-bold mt-1 text-sm bg-sky-50 px-2 py-1 rounded-md w-full md:w-auto">
                   <MapPin size={16}/> 地點 Place：{displayPlace}
                </div>
             )}

             {time && (
                <div className="flex items-center gap-1 text-orange-600 font-bold mt-1 text-sm bg-orange-50 px-2 py-1 rounded-md w-full md:w-auto">
                   <Clock size={16}/> 集合時間 Meeting time：{time}
                </div>
             )}
          </div>
          
          <div className="flex items-center gap-3 opacity-90">
             <img src="/logo.png" alt="RUMA Logo" className="h-7 w-auto object-contain drop-shadow-sm" />
             <span className="text-sm font-bold text-sky-700 tracking-wider">RUMA Dragon Boat</span>
          </div>
        </div>

        {/* 船體座位 */}
        <div className="flex flex-col gap-1 bg-white/60 p-4 rounded-[3rem] border-2 border-sky-200 relative shadow-inner z-10 backdrop-blur-sm">
           <div className="text-center text-sky-400 text-xs pb-2 font-black tracking-[0.2em] uppercase">▲ Bow (船頭)</div>
           
           {Array.from({ length: 10 }).map((_, i) => {
             const rowIndex = i;
             return (
               <div key={rowIndex} className="flex gap-4 items-center justify-center relative">
                  <div className="absolute inset-x-0 h-px bg-sky-100 top-1/2 -z-10 w-[90%] mx-auto"></div>
                  
                  {/* Left Seat */}
                  <Seat 
                    user={boatData.left[rowIndex]} 
                    side="left" 
                    index={rowIndex} 
                    isSelected={selectedSeat?.side === 'left' && selectedSeat?.index === rowIndex}
                    isEditable={isEditable}
                    onClick={handleSeatClick}
                  />

                  <div className="text-sky-300 font-mono w-8 text-center font-black text-xl italic drop-shadow-sm">
                    {rowIndex + 1}
                  </div>

                  {/* Right Seat */}
                  <Seat 
                    user={boatData.right[rowIndex]} 
                    side="right" 
                    index={rowIndex} 
                    isSelected={selectedSeat?.side === 'right' && selectedSeat?.index === rowIndex}
                    isEditable={isEditable}
                    onClick={handleSeatClick}
                  />
               </div>
             );
           })}
           
           <div className="text-center text-sky-400 text-xs pt-2 font-black tracking-[0.2em] uppercase">▼ Stern (船尾)</div>
        </div>

        {/* 舵手位置 */}
        <div className="mt-6 relative z-10">
           <div className="absolute -top-6 left-1/2 w-2 h-6 bg-yellow-300 -translate-x-1/2 rounded-full shadow-sm"></div>
           
           <div 
             onClick={() => handleSeatClick('steer', 0)} 
             className={`
                w-24 h-24 bg-gradient-to-br from-yellow-50 to-yellow-100 
                border-4 border-yellow-400 rounded-full 
                flex flex-col items-center justify-center shadow-lg relative 
                transition-all
                ${isSteerSelected ? 'ring-4 ring-orange-500 scale-110 z-20 shadow-xl' : ''} 
                ${isEditable ? 'cursor-pointer hover:brightness-95 hover:scale-105' : ''}
             `}
           >
             <span className="font-black text-xs text-yellow-700 mb-1 uppercase tracking-widest">Steer 舵手</span>
             <span className="font-extrabold text-lg text-gray-800">
                {boatData.steer ? boatData.steer.Name : "?"}
             </span>
           </div>
        </div>

      </div>

      <button 
        onClick={downloadImage}
        className="mt-8 flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-full shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
      >
        <Download size={24} />
        下載高畫質座位圖 (HD)
      </button>
    </div>
  );
};

export default SeatVisualizer;