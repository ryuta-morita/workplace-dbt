const checkItems = [
  { id: "dizziness", label: "目眩", note: "ふらつき、立っているのがつらい感じ" },
  { id: "breathlessness", label: "息苦しさ", note: "呼吸が浅い、胸が詰まる感じ" },
  { id: "rumination", label: "反芻", note: "同じ不安・怒り・後悔を繰り返し考える" },
  { id: "realityGap", label: "認知と事実の乖離・修整不可", note: "事実確認しても、悪い解釈から戻れない" },
  { id: "persecutoryIdeas", label: "被害妄想", note: "責められている、嫌われている、攻撃される感覚" },
  { id: "agitation", label: "焦燥感", note: "落ち着かない、今すぐ何とかしないといけない感じ" },
  { id: "selfDenial", label: "自己否定", note: "自分はダメだ、価値がないという感覚" },
  { id: "tremor", label: "手の震え", note: "緊張・不安・身体症状としての震え" },
  { id: "headache", label: "頭痛", note: "反芻や緊張に伴う痛みも含む" }
];

const emergencyItem = {
  id: "selfHarm",
  label: "希死念慮・自傷衝動",
  note: "死にたい、消えたい、自分を傷つけたい、危険物に近づきたい等"
};

const scoreLabels = {
  0: "なし",
  1: "少しある・あるかもしれない",
  2: "ある",
  3: "かなりある"
};

const $ = (selector) => document.querySelector(selector);
const itemsRoot = $("#items");
const emergencyRoot = $("#emergencyItem");
const resultCard = $("#resultCard");
const historyList = $("#historyList");
let lastResult = null;

function createItem(item, isEmergency = false) {
  const wrap = document.createElement("fieldset");
  wrap.className = "item";
  wrap.innerHTML = `
    <legend class="sr-only">${item.label}</legend>
    <div class="item-header">
      <div>
        <div class="item-title">${item.label}</div>
        <div class="item-note">${item.note}</div>
      </div>
      <div class="current-score" id="score-${item.id}" aria-label="現在の点数">0</div>
    </div>
    <div class="options" role="radiogroup" aria-label="${item.label}の点数">
      ${[0,1,2,3].map(score => `
        <label class="option" title="${score}: ${scoreLabels[score]}">
          <input type="radio" name="${item.id}" value="${score}" ${score === 0 ? "checked" : ""} data-emergency="${isEmergency}">
          <span>${score}</span>
        </label>
      `).join("")}
    </div>
  `;
  return wrap;
}

function renderItems() {
  itemsRoot.innerHTML = "";
  checkItems.forEach(item => itemsRoot.appendChild(createItem(item)));
  emergencyRoot.innerHTML = "";
  emergencyRoot.appendChild(createItem(emergencyItem, true));
}

function getScore(id) {
  const selected = document.querySelector(`input[name="${id}"]:checked`);
  return selected ? Number(selected.value) : 0;
}

function updateScoreBadges() {
  [...checkItems, emergencyItem].forEach(item => {
    const badge = $(`#score-${item.id}`);
    if (badge) badge.textContent = getScore(item.id);
  });
}

function evaluate() {
  const scores = Object.fromEntries(checkItems.map(item => [item.id, getScore(item.id)]));
  const selfHarm = getScore(emergencyItem.id);
  const total = Object.values(scores).reduce((sum, v) => sum + v, 0);

  const flags = [];
  if (selfHarm > 0) flags.push("希死念慮・自傷衝動が1以上");
  if (scores.realityGap === 3) flags.push("認知と事実の乖離・修整不可が3");
  if (scores.persecutoryIdeas === 3) flags.push("被害妄想が3");
  const severePhysical = [
    ["目眩", scores.dizziness],
    ["息苦しさ", scores.breathlessness],
    ["手の震え", scores.tremor],
    ["頭痛", scores.headache]
  ].filter(([, score]) => score === 3).map(([label]) => label);
  if (severePhysical.length > 0) flags.push(`身体症状が強い：${severePhysical.join("、")}`);
  if (scores.agitation === 3 && scores.selfDenial >= 2) flags.push("焦燥感が3、かつ自己否定が2以上");

  let status = "safe";
  let label = "安全";
  let title = "安全：セルフケアで戻せる範囲";

  if (flags.length > 0 || total >= 14) {
    status = "danger";
    label = "危険";
    title = "危険：一人で判断しない方がよい状態";
  } else if (total >= 7) {
    status = "warn";
    label = "注意";
    title = "注意：刺激を下げて回復を優先";
  }

  const result = { total, status, label, title, flags, scores, selfHarm, savedAt: new Date().toISOString() };
  lastResult = result;
  showResult(result);
  return result;
}

function showResult(result) {
  resultCard.className = `result card ${result.status}`;
  resultCard.classList.remove("hidden");
  $("#resultTitle").textContent = result.title;
  $("#totalScore").textContent = result.total;
  $("#statusLabel").textContent = result.label;

  const flagList = $("#flagList");
  if (result.flags.length > 0) {
    flagList.classList.remove("hidden");
    flagList.innerHTML = `<strong>危険フラグ</strong><ul>${result.flags.map(f => `<li>${f}</li>`).join("")}</ul>`;
  } else {
    flagList.classList.add("hidden");
    flagList.innerHTML = "";
  }

  $("#advice").innerHTML = adviceHtml(result.status);
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function adviceHtml(status) {
  if (status === "danger") {
    return `
      <p><strong>今は安全確保が最優先です。</strong></p>
      <p>考え続ける、結論を出す、相手に連絡する、仕事を続ける、という行動はいったん止めてください。</p>
      <p>水を飲む、座る・横になる、刃物・薬・危険物から離れる、妻・家族・主治医・カウンセラーなど現実の人に状態を共有してください。</p>
      <p>息苦しさ、強い頭痛、意識がぼんやりする、手足のしびれ・脱力、希死念慮・自傷衝動が強い場合は、救急相談または119を検討してください。</p>
    `;
  }
  if (status === "warn") {
    return `
      <p><strong>放置すると悪化しやすい状態です。</strong></p>
      <p>10〜20分、刺激を下げてください。スマホ・仕事・対人連絡・反芻の材料から一度離れるのがおすすめです。</p>
      <p>「今は結論を出さない。記録だけして保留する」と決めると、反芻を増やしにくくなります。</p>
    `;
  }
  return `
    <p><strong>大きな危険サインは強く出ていません。</strong></p>
    <p>水分、食事、休憩、睡眠を優先してください。反芻が始まりそうなら、今は結論を出さず、記録だけして保留しましょう。</p>
  `;
}

function saveHistory() {
  const result = lastResult || evaluate();
  const history = JSON.parse(localStorage.getItem("mentalCheckHistory") || "[]");
  history.unshift({
    savedAt: new Date().toISOString(),
    total: result.total,
    label: result.label,
    status: result.status,
    flags: result.flags
  });
  localStorage.setItem("mentalCheckHistory", JSON.stringify(history.slice(0, 30)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("mentalCheckHistory") || "[]");
  if (history.length === 0) {
    historyList.className = "history-list empty";
    historyList.textContent = "まだ履歴はありません。";
    return;
  }
  historyList.className = "history-list";
  historyList.innerHTML = history.slice(0, 10).map(entry => {
    const dt = new Date(entry.savedAt);
    const flagsText = entry.flags && entry.flags.length > 0 ? ` / フラグ: ${entry.flags.join("、")}` : "";
    return `
      <div class="history-entry ${entry.status}">
        <div><strong>${entry.label}</strong> ${entry.total}/27点</div>
        <div class="history-meta">${dt.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}${flagsText}</div>
      </div>
    `;
  }).join("");
}

function resetForm() {
  document.querySelectorAll('input[type="radio"][value="0"]').forEach(input => { input.checked = true; });
  updateScoreBadges();
  resultCard.classList.add("hidden");
  lastResult = null;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

renderItems();
updateScoreBadges();
renderHistory();
registerServiceWorker();

document.addEventListener("change", updateScoreBadges);
$("#calcButton").addEventListener("click", evaluate);
$("#resetButton").addEventListener("click", resetForm);
$("#saveButton").addEventListener("click", saveHistory);
$("#clearHistoryButton").addEventListener("click", () => {
  if (confirm("履歴を削除しますか？")) {
    localStorage.removeItem("mentalCheckHistory");
    renderHistory();
  }
});
