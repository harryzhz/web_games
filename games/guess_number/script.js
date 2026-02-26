// ===== State =====
const state = {
  config: {
    digits: 4,
    allowDuplicates: false,
    difficulty: 'easy', // 'easy' | 'hard'
    hintMode: 'position-only', // 'position-only' | 'position-and-digit'
  },
  answer: [],
  history: [],
  startTime: null,
  timerInterval: null,
  gameActive: false,
};

// ===== DOM Refs =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  configScreen: $('#config-screen'),
  gameScreen: $('#game-screen'),
  winOverlay: $('#win-overlay'),
  confettiCanvas: $('#confetti-canvas'),
  particlesCanvas: $('#particles-canvas'),
  // Config
  digitSelector: $('#digit-selector'),
  toggleDuplicates: $('#toggle-duplicates'),
  hintModePosition: $('#hint-mode-position'),
  hintModeBoth: $('#hint-mode-both'),
  toggleDifficulty: $('#toggle-difficulty'),
  difficultyHint: $('#difficulty-hint'),
  startBtn: $('#start-btn'),
  // Game
  digitInputs: $('#digit-inputs'),
  submitBtn: $('#submit-btn'),
  clearBtn: $('#clear-btn'),
  backBtn: $('#back-btn'),
  newGameBtn: $('#new-game-btn'),
  attemptNumber: $('#attempt-number'),
  infoDigits: $('#info-digits'),
  infoMode: $('#info-mode'),
  infoDifficulty: $('#info-difficulty'),
  infoTimer: $('#info-timer'),
  historyList: $('#history-list'),
  historyArea: $('#history-area'),
  numpad: $('#numpad'),
  // Win
  winAnswerDigits: $('#win-answer-digits'),
  statAttempts: $('#stat-attempts'),
  statTime: $('#stat-time'),
  statAvg: $('#stat-avg'),
  winReplayBtn: $('#win-replay-btn'),
  winSettingsBtn: $('#win-settings-btn'),
};

// ===== Particles Background =====
function initParticles() {
  const canvas = DOM.particlesCanvas;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.hue = Math.random() > 0.5 ? 185 : 295; // cyan or magenta
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.opacity})`;
      ctx.fill();
    }
  }

  const count = Math.min(80, Math.floor((w * h) / 15000));
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.update();
      p.draw();
    }
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

// ===== Confetti =====
function launchConfetti() {
  const canvas = DOM.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#39ff14', '#00f0ff', '#ff00e5', '#ffe600', '#ff6a00', '#fff'];

  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15,
      vy: -(Math.random() * 12 + 5),
      size: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.2 + Math.random() * 0.1,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.005;

      if (p.opacity <= 0) continue;
      alive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    frame++;
    if (alive && frame < 300) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

// ===== Screen Transitions =====
function showScreen(screenId) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $(`#${screenId}`).classList.add('active');
}

// ===== Config Handlers =====
function initConfig() {
  // Digit selector
  DOM.digitSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.digit-btn');
    if (!btn) return;
    $$('.digit-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.config.digits = parseInt(btn.dataset.value);
  });

  // Duplicates toggle
  DOM.toggleDuplicates.addEventListener('click', () => {
    const current = DOM.toggleDuplicates.dataset.active === 'true';
    DOM.toggleDuplicates.dataset.active = !current;
    state.config.allowDuplicates = !current;
  });

  // Difficulty toggle
  DOM.toggleDifficulty.addEventListener('click', () => {
    const current = DOM.toggleDifficulty.dataset.active === 'true';
    DOM.toggleDifficulty.dataset.active = !current;
    state.config.difficulty = !current ? 'hard' : 'easy';
    DOM.difficultyHint.textContent = !current
      ? '困难模式：仅提示数量，不标记具体数字'
      : '简单模式：提示具体哪些数字正确';
  });

  // Hint mode
  DOM.hintModePosition.addEventListener('click', () => {
    DOM.hintModePosition.classList.add('active');
    DOM.hintModeBoth.classList.remove('active');
    state.config.hintMode = 'position-only';
  });

  DOM.hintModeBoth.addEventListener('click', () => {
    DOM.hintModeBoth.classList.add('active');
    DOM.hintModePosition.classList.remove('active');
    state.config.hintMode = 'position-and-digit';
  });

  // Start
  DOM.startBtn.addEventListener('click', startGame);
}

// ===== Number Generator =====
function generateAnswer() {
  const { digits, allowDuplicates } = state.config;
  const answer = [];

  if (allowDuplicates) {
    for (let i = 0; i < digits; i++) {
      answer.push(Math.floor(Math.random() * 10));
    }
  } else {
    const available = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 0; i < digits; i++) {
      const idx = Math.floor(Math.random() * available.length);
      answer.push(available[idx]);
      available.splice(idx, 1);
    }
  }

  return answer;
}

// ===== Hint Engine =====
function calculateHints(guess, answer) {
  const n = answer.length;
  let correctPosition = 0;
  let correctDigit = 0;

  const answerUsed = new Array(n).fill(false);
  const guessUsed = new Array(n).fill(false);

  // First pass: exact matches
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      correctPosition++;
      answerUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Second pass: digit present but wrong position
  if (state.config.hintMode === 'position-and-digit') {
    for (let i = 0; i < n; i++) {
      if (guessUsed[i]) continue;
      for (let j = 0; j < n; j++) {
        if (answerUsed[j]) continue;
        if (guess[i] === answer[j]) {
          correctDigit++;
          answerUsed[j] = true;
          break;
        }
      }
    }
  }

  // Per-digit status for coloring history
  const digitStatus = [];
  const answerUsed2 = new Array(n).fill(false);
  const guessUsed2 = new Array(n).fill(false);

  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      digitStatus[i] = 'correct-pos';
      answerUsed2[i] = true;
      guessUsed2[i] = true;
    }
  }

  if (state.config.hintMode === 'position-and-digit') {
    for (let i = 0; i < n; i++) {
      if (guessUsed2[i]) continue;
      let found = false;
      for (let j = 0; j < n; j++) {
        if (answerUsed2[j]) continue;
        if (guess[i] === answer[j]) {
          digitStatus[i] = 'correct-digit';
          answerUsed2[j] = true;
          found = true;
          break;
        }
      }
      if (!found) digitStatus[i] = 'wrong';
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (!guessUsed2[i]) digitStatus[i] = 'wrong';
    }
  }

  return { correctPosition, correctDigit, digitStatus };
}

// ===== Input Controller =====
function createDigitInputs() {
  DOM.digitInputs.innerHTML = '';
  for (let i = 0; i < state.config.digits; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'none';
    input.maxLength = 1;
    input.classList.add('digit-cell');
    input.dataset.index = i;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('id', `digit-cell-${i}`);

    input.addEventListener('input', (e) => handleDigitInput(e, i));
    input.addEventListener('keydown', (e) => handleDigitKeydown(e, i));
    input.addEventListener('focus', () => input.select());
    input.addEventListener('paste', handlePaste);

    DOM.digitInputs.appendChild(input);
  }
}

function handleDigitInput(e, index) {
  const input = e.target;
  const value = input.value;

  // Only allow digits 0-9
  if (!/^\d$/.test(value)) {
    input.value = '';
    return;
  }

  input.classList.add('filled', 'pop');
  setTimeout(() => input.classList.remove('pop'), 300);

  // Auto-advance
  const next = DOM.digitInputs.children[index + 1];
  if (next) {
    next.focus();
  }

  updateSubmitState();
}

function handleDigitKeydown(e, index) {
  const cells = DOM.digitInputs.children;

  if (e.key === 'Backspace') {
    if (!cells[index].value && index > 0) {
      cells[index - 1].focus();
      cells[index - 1].value = '';
      cells[index - 1].classList.remove('filled');
    } else {
      cells[index].value = '';
      cells[index].classList.remove('filled');
    }
    updateSubmitState();
  } else if (e.key === 'ArrowLeft' && index > 0) {
    cells[index - 1].focus();
  } else if (e.key === 'ArrowRight' && index < cells.length - 1) {
    cells[index + 1].focus();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    submitGuess();
  }
}

function handlePaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text').trim();
  const digits = text.replace(/\D/g, '').split('');
  const cells = DOM.digitInputs.children;

  for (let i = 0; i < Math.min(digits.length, cells.length); i++) {
    cells[i].value = digits[i];
    cells[i].classList.add('filled');
  }

  const focusIdx = Math.min(digits.length, cells.length - 1);
  cells[focusIdx].focus();
  updateSubmitState();
}

function updateSubmitState() {
  const cells = DOM.digitInputs.children;
  const allFilled = Array.from(cells).every((c) => c.value.length === 1);
  DOM.submitBtn.disabled = !allFilled;
}

function getGuessFromCells() {
  const cells = DOM.digitInputs.children;
  return Array.from(cells).map((c) => parseInt(c.value));
}

function clearInputs() {
  const cells = DOM.digitInputs.children;
  Array.from(cells).forEach((c) => {
    c.value = '';
    c.classList.remove('filled');
  });
  cells[0]?.focus();
  updateSubmitState();
}

// ===== Numpad =====
function initNumpad() {
  DOM.numpad.addEventListener('click', (e) => {
    const btn = e.target.closest('.numpad-btn');
    if (!btn) return;

    const num = btn.dataset.num;

    if (num === 'del') {
      numpadDelete();
    } else if (num === 'submit') {
      submitGuess();
    } else {
      numpadInput(parseInt(num));
    }
  });
}

function numpadInput(digit) {
  const cells = Array.from(DOM.digitInputs.children);
  const emptyIdx = cells.findIndex((c) => !c.value);
  if (emptyIdx === -1) return;

  cells[emptyIdx].value = digit;
  cells[emptyIdx].classList.add('filled', 'pop');
  setTimeout(() => cells[emptyIdx].classList.remove('pop'), 300);

  const nextEmpty = cells.findIndex((c, i) => i > emptyIdx && !c.value);
  if (nextEmpty !== -1) {
    cells[nextEmpty].focus();
  } else {
    cells[emptyIdx].focus();
  }

  updateSubmitState();
}

function numpadDelete() {
  const cells = Array.from(DOM.digitInputs.children);
  // Find last filled cell
  let lastFilled = -1;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].value) {
      lastFilled = i;
      break;
    }
  }
  if (lastFilled >= 0) {
    cells[lastFilled].value = '';
    cells[lastFilled].classList.remove('filled');
    cells[lastFilled].focus();
  }
  updateSubmitState();
}

// ===== Timer =====
function startTimer() {
  state.startTime = Date.now();
  state.timerInterval = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  DOM.infoTimer.textContent = `${mins}:${secs}`;
}

function getElapsedTimeStr() {
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

// ===== History Rendering =====
function renderHistory() {
  if (state.history.length === 0) {
    DOM.historyList.innerHTML = '<div class="history-empty">尚无记录，开始你的第一次猜测吧！</div>';
    return;
  }

  DOM.historyList.innerHTML = '';
  // Render in reverse order (newest first)
  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i];
    const row = document.createElement('div');
    row.classList.add('history-row');
    if (i === state.history.length - 1) {
      row.style.animationDelay = '0s';
    }

    // Attempt number
    const numEl = document.createElement('span');
    numEl.classList.add('hist-num');
    numEl.textContent = entry.attempt;

    // Guess digits
    const guessEl = document.createElement('div');
    guessEl.classList.add('hist-guess');
    entry.guess.forEach((d, idx) => {
      const digitEl = document.createElement('span');
      digitEl.classList.add('hist-digit');
      digitEl.textContent = d;
      // Color coding — only in easy mode
      if (state.config.difficulty === 'easy') {
        const status = entry.digitStatus[idx];
        if (status === 'correct-pos') digitEl.classList.add('correct-pos');
        else if (status === 'correct-digit') digitEl.classList.add('correct-digit');
      }
      guessEl.appendChild(digitEl);
    });

    // Hint badges
    const hintEl = document.createElement('div');
    hintEl.classList.add('hist-hint');

    const greenBadge = document.createElement('span');
    greenBadge.classList.add('hint-badge', 'green');
    greenBadge.innerHTML = `<span class="hint-icon">🎯</span> ${entry.correctPosition}`;
    hintEl.appendChild(greenBadge);

    if (state.config.hintMode === 'position-and-digit') {
      const yellowBadge = document.createElement('span');
      yellowBadge.classList.add('hint-badge', 'yellow');
      yellowBadge.innerHTML = `<span class="hint-icon">🔢</span> ${entry.correctDigit}`;
      hintEl.appendChild(yellowBadge);
    }

    row.appendChild(numEl);
    row.appendChild(guessEl);
    row.appendChild(hintEl);
    DOM.historyList.appendChild(row);
  }
}

// ===== Submit Guess =====
function submitGuess() {
  if (!state.gameActive) return;

  const cells = Array.from(DOM.digitInputs.children);
  const allFilled = cells.every((c) => c.value.length === 1);
  if (!allFilled) {
    // Shake effect
    cells.forEach((c) => {
      c.classList.add('shake');
      setTimeout(() => c.classList.remove('shake'), 500);
    });
    return;
  }

  const guess = getGuessFromCells();
  const { correctPosition, correctDigit, digitStatus } = calculateHints(guess, state.answer);

  const entry = {
    attempt: state.history.length + 1,
    guess: [...guess],
    correctPosition,
    correctDigit,
    digitStatus: [...digitStatus],
  };

  state.history.push(entry);
  renderHistory();

  // Check win
  if (correctPosition === state.config.digits) {
    state.gameActive = false;
    stopTimer();
    setTimeout(() => showWin(), 600);
  } else {
    // Update attempt counter
    DOM.attemptNumber.textContent = state.history.length + 1;
    clearInputs();
  }
}

// ===== Win =====
function showWin() {
  // Populate answer
  DOM.winAnswerDigits.innerHTML = '';
  state.answer.forEach((d) => {
    const el = document.createElement('span');
    el.classList.add('win-digit');
    el.textContent = d;
    DOM.winAnswerDigits.appendChild(el);
  });

  // Stats
  DOM.statAttempts.textContent = state.history.length;
  DOM.statTime.textContent = getElapsedTimeStr();

  // Average hit rate
  const totalCorrectPos = state.history.reduce((sum, e) => sum + e.correctPosition, 0);
  const maxTotal = state.history.length * state.config.digits;
  const avgRate = maxTotal > 0 ? Math.round((totalCorrectPos / maxTotal) * 100) : 0;
  DOM.statAvg.textContent = avgRate + '%';

  DOM.winOverlay.classList.add('active');
  launchConfetti();
}

function hideWin() {
  DOM.winOverlay.classList.remove('active');
}

// ===== Game Flow =====
function startGame() {
  // Generate answer
  state.answer = generateAnswer();
  state.history = [];
  state.gameActive = true;

  // Update game info
  DOM.infoDigits.textContent = state.config.digits;
  DOM.infoMode.textContent = state.config.hintMode === 'position-only' ? '玩法1' : '玩法2';
  DOM.infoDifficulty.textContent = state.config.difficulty === 'easy' ? '简单' : '困难';

  // Create inputs
  createDigitInputs();
  DOM.attemptNumber.textContent = '1';
  renderHistory();
  updateSubmitState();

  // Switch screen
  showScreen('game-screen');

  // Focus first cell after transition
  setTimeout(() => {
    const firstCell = DOM.digitInputs.children[0];
    if (firstCell) firstCell.focus();
  }, 400);

  // Start timer
  startTimer();
}

function newGame() {
  hideWin();
  stopTimer();
  startGame();
}

function backToSettings() {
  hideWin();
  stopTimer();
  state.gameActive = false;
  showScreen('config-screen');
}

// ===== Event Bindings =====
function initEvents() {
  DOM.submitBtn.addEventListener('click', submitGuess);
  DOM.clearBtn.addEventListener('click', clearInputs);
  DOM.backBtn.addEventListener('click', backToSettings);
  DOM.newGameBtn.addEventListener('click', newGame);
  DOM.winReplayBtn.addEventListener('click', newGame);
  DOM.winSettingsBtn.addEventListener('click', backToSettings);

  // Keyboard shortcut: Enter to submit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.gameActive && DOM.gameScreen.classList.contains('active')) {
      e.preventDefault();
      submitGuess();
    }
  });
}

// ===== Init =====
function init() {
  initParticles();
  initConfig();
  initNumpad();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);
