// ZenNori - Game Application Controller
// Norinori (海苔のり) Japanese Seaweed Domino Logic Puzzle

(function() {
  'use strict';

  // State
  let currentLevelIndex = 0;
  let currentLevel = null;
  let gridState = []; // 0 = empty, 1 = nori, 2 = dot
  let history = [];
  let activeTool = 'cycle'; // 'cycle' | 'nori' | 'dot'
  let isDragging = false;
  let dragTargetVal = 0;
  let timerInterval = null;
  let timerSeconds = 0;
  let isLevelComplete = false;
  let completedLevels = new Set();
  let hintTimeout = null;

  // Audio & Themes
  const audio = new ZenNoriAudio();

  // DOM Elements
  const gridEl = document.getElementById('grid');
  const levelPackEl = document.getElementById('level-pack');
  const levelTitleEl = document.getElementById('level-title');
  const levelSizeEl = document.getElementById('level-size');
  const statNoriEl = document.getElementById('stat-nori');
  const statTimerEl = document.getElementById('stat-timer');
  const statusBadgeEl = document.getElementById('status-badge');

  // Controls
  const toolCycleBtn = document.getElementById('tool-cycle');
  const toolNoriBtn = document.getElementById('tool-nori');
  const toolDotBtn = document.getElementById('tool-dot');
  const btnUndo = document.getElementById('btn-undo');
  const btnHint = document.getElementById('btn-hint');
  const btnReset = document.getElementById('btn-reset');
  const btnNext = document.getElementById('btn-next');

  // Header Buttons
  const btnTheme = document.getElementById('btn-theme');
  const btnSound = document.getElementById('btn-sound');
  const btnRules = document.getElementById('btn-rules');
  const btnLevels = document.getElementById('btn-levels');

  // Modals
  const modalRules = document.getElementById('modal-rules');
  const btnCloseRules = document.getElementById('btn-close-rules');
  const modalLevels = document.getElementById('modal-levels');
  const btnCloseLevels = document.getElementById('btn-close-levels');
  const packTabsEl = document.getElementById('pack-tabs');
  const levelGridEl = document.getElementById('level-grid');
  const modalVictory = document.getElementById('modal-victory');
  const victoryDescEl = document.getElementById('victory-desc');
  const btnVictoryNext = document.getElementById('btn-victory-next');

  // Persistence keys
  const STORAGE_LEVEL = 'zennori_level_idx';
  const STORAGE_COMPLETED = 'zennori_completed_set';
  const STORAGE_THEME = 'zennori_theme';
  const STORAGE_SOUND = 'zennori_sound';

  // Initialize
  function init() {
    loadSavedSettings();
    bindEvents();
    loadLevelsList();

    const savedIdx = parseInt(localStorage.getItem(STORAGE_LEVEL) || '0', 10);
    const validIdx = (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < (window.ZENNORI_LEVELS || []).length) ? savedIdx : 0;
    loadLevel(validIdx);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function loadSavedSettings() {
    // Theme
    const savedTheme = localStorage.getItem(STORAGE_THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    btnTheme.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    // Sound
    const savedSound = localStorage.getItem(STORAGE_SOUND);
    if (savedSound === 'muted') {
      audio.muted = true;
      btnSound.textContent = '🔕';
    } else {
      audio.muted = false;
      btnSound.textContent = '🔔';
    }

    // Completed levels
    try {
      const savedCompleted = JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || '[]');
      completedLevels = new Set(savedCompleted);
    } catch (e) {
      completedLevels = new Set();
    }
  }

  function bindEvents() {
    // Theme toggle
    btnTheme.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_THEME, next);
      btnTheme.textContent = next === 'dark' ? '☀️' : '🌙';
      audio.playWoodTap();
    });

    // Sound toggle
    btnSound.addEventListener('click', () => {
      audio.init();
      const isMuted = audio.toggleMute();
      localStorage.setItem(STORAGE_SOUND, isMuted ? 'muted' : 'unmuted');
      btnSound.textContent = isMuted ? '🔕' : '🔔';
      if (!isMuted) audio.playChime();
    });

    // Tool switching
    toolCycleBtn.addEventListener('click', () => setTool('cycle'));
    toolNoriBtn.addEventListener('click', () => setTool('nori'));
    toolDotBtn.addEventListener('click', () => setTool('dot'));

    // Actions
    btnUndo.addEventListener('click', handleUndo);
    btnHint.addEventListener('click', handleHint);
    btnReset.addEventListener('click', handleReset);
    btnNext.addEventListener('click', handleNextLevel);

    // Modals
    btnRules.addEventListener('click', () => modalRules.classList.add('active'));
    btnCloseRules.addEventListener('click', () => modalRules.classList.remove('active'));
    btnLevels.addEventListener('click', openLevelSelectModal);
    btnCloseLevels.addEventListener('click', () => modalLevels.classList.remove('active'));
    btnVictoryNext.addEventListener('click', () => {
      modalVictory.classList.remove('active');
      handleNextLevel();
    });

    // Close modals on backdrop click
    [modalRules, modalLevels, modalVictory].forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('active');
      });
    });

    // Grid pointer events (delegated)
    gridEl.addEventListener('pointerdown', handleGridPointerDown);
    window.addEventListener('pointerup', handleGridPointerUp);
    window.addEventListener('pointercancel', handleGridPointerUp);
    window.addEventListener('resize', updateGridSizing);

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'h' || e.key === 'H') {
        handleHint();
      } else if (e.key === '1') {
        setTool('cycle');
      } else if (e.key === '2') {
        setTool('nori');
      } else if (e.key === '3') {
        setTool('dot');
      }
    });
  }

  function setTool(tool) {
    activeTool = tool;
    toolCycleBtn.classList.toggle('active', tool === 'cycle');
    toolNoriBtn.classList.toggle('active', tool === 'nori');
    toolDotBtn.classList.toggle('active', tool === 'dot');
    audio.playWoodTap();
  }

  // Load and setup level
  function loadLevel(index) {
    const levels = window.ZENNORI_LEVELS || [];
    if (!levels.length) return;
    if (index < 0) index = 0;
    if (index >= levels.length) index = levels.length - 1;

    currentLevelIndex = index;
    currentLevel = levels[index];
    localStorage.setItem(STORAGE_LEVEL, index.toString());

    // Initialize board state
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;
    gridState = Array.from({ length: rows }, () => Array(cols).fill(0));
    history = [];
    isLevelComplete = false;

    // Timer reset
    if (timerInterval) clearInterval(timerInterval);
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (!isLevelComplete) {
        timerSeconds++;
        updateTimerDisplay();
      }
    }, 1000);

    // Update banner
    levelPackEl.textContent = currentLevel.pack || 'Zen Course';
    levelTitleEl.textContent = currentLevel.name;
    levelSizeEl.textContent = `${rows}×${cols}`;

    buildBoardDOM();
    updateValidationAndCounters();
  }

  function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    statTimerEl.textContent = `${m}:${s}`;
  }

  // Build grid layout and cells
  function buildBoardDOM() {
    gridEl.innerHTML = '';
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;

    updateGridSizing();

    // Map each cell to room ID for rapid lookup
    const roomMap = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const roomTopLeft = new Map();

    currentLevel.rooms.forEach(rm => {
      let minR = Infinity, minC = Infinity;
      rm.cells.forEach(([r, c]) => {
        roomMap[r][c] = rm.id;
        if (r < minR || (r === minR && c < minC)) {
          minR = r;
          minC = c;
        }
      });
      roomTopLeft.set(rm.id, { r: minR, c: minC });
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const myRoom = roomMap[r][c];

        // Borders and Room Walls
        // Top
        if (r === 0 || roomMap[r - 1][c] !== myRoom) {
          cell.classList.add('cell-wall-top');
        } else {
          cell.classList.add('cell-border-top');
        }
        // Bottom
        if (r === rows - 1 || roomMap[r + 1][c] !== myRoom) {
          cell.classList.add('cell-wall-bottom');
        } else {
          cell.classList.add('cell-border-bottom');
        }
        // Left
        if (c === 0 || roomMap[r][c - 1] !== myRoom) {
          cell.classList.add('cell-wall-left');
        } else {
          cell.classList.add('cell-border-left');
        }
        // Right
        if (c === cols - 1 || roomMap[r][c + 1] !== myRoom) {
          cell.classList.add('cell-wall-right');
        } else {
          cell.classList.add('cell-border-right');
        }

        // Add chamber badge in top-left cell of chamber
        const tl = roomTopLeft.get(myRoom);
        if (tl && tl.r === r && tl.c === c) {
          const badge = document.createElement('span');
          badge.className = 'room-badge';
          badge.id = `room-badge-${myRoom}`;
          badge.textContent = '0/2';
          cell.appendChild(badge);
        }

        cell.addEventListener('pointerenter', handleCellPointerEnter);
        gridEl.appendChild(cell);
      }
    }
  }

  function updateGridSizing() {
    if (!currentLevel) return;
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;

    const availableW = Math.min(window.innerWidth - 32, 540);
    const availableH = window.innerHeight - 330;
    const sizeW = Math.floor(availableW / cols);
    const sizeH = Math.floor(availableH / rows);
    const cellSize = Math.max(28, Math.min(50, Math.min(sizeW, sizeH)));

    gridEl.style.setProperty('--cell-size', `${cellSize}px`);
    gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  }

  // Pointer interaction
  function handleGridPointerDown(e) {
    if (isLevelComplete) return;
    const cellEl = e.target.closest('.cell');
    if (!cellEl) return;

    audio.init();

    const r = parseInt(cellEl.dataset.row, 10);
    const c = parseInt(cellEl.dataset.col, 10);
    if (isNaN(r) || isNaN(c)) return;

    // Clear any active hint
    clearHintHighlight();

    // Determine target value
    const curVal = gridState[r][c];
    if (activeTool === 'cycle') {
      dragTargetVal = (curVal + 1) % 3;
    } else if (activeTool === 'nori') {
      dragTargetVal = curVal === 1 ? 0 : 1;
    } else if (activeTool === 'dot') {
      dragTargetVal = curVal === 2 ? 0 : 2;
    }

    // Save history state
    saveSnapshot();

    gridState[r][c] = dragTargetVal;
    renderCellContent(r, c);

    if (dragTargetVal === 1) audio.playNori();
    else if (dragTargetVal === 2) audio.playDot();
    else audio.playWoodTap();

    isDragging = true;
    updateValidationAndCounters();
  }

  function handleCellPointerEnter(e) {
    if (!isDragging || isLevelComplete) return;
    const cellEl = e.currentTarget;
    const r = parseInt(cellEl.dataset.row, 10);
    const c = parseInt(cellEl.dataset.col, 10);
    if (isNaN(r) || isNaN(c)) return;

    if (gridState[r][c] !== dragTargetVal) {
      gridState[r][c] = dragTargetVal;
      renderCellContent(r, c);
      audio.playDot();
      updateValidationAndCounters();
    }
  }

  function handleGridPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    checkVictoryCondition();
  }

  function saveSnapshot() {
    const clone = gridState.map(row => [...row]);
    history.push(clone);
    if (history.length > 50) history.shift();
  }

  function handleUndo() {
    if (!history.length || isLevelComplete) return;
    gridState = history.pop();
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        renderCellContent(r, c);
      }
    }
    audio.playWoodTap();
    updateValidationAndCounters();
  }

  function handleReset() {
    if (isLevelComplete) return;
    saveSnapshot();
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;
    gridState = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        renderCellContent(r, c);
      }
    }
    audio.playWoodTap();
    updateValidationAndCounters();
  }

  function renderCellContent(r, c) {
    const cellEl = gridEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (!cellEl) return;

    // Remove old nori tile or dot marker, retain room-badge
    const oldNori = cellEl.querySelector('.nori-tile');
    const oldDot = cellEl.querySelector('.dot-marker');
    if (oldNori) oldNori.remove();
    if (oldDot) oldDot.remove();

    const val = gridState[r][c];
    if (val === 1) {
      const tile = document.createElement('div');
      tile.className = 'nori-tile';
      cellEl.appendChild(tile);
    } else if (val === 2) {
      const dot = document.createElement('div');
      dot.className = 'dot-marker';
      cellEl.appendChild(dot);
    }
  }

  // Real-time validation and UI updates
  function updateValidationAndCounters() {
    if (!currentLevel) return;
    const rows = currentLevel.rows;
    const cols = currentLevel.cols;

    // Count shaded in each chamber
    let totalShaded = 0;
    let satisfiedRooms = 0;
    let roomViolation = false;

    currentLevel.rooms.forEach(rm => {
      let count = 0;
      rm.cells.forEach(([r, c]) => {
        if (gridState[r][c] === 1) count++;
      });
      totalShaded += count;

      const badge = document.getElementById(`room-badge-${rm.id}`);
      if (badge) {
        badge.textContent = `${count}/2`;
        badge.classList.toggle('valid-chamber', count === 2);
        badge.classList.toggle('invalid-chamber', count > 2);
      }

      if (count === 2) satisfiedRooms++;
      if (count > 2) roomViolation = true;
    });

    const expectedDominoes = currentLevel.rooms.length;
    const expectedShaded = expectedDominoes * 2;
    statNoriEl.textContent = `${Math.floor(totalShaded / 2)} / ${expectedDominoes}`;

    // Connected components check for dominoes
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const oversizeCells = [];

    // Clear previous violation highlights
    const allCells = gridEl.querySelectorAll('.cell');
    allCells.forEach(el => el.classList.remove('violation-domino'));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (gridState[r][c] === 1 && !visited[r][c]) {
          const comp = [];
          const queue = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [cr, cc] = queue.shift();
            comp.push([cr, cc]);
            for (const [dr, dc] of ORTHO) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && gridState[nr][nc] === 1 && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }

          if (comp.length > 2) {
            comp.forEach(([cr, cc]) => oversizeCells.push([cr, cc]));
          }
        }
      }
    }

    oversizeCells.forEach(([r, c]) => {
      const cellEl = gridEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (cellEl) cellEl.classList.add('violation-domino');
    });

    // Update status message
    if (oversizeCells.length > 0) {
      setStatus('Nori clusters cannot exceed 2 cells (dominoes only)!', 'error');
    } else if (roomViolation) {
      setStatus('A chamber contains more than 2 shaded nori cells!', 'error');
    } else if (satisfiedRooms === expectedDominoes && totalShaded === expectedShaded) {
      setStatus('All chambers balanced! Checking domino alignment...', 'valid');
    } else {
      setStatus(`Chambers balanced: ${satisfiedRooms} / ${expectedDominoes}. Place 1×2 dominoes.`, 'normal');
    }
  }

  function setStatus(text, type) {
    statusBadgeEl.className = `status-badge ${type}`;
    statusBadgeEl.querySelector('span').textContent = text;
  }

  // Deductive Hint engine
  function handleHint() {
    if (isLevelComplete || !currentLevel) return;
    audio.init();

    const hint = window.ZenNoriEngine.getDeductiveHint(gridState, currentLevel.rooms);
    clearHintHighlight();

    if (hint) {
      audio.playChime();
      const cellEl = gridEl.querySelector(`.cell[data-row="${hint.r}"][data-col="${hint.c}"]`);
      if (cellEl) {
        cellEl.classList.add('hint-highlight');
        hintTimeout = setTimeout(clearHintHighlight, 3500);
      }
      setStatus(`Hint: ${hint.message}`, 'valid');
    } else {
      audio.playWoodTap();
      setStatus('No immediate deduction found. Consider placing dominoes in small chambers.', 'normal');
    }
  }

  function clearHintHighlight() {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
    const hints = gridEl.querySelectorAll('.hint-highlight');
    hints.forEach(el => el.classList.remove('hint-highlight'));
  }

  // Victory validation
  function checkVictoryCondition() {
    if (isLevelComplete || !currentLevel) return;

    const res = window.ZenNoriEngine.validateBoard(gridState, currentLevel.rooms);
    if (res.isComplete) {
      isLevelComplete = true;
      if (timerInterval) clearInterval(timerInterval);

      audio.playBell();
      setTimeout(() => audio.playChime(), 400);

      completedLevels.add(currentLevel.id);
      localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(Array.from(completedLevels)));

      // Show victory modal
      const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
      const s = (timerSeconds % 60).toString().padStart(2, '0');
      victoryDescEl.textContent = `You achieved bento harmony in ${m}:${s} with mindful elegance.`;
      modalVictory.classList.add('active');

      setStatus('✦ Bento Harmony Achieved! Excellent division. ✦', 'valid');
    }
  }

  function handleNextLevel() {
    const levels = window.ZENNORI_LEVELS || [];
    if (currentLevelIndex < levels.length - 1) {
      loadLevel(currentLevelIndex + 1);
    } else {
      setStatus('Congratulations! You completed all 50 ZenNori courses!', 'valid');
    }
  }

  // Level select modal
  function openLevelSelectModal() {
    modalLevels.classList.add('active');
    loadLevelsList();
  }

  function loadLevelsList() {
    const levels = window.ZENNORI_LEVELS || [];
    if (!levels.length) return;

    // Collect packs
    const packs = [];
    levels.forEach(lvl => {
      const p = lvl.pack || 'Standard';
      if (!packs.includes(p)) packs.push(p);
    });

    // Populate tabs
    packTabsEl.innerHTML = '';
    let activePack = levels[currentLevelIndex] ? levels[currentLevelIndex].pack : packs[0];

    packs.forEach(packName => {
      const tab = document.createElement('button');
      tab.className = `pack-tab ${packName === activePack ? 'active' : ''}`;
      tab.textContent = packName;
      tab.addEventListener('click', () => {
        packTabsEl.querySelectorAll('.pack-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLevelsForPack(packName);
      });
      packTabsEl.appendChild(tab);
    });

    renderLevelsForPack(activePack);
  }

  function renderLevelsForPack(packName) {
    levelGridEl.innerHTML = '';
    const levels = window.ZENNORI_LEVELS || [];

    levels.forEach((lvl, idx) => {
      if (lvl.pack === packName) {
        const tile = document.createElement('div');
        tile.className = 'level-tile';
        if (completedLevels.has(lvl.id)) tile.classList.add('completed');
        if (idx === currentLevelIndex) tile.classList.add('current');

        const num = document.createElement('span');
        num.textContent = lvl.id;
        tile.appendChild(num);

        tile.addEventListener('click', () => {
          modalLevels.classList.remove('active');
          loadLevel(idx);
        });

        levelGridEl.appendChild(tile);
      }
    });
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
