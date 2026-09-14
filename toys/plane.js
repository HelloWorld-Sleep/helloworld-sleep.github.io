// ===== 寻机头 / 猜飞机（单人 vs 电脑，纯前端）=====
const GRID = 10;
const PLANES = 2; // 每局藏 2 架

// 三款飞机造型（机头=红、机身=蓝），用相对机头 [0,0] 的偏移表示；每局随机抽 2 款、各随机朝向
// 1 号：紧凑型，机翼偏下
const PLANE_1 = [
  [0, 0],
  [1, -2], [1, -1], [1, 0], [1, 1], [1, 2],
  [2, 0],
  [3, -1], [3, 0], [3, 1],
];
// 2 号：机翼居中
const PLANE_2 = [
  [0, 0],
  [1, 0],
  [2, -2], [2, -1], [2, 0], [2, 1], [2, 2],
  [3, 0],
  [4, -1], [4, 1],
];
// 3 号：左右对称、翼展大（7×5，13 格）
const PLANE_3 = [
  [0, 0],
  [1, -1], [1, 0], [1, 1],
  [2, -2], [2, 0], [2, 2],
  [3, -3], [3, 0], [3, 3],
  [4, -1], [4, 0], [4, 1],
];

const PLANE_POOL = [PLANE_1, PLANE_2, PLANE_3];

const BEST_KEY = `plane_best_${GRID}x${GRID}_${PLANES}`;

let planeSet = new Set();   // 所有飞机格子 "r,c"
let headSet = new Set();    // 机头格子 "r,c"
let revealed = new Set();    // 已点开的格子
let steps = 0;
let foundHeads = 0;
let gameOver = false;

const gridEl = document.getElementById("grid");
const msgEl = document.getElementById("msg");
const stepsEl = document.getElementById("steps");
const bestEl = document.getElementById("best");
const headsEl = document.getElementById("heads");
const totalEl = document.getElementById("total");
const newBtn = document.getElementById("newBtn");
const boardWrap = document.querySelector(".board-wrap");

const key = (r, c) => r + "," + c;

// 将造型顺时针旋转 k*90°（机头恒在 [0,0]，旋转不改变首元素位置）
function rotate(offsets, k) {
  let o = offsets.map(([r, c]) => [r, c]);
  for (let t = 0; t < k; t++) o = o.map(([r, c]) => [c, -r]);
  return o;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 随机放一架指定的飞机（不与 occupied 重叠），返回 {cells, ks}
function placePlane(occupied, planeOffsets) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const offs = rotate(planeOffsets, Math.floor(Math.random() * 4));
    const minR = Math.min(...offs.map((p) => p[0]));
    const minC = Math.min(...offs.map((p) => p[1]));
    const norm = offs.map(([r, c]) => [r - minR, c - minC]); // 归一化到左上角
    const h = Math.max(...norm.map((p) => p[0]));
    const w = Math.max(...norm.map((p) => p[1]));
    const r0 = Math.floor(Math.random() * (GRID - h));
    const c0 = Math.floor(Math.random() * (GRID - w));
    const cells = norm.map(([dr, dc]) => [r0 + dr, c0 + dc]);
    const ks = cells.map(([r, c]) => key(r, c));
    if (ks.some((k2) => occupied.has(k2))) continue; // 重叠，重试
    return { cells, ks };
  }
  return null;
}

function newGame() {
  let ok = false;
  for (let guard = 0; guard < 50 && !ok; guard++) {
    planeSet = new Set();
    headSet = new Set();
    revealed = new Set();
    steps = 0;
    foundHeads = 0;
    gameOver = false;

    const occupied = new Set();
    const idxs = shuffle([0, 1, 2]).slice(0, PLANES); // 随机抽 2 款
    ok = true;
    for (const idx of idxs) {
      const p = placePlane(occupied, PLANE_POOL[idx]);
      if (!p) { ok = false; break; } // 极少见放不下，整轮重试
      p.ks.forEach((k2) => { occupied.add(k2); planeSet.add(k2); });
      headSet.add(p.cells[0][0] + "," + p.cells[0][1]); // 首格恒为机头
    }
  }

  boardWrap.classList.remove("win");
  totalEl.textContent = PLANES;
  const prev = localStorage.getItem(BEST_KEY);
  bestEl.textContent = prev ? prev + " 步" : "—";
  render();
  msgEl.textContent = "已藏好 2 架飞机，开始侦察吧！";
}

function render() {
  gridEl.innerHTML = "";
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const k = key(r, c);
      if (revealed.has(k)) {
        cell.classList.add("revealed");
        if (headSet.has(k)) cell.classList.add("head");
        else if (planeSet.has(k)) cell.classList.add("body");
        else cell.classList.add("miss");
      }
      cell.addEventListener("click", () => clickCell(r, c));
      gridEl.appendChild(cell);
    }
  }
  stepsEl.textContent = steps;
  headsEl.textContent = foundHeads;
}

function clickCell(r, c) {
  if (gameOver) return;
  const k = key(r, c);
  if (revealed.has(k)) return; // 已点过，不计步
  revealed.add(k);
  steps++;

  if (headSet.has(k)) {
    foundHeads++;
    if (foundHeads === PLANES) return win();
    msgEl.textContent = `🎯 击中机头！还差 ${PLANES - foundHeads} 个。`;
  } else if (planeSet.has(k)) {
    msgEl.textContent = "✈️ 击中机身！继续找机头。";
  } else {
    msgEl.textContent = "⬜ 未击中，这里是空地。";
  }
  render();
}

function win() {
  gameOver = true;
  planeSet.forEach((k) => revealed.add(k)); // 展示整架飞机
  render();
  boardWrap.classList.add("win");
  const prev = localStorage.getItem(BEST_KEY);
  if (!prev || steps < parseInt(prev, 10)) {
    localStorage.setItem(BEST_KEY, String(steps));
    bestEl.textContent = steps + " 步";
    msgEl.textContent = `🎉 找到全部 ${PLANES} 个机头！用了 ${steps} 步，刷新最佳记录！`;
  } else {
    msgEl.textContent = `🎉 找到全部 ${PLANES} 个机头！用了 ${steps} 步（最佳 ${prev} 步）。`;
  }
}

// 在界面上画出三款飞机的造型，让玩家认识飞机长什么样
function renderLegend() {
  const legend = document.getElementById("legend");
  if (!legend) return;
  PLANE_POOL.forEach((plane, i) => {
    const set = new Set(plane.map(([r, c]) => r + "," + c));
    const head = plane[0];
    const minR = Math.min(...plane.map((p) => p[0]));
    const minC = Math.min(...plane.map((p) => p[1]));
    const maxR = Math.max(...plane.map((p) => p[0]));
    const maxC = Math.max(...plane.map((p) => p[1]));
    const rows = maxR - minR + 1, cols = maxC - minC + 1;
    const item = document.createElement("div");
    item.className = "legend-item";
    const cap = document.createElement("div");
    cap.className = "cap";
    cap.textContent = (i + 1) + " 号";
    const grid = document.createElement("div");
    grid.className = "mini-grid";
    grid.style.gridTemplateColumns = "repeat(" + cols + ", 16px)";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rr = minR + r, cc = minC + c;
        const cell = document.createElement("div");
        cell.className = "mini-cell";
        if (rr === head[0] && cc === head[1]) cell.classList.add("head");
        else if (set.has(rr + "," + cc)) cell.classList.add("body");
        else cell.classList.add("empty");
        grid.appendChild(cell);
      }
    }
    item.appendChild(cap);
    item.appendChild(grid);
    legend.appendChild(item);
  });
}

newBtn.addEventListener("click", newGame);
renderLegend();
newGame();
