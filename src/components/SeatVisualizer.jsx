// src/components/SeatVisualizer.jsx
import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, MapPin, Clock } from 'lucide-react';

// --- 獨立的 Seat 元件 ---
const Seat = ({ user, side, index, isSelected, isEditable, onClick }) => {
  return (
    <div 
      onClick={() => onClick(side, index)}
      className={`
        flex items-center justify-center
        w-20 h-20 md:w-24 md:h-24 
        border-2 rounded-lg shadow-sm m-1 transition-all relative
        ${side === 'left' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}
        ${user?.weight > 80 ? 'border-red-400 border-4' : ''}
        ${isSelected ? 'ring-4 ring-orange-500 scale-110 z-20 shadow-lg' : ''} 
        ${isEditable ? 'cursor-pointer hover:brightness-95 hover:scale-105' : ''}
      `}
      style={{ minWidth: '80px' }}
    >
      <span className="font-bold text-gray-800 text-sm md:text-base text-center leading-tight">
        {user ? user.Name : "空"}
      </span>
      <span className="absolute top-0 right-1 text-[10px] text-gray-400 opacity-50">
        {side === 'left' ? 'L' : 'R'}{index + 1}
      </span>
    </div>
  );
};

// --- 主元件 ---
const SeatVisualizer = ({ boatData, date, location, place, time, onSwap, isEditable = false }) => {
  const boatRef = useRef(null);
  const [selectedSeat, setSelectedSeat] = useState(null);

  const displayPlace = location || place;

  const downloadImage = async () => {
    if (!boatRef.current) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(boatRef.current, { 
        scale: 3, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff',
        height: boatRef.current.scrollHeight + 50,
        windowHeight: boatRef.current.scrollHeight + 50,
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector('.seat-visualizer-container');
            if (clonedElement) {
                clonedElement.style.height = 'auto';
                clonedElement.style.overflow = 'visible';
            }
        }
      });
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

    if (selectedSeat) {
      if (selectedSeat.side === side && selectedSeat.index === index) {
        setSelectedSeat(null);
        return;
      }
      onSwap(selectedSeat, { side, index });
      setSelectedSeat(null);
    } else {
      setSelectedSeat({ side, index });
    }
  };

  if (!boatData) return <div className="text-gray-400 text-center py-4">尚無資料</div>;

  const isSteerSelected = selectedSeat?.side === 'steer';
  const isDrummerSelected = selectedSeat?.side === 'drummer';

  return (
    <div className="flex flex-col items-center w-full my-6 seat-visualizer-container">
      
      {/* 頂部提示 */}
      <div className="flex flex-col items-center gap-2 mb-4">
        {isEditable && (
            <div className={`
              px-4 py-1 rounded-full border text-sm font-bold transition-colors
              ${selectedSeat 
                ? 'bg-orange-500 text-white border-orange-600 animate-pulse' 
                : 'bg-orange-50 text-orange-600 border-orange-200'}
            `}>
             {selectedSeat ? "👇 請點擊第二個位置進行交換" : "👆 點擊任意兩個位置 (含鼓手/舵手) 可交換位置"}
            </div>
        )}
      </div>

      {/* --- 圖片生成區域 --- */}
      <div 
        ref={boatRef} 
        className="p-8 bg-white rounded-[2rem] shadow-xl border-4 border-sky-100 flex flex-col items-center w-full max-w-2xl relative overflow-visible"
        style={{ backgroundImage: 'radial-gradient(circle at center, white 0%, #f0f9ff 100%)' }}
      >
        <img src="/logo.png" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 opacity-[0.03] pointer-events-none" alt="" />

        {/* 標題區 */}
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

        {/* 船身區域 */}
        <div className="flex flex-col gap-1 bg-white/60 p-4 rounded-[3rem] border-2 border-sky-200 relative shadow-inner z-10 backdrop-blur-sm">
           
           {/* ✨ 鼓手區域 (Drummer) - 修正樣式 */}
           <div className="flex justify-center mb-4 relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-100 -z-10"></div>
              
              <div 
                onClick={() => handleSeatClick('drummer', 0)}
                className={`
                   w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 
                   border-4 border-red-400 rounded-full 
                   flex flex-col items-center justify-center shadow-lg relative 
                   transition-all cursor-pointer overflow-hidden
                   ${isDrummerSelected ? 'ring-4 ring-orange-500 scale-110 z-20 shadow-xl' : ''} 
                   ${isEditable ? 'hover:brightness-95 hover:scale-105' : ''}
                `}
              >
                {/* 修正：文字置中與大小微調 */}
                <span className="font-black text-[9px] text-red-700 uppercase tracking-widest leading-none mb-0.5 mt-1">DRUMMER</span>
                <span className="font-black text-xs text-red-700 uppercase tracking-widest leading-none">鼓手</span>
                <span className="font-extrabold text-lg text-gray-800 text-center leading-tight px-1 mt-1 truncate w-full">
                   {boatData.drummer ? boatData.drummer.Name : "?"}
                </span>
              </div>
           </div>
           
           {/* 左右槳手 (1-10排) */}
           {Array.from({ length: 10 }).map((_, i) => {
             const rowIndex = i;
             return (
               <div key={rowIndex} className="flex gap-4 items-center justify-center relative">
                  <div className="absolute inset-x-0 h-px bg-sky-100 top-1/2 -z-10 w-[90%] mx-auto"></div>
                  
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

        {/* 舵手位置 (Steer) */}
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
             <span className="font-black text-[9px] text-yellow-700 uppercase tracking-widest leading-none mb-0.5 mt-1">STEER</span>
             <span className="font-black text-xs text-yellow-700 uppercase tracking-widest leading-none">舵手</span>
             <span className="font-extrabold text-lg text-gray-800 text-center leading-tight px-1 mt-1 truncate w-full">
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