// src/utils/seatingLogic.js

// 解析位置能力
const parsePosition = (posString) => {
  const s = posString || "";
  return {
    canLeft: s.includes("左") || s.includes("左右"),
    canRight: s.includes("右") || s.includes("左右"),
    canSteer: s.includes("舵手")
  };
};

export const generateSeating = (users) => {
  // 初始化結構
  let boat = {
    left: Array(10).fill(null),
    right: Array(10).fill(null),
    steer: null
  };

  if (!users || users.length === 0) return boat;

  // 1. 資料預處理與排序 (技術高 -> 體重重)
  let pool = users.map(u => ({
    ...u,
    weight: parseFloat(u.Weight) || 0,
    skill: parseFloat(u.Skill_Rating) || 0,
    ...parsePosition(u.Position),
    originalName: u.Name // 保留原始名字
  })).sort((a, b) => b.skill - a.skill || b.weight - a.weight);

  // --- 步驟 1: 選舵手 ---
  const steerCandidates = pool.filter(u => u.canSteer);
  if (steerCandidates.length > 0) {
    const bestSteer = steerCandidates[0]; // 取技術最好的
    boat.steer = bestSteer;
    pool = pool.filter(u => u !== bestSteer);
  }

  // --- 步驟 2: 安排第一排 (Pacers) ---
  for (let side of ['left', 'right']) {
    const idx = pool.findIndex(u => side === 'left' ? u.canLeft : u.canRight);
    if (idx !== -1) {
      boat[side][0] = pool[idx];
      pool.splice(idx, 1);
    }
  }

  // --- 步驟 3: 安排引擎室 (Row 5 & 6) ---
  const heavyHitters = pool.filter(u => u.weight > 80);
  pool = pool.filter(u => u.weight <= 80);

  [4, 5].forEach(rowIndex => {
    ['left', 'right'].forEach(side => {
      if (heavyHitters.length === 0) return;
      const idx = heavyHitters.findIndex(u => side === 'left' ? u.canLeft : u.canRight);
      if (idx !== -1) {
        boat[side][rowIndex] = heavyHitters[idx];
        heavyHitters.splice(idx, 1);
      }
    });
  });
  if (heavyHitters.length > 0) pool = [...heavyHitters, ...pool];

  // --- 步驟 4: 填滿剩餘座位 ---
  for (let i = 0; i < 10; i++) {
    ['left', 'right'].forEach(side => {
      if (boat[side][i]) return;
      if (pool.length === 0) return;

      const idx = pool.findIndex(u => side === 'left' ? u.canLeft : u.canRight);
      if (idx !== -1) {
        boat[side][i] = pool[idx];
        pool.splice(idx, 1);
      }
    });
  }

  // --- 步驟 5: 處理超額人員 (>21人) ---
  // 邏輯：塞入已有的格子顯示 "Name1 / Name2"
  while (pool.length > 0) {
    const u = pool.shift();
    let placed = false;
    for (let i = 0; i < 10; i++) {
      if (placed) break;
      for (let side of ['left', 'right']) {
        const canSide = side === 'left' ? u.canLeft : u.canRight;
        // 找同邊、且還沒被合併過的格子
        if (boat[side][i] && !boat[side][i].isShared && canSide) {
           boat[side][i].Name = `${boat[side][i].Name} / ${u.Name}`;
           boat[side][i].weight += u.weight; // 重量疊加
           boat[side][i].isShared = true;
           placed = true;
           break;
        }
      }
    }
    // 如果真的塞不下(所有格子都滿了)，就隨便塞一個還能塞的空位(極端狀況)
    if (!placed) {
        // ... (這裡通常不會發生，除非30人以上)
    }
  }

  // --- 步驟 6: 重量平衡檢查 (>20kg 邏輯) ---
  const calcWeight = (arr) => arr.reduce((sum, u) => sum + (u ? u.weight : 0), 0);
  let leftTotal = calcWeight(boat.left);
  let rightTotal = calcWeight(boat.right);
  let diff = Math.abs(leftTotal - rightTotal);

  if (diff > 20) {
    const heavierSide = leftTotal > rightTotal ? 'left' : 'right';
    const lighterSide = heavierSide === 'left' ? 'right' : 'left';
    
    // 1. 找出重邊的所有人
    let heavySideUsers = boat[heavierSide].map((u, index) => ({ u, index })).filter(item => item.u !== null);
    
    // 2. 依照「技術評分」由小到大排序 (找最菜的)
    heavySideUsers.sort((a, b) => a.u.skill - b.u.skill);

    // 3. 嘗試將技術最差的人移到對面 (如果是空的或交換)
    for (let candidate of heavySideUsers) {
        const user = candidate.u;
        const originalIndex = candidate.index;

        // 檢查這個人能不能划對面 (或雙邊)
        const canRowLighter = lighterSide === 'left' ? user.canLeft : user.canRight;
        
        if (canRowLighter) {
            // 找對面的一個空位，或是最輕的人交換
            // 簡單策略：找對面同排是否為空，若空直接移過去
            if (boat[lighterSide][originalIndex] === null) {
                boat[lighterSide][originalIndex] = user;
                boat[heavierSide][originalIndex] = null;
                break; // 移一個就夠了，重新計算太複雜，先做一次調整
            } 
            // 若對面有人，且對面那個人也能划重邊，則交換
            else {
                const target = boat[lighterSide][originalIndex];
                const targetCanRowHeavy = heavierSide === 'left' ? target.canLeft : target.canRight;
                if (targetCanRowHeavy) {
                    // 交換
                    boat[lighterSide][originalIndex] = user;
                    boat[heavierSide][originalIndex] = target;
                    break;
                }
            }
        }
    }
  }

  return boat;
};