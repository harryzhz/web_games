const state = {
  answer: "",
  config: {
    length: 4,
    allowRepeat: false,
    hintMode: "exact",
  },
  history: [],
  gameActive: false,
  startTime: null,
  timerId: null,
};

const el = {
  digitLength: document.getElementById("digit-length"),
  allowRepeat: document.getElementById("allow-repeat"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  guessInput: document.getElementById("guess-input"),
  submitBtn: document.getElementById("submit-btn"),
  gameState: document.getElementById("game-state"),
  liveStats: document.getElementById("live-stats"),
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

el.startBtn.addEventListener("click", startGame);
el.restartBtn.addEventListener("click", restartGame);
el.submitBtn.addEventListener("click", submitGuess);
el.guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    submitGuess();
  }
});

el.guessInput.addEventListener("input", () => {
  el.guessInput.value = el.guessInput.value.replace(/\D+/g, "");
});

function startGame() {
  clearErrors();
  const length = Number.parseInt(el.digitLength.value, 10);
  const allowRepeat = el.allowRepeat.value === "yes";
  const hintMode = document.querySelector('input[name="hint-mode"]:checked')?.value || "exact";

  if (!Number.isInteger(length) || length < 2 || length > 10) {
    el.configError.textContent = "数字位数必须是 2 到 10 的整数。";
    return;
  }

  if (!allowRepeat && length > 10) {
    el.configError.textContent = "不允许重复数字时，位数不能大于 10。";
    return;
  }

  state.config = { length, allowRepeat, hintMode };
  state.answer = generateAnswer(length, allowRepeat);
  state.history = [];
  state.gameActive = true;
  state.startTime = Date.now();

  if (state.timerId) {
    clearInterval(state.timerId);
  }

  state.timerId = setInterval(updateLiveStats, 1000);

  el.gameState.textContent = "游戏中";
  el.gameState.style.background = "#dff6ea";
  el.gameState.style.color = "#0f6f4e";

  el.guessInput.disabled = false;
  el.submitBtn.disabled = false;
  el.restartBtn.disabled = false;
  el.guessInput.maxLength = length;
  el.guessInput.placeholder = `请输入 ${length} 位数字`;
  el.guessInput.value = "";
  el.guessInput.focus();

  el.lastHint.textContent = "已生成答案，开始你的推理。";
  el.resultPanel.classList.add("hidden");
  renderHistory();
  updateLiveStats();
}

function restartGame() {
  if (!state.config) {
    return;
  }

  state.answer = generateAnswer(state.config.length, state.config.allowRepeat);
  state.history = [];
  state.gameActive = true;
  state.startTime = Date.now();
  clearErrors();

  if (state.timerId) {
    clearInterval(state.timerId);
  }

  state.timerId = setInterval(updateLiveStats, 1000);

  el.gameState.textContent = "游戏中";
  el.gameState.style.background = "#dff6ea";
  el.gameState.style.color = "#0f6f4e";

  el.guessInput.disabled = false;
  el.submitBtn.disabled = false;
  el.guessInput.maxLength = state.config.length;
  el.guessInput.placeholder = `请输入 ${state.config.length} 位数字`;
  el.guessInput.value = "";
  el.guessInput.focus();

  el.lastHint.textContent = "新一局已开始，祝你快速命中。";
  el.resultPanel.classList.add("hidden");
  renderHistory();
  updateLiveStats();
}

function submitGuess() {
  clearGuessError();

  if (!state.gameActive) {
    el.guessError.textContent = "请先开始游戏。";
    return;
  }

  const guess = el.guessInput.value.trim();
  const { length, hintMode } = state.config;

  if (!/^\d+$/.test(guess)) {
    el.guessError.textContent = "请输入纯数字。";
    return;
  }

  if (guess.length !== length) {
    el.guessError.textContent = `请输入 ${length} 位数字。`;
    return;
  }

  const result = evaluateGuess(guess, state.answer);
  const hintText =
    hintMode === "exact"
      ? `位置+数字都正确：${result.exact}`
      : `位置+数字都正确：${result.exact}，仅数字正确：${result.misplaced}`;

  const record = {
    attempt: state.history.length + 1,
    guess,
    hint: hintText,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };

  state.history.push(record);
  renderHistory();

  if (result.exact === length) {
    finishGame();
  } else {
    el.lastHint.textContent = `第 ${record.attempt} 次提示：${hintText}`;
    updateLiveStats();
  }

  el.guessInput.value = "";
  el.guessInput.focus();
}

function finishGame() {
  state.gameActive = false;

  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  const durationSec = Math.max(1, Math.floor((Date.now() - state.startTime) / 1000));
  const attempts = state.history.length;

  el.gameState.textContent = "已猜中";
  el.gameState.style.background = "#e3f7eb";
  el.gameState.style.color = "#0f6f4e";

  el.guessInput.disabled = true;
  el.submitBtn.disabled = true;

  el.lastHint.textContent = `恭喜！你在第 ${attempts} 次猜测命中答案。`;
  el.liveStats.textContent = `总尝试 ${attempts} 次，用时 ${durationSec} 秒`;

  el.resultLine.textContent = "你成功破解了本局数字密码。";
  el.resultAnswer.textContent = state.answer;
  el.resultAttempts.textContent = `${attempts} 次`;
  el.resultDuration.textContent = `${durationSec} 秒`;
  el.resultPanel.classList.remove("hidden");
}

function updateLiveStats() {
  if (!state.gameActive) {
    return;
  }

  const attempts = state.history.length;
  const durationSec = Math.max(1, Math.floor((Date.now() - state.startTime) / 1000));
  el.liveStats.textContent = `已猜 ${attempts} 次 | 已用时 ${durationSec} 秒`;
}

function renderHistory() {
  const count = state.history.length;
  el.historyCount.textContent = `${count} 次`;

  if (count === 0) {
    el.historyBody.innerHTML =
      '<tr class="empty-row"><td colspan="4">开始游戏后，这里会保存每次猜测记录</td></tr>';
    return;
  }

  el.historyBody.innerHTML = [...state.history]
    .reverse()
    .map(
      (item) => `
      <tr>
        <td>${item.attempt}</td>
        <td><strong>${item.guess}</strong></td>
        <td>${item.hint}</td>
        <td>${item.time}</td>
      </tr>`
    )
    .join("");
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

function clearErrors() {
  el.configError.textContent = "";
  clearGuessError();
}

function clearGuessError() {
  el.guessError.textContent = "";
}
