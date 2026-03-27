// src/utils/seatingLogic.js

// 解析位置能力
const parsePosition = (posString) => {
  const s = posString || "";
  return {
    canLeft: s.includes("左") || s.includes("左右"),
    canRight: s.includes("右") || s.includes("左右"),
    canSteer: s.includes("舵手"),
    canDrum: s.includes("鼓手")
  };
};

export const generateSeating = (users) => {
  // 初始化結構
  let boat = {
    left: Array(10).fill(null),
    right: Array(10).fill(null),
    steer: null,
    drummer: null
  };
  let reserve = [];

  if (!users || users.length === 0) return { ...boat, reserve };

  // 1. 資料預處理
  let pool = users.map(u => ({
    ...u,
    weight: parseFloat(u.Weight) || 0,
    skill: parseFloat(u.Skill_Rating) || 0,
    attendanceCount: u.attendanceCount || 0,
    mPoints: u.M_Points || 0,
    ...parsePosition(u.Position),
    originalName: u.Name // 保留原始名字
  }));

  // 2. 排序邏輯 (決定誰上船)
  // 優先順序: 舵手/鼓手(特殊) > 出席率 > 技術評分 > M點
  // 但為了方便選人，我們先整體排序
  pool.sort((a, b) => {
    if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
    if (b.skill !== a.skill) return b.skill - a.skill;
    return b.mPoints - a.mPoints;
  });

  // --- 步驟 A: 選舵手 (Steer) ---
  // 從所有人中選出會舵手的 (優先選技術最好的)
  // 若沒人會舵手，則暫時空著
  const steerCandidates = pool.filter(u => u.canSteer);
  if (steerCandidates.length > 0) {
    // 舵手通常需要經驗豐富，這裡假設 skill 還是重要參考，
    // 或者可以直接用 attendance/skill 排序後的 pool 第一個會舵手的
    // 這裡沿用之前的邏輯：取出 steerCandidates 並用 skill 排序
    steerCandidates.sort((a, b) => b.skill - a.skill);
    const bestSteer = steerCandidates[0];
    boat.steer = bestSteer;
    // 從 pool 中移除
    pool = pool.filter(u => u !== bestSteer);
  }

  // --- 步驟 B: 選鼓手 (Drummer) ---
  // (Optional: 如果有專職鼓手可以先選，目前需求沒特別提，先保留邏輯接口)
  // 假設鼓手不佔用 20 個划手名額，是額外的 (20+1+1)
  /*
  const drumCandidates = pool.filter(u => u.canDrum);
  if (drumCandidates.length > 0 && !boat.drummer) {
      boat.drummer = drumCandidates[0];
      pool = pool.filter(u => u !== boat.drummer);
  }
  */

  // --- 步驟 C: 決定正選名單 (Top 20 Paddlers) ---
  // pool 已經依照 (Attendance -> Skill -> MPoints) 排序
  // 取前 20 位作為正選，剩下的進入候補
  // *注意*: 如果人數 > 20，第 21 位以後就是候補
  let paddlerCandidates = [];
  if (pool.length > 20) {
    paddlerCandidates = pool.slice(0, 20);
    reserve = pool.slice(20);
  } else {
    paddlerCandidates = [...pool];
    reserve = [];
  }

  // 接以來的座位安排只針對 paddlerCandidates 進行
  // 重新對 paddlerCandidates 依照 (Skill -> Weight) 排序以進行座位平衡 (沿用舊邏輯)
  // 因為上船名單確定後，座位安排應以「平衡」為重
  let seatingPool = paddlerCandidates.sort((a, b) => b.skill - a.skill || b.weight - a.weight);

  // --- 步驟 3: 安排第一排 (Pacers) ---
  for (let side of ['left', 'right']) {
    const idx = seatingPool.findIndex(u => side === 'left' ? u.canLeft : u.canRight);
    if (idx !== -1) {
      boat[side][0] = seatingPool[idx];
      seatingPool.splice(idx, 1);
    }
  }

  // --- 步驟 4: 安排引擎室 (Row 5 & 6) ---
  const heavyHitters = seatingPool.filter(u => u.weight > 80);
  seatingPool = seatingPool.filter(u => u.weight <= 80);

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
  if (heavyHitters.length > 0) seatingPool = [...heavyHitters, ...seatingPool];

  // --- 步驟 5: 填滿剩餘座位 ---
  for (let i = 0; i < 10; i++) {
    ['left', 'right'].forEach(side => {
      if (boat[side][i]) return;
      if (seatingPool.length === 0) return;

      const idx = seatingPool.findIndex(u => side === 'left' ? u.canLeft : u.canRight);
      if (idx !== -1) {
        boat[side][i] = seatingPool[idx];
        seatingPool.splice(idx, 1);
      }
    });
  }

  // --- 步驟 6: 處理無法安排的人 (例如單邊人過多) ---
  // 這些人也應該進入 reserve，或者強行塞入空位(如果是雙邊人)
  // 剩餘的 seatingPool 人員，如果是因為邊不對而沒排進去
  if (seatingPool.length > 0) {
    // 嘗試填入任何空位 (如果不介意邊) - 暫不實作，假設大家都能配合或已篩選
    // 將剩餘無法排入座位的人移至 reserve 最前面 (因為他們是正選但沒位置)
    reserve = [...seatingPool, ...reserve];
  }

  // --- 步驟 7: 重量平衡檢查 (>20kg 邏輯) ---
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
    // 修正: 應該找體重適合交換的，而不僅僅是技術最差。但沿用舊邏輯。
    heavySideUsers.sort((a, b) => a.u.skill - b.u.skill);

    // 3. 嘗試將技術最差的人移到對面 (如果是空的或交換)
    for (let candidate of heavySideUsers) {
      const user = candidate.u;
      const originalIndex = candidate.index;

      // 檢查這個人能不能划對面 (或雙邊)
      const canRowLighter = lighterSide === 'left' ? user.canLeft : user.canRight;

      if (canRowLighter) {
        // 找對面的一個空位，或是最輕的人交換
        if (boat[lighterSide][originalIndex] === null) {
          boat[lighterSide][originalIndex] = user;
          boat[heavierSide][originalIndex] = null;
          break; // 移一個就夠了
        }
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

  // 回傳包含 reserve 的結構
  return { ...boat, reserve };
};