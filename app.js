const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const state = {
  logs: storage.get("ruminationLogs", []),
  worries: storage.get("ruminationWorries", []),
  theme: storage.get("theme", "light")
};

function applyTheme() {
  document.documentElement.classList.toggle("dark", state.theme === "dark");
  $("#themeToggle").textContent = state.theme === "dark" ? "☀" : "☾";
}
applyTheme();

$("#themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  storage.set("theme", state.theme);
  applyTheme();
});

function switchTab(tabName) {
  $$(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabName));
  $$(".panel").forEach(panel => panel.classList.toggle("active", panel.id === tabName));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".tab").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
$$("[data-go]").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.go)));

$("#stressRange").addEventListener("input", (event) => {
  $("#stressValue").textContent = event.target.value;
});

$("#labelButton").addEventListener("click", () => {
  $("#labelResult").hidden = false;
});

$$(".skill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $("#skillResult").textContent = `次の一手：${btn.dataset.skill}`;
  });
});

let breathInterval = null;
let breathRemaining = 60;
let breathPhase = false;

function resetBreath() {
  clearInterval(breathInterval);
  breathInterval = null;
  breathRemaining = 60;
  $("#timerText").textContent = "60";
  $("#breathCircle").textContent = "吐く";
  $("#breathCircle").classList.remove("expand");
  $("#breathStart").textContent = "開始";
}

$("#breathStart").addEventListener("click", () => {
  if (breathInterval) {
    resetBreath();
    return;
  }

  breathRemaining = 60;
  $("#breathStart").textContent = "停止";
  $("#breathCircle").textContent = "吐く";
  $("#breathCircle").classList.remove("expand");

  breathInterval = setInterval(() => {
    breathRemaining -= 1;
    $("#timerText").textContent = breathRemaining;

    if (breathRemaining % 8 === 0) {
      breathPhase = !breathPhase;
      $("#breathCircle").classList.toggle("expand", breathPhase);
      $("#breathCircle").textContent = breathPhase ? "吸う" : "吐く";
    }

    if (breathRemaining <= 0) {
      clearInterval(breathInterval);
      breathInterval = null;
      $("#breathCircle").textContent = "完了";
      $("#breathStart").textContent = "もう一度";
    }
  }, 1000);
});

function renderLogs() {
  const container = $("#logList");
  if (!state.logs.length) {
    container.innerHTML = `<p class="result-text">まだ履歴はありません。</p>`;
    return;
  }

  container.innerHTML = state.logs
    .slice()
    .reverse()
    .map(log => `
      <article class="log-entry">
        <time>${new Date(log.createdAt).toLocaleString("ja-JP")}</time>
        <p><strong>しんどさ：</strong>${log.stress}/10</p>
        <p><strong>事実：</strong>${escapeHtml(log.fact)}</p>
        <p><strong>解釈：</strong>${escapeHtml(log.interpretation)}</p>
        <p><strong>次の一手：</strong>${escapeHtml(log.nextStep)}</p>
      </article>
    `).join("");
}

function renderWorries() {
  const list = $("#worryList");
  if (!state.worries.length) {
    list.innerHTML = `<li>予約中の心配はありません。</li>`;
    return;
  }

  list.innerHTML = state.worries
    .slice()
    .reverse()
    .map((worry, reverseIndex) => {
      const index = state.worries.length - 1 - reverseIndex;
      return `
        <li>
          <strong>${escapeHtml(worry.time)} に考える</strong><br />
          ${escapeHtml(worry.text)}
          <br /><button class="ghost-btn remove-worry" data-index="${index}" aria-label="削除">×</button>
        </li>
      `;
    }).join("");

  $$(".remove-worry").forEach(btn => {
    btn.addEventListener("click", () => {
      state.worries.splice(Number(btn.dataset.index), 1);
      storage.set("ruminationWorries", state.worries);
      renderWorries();
    });
  });
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("#saveMemo").addEventListener("click", () => {
  const fact = $("#fact").value.trim();
  const interpretation = $("#interpretation").value.trim();
  const nextStep = $("#nextStep").value.trim();

  if (!fact && !interpretation && !nextStep) {
    $("#saveResult").hidden = false;
    $("#saveResult").textContent = "何か1つだけでも入力してください。";
    return;
  }

  state.logs.push({
    createdAt: new Date().toISOString(),
    stress: $("#stressRange").value,
    fact,
    interpretation,
    nextStep
  });

  storage.set("ruminationLogs", state.logs);

  $("#fact").value = "";
  $("#interpretation").value = "";
  $("#nextStep").value = "";
  $("#saveResult").hidden = false;
  $("#saveResult").textContent = "保存しました。いったんここでClose。";
  renderLogs();
});

$("#saveWorry").addEventListener("click", () => {
  const text = $("#worryText").value.trim();
  const time = $("#worryTime").value || "20:30";

  if (!text) return;

  state.worries.push({ text, time, createdAt: new Date().toISOString() });
  storage.set("ruminationWorries", state.worries);
  $("#worryText").value = "";
  renderWorries();
});

$("#exportText").addEventListener("click", () => {
  const body = state.logs.map(log => [
    `日時：${new Date(log.createdAt).toLocaleString("ja-JP")}`,
    `しんどさ：${log.stress}/10`,
    `事実：${log.fact}`,
    `解釈：${log.interpretation}`,
    `次の一手：${log.nextStep}`,
    "----"
  ].join("\n")).join("\n");

  const blob = new Blob([body || "履歴はありません。"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rumination-log-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

$("#clearLog").addEventListener("click", () => {
  if (!confirm("履歴を削除しますか？")) return;
  state.logs = [];
  storage.set("ruminationLogs", state.logs);
  renderLogs();
});

$("#sosPlan").addEventListener("click", () => {
  $("#sosPlanText").hidden = !$("#sosPlanText").hidden;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

renderLogs();
renderWorries();
