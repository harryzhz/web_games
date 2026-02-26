const LIMITS = {
  minLength: 2,
  maxLength: 10,
};

const DEFAULT_CONFIG = {
  length: 4,
  allowRepeat: false,
  hintMode: "exact",
};

const state = {
  answer: "",
  config: { ...DEFAULT_CONFIG },
  history: [],
  gameActive: false,
  startTime: null,
  timerId: null,
};

const dom = {
  digitLength: document.getElementById("digit-length"),
  allowRepeat: document.getElementById("allow-repeat"),
  hintModeRadios: document.querySelectorAll('input[name="hint-mode"]'),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  submitBtn: document.getElementById("submit-btn"),
  clearBtn: document.getElementById("clear-btn"),
  guessInput: document.getElementById("guess-input"),
  gameState: document.getElementById("game-state"),
  liveStats: document.getElementById("live-stats"),
  ruleSummary: document.getElementById("rule-summary"),
  inputProgress: document.getElementById("input-progress"),
  configError: document.getElementById("config-error"),
  guessError: document.getElementById("guess-error"),
  lastHint: document.getElementById("last-hint"),
  historyBody: document.getElementById("history-body"),
  historyCount: document.getElementById("history-count"),
  resultPanel: document.getElementById("result-panel"),
  resultLine: document.getElementById("result-line"),
  resultAnswer: document.getElementById("result-answer"),
  resultAttempts: document.getElementById("result-attempts"),
  resultDuration: document.getElementById("result-duration"),
};

init();

function init() {
  bindEvents();
  setGameState("idle");
  setGuessControls(false);
  renderRuleSummary(getConfigPreviewFromInputs());
  renderHistory();
  updateInputProgress();
}

function bindEvents() {
  dom.startBtn.addEventListener("click", startGame);
  dom.restartBtn.addEventListener("click", restartGame);
  dom.submitBtn.addEventListener("click", submitGuess);
  dom.clearBtn.addEventListener("click", clearGuessInput);

  dom.guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitGuess();
    }
  });

  dom.guessInput.addEventListener("input", handleGuessInput);
  dom.digitLength.addEventListener("input", handleConfigChange);
  dom.allowRepeat.addEventListener("change", handleConfigChange);

  dom.hintModeRadios.forEach((radio) => {
    radio.addEventListener("change", handleConfigChange);
  });
}

function handleGuessInput() {
  const maxLength = state.gameActive ? state.config.length : getPreviewLengthFromInput();
  const sanitized = dom.guessInput.value.replace(/\D+/g, "").slice(0, maxLength);

  if (dom.guessInput.value !== sanitized) {
    dom.guessInput.value = sanitized;
  }

  clearGuessError();
  updateInputProgress();
}

function handleConfigChange() {
  dom.configError.textContent = "";
  renderRuleSummary(getConfigPreviewFromInputs());
  if (!state.gameActive) {
    updateInputProgress();
  }
}

function startGame() {
  clearErrors();

  const configResult = readConfigFromInputs();
  if (!configResult.ok) {
    dom.configError.textContent = configResult.message;
    return;
  }

  state.config = configResult.config;
  startRound("已生成答案，开始你的推理。");
}

function restartGame() {
  startRound("新一局已开始，祝你快速命中。");
}

function startRound(startMessage) {
  stopTimer();
  clearErrors();

  state.answer = generateAnswer(state.config.length, state.config.allowRepeat);
  state.history = [];
  state.gameActive = true;
  state.startTime = Date.now();

  dom.restartBtn.disabled = false;
  dom.resultPanel.classList.add("hidden");

  setGameState("running");
  setGuessControls(true);

  dom.guessInput.maxLength = state.config.length;
  dom.guessInput.placeholder = `请输入 ${state.config.length} 位数字`;
  dom.guessInput.value = "";

  dom.lastHint.textContent = startMessage;
  renderHistory();
  renderRuleSummary(state.config);
  updateInputProgress();
  updateLiveStats();

  state.timerId = setInterval(updateLiveStats, 1000);
  dom.guessInput.focus();
}

function submitGuess() {
  clearGuessError();

  if (!state.gameActive) {
    dom.guessError.textContent = "请先开始游戏。";
    return;
  }

  const guess = dom.guessInput.value.trim();
  const validationError = validateGuess(guess, state.config.length);
  if (validationError) {
    dom.guessError.textContent = validationError;
    return;
  }

  const result = evaluateGuess(guess, state.answer);
  const record = {
    attempt: state.history.length + 1,
    guess,
    exact: result.exact,
    misplaced: result.misplaced,
    hintText: formatHintText(result, state.config.hintMode),
    time: formatTimeLabel(new Date()),
  };

  state.history.push(record);
  renderHistory();

  if (result.exact === state.config.length) {
    finishGame();
  } else {
    dom.lastHint.textContent = `第 ${record.attempt} 次提示：${record.hintText}`;
    updateLiveStats();
  }

  dom.guessInput.value = "";
  updateInputProgress();
  dom.guessInput.focus();
}

function finishGame() {
  state.gameActive = false;
  stopTimer();

  const attempts = state.history.length;
  const durationSec = getElapsedSeconds();

  setGameState("win");
  setGuessControls(false);

  dom.lastHint.textContent = `恭喜！你在第 ${attempts} 次猜测命中答案。`;
  dom.liveStats.textContent = `总尝试 ${attempts} 次 | 用时 ${durationSec} 秒`;

  dom.resultLine.textContent = "你成功破解了本局数字密码。";
  dom.resultAnswer.textContent = state.answer;
  dom.resultAttempts.textContent = `${attempts} 次`;
  dom.resultDuration.textContent = `${durationSec} 秒`;
  dom.resultPanel.classList.remove("hidden");
  dom.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setGameState(status) {
  dom.gameState.classList.remove("is-idle", "is-running", "is-win");

  if (status === "running") {
    dom.gameState.textContent = "游戏中";
    dom.gameState.classList.add("is-running");
    return;
  }

  if (status === "win") {
    dom.gameState.textContent = "已猜中";
    dom.gameState.classList.add("is-win");
    return;
  }

  dom.gameState.textContent = "未开始";
  dom.gameState.classList.add("is-idle");
}

function setGuessControls(enabled) {
  dom.guessInput.disabled = !enabled;
  dom.submitBtn.disabled = !enabled;
  dom.clearBtn.disabled = !enabled;
}

function updateLiveStats() {
  if (!state.gameActive) {
    return;
  }

  const attempts = state.history.length;
  const durationSec = getElapsedSeconds();
  const bestExact = getBestExact();

  dom.liveStats.textContent = `已猜 ${attempts} 次 | 最佳命中 ${bestExact}/${state.config.length} | 已用时 ${durationSec} 秒`;
}

function getBestExact() {
  return state.history.reduce((max, record) => Math.max(max, record.exact), 0);
}

function renderHistory() {
  const count = state.history.length;
  dom.historyCount.textContent = `${count} 次`;

  if (count === 0) {
    dom.historyBody.innerHTML =
      '<tr class="empty-row"><td colspan="4">开始游戏后，这里会保存每次猜测记录（最新在最上方）</td></tr>';
    return;
  }

  dom.historyBody.innerHTML = [...state.history]
    .reverse()
    .map((record, index) => {
      const rowClass = index === 0 ? "latest-row" : "";
      return `
      <tr class="${rowClass}">
        <td>${record.attempt}</td>
        <td class="guess-value">${record.guess}</td>
        <td>${record.hintText}</td>
        <td>${record.time}</td>
      </tr>`;
    })
    .join("");
}

function renderRuleSummary(config) {
  const hintLabel =
    config.hintMode === "exact"
      ? "仅提示位置+数字都正确数量"
      : "提示位置+数字正确数量，并额外提示仅数字正确数量";

  const repeatLabel = config.allowRepeat ? "允许重复数字" : "不允许重复数字";

  dom.ruleSummary.textContent = `本局规则：${config.length} 位数字，${repeatLabel}，${hintLabel}。`;
}

function updateInputProgress() {
  const targetLength = state.gameActive ? state.config.length : getPreviewLengthFromInput();
  const currentLength = dom.guessInput.value.length;

  dom.inputProgress.textContent = `${currentLength} / ${targetLength} 位`;
  dom.inputProgress.classList.toggle("ready", currentLength === targetLength && targetLength > 0);
}

function clearGuessInput() {
  if (!state.gameActive) {
    return;
  }

  dom.guessInput.value = "";
  clearGuessError();
  updateInputProgress();
  dom.guessInput.focus();
}

function readConfigFromInputs() {
  const length = Number.parseInt(dom.digitLength.value, 10);
  if (!Number.isInteger(length) || length < LIMITS.minLength || length > LIMITS.maxLength) {
    return { ok: false, message: "数字位数必须是 2 到 10 的整数。" };
  }

  const allowRepeat = dom.allowRepeat.value === "yes";
  if (!allowRepeat && length > 10) {
    return { ok: false, message: "不允许重复数字时，位数不能大于 10。" };
  }

  return {
    ok: true,
    config: {
      length,
      allowRepeat,
      hintMode: getHintModeFromInputs(),
    },
  };
}

function getConfigPreviewFromInputs() {
  return {
    length: getPreviewLengthFromInput(),
    allowRepeat: dom.allowRepeat.value === "yes",
    hintMode: getHintModeFromInputs(),
  };
}

function getPreviewLengthFromInput() {
  const parsed = Number.parseInt(dom.digitLength.value, 10);

  if (!Number.isInteger(parsed)) {
    return DEFAULT_CONFIG.length;
  }

  return Math.min(LIMITS.maxLength, Math.max(LIMITS.minLength, parsed));
}

function getHintModeFromInputs() {
  const selected = document.querySelector('input[name="hint-mode"]:checked');
  return selected?.value === "full" ? "full" : "exact";
}

function validateGuess(guess, expectedLength) {
  if (!/^\d+$/.test(guess)) {
    return "请输入纯数字。";
  }

  if (guess.length !== expectedLength) {
    return `请输入 ${expectedLength} 位数字。`;
  }

  return "";
}

function generateAnswer(length, allowRepeat) {
  if (allowRepeat) {
    let result = "";
    for (let i = 0; i < length; i += 1) {
      result += String(Math.floor(Math.random() * 10));
    }
    return result;
  }

  const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, length).join("");
}

function evaluateGuess(guess, answer) {
  let exact = 0;
  const guessCount = {};
  const answerCount = {};

  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === answer[i]) {
      exact += 1;
    }

    guessCount[guess[i]] = (guessCount[guess[i]] || 0) + 1;
    answerCount[answer[i]] = (answerCount[answer[i]] || 0) + 1;
  }

  let totalMatch = 0;
  for (const digit of Object.keys(guessCount)) {
    if (answerCount[digit]) {
      totalMatch += Math.min(guessCount[digit], answerCount[digit]);
    }
  }

  return {
    exact,
    misplaced: totalMatch - exact,
  };
}

function formatHintText(result, hintMode) {
  if (hintMode === "exact") {
    return `位置+数字都正确：${result.exact}`;
  }

  return `位置+数字都正确：${result.exact}，仅数字正确：${result.misplaced}`;
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getElapsedSeconds() {
  if (!state.startTime) {
    return 0;
  }

  return Math.max(1, Math.floor((Date.now() - state.startTime) / 1000));
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function clearErrors() {
  dom.configError.textContent = "";
  clearGuessError();
}

function clearGuessError() {
  dom.guessError.textContent = "";
}
