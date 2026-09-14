// ===== 数独核心逻辑（纯前端，无后端）=====
const SIZE = 9;

let solution = [];      // 完整解答（81 个数，1-9）
let puzzle = [];       // 当前盘面（0 表示空）
let given = [];        // 该格是否为“给定/锁定”（不可改）
let selectedIdx = null; // 当前选中的格子
let mistakeCount = 0;  // 错误次数（填入即冲突计一次）
let paused = false;    // 是否暂停（暂停时题面被遮住、计时停止）

let notes = [];        // 每格的候选数（笔记）：notes[i] 为数字数组
let notesMode = false; // 是否处于笔记模式
let completedDigits = new Set(); // 已经集齐（9 个都正确落子）的数字
let padBtns = {};      // 数字键盘按钮引用，用于刷新剩余计数

// 计时器（支持暂停）
let elapsedMs = 0;
let runStart = 0;
let running = false;
let timerId = null;

const gridEl = document.getElementById("grid");
const msgEl = document.getElementById("msg");
const timerEl = document.getElementById("timer");
const mistakesEl = document.getElementById("mistakes");
const remainEl = document.getElementById("remain");
const padFillEl = document.getElementById("padFill");
const padDraftEl = document.getElementById("padDraft");
const pauseBtn = document.getElementById("pauseBtn");
const pauseMask = document.getElementById("pauseMask");
const draftBtn = document.getElementById("draftBtn");

// 工具：打乱数组
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 判断在 idx 放 val 是否合法（行/列/宫无重复）
function isValid(board, idx, val) {
  const r = Math.floor(idx / 9), c = idx % 9;
  for (let i = 0; i < 9; i++) {
    if (board[r * 9 + i] === val) return false;
    if (board[i * 9 + c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[(br + i) * 9 + (bc + j)] === val) return false;
  return true;
}

// 随机回溯填满整个棋盘，得到一组合法解
function fillBoard(board) {
  const idx = board.indexOf(0);
  if (idx === -1) return true;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const n of nums) {
    if (isValid(board, idx, n)) {
      board[idx] = n;
      if (fillBoard(board)) return true;
      board[idx] = 0;
    }
  }
  return false;
}

function generateSolution() {
  const board = new Array(81).fill(0);
  fillBoard(board);
  return board;
}

// 按难度挖空：holes = 要挖掉的格子数
function makePuzzle(sol, holes) {
  const p = sol.slice();
  const idxs = shuffle([...Array(81).keys()]);
  let removed = 0;
  for (const i of idxs) {
    if (removed >= holes) break;
    p[i] = 0;
    removed++;
  }
  return p;
}

// 某个值在当前盘面是否“与别处冲突”
function hasConflict(idx, val) {
  if (val === 0) return false;
  const r = Math.floor(idx / 9), c = idx % 9;
  for (let i = 0; i < 9; i++) {
    const ri = r * 9 + i, ci = i * 9 + c;
    if (ri !== idx && puzzle[ri] === val) return true;
    if (ci !== idx && puzzle[ci] === val) return true;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const bi = (br + i) * 9 + (bc + j);
      if (bi !== idx && puzzle[bi] === val) return true;
    }
  return false;
}

// 渲染棋盘
function render() {
  gridEl.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.idx = i;
    if (c === 2 || c === 5) cell.classList.add("br");
    if (r === 2 || r === 5) cell.classList.add("bb");
    if ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1) cell.classList.add("box-alt");

    const inner = document.createElement("div");
    inner.className = "cell-inner";
    if (given[i]) {
      cell.classList.add("given");
      inner.textContent = puzzle[i];
    } else if (puzzle[i] !== 0) {
      inner.classList.add("filled");
      inner.textContent = puzzle[i];
    } else if (notes[i] && notes[i].length) {
      inner.classList.add("notes");
      const grid = document.createElement("div");
      grid.className = "cell-notes";
      for (let d = 1; d <= 9; d++) {
        const s = document.createElement("span");
        s.textContent = notes[i].includes(d) ? d : "";
        grid.appendChild(s);
      }
      inner.appendChild(grid);
    }
    cell.appendChild(inner);
    cell.addEventListener("click", () => selectCell(i));
    gridEl.appendChild(cell);
  }
  updateHighlights();
  applyConflicts();
  updateStatus();
}

// 选中格子
function selectCell(i) {
  selectedIdx = i;
  updateHighlights();
}

// 高亮：选中格 / 同行列宫 / 相同数字
function updateHighlights() {
  const cells = gridEl.children;
  for (const cell of cells) cell.classList.remove("selected", "peer", "same");
  if (selectedIdx === null) return;
  const sr = Math.floor(selectedIdx / 9), sc = selectedIdx % 9;
  const val = puzzle[selectedIdx];
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const cell = cells[i];
    if (i === selectedIdx) { cell.classList.add("selected"); continue; }
    if (r === sr || c === sc ||
        (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3)))
      cell.classList.add("peer");
    if (val !== 0 && puzzle[i] === val) cell.classList.add("same");
  }
}

// 把所有“与别处重复”的格子标红（实时冲突）
function applyConflicts() {
  const cells = gridEl.children;
  for (let i = 0; i < 81; i++) {
    if (given[i] || puzzle[i] === 0) continue;
    if (hasConflict(i, puzzle[i])) cells[i].classList.add("conflict");
    else cells[i].classList.remove("conflict");
  }
}

// 填入数字（来自键盘或数字键盘）
// 笔记模式下：在空格里切换候选小标记，而不是直接落子
function inputNumber(n) {
  if (paused || selectedIdx === null || given[selectedIdx]) return;

  if (notesMode) {
    if (n === 0) {
      // 草稿模式下清除：连同已填数字一起清空（两种内容在两种模式下都能删）
      puzzle[selectedIdx] = 0;
      notes[selectedIdx] = [];
    } else if (puzzle[selectedIdx] === 0) {
      const arr = notes[selectedIdx];
      const pos = arr.indexOf(n);
      if (pos >= 0) arr.splice(pos, 1); else arr.push(n);
    }
    render();
    return;
  }

  // 普通模式：正式落子（render 会重绘该格并显示数字）
  if (n === 0) {
    puzzle[selectedIdx] = 0;
  } else {
    puzzle[selectedIdx] = n;
    if (hasConflict(selectedIdx, n)) mistakeCount++;
  }
  notes[selectedIdx] = []; // 落子后清掉该格笔记
  render();
  checkWin();
}

function checkWin() {
  for (let i = 0; i < 81; i++) if (puzzle[i] !== solution[i]) { msgEl.textContent = ""; return; }
  msgEl.textContent = "🎉 全部正确，完成！";
  stopTimer();
  gridEl.classList.add("win");
  setTimeout(() => gridEl.classList.remove("win"), 700);
}

// 计时器（可暂停）
function tick() {
  const total = elapsedMs + (running ? Date.now() - runStart : 0);
  const s = Math.floor(total / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  timerEl.textContent = `${mm}:${ss}`;
}
function startTimer() {
  elapsedMs = 0; runStart = Date.now(); running = true; paused = false;
  if (timerId) clearInterval(timerId);
  timerId = setInterval(tick, 250);
  tick();
}
function pauseTimer() {
  if (!running) return;
  elapsedMs += Date.now() - runStart;
  running = false; paused = true;
  clearInterval(timerId); timerId = null;
}
function resumeTimer() {
  if (running) return;
  runStart = Date.now(); running = true; paused = false;
  if (!timerId) timerId = setInterval(tick, 250);
  tick();
}
function stopTimer() {
  if (running) { elapsedMs += Date.now() - runStart; running = false; }
  clearInterval(timerId); timerId = null; paused = false;
  tick();
}

// 数字键盘上的“剩余数” + 集齐检测
function updateStatus() {
  mistakesEl.textContent = mistakeCount;
  let rem = 0;
  for (let i = 0; i < 81; i++) if (!given[i] && puzzle[i] === 0) rem++;
  remainEl.textContent = rem;

  // 统计每个数字“正确落子”的个数，剩余 = 9 - 已正确落子
  const placed = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = puzzle[i];
    if (v !== 0 && v === solution[i]) placed[v]++;
  }
  for (let d = 1; d <= 9; d++) {
    const left = 9 - placed[d];
    const refs = padBtns[d];
    if (!refs) continue;
    setDots(refs.fill, left);
    setDots(refs.draft, left);
    const complete = left === 0;
    if (complete && !completedDigits.has(d)) {
      completedDigits.add(d);
      flashDigitDone(d);
    } else if (!complete && completedDigits.has(d)) {
      completedDigits.delete(d);
    }
    refs.fill.classList.toggle("done", complete);
    refs.draft.classList.toggle("done", complete);
  }
}

// 某数字全部正确落子时给个提示（整盘完成交给 checkWin 显示胜利）
function flashDigitDone(d) {
  for (let i = 0; i < 81; i++) if (puzzle[i] !== solution[i]) {
    msgEl.textContent = `✅ 数字 ${d} 已全部正确填完！`;
    return;
  }
}

// 暂停 / 继续
function togglePause() {
  if (paused) {
    resumeTimer();
    pauseMask.classList.remove("show");
    pauseBtn.textContent = "暂停";
  } else {
    pauseTimer();
    pauseMask.classList.add("show");
    pauseBtn.textContent = "继续";
  }
}

// 草稿键盘开 / 关（切换两套键盘）
function toggleDraft() {
  notesMode = !notesMode;
  draftBtn.classList.toggle("active", notesMode);
  draftBtn.textContent = notesMode ? "草稿 ✓" : "草稿";
  padFillEl.style.display = notesMode ? "none" : "grid";
  padDraftEl.style.display = notesMode ? "grid" : "none";
  if (notesMode) msgEl.textContent = "草稿键盘：点数字在空格里做小标记（候选数），再点「草稿」返回填写。";
}

// 新游戏
function newGame() {
  solution = generateSolution();
  const holes = { easy: 40, medium: 50, hard: 58 }[document.getElementById("difficulty").value];
  puzzle = makePuzzle(solution, holes);
  given = puzzle.map((v) => v !== 0);
  notes = new Array(81).fill().map(() => []);
  selectedIdx = null;
  mistakeCount = 0;
  paused = false;
  completedDigits = new Set();
  notesMode = false;
  draftBtn.classList.remove("active");
  draftBtn.textContent = "草稿";
  padFillEl.style.display = "grid";
  padDraftEl.style.display = "none";
  pauseMask.classList.remove("show");
  pauseBtn.textContent = "暂停";
  render();
  msgEl.textContent = "";
  startTimer();
}

// 检查（对比标准答案）
function check() {
  let filled = 0, ok = true;
  const cells = gridEl.children;
  for (let i = 0; i < 81; i++) {
    if (given[i]) continue;
    const cell = cells[i];
    cell.classList.remove("wrong", "right");
    if (puzzle[i] !== 0) {
      filled++;
      if (puzzle[i] === solution[i]) cell.classList.add("right");
      else { cell.classList.add("wrong"); ok = false; }
    }
  }
  if (filled < 81) msgEl.textContent = "还有空格没填。";
  else if (ok) msgEl.textContent = "🎉 全部正确，完成！";
  else msgEl.textContent = "有填错的地方，标红的是错的。";
}

// 提示（填一个正确格）
function hint() {
  const empties = [];
  for (let i = 0; i < 81; i++) if (!given[i] && puzzle[i] === 0) empties.push(i);
  if (empties.length === 0) { msgEl.textContent = "没有可提示的空格了。"; return; }
  const i = empties[Math.floor(Math.random() * empties.length)];
  puzzle[i] = solution[i];
  notes[i] = [];
  given[i] = true;
  selectedIdx = null;
  render();
  msgEl.textContent = "已填入一个提示。";
}

// 解题（显示完整答案）
function solve() {
  for (let i = 0; i < 81; i++) { puzzle[i] = solution[i]; given[i] = true; notes[i] = []; }
  selectedIdx = null;
  render();
  msgEl.textContent = "已显示完整答案。";
  stopTimer();
}

// 清除用户填写（保留给定）
function clearUser() {
  for (let i = 0; i < 81; i++) if (!given[i]) { puzzle[i] = 0; notes[i] = []; }
  selectedIdx = null;
  mistakeCount = 0;
  render();
  msgEl.textContent = "";
}

// 构建一套键盘的一个按钮（n=0 表示清除键）
function makePadBtn(container, n) {
  const b = document.createElement("button");
  b.className = "pad-btn" + (n === 0 ? " pad-erase" : "");
  if (n === 0) {
    b.innerHTML = `<span class="pad-num">⌫</span><span class="pad-sub">清除</span>`;
  } else {
    let dots = "";
    for (let k = 0; k < 9; k++) dots += `<i class="dot on"></i>`;
    b.innerHTML = `<span class="pad-num">${n}</span><span class="pad-dots">${dots}</span>`;
    b.dataset.n = n;
  }
  b.addEventListener("click", () => inputNumber(n));
  container.appendChild(b);
  return b;
}

// 构建两套键盘：填写键盘 + 草稿键盘（候选数）
function buildPad() {
  padFillEl.innerHTML = "";
  padDraftEl.innerHTML = "";
  padBtns = {};
  for (let n = 1; n <= 9; n++) {
    padBtns[n] = { fill: makePadBtn(padFillEl, n), draft: makePadBtn(padDraftEl, n) };
  }
  makePadBtn(padFillEl, 0);
  makePadBtn(padDraftEl, 0);
}

// 更新按钮上的“剩余”圆点（亮 = 还剩没填）
function setDots(btn, remaining) {
  const dots = btn.querySelectorAll(".dot");
  dots.forEach((d, i) => d.classList.toggle("on", i < remaining));
}

// 键盘：1-9 填数，方向键移动，退格清除，N 切换笔记
document.addEventListener("keydown", (e) => {
  if (paused) return;
  if (e.target.tagName === "SELECT") return;
  if (e.key === "n" || e.key === "N") { toggleDraft(); e.preventDefault(); return; }
  if (e.key >= "1" && e.key <= "9") { inputNumber(+e.key); e.preventDefault(); return; }
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { inputNumber(0); e.preventDefault(); return; }
  if (e.key.startsWith("Arrow")) {
    if (selectedIdx === null) selectedIdx = 0;
    let r = Math.floor(selectedIdx / 9), c = selectedIdx % 9;
    if (e.key === "ArrowUp") r = (r + 8) % 9;
    if (e.key === "ArrowDown") r = (r + 1) % 9;
    if (e.key === "ArrowLeft") c = (c + 8) % 9;
    if (e.key === "ArrowRight") c = (c + 1) % 9;
    selectCell(r * 9 + c);
    e.preventDefault();
  }
});

// 绑定按钮
document.getElementById("newBtn").addEventListener("click", newGame);
document.getElementById("checkBtn").addEventListener("click", check);
document.getElementById("hintBtn").addEventListener("click", hint);
document.getElementById("solveBtn").addEventListener("click", solve);
document.getElementById("clearBtn").addEventListener("click", clearUser);
pauseBtn.addEventListener("click", togglePause);
pauseMask.addEventListener("click", togglePause);
draftBtn.addEventListener("click", toggleDraft);

// 初始化
buildPad();
newGame();
