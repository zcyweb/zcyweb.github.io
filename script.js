// LuckyDraw Pro
// 纯 HTML + CSS + JavaScript 实现，可离线运行。
// 所有配置通过 LocalStorage 持久化保存，便于后续继续升级。

(function () {
  "use strict";

  const STORAGE_KEY = "luckyDrawProState_v1";
  const DEFAULT_LOGO = "assets/logo/logo.png";
  const DEFAULT_BACKGROUND = "";
  const THANKS_IMAGE =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#77a8ff"/>
            <stop offset="100%" stop-color="#77f3c0"/>
          </linearGradient>
        </defs>
        <rect width="800" height="800" rx="80" fill="#0f1b2c"/>
        <circle cx="400" cy="290" r="150" fill="url(#g)" opacity="0.92"/>
        <text x="400" y="560" text-anchor="middle" fill="#f5f8ff" font-size="96" font-family="Arial, PingFang SC">谢谢参与</text>
      </svg>
    `);

  const DEFAULT_PRIZES = [
    { id: createId(), name: "一等奖", image: "assets/prizes/1.jpg", quantity: 5, probability: 1 },
    { id: createId(), name: "二等奖", image: "assets/prizes/2.jpg", quantity: 10, probability: 5 },
    { id: createId(), name: "三等奖", image: "assets/prizes/3.jpg", quantity: 20, probability: 20 },
    { id: createId(), name: "四等奖", image: "assets/prizes/4.jpg", quantity: 50, probability: 30 },
  ];

  const DEFAULT_STATE = {
    settings: {
      title: "幸运抽奖系统",
      subtitle: "点击学校logo5次，进入后台管理！",
      mode: "quantity",
      logo: DEFAULT_LOGO,
      background: DEFAULT_BACKGROUND,
      adminPassword: "yaohua2001",
      soundEnabled: true,
      noRepeatWinners: true,
    },
    prizes: DEFAULT_PRIZES,
    participants: [],
    records: [],
    control: {
      nextPrizeId: "",
      nextParticipantId: "",
    },
  };

  const els = {
    backgroundLayer: document.getElementById("backgroundLayer"),
    mainLogo: document.getElementById("mainLogo"),
    logoButton: document.getElementById("logoButton"),
    activityTitle: document.getElementById("activityTitle"),
    activitySubtitle: document.getElementById("activitySubtitle"),
    modeChip: document.getElementById("modeChip"),
    soundChip: document.getElementById("soundChip"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    drawStage: document.getElementById("drawStage"),
    prizeBubbleField: document.getElementById("prizeBubbleField"),
    drawImage: document.getElementById("drawImage"),
    drawPrizeName: document.getElementById("drawPrizeName"),
    drawNameTrack: document.getElementById("drawNameTrack"),
    drawDescription: document.getElementById("drawDescription"),
    startDrawButton: document.getElementById("startDrawButton"),
    openAdminButton: document.getElementById("openAdminButton"),
    totalPrizeCount: document.getElementById("totalPrizeCount"),
    participantCount: document.getElementById("participantCount"),
    recordCount: document.getElementById("recordCount"),
    prizeGrid: document.getElementById("prizeGrid"),
    recentRecords: document.getElementById("recentRecords"),
    resultModal: document.getElementById("resultModal"),
    closeResultModal: document.getElementById("closeResultModal"),
    resultPrizeName: document.getElementById("resultPrizeName"),
    resultPrizeImage: document.getElementById("resultPrizeImage"),
    resultParticipantText: document.getElementById("resultParticipantText"),
    resultTimeText: document.getElementById("resultTimeText"),
    confettiLayer: document.getElementById("confettiLayer"),
    adminModal: document.getElementById("adminModal"),
    closeAdminModal: document.getElementById("closeAdminModal"),
    adminLockSection: document.getElementById("adminLockSection"),
    adminContent: document.getElementById("adminContent"),
    adminPasswordInput: document.getElementById("adminPasswordInput"),
    unlockAdminButton: document.getElementById("unlockAdminButton"),
    settingTitle: document.getElementById("settingTitle"),
    settingSubtitle: document.getElementById("settingSubtitle"),
    settingMode: document.getElementById("settingMode"),
    settingPassword: document.getElementById("settingPassword"),
    settingLogo: document.getElementById("settingLogo"),
    settingBackground: document.getElementById("settingBackground"),
    settingSoundEnabled: document.getElementById("settingSoundEnabled"),
    settingNoRepeatWinners: document.getElementById("settingNoRepeatWinners"),
    saveSettingsButton: document.getElementById("saveSettingsButton"),
    resetBackgroundButton: document.getElementById("resetBackgroundButton"),
    prizeEditorList: document.getElementById("prizeEditorList"),
    addPrizeButton: document.getElementById("addPrizeButton"),
    probabilitySummary: document.getElementById("probabilitySummary"),
    participantFileInput: document.getElementById("participantFileInput"),
    participantTextarea: document.getElementById("participantTextarea"),
    importParticipantsButton: document.getElementById("importParticipantsButton"),
    clearParticipantsButton: document.getElementById("clearParticipantsButton"),
    participantTable: document.getElementById("participantTable"),
    nextPrizeSelect: document.getElementById("nextPrizeSelect"),
    nextParticipantSelect: document.getElementById("nextParticipantSelect"),
    saveControlButton: document.getElementById("saveControlButton"),
    clearControlButton: document.getElementById("clearControlButton"),
    controlSummary: document.getElementById("controlSummary"),
    exportRecordsButton: document.getElementById("exportRecordsButton"),
    clearRecordsButton: document.getElementById("clearRecordsButton"),
    recordTable: document.getElementById("recordTable"),
    imageManager: document.getElementById("imageManager"),
    toast: document.getElementById("toast"),
    tabButtons: Array.from(document.querySelectorAll(".tab-button")),
    panels: Array.from(document.querySelectorAll(".admin-panel")),
  };

  let state = normalizeState(loadState());
  let isDrawing = false;
  let adminUnlocked = false;
  let logoClickCount = 0;
  let logoClickTimer = null;
  let toastTimer = null;
  let audioContext = null;
  let currentPreviewId = "";
  let prizeSecretClickCount = 0;
  let prizeSecretTargetId = "";
  let prizeSecretClickTimer = null;

  init();

  function init() {
    bindEvents();
    if (els.openAdminButton) {
      els.openAdminButton.classList.add("hidden");
    }
    renderAll();
  }

  function bindEvents() {
    els.startDrawButton.addEventListener("click", startDraw);
    els.fullscreenButton.addEventListener("click", toggleFullscreen);
    els.soundChip.addEventListener("click", toggleSound);
    els.logoButton.addEventListener("click", handleLogoSecretEntry);
    document.addEventListener("fullscreenchange", syncFullscreenButtonText);

    els.closeResultModal.addEventListener("click", closeResultModal);
    els.resultModal.addEventListener("click", (event) => {
      if (event.target === els.resultModal) {
        closeResultModal();
      }
    });

    els.closeAdminModal.addEventListener("click", closeAdminModal);
    els.adminModal.addEventListener("click", (event) => {
      if (event.target === els.adminModal) {
        closeAdminModal();
      }
    });

    els.unlockAdminButton.addEventListener("click", unlockAdmin);
    els.adminPasswordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockAdmin();
      }
    });

    els.tabButtons.forEach((button) => {
      button.addEventListener("click", () => switchAdminTab(button.dataset.tab));
    });

    els.saveSettingsButton.addEventListener("click", saveSettings);
    els.resetBackgroundButton.addEventListener("click", resetBackground);
    els.addPrizeButton.addEventListener("click", addPrize);
    els.prizeEditorList.addEventListener("input", handlePrizeEditorInput);
    els.prizeEditorList.addEventListener("click", handlePrizeEditorClick);
    els.prizeEditorList.addEventListener("change", handlePrizeImageChange);

    els.importParticipantsButton.addEventListener("click", importParticipants);
    els.clearParticipantsButton.addEventListener("click", clearParticipants);

    els.saveControlButton.addEventListener("click", saveControlSettings);
    els.clearControlButton.addEventListener("click", clearControlSettings);

    els.exportRecordsButton.addEventListener("click", exportRecordsCsv);
    els.clearRecordsButton.addEventListener("click", clearRecords);

    // 首页奖品列表：连续点击 5 次，下次抽奖必中该奖项
    els.prizeGrid.addEventListener("click", handlePrizeGridSecretClick);

    // 图片管理
    if (els.imageManager) {
      els.imageManager.addEventListener("change", handleImageManagerChange);
      els.imageManager.addEventListener("click", handleImageManagerClick);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : cloneData(DEFAULT_STATE);
    } catch (error) {
      console.warn("读取本地数据失败，已恢复默认配置。", error);
      return cloneData(DEFAULT_STATE);
    }
  }

  function normalizeState(input) {
    const safe = cloneData(DEFAULT_STATE);
    const merged = Object.assign(safe, input || {});

    merged.settings = Object.assign({}, safe.settings, input?.settings || {});
    merged.prizes = Array.isArray(input?.prizes) && input.prizes.length
      ? input.prizes.map((item, index) => normalizePrize(item, index))
      : cloneData(DEFAULT_PRIZES);
    merged.participants = Array.isArray(input?.participants)
      ? input.participants.map((item) => ({
          id: String(item.id || "").trim(),
          name: String(item.name || "").trim(),
        })).filter((item) => item.id && item.name)
      : [];
    merged.records = Array.isArray(input?.records)
      ? input.records.map((item) => ({
          id: createId(),
          participantId: String(item.participantId || "").trim(),
          participantName: String(item.participantName || "").trim(),
          prizeId: String(item.prizeId || "").trim(),
          prizeName: String(item.prizeName || "").trim(),
          prizeImage: String(item.prizeImage || THANKS_IMAGE),
          time: String(item.time || formatDate(new Date())),
        }))
      : [];
    merged.control = Object.assign(
      { nextPrizeId: "", nextParticipantId: "" },
      input?.control || {}
    );

    return merged;
  }

  function normalizePrize(item, index) {
    return {
      id: String(item?.id || createId()),
      name: String(item?.name || `奖项 ${index + 1}`),
      image: String(item?.image || getDefaultPrizeImage(index)),
      quantity: toSafeNumber(item?.quantity, 0),
      probability: toSafeNumber(item?.probability, 0),
    };
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function createId() {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function toSafeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function getDefaultPrizeImage(index) {
    const order = (index % 4) + 1;
    return `assets/prizes/${order}.jpg`;
  }

  function saveState(options = {}) {
    const { validatePrizeProbability = false } = options;
    if (validatePrizeProbability && state.settings.mode === "probability" && getProbabilityTotal() > 100) {
      showToast("概率总和超过 100%，请调整后再保存。");
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("保存失败", error);
      showToast("保存失败，请检查浏览器本地存储权限。");
      return false;
    }
  }

  function renderAll() {
    renderSettings();
    renderPrizeGrid();
    renderRecentRecords();
    renderStats();
    renderPrizeEditor();
    renderParticipantTable();
    renderRecordTable();
    renderControlOptions();
    renderControlSummary();
    renderImageManager();
    updateProbabilitySummary();
    updateDrawPreview(getFirstPreviewItem());
  }

  function renderSettings() {
    document.title = `${state.settings.title} - LuckyDraw Pro`;
    els.mainLogo.src = state.settings.logo || DEFAULT_LOGO;
    els.activityTitle.textContent = state.settings.title;
    els.activitySubtitle.textContent = state.settings.subtitle;
    els.modeChip.textContent = state.settings.mode === "quantity" ? "数量模式" : "概率模式";
    els.soundChip.textContent = state.settings.soundEnabled ? "音效开启" : "音效关闭";
    els.backgroundLayer.style.backgroundImage = state.settings.background
      ? `url("${state.settings.background}")`
      : "none";

    els.settingTitle.value = state.settings.title;
    els.settingSubtitle.value = state.settings.subtitle;
    els.settingMode.value = state.settings.mode;
    els.settingPassword.value = state.settings.adminPassword;
    els.settingSoundEnabled.checked = Boolean(state.settings.soundEnabled);
    els.settingNoRepeatWinners.checked = Boolean(state.settings.noRepeatWinners);
  }

  function renderPrizeGrid() {
    if (!state.prizes.length) {
      els.prizeGrid.innerHTML = `<div class="data-empty">暂无奖项，请先在后台新增奖项。</div>`;
      return;
    }

    els.prizeGrid.innerHTML = state.prizes.map((prize) => {
      const displayName = getPrizeDisplayName(prize);
      const modeInfo = state.settings.mode === "quantity"
        ? `剩余数量：${prize.quantity}`
        : `中奖概率：${formatPercent(prize.probability)}`;

      return `
        <article class="prize-item" data-id="${escapeHtml(prize.id)}">
          <img src="${escapeHtml(prize.image)}" alt="${escapeHtml(displayName)}">
          <h3>${escapeHtml(displayName)}</h3>
          <p class="prize-meta">${modeInfo}</p>
        </article>
      `;
    }).join("");
  }

  function renderRecentRecords() {
    const records = [...state.records].slice(-5).reverse();

    if (!records.length) {
      els.recentRecords.innerHTML = `<div class="data-empty">暂无中奖记录，现场点击“开始抽奖”后会自动生成。</div>`;
      return;
    }

    els.recentRecords.innerHTML = records.map((record) => {
      const participantText = record.participantName
        ? `${record.participantName}（${record.participantId || "未编号"}）`
        : "未导入人员名单";

      return `
        <article class="record-item">
          <h3>${escapeHtml(record.prizeName)}</h3>
          <p>${escapeHtml(participantText)}</p>
          <p>${escapeHtml(record.time)}</p>
        </article>
      `;
    }).join("");
  }

  function renderStats() {
    const totalPrizeCount = state.settings.mode === "quantity"
      ? state.prizes.reduce((sum, item) => sum + toSafeNumber(item.quantity, 0), 0)
      : state.prizes.length;

    els.totalPrizeCount.textContent = String(totalPrizeCount);
    els.participantCount.textContent = String(state.participants.length);
    els.recordCount.textContent = String(state.records.length);
  }

  function renderBubbleField() {
    if (!state.prizes.length) {
      els.prizeBubbleField.innerHTML = `<div class="bubble-empty">请先在后台配置奖项</div>`;
      return;
    }

    const bubbleHtml = state.prizes.map((prize, index) => {
      const layout = getBubbleLayout(index, state.prizes.length);
      const activeClass = prize.id === currentPreviewId ? "active" : "";
      const countInfo = getBubbleCountInfo(prize);

      return `
        <div
          class="prize-bubble ${activeClass}"
          style="--bubble-size:${layout.size}px; --bubble-left:${layout.left}%; --bubble-top:${layout.top}%; --float-duration:${layout.duration}s; --float-delay:${layout.delay}s;"
        >
          <span class="bubble-count ${countInfo.className}">${escapeHtml(countInfo.text)}</span>
          <img src="${escapeHtml(prize.image)}" alt="${escapeHtml(getPrizeDisplayName(prize))}">
          <span class="bubble-name">${escapeHtml(getPrizeDisplayName(prize))}</span>
        </div>
      `;
    }).join("");

    els.prizeBubbleField.innerHTML = bubbleHtml;
  }

  function renderPrizeEditor() {
    if (!state.prizes.length) {
      els.prizeEditorList.innerHTML = `<div class="data-empty">暂无奖项，点击“新增奖项”开始配置。</div>`;
      return;
    }

    els.prizeEditorList.innerHTML = state.prizes.map((prize, index) => `
      <article class="editor-card" data-id="${escapeHtml(prize.id)}">
        <div class="editor-top">
          <img src="${escapeHtml(prize.image)}" alt="${escapeHtml(getPrizeDisplayName(prize))}">
          <div class="table-grid">
            <h3 class="editor-title">${escapeHtml(getPrizeDisplayName(prize))}</h3>
            <div class="form-grid">
              <label class="field">
                <span>奖项名称</span>
                <input type="text" data-field="name" value="${escapeAttribute(prize.name)}">
              </label>
              <label class="field">
                <span>奖品图片</span>
                <input class="prize-image-input" type="file" accept="image/*">
              </label>
              <label class="field">
                <span>数量模式下剩余数量</span>
                <input type="number" min="0" step="1" data-field="quantity" value="${prize.quantity}">
              </label>
              <label class="field">
                <span>概率模式下中奖概率（%）</span>
                <input type="number" min="0" step="0.1" data-field="probability" value="${prize.probability}">
              </label>
            </div>
          </div>
        </div>

        <div class="editor-actions">
          <div class="editor-sort">
            <button class="secondary-button compact" type="button" data-action="move-up">上移</button>
            <button class="secondary-button compact" type="button" data-action="move-down">下移</button>
          </div>
          <button class="secondary-button compact" type="button" data-action="reset-image">恢复默认图片</button>
          <button class="secondary-button compact" type="button" data-action="delete">删除奖项</button>
          <p class="editor-help">当前顺序：第 ${index + 1} 位</p>
        </div>
      </article>
    `).join("");
  }

  function renderParticipantTable() {
    if (!state.participants.length) {
      els.participantTable.innerHTML = `<div class="data-empty">暂无人员名单。未导入名单时，系统仍可只抽奖项。</div>`;
      return;
    }

    const rows = state.participants.map((person) => {
      const won = state.records.some((record) => record.participantId === person.id);
      return `
        <div class="table-row">
          <span>${escapeHtml(person.id)}</span>
          <span>${escapeHtml(person.name)}</span>
          <span>${won ? "已中奖" : "未中奖"}</span>
          <span class="table-subtext">${won ? "如需再次中奖，可关闭“不重复中奖”" : "可参与抽奖"}</span>
        </div>
      `;
    }).join("");

    els.participantTable.innerHTML = `
      <div class="table-grid">
        <div class="table-row header">
          <span>编号</span>
          <span>姓名</span>
          <span>状态</span>
          <span>说明</span>
        </div>
        ${rows}
      </div>
    `;
  }

  function renderRecordTable() {
    if (!state.records.length) {
      els.recordTable.innerHTML = `<div class="data-empty">暂无中奖记录。</div>`;
      return;
    }

    const rows = [...state.records].reverse().map((record) => `
      <div class="table-row">
        <span>${escapeHtml(record.participantId || "--")}</span>
        <span>${escapeHtml(record.participantName || "--")}</span>
        <span>${escapeHtml(record.prizeName)}</span>
        <span>${escapeHtml(record.time)}</span>
      </div>
    `).join("");

    els.recordTable.innerHTML = `
      <div class="table-grid">
        <div class="table-row header">
          <span>编号</span>
          <span>姓名</span>
          <span>奖项</span>
          <span>时间</span>
        </div>
        ${rows}
      </div>
    `;
  }

  function renderControlOptions() {
    const prizeOptions = ['<option value="">随机抽取</option>']
      .concat(state.prizes.map((prize) => `<option value="${escapeAttribute(prize.id)}">${escapeHtml(getPrizeDisplayName(prize))}</option>`))
      .join("");

    const participantOptions = ['<option value="">随机人员</option>']
      .concat(state.participants.map((person) => `<option value="${escapeAttribute(person.id)}">${escapeHtml(person.id)} - ${escapeHtml(person.name)}</option>`))
      .join("");

    els.nextPrizeSelect.innerHTML = prizeOptions;
    els.nextParticipantSelect.innerHTML = participantOptions;
    els.nextPrizeSelect.value = state.control.nextPrizeId || "";
    els.nextParticipantSelect.value = state.control.nextParticipantId || "";
  }

  function getBubbleCountInfo(prize) {
    if (state.settings.mode === "quantity") {
      const qty = toSafeNumber(prize.quantity, 0);
      return {
        text: `剩 ${qty}`,
        className: qty <= 0 ? "empty" : "",
      };
    }

    return {
      text: formatPercent(prize.probability),
      className: "probability",
    };
  }

  function handlePrizeGridSecretClick(event) {
    const card = event.target.closest(".prize-item");
    if (!card || !card.dataset.id) return;

    const prizeId = card.dataset.id;

    if (prizeSecretTargetId !== prizeId) {
      prizeSecretTargetId = prizeId;
      prizeSecretClickCount = 1;
    } else {
      prizeSecretClickCount += 1;
    }

    clearTimeout(prizeSecretClickTimer);
    prizeSecretClickTimer = setTimeout(() => {
      prizeSecretClickCount = 0;
      prizeSecretTargetId = "";
    }, 2000);

    if (prizeSecretClickCount >= 5) {
      prizeSecretClickCount = 0;
      prizeSecretTargetId = "";
      state.control.nextPrizeId = prizeId;
    }
  }

  function renderImageManager() {
    if (!els.imageManager) return;

    const logoCard = `
      <article class="image-card" data-type="logo">
        <img src="${escapeHtml(state.settings.logo || DEFAULT_LOGO)}" alt="Logo">
        <h4>活动 Logo</h4>
        <div class="image-card-actions">
          <label>上传替换<input type="file" accept="image/*" data-action="upload-logo"></label>
          <button class="secondary-button compact" type="button" data-action="reset-logo">恢复默认</button>
        </div>
      </article>
    `;

    const prizeCards = state.prizes.map((prize, index) => `
      <article class="image-card" data-type="prize" data-id="${escapeHtml(prize.id)}">
        <img src="${escapeHtml(prize.image)}" alt="${escapeHtml(getPrizeDisplayName(prize))}">
        <h4>${escapeHtml(getPrizeDisplayName(prize))}</h4>
        <div class="image-card-actions">
          <label>上传替换<input type="file" accept="image/*" data-action="upload-prize"></label>
          <button class="secondary-button compact" type="button" data-action="reset-prize">恢复默认</button>
          <button class="secondary-button compact" type="button" data-action="delete-image">清除图片</button>
        </div>
        <p class="editor-help">默认路径：assets/prizes/${(index % 4) + 1}.jpg</p>
      </article>
    `).join("");

    els.imageManager.innerHTML = logoCard + prizeCards;
  }

  async function handleImageManagerChange(event) {
    const input = event.target;
    if (input.tagName !== "INPUT" || input.type !== "file" || !input.files[0]) return;

    const card = input.closest(".image-card");
    if (!card) return;

    const dataUrl = await readFileAsDataUrl(input.files[0]);
    const action = input.dataset.action;

    if (action === "upload-logo") {
      state.settings.logo = dataUrl;
    }

    if (action === "upload-prize") {
      const prize = state.prizes.find((item) => item.id === card.dataset.id);
      if (prize) prize.image = dataUrl;
    }

    saveState();
    renderAll();
    showToast("图片已更新。");
    input.value = "";
  }

  function handleImageManagerClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.tagName === "LABEL") return;

    const card = button.closest(".image-card");
    if (!card) return;

    const action = button.dataset.action;

    if (action === "reset-logo") {
      state.settings.logo = DEFAULT_LOGO;
      saveState();
      renderAll();
      showToast("Logo 已恢复默认。");
      return;
    }

    if (action === "reset-prize") {
      const index = state.prizes.findIndex((item) => item.id === card.dataset.id);
      if (index !== -1) {
        state.prizes[index].image = getDefaultPrizeImage(index);
        saveState();
        renderAll();
        showToast("奖品图片已恢复默认。");
      }
      return;
    }

    if (action === "delete-image") {
      const index = state.prizes.findIndex((item) => item.id === card.dataset.id);
      if (index !== -1) {
        state.prizes[index].image = THANKS_IMAGE;
        saveState();
        renderAll();
        showToast("奖品图片已清除。");
      }
    }
  }

  function renderControlSummary() {
    const selectedPrize = state.prizes.find((item) => item.id === state.control.nextPrizeId);
    const prizeName = selectedPrize ? getPrizeDisplayName(selectedPrize) : "未指定";
    const participant = state.participants.find((item) => item.id === state.control.nextParticipantId);
    const participantText = participant ? `${participant.name}（${participant.id}）` : "未指定";

    els.controlSummary.textContent = `下一次抽奖：奖项 ${prizeName}，人员 ${participantText}。`;
  }

  function updateProbabilitySummary() {
    const total = getProbabilityTotal();
    const remain = Math.max(0, 100 - total);
    const valid = total <= 100;

    els.probabilitySummary.classList.toggle("invalid", !valid);
    els.probabilitySummary.textContent = valid
      ? `当前概率总和：${formatPercent(total)}，剩余 ${formatPercent(remain)} 将视为“谢谢参与”。`
      : `当前概率总和：${formatPercent(total)}，已超过 100%，系统禁止保存。`;
  }

  function getProbabilityTotal() {
    return state.prizes.reduce((sum, item) => sum + toSafeNumber(item.probability, 0), 0);
  }

  function getFirstPreviewItem() {
    if (state.prizes.length) {
      return state.prizes[0];
    }
    return { name: "请先配置奖项", image: THANKS_IMAGE };
  }

  function updateDrawPreview(item, description) {
    currentPreviewId = item.id || "";
    renderBubbleField();
    els.drawImage.src = item.image || THANKS_IMAGE;
    els.drawPrizeName.textContent = getPrizeDisplayName(item) || "抽奖中";
    if (description) {
      els.drawDescription.textContent = description;
      return;
    }

    if (state.settings.mode === "quantity") {
      els.drawDescription.textContent = "数量模式下，奖品会根据剩余数量参与随机抽取。";
    } else {
      const remaining = Math.max(0, 100 - getProbabilityTotal());
      els.drawDescription.textContent = `概率模式下，剩余 ${formatPercent(remaining)} 为“谢谢参与”。`;
    }
  }

  function handleLogoSecretEntry() {
    logoClickCount += 1;
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => {
      logoClickCount = 0;
    }, 1800);

    if (logoClickCount >= 5) {
      logoClickCount = 0;
      openAdminModal();
    }
  }

  function openAdminModal() {
    els.adminModal.classList.remove("hidden");
    els.adminPasswordInput.value = "";
    if (!adminUnlocked) {
      els.adminLockSection.classList.remove("hidden");
      els.adminContent.classList.add("hidden");
      els.adminPasswordInput.focus();
    }
  }

  function closeAdminModal() {
    els.adminModal.classList.add("hidden");
  }

  function unlockAdmin() {
    if (els.adminPasswordInput.value !== state.settings.adminPassword) {
      showToast("后台密码错误。");
      return;
    }

    adminUnlocked = true;
    els.adminLockSection.classList.add("hidden");
    els.adminContent.classList.remove("hidden");
    switchAdminTab("settings");
  }

  function switchAdminTab(tab) {
    els.tabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tab);
    });

    els.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === tab);
    });
  }

  async function saveSettings() {
    const nextLogo = els.settingLogo.files[0] ? await readFileAsDataUrl(els.settingLogo.files[0]) : state.settings.logo;
    const nextBackground = els.settingBackground.files[0] ? await readFileAsDataUrl(els.settingBackground.files[0]) : state.settings.background;

    state.settings.title = cleanText(els.settingTitle.value, DEFAULT_STATE.settings.title);
    state.settings.subtitle = cleanText(els.settingSubtitle.value, DEFAULT_STATE.settings.subtitle);
    state.settings.mode = els.settingMode.value === "probability" ? "probability" : "quantity";
    state.settings.adminPassword = cleanText(els.settingPassword.value, DEFAULT_STATE.settings.adminPassword);
    state.settings.soundEnabled = els.settingSoundEnabled.checked;
    state.settings.noRepeatWinners = els.settingNoRepeatWinners.checked;
    state.settings.logo = nextLogo || DEFAULT_LOGO;
    state.settings.background = nextBackground || "";

    const saved = saveState({ validatePrizeProbability: true });
    if (!saved) return;

    renderAll();
    els.settingLogo.value = "";
    els.settingBackground.value = "";
    showToast("活动设置已保存。");
  }

  function resetBackground() {
    state.settings.background = "";
    saveState();
    renderSettings();
    showToast("背景已恢复默认。");
  }

  function addPrize() {
    state.prizes.push({
      id: createId(),
      name: `新奖项 ${state.prizes.length + 1}`,
      image: getDefaultPrizeImage(state.prizes.length),
      quantity: 0,
      probability: 0,
    });

    const saved = saveState({ validatePrizeProbability: true });
    if (!saved) return;

    renderAll();
    showToast("已新增奖项。");
  }

  function handlePrizeEditorInput(event) {
    const card = event.target.closest(".editor-card");
    if (!card) return;

    const prize = state.prizes.find((item) => item.id === card.dataset.id);
    if (!prize) return;

    const field = event.target.dataset.field;
    if (!field) return;

    if (field === "name") {
      prize.name = String(event.target.value || "");
    }

    if (field === "quantity") {
      prize.quantity = Math.max(0, Math.round(toSafeNumber(event.target.value, 0)));
    }

    if (field === "probability") {
      prize.probability = Math.max(0, Number(event.target.value || 0));
    }

    if (getProbabilityTotal() <= 100) {
      saveState();
    }

    renderPrizeGrid();
    renderStats();
    renderControlOptions();
    renderControlSummary();
    updateProbabilitySummary();
    updateDrawPreview(getFirstPreviewItem());
  }

  async function handlePrizeImageChange(event) {
    if (!event.target.classList.contains("prize-image-input")) return;

    const card = event.target.closest(".editor-card");
    if (!card || !event.target.files[0]) return;

    const prize = state.prizes.find((item) => item.id === card.dataset.id);
    if (!prize) return;

    prize.image = await readFileAsDataUrl(event.target.files[0]);
    saveState();
    renderAll();
    showToast("奖品图片已更新。");
  }

  function handlePrizeEditorClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest(".editor-card");
    if (!card) return;

    const index = state.prizes.findIndex((item) => item.id === card.dataset.id);
    if (index === -1) return;

    const action = button.dataset.action;

    if (action === "move-up" && index > 0) {
      swapItems(state.prizes, index, index - 1);
    }

    if (action === "move-down" && index < state.prizes.length - 1) {
      swapItems(state.prizes, index, index + 1);
    }

    if (action === "delete") {
      state.prizes.splice(index, 1);
      if (getProbabilityTotal() > 100) {
        showToast("删除后请重新检查概率设置。");
      }
    }

    if (action === "reset-image") {
      state.prizes[index].image = getDefaultPrizeImage(index);
    }

    const saved = saveState({ validatePrizeProbability: true });
    if (!saved) return;

    renderAll();
  }

  async function importParticipants() {
    let text = els.participantTextarea.value.trim();

    if (!text && els.participantFileInput.files[0]) {
      text = await readFileAsText(els.participantFileInput.files[0]);
    }

    if (!text) {
      showToast("请先上传 CSV 或粘贴名单内容。");
      return;
    }

    const list = parseParticipants(text);
    if (!list.length) {
      showToast("未识别到有效名单，请检查格式。");
      return;
    }

    state.participants = list;
    saveState();
    renderAll();
    els.participantTextarea.value = "";
    els.participantFileInput.value = "";
    showToast(`已导入 ${list.length} 位人员。`);
  }

  function clearParticipants() {
    if (!window.confirm("确定要清空全部人员名单吗？")) {
      return;
    }

    state.participants = [];
    state.control.nextParticipantId = "";
    saveState();
    renderAll();
    showToast("人员名单已清空。");
  }

  function saveControlSettings() {
    state.control.nextPrizeId = els.nextPrizeSelect.value;
    state.control.nextParticipantId = els.nextParticipantSelect.value;
    saveState();
    renderControlSummary();
    showToast("高级控制已保存。");
  }

  function clearControlSettings() {
    state.control.nextPrizeId = "";
    state.control.nextParticipantId = "";
    saveState();
    renderControlOptions();
    renderControlSummary();
    showToast("指定设置已清除。");
  }

  function clearRecords() {
    if (!window.confirm("确定要清空全部中奖记录吗？")) {
      return;
    }

    state.records = [];
    saveState();
    renderAll();
    showToast("中奖记录已清空。");
  }

  function exportRecordsCsv() {
    if (!state.records.length) {
      showToast("暂无中奖记录可导出。");
      return;
    }

    const lines = [
      ["编号", "姓名", "奖项", "时间"],
      ...state.records.map((record) => [
        record.participantId || "",
        record.participantName || "",
        record.prizeName,
        record.time,
      ]),
    ];

    const csv = "\uFEFF" + lines.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    downloadFile(csv, `luckydraw-records-${Date.now()}.csv`, "text/csv;charset=utf-8;");
    showToast("中奖记录已导出 CSV。");
  }

  async function startDraw() {
    if (isDrawing) return;

    const validationMessage = validateBeforeDraw();
    if (validationMessage) {
      showToast(validationMessage);
      return;
    }

    const finalPrize = resolveFinalPrize();
    if (!finalPrize) {
      showToast("当前没有可抽取的奖项。");
      return;
    }

    const participantResult = resolveFinalParticipant();
    if (participantResult.error) {
      showToast(participantResult.error);
      return;
    }

    isDrawing = true;
    els.startDrawButton.disabled = true;
    els.drawStage.classList.add("is-drawing");
    els.drawNameTrack.classList.add("spinning");

    const candidates = getAnimationCandidates(finalPrize);
    await playDrawAnimation(candidates, finalPrize);

    finalizeDraw(finalPrize, participantResult.person);
  }

  function validateBeforeDraw() {
    if (!state.prizes.length) {
      return "请先在后台配置奖项。";
    }

    if (state.settings.mode === "quantity") {
      const available = state.prizes.some((item) => item.quantity > 0);
      if (!available) {
        return "所有奖项数量都已抽完。";
      }
    }

    if (state.settings.mode === "probability") {
      const total = getProbabilityTotal();
      if (total <= 0) {
        return "请先设置有效的中奖概率。";
      }
      if (total > 100) {
        return "当前概率总和超过 100%，请先调整。";
      }
    }

    return "";
  }

  function resolveFinalPrize() {
    const forcedPrize = state.prizes.find((item) => item.id === state.control.nextPrizeId);
    if (forcedPrize) {
      if (state.settings.mode === "quantity" && forcedPrize.quantity <= 0) {
        showToast("指定奖项数量为 0，已自动忽略。");
      } else {
        return forcedPrize;
      }
    }

    if (state.settings.mode === "quantity") {
      return pickPrizeByQuantity();
    }

    return pickPrizeByProbability();
  }

  function resolveFinalParticipant() {
    if (!state.participants.length) {
      return { person: null, error: "" };
    }

    const forcedPerson = state.participants.find((item) => item.id === state.control.nextParticipantId);
    if (forcedPerson) {
      return { person: forcedPerson, error: "" };
    }

    const pool = getEligibleParticipants();
    if (!pool.length) {
      return { person: null, error: "没有可抽取的人员，请检查是否允许重复中奖。" };
    }

    return {
      person: pool[Math.floor(Math.random() * pool.length)],
      error: "",
    };
  }

  function getEligibleParticipants() {
    if (!state.settings.noRepeatWinners) {
      return [...state.participants];
    }

    const winnerIds = new Set(state.records.map((record) => record.participantId).filter(Boolean));
    return state.participants.filter((item) => !winnerIds.has(item.id));
  }

  function pickPrizeByQuantity() {
    const available = state.prizes.filter((item) => item.quantity > 0);
    if (!available.length) return null;

    const totalQuantity = available.reduce((sum, item) => sum + item.quantity, 0);
    let random = Math.random() * totalQuantity;

    for (const prize of available) {
      random -= prize.quantity;
      if (random <= 0) {
        return prize;
      }
    }

    return available[available.length - 1];
  }

  function pickPrizeByProbability() {
    const total = getProbabilityTotal();
    const random = Math.random() * 100;
    let cursor = 0;

    for (const prize of state.prizes) {
      cursor += toSafeNumber(prize.probability, 0);
      if (random <= cursor) {
        return prize;
      }
    }

    if (random > total) {
      return createThanksEntry();
    }

    return state.prizes[state.prizes.length - 1] || createThanksEntry();
  }

  function createThanksEntry() {
    return {
      id: "thanks",
      name: "谢谢参与",
      image: THANKS_IMAGE,
      quantity: Infinity,
      probability: Math.max(0, 100 - getProbabilityTotal()),
    };
  }

  function getAnimationCandidates(finalPrize) {
    const base = state.prizes.slice(0, 8);
    if (!base.some((item) => item.id === finalPrize.id)) {
      base.push(finalPrize);
    }
    if (state.settings.mode === "probability" && getProbabilityTotal() < 100) {
      base.push(createThanksEntry());
    }
    return base;
  }

  function playDrawAnimation(candidates, finalPrize) {
    return new Promise((resolve) => {
      const duration = 2200;
      const start = performance.now();

      const step = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const slowFactor = 0.08 + progress * progress * 0.92;
        const index = Math.floor(Math.random() * candidates.length);
        const preview = candidates[index];

        updateDrawPreview(preview, "奖品图片快速切换中，请等待结果揭晓。");
        if (state.settings.soundEnabled) {
          playTickSound(520 - progress * 180, 0.035);
        }

        if (progress >= 1) {
          setTimeout(() => {
            updateDrawPreview(finalPrize, `本轮结果：${getPrizeDisplayName(finalPrize)}`);
            resolve();
          }, 260);
          return;
        }

        setTimeout(step, 50 + slowFactor * 180);
      };

      step();
    });
  }

  function finalizeDraw(prize, person) {
    if (prize.id !== "thanks" && state.settings.mode === "quantity") {
      const target = state.prizes.find((item) => item.id === prize.id);
      if (target) {
        target.quantity = Math.max(0, target.quantity - 1);
      }
    }

    const record = {
      id: createId(),
      participantId: person?.id || "",
      participantName: person?.name || "",
      prizeId: prize.id,
      prizeName: getPrizeDisplayName(prize),
      prizeImage: prize.image,
      time: formatDate(new Date()),
    };

    state.records.push(record);
    state.control.nextPrizeId = "";
    state.control.nextParticipantId = "";
    saveState({ validatePrizeProbability: true });

    renderAll();
    openResultModal(record);
    if (state.settings.soundEnabled) {
      playCelebrateSound();
    }

    els.drawStage.classList.remove("is-drawing");
    els.drawNameTrack.classList.remove("spinning");
    els.startDrawButton.disabled = false;
    isDrawing = false;
  }

  function openResultModal(record) {
    els.resultPrizeName.textContent = record.prizeName;
    els.resultPrizeImage.src = record.prizeImage || THANKS_IMAGE;
    els.resultParticipantText.textContent = record.participantName
      ? `中奖人：${record.participantName}（${record.participantId || "--"}）`
      : `结果：${record.prizeName}`;
    els.resultTimeText.textContent = `时间：${record.time}`;
    els.resultModal.classList.remove("hidden");
    launchConfetti();
  }

  function closeResultModal() {
    els.resultModal.classList.add("hidden");
    els.confettiLayer.innerHTML = "";
  }

  function launchConfetti() {
    const colors = ["#77a8ff", "#7cf3ba", "#ffd772", "#ff7c90", "#f5f8ff"];
    const pieces = Array.from({ length: 36 }).map(() => {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${3 + Math.random() * 2}s`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.setProperty("--x-end", `${(Math.random() - 0.5) * 260}px`);
      piece.style.setProperty("--rotate", `${220 + Math.random() * 360}deg`);
      return piece;
    });

    els.confettiLayer.innerHTML = "";
    pieces.forEach((piece) => els.confettiLayer.appendChild(piece));
  }

  function toggleSound() {
    state.settings.soundEnabled = !state.settings.soundEnabled;
    saveState();
    renderSettings();
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      showToast("当前设备不支持全屏模式。");
    }
  }

  function syncFullscreenButtonText() {
    els.fullscreenButton.textContent = document.fullscreenElement ? "退出全屏" : "全屏";
  }

  function parseParticipants(text) {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const list = [];
    const seen = new Set();

    for (const line of lines) {
      const cells = line.split(/,|，|\t|;/).map((item) => item.trim()).filter(Boolean);
      if (cells.length < 2) continue;

      const [id, name] = cells;
      const headerLine = `${id}${name}`.toLowerCase();
      if (headerLine.includes("编号") || headerLine.includes("姓名") || headerLine.includes("idname")) {
        continue;
      }
      if (seen.has(id)) continue;

      list.push({ id, name });
      seen.add(id);
    }

    return list;
  }

  function swapItems(list, a, b) {
    [list[a], list[b]] = [list[b], list[a]];
  }

  function cleanText(value, fallback) {
    const cleaned = String(value || "").trim();
    return cleaned || fallback;
  }

  function getPrizeDisplayName(prize) {
    return String(prize?.name || "").trim() || "未命名奖项";
  }

  function getBubbleLayout(index, count) {
    const presets = [
      { left: 14, top: 22, size: 122, duration: 8.2, delay: -0.6 },
      { left: 26, top: 66, size: 116, duration: 9.1, delay: -2.1 },
      { left: 50, top: 18, size: 128, duration: 8.8, delay: -1.8 },
      { left: 74, top: 30, size: 120, duration: 9.5, delay: -0.9 },
      { left: 86, top: 64, size: 110, duration: 8.7, delay: -2.8 },
      { left: 50, top: 78, size: 118, duration: 9.3, delay: -1.1 },
      { left: 16, top: 48, size: 108, duration: 8.4, delay: -2.5 },
      { left: 82, top: 16, size: 102, duration: 7.9, delay: -1.4 },
    ];

    if (index < presets.length) {
      return presets[index];
    }

    const ringIndex = index - presets.length;
    const angle = (Math.PI * 2 * ringIndex) / Math.max(1, count - presets.length);
    const radiusX = 34;
    const radiusY = 26;
    return {
      left: 50 + Math.cos(angle) * radiusX,
      top: 48 + Math.sin(angle) * radiusY,
      size: 96 + (index % 4) * 8,
      duration: 8 + (index % 5) * 0.6,
      delay: -0.8 * index,
    };
  }

  function formatPercent(value) {
    const safe = Number(value) || 0;
    return `${safe % 1 === 0 ? safe.toFixed(0) : safe.toFixed(1)}%`;
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(text) {
    return escapeHtml(text);
  }

  function escapeCsvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsText(file, "utf-8");
    });
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.add("hidden");
    }, 2600);
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function ensureAudioContext() {
    if (!state.settings.soundEnabled) return null;
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function playTickSound(frequency, duration) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    playTone(ctx, frequency, duration, "triangle", 0.02);
  }

  function playCelebrateSound() {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    playTone(ctx, 523.25, 0.18, "sine", 0.05, 0);
    playTone(ctx, 659.25, 0.18, "sine", 0.05, 0.08);
    playTone(ctx, 783.99, 0.28, "sine", 0.06, 0.16);
  }

  function playTone(ctx, frequency, duration, type, gainValue, delay = 0) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const startTime = ctx.currentTime + delay;
    const endTime = startTime + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  }
})();
