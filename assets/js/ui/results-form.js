'use strict';

// ════════════════════════════════════════════════════════════
// RESULTS FORM — Modal for entering tournament results.
// Extracted from core.js (lines 303–690).
// ════════════════════════════════════════════════════════════

let _resState = null;

const PRESETS = {
  kotc: {
    label: 'KotC',
    pts: [100,90,82,76,70,65,60,56,52,48,44,42,40,38,36,34,32,30,28,26,
          24,22,20,18,16,14,12,10,8,7,6,5,4,3,2,2,1,1,1,1],
  },
  rr8: {
    label: 'RR-8',
    pts: [100,80,60,50,40,30,20,10],
  },
  top3: {
    label: 'Топ-3',
    pts: [100,80,60],
  },
  ipt: {
    label: 'IPT',
    pts: [100,84,70,58,48,38,28,18,10,6,4,2],
  },
};

const DEFAULT_SLOTS = 8;

// ── Open / close ─────────────────────────────────────────────

function openResultsForm(trnId) {
  const trn = getTournaments().find(t => t.id === trnId);
  if (!trn) { showToast('❌ Турнир не найден'); return; }

  const type = divisionToType(trn.division);

  // If tournament already has winners — restore them
  const pMap = new Map();
  loadPlayerDB().forEach(p => pMap.set(String(p.id), p));

  // Build slots from existing winners, or create empty slots
  let slots;
  if (Array.isArray(trn.winners) && trn.winners.length > 0 &&
      trn.winners.some(w => w && typeof w === 'object' && Array.isArray(w.playerIds) && w.playerIds.length)) {
    slots = trn.winners
      .filter(w => w && typeof w === 'object')
      .map(w => ({
        place:     w.place  || 1,
        pts:       typeof w.points === 'number' ? w.points : 0,
        playerIds: Array.isArray(w.playerIds) ? [...w.playerIds] : [],
      }))
      .sort((a, b) => a.place - b.place);
    // Ensure at least DEFAULT_SLOTS slots
    const maxPlace = Math.max(...slots.map(s => s.place), 0);
    for (let i = maxPlace + 1; i <= Math.max(maxPlace, DEFAULT_SLOTS); i++) {
      slots.push({ place: i, pts: 0, playerIds: [] });
    }
  } else {
    // Default: 8 empty slots
    slots = Array.from({ length: DEFAULT_SLOTS }, (_, i) => ({
      place: i + 1, pts: 0, playerIds: [],
    }));
  }

  _resState = {
    trnId,
    trn,
    type,
    slots,
    filterQ: '',
    showNewPlayerForm: false,
    newPlayerSlot: 0,
    newPlayerName: '',
    newPlayerGender: type === 'W' ? 'W' : 'M',
    isFirstSave: !trn.winners?.length,
  };

  document.getElementById('res-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'res-modal-overlay';
  overlay.className = 'res-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeResultsModal(); });
  overlay.innerHTML = _resModalHtml();
  document.body.appendChild(overlay);
}

function closeResultsModal() {
  document.getElementById('res-modal-overlay')?.remove();
  _resState = null;
}

// ── Re-render helpers ─────────────────────────────────────────

function _resModalHtml() {
  if (!_resState) return '';
  const { trn, type, slots, filterQ, showNewPlayerForm } = _resState;

  const db   = loadPlayerDB();
  const pMap = new Map();
  db.forEach(p => pMap.set(String(p.id), p));

  // Collect all playerIds already assigned
  const usedIds = new Set(slots.flatMap(s => s.playerIds));

  // Players for selection (filtered)
  const q = filterQ.toLowerCase();
  const typeFilter = type === 'Mix' ? () => true
    : type === 'W' ? p => p.gender === 'W'
    : p => p.gender === 'M';
  const available = db
    .filter(typeFilter)
    .filter(p => !usedIds.has(String(p.id)))
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => (b.ratingM || b.ratingW || 0) - (a.ratingM || a.ratingW || 0));

  const filledCount = slots.filter(s => s.playerIds.length > 0).length;
  const totalSlots  = slots.length;

  const progressHtml = `
    <div class="res-progress">
      ${slots.map((s, i) => `<div class="res-progress-dot${s.playerIds.length ? ' done' : ''}" title="Место ${s.place}"></div>`).join('')}
      <div class="res-progress-lbl${filledCount === totalSlots ? ' all-done' : ''}">
        Заполнено: ${filledCount} / ${totalSlots}
      </div>
    </div>`;

  const presetHtml = `
    <div class="res-presets">
      ${Object.entries(PRESETS).map(([key, p]) => `
        <button class="res-preset-btn" onclick="resApplyPreset('${key}')">
          ${esc(p.label)}
          <span class="res-preset-pts">${p.pts[0]}/${p.pts[1] || '-'}</span>
        </button>`).join('')}
    </div>`;

  const typeHtml = `
    <div class="res-type-row">
      <span class="res-type-lbl">Дивизион:</span>
      <div class="res-type-btns">
        ${['M','W','Mix'].map(t => `
          <button class="res-type-btn${type === t ? ' active' : ''}" onclick="resSetTrnType('${t}')">
            ${t === 'M' ? '🏋️ М' : t === 'W' ? '👩 Ж' : '🤝 Микст'}
          </button>`).join('')}
      </div>
    </div>`;

  const slotsHtml = slots.map((slot, idx) => _slotHtml(slot, idx, pMap)).join('');

  const searchHtml = `
    <div class="res-sel-row" style="margin-top:8px">
      <input class="res-search-inp" type="search" placeholder="Поиск игрока…"
        value="${esc(filterQ)}" oninput="resFilterPlayers(this.value)">
    </div>
    <div id="res-player-list" style="max-height:180px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:4px;padding:6px 0">
      ${available.map(p => `
        <button class="res-badge" style="cursor:pointer"
          onclick="resAddPlayer('${escAttr(String(p.id))}')">
          ${esc(p.name)}
          <span style="font-size:10px;color:var(--muted)">+</span>
        </button>`).join('')}
      ${available.length === 0 ? `<div style="font-size:11px;color:var(--muted);padding:4px">${q ? 'Не найдено' : 'Все добавлены'}</div>` : ''}
    </div>`;

  const newPlayerHtml = showNewPlayerForm ? `
    <div class="res-new-player-form">
      <div class="res-new-player-title">➕ Новый игрок</div>
      <div class="res-new-player-row">
        <input id="res-new-name" class="res-new-inp" type="text" placeholder="Фамилия Имя"
          value="${esc(_resState.newPlayerName)}"
          oninput="_resState.newPlayerName=this.value">
        <select id="res-new-gender" class="res-new-gender"
          onchange="_resState.newPlayerGender=this.value">
          <option value="M"${_resState.newPlayerGender === 'M' ? ' selected' : ''}>М</option>
          <option value="W"${_resState.newPlayerGender === 'W' ? ' selected' : ''}>Ж</option>
        </select>
        <button class="res-new-confirm" onclick="resCreateNewPlayer()">Добавить</button>
        <button class="res-new-cancel" onclick="resCloseNewPlayerForm()">✕</button>
      </div>
    </div>` : `
    <button style="font-size:11px;color:#4DA8DA;background:none;border:none;cursor:pointer;padding:4px 0"
      onclick="resOpenNewPlayerForm()">+ Новый игрок</button>`;

  return `
    <div class="res-modal">
      <div class="res-modal-hdr">
        <div>
          <div class="res-modal-title">📊 Результаты</div>
          <div class="res-modal-sub">${esc(trn.name)}</div>
        </div>
        <button class="res-modal-close" onclick="closeResultsModal()">✕</button>
      </div>
      <div class="res-modal-body">
        ${typeHtml}
        ${progressHtml}
        ${presetHtml}
        <div id="res-slots">${slotsHtml}</div>
        ${searchHtml}
        ${newPlayerHtml}
      </div>
      <div class="res-modal-footer">
        <button class="res-btn-skip" onclick="finishTrnNoResults('${escAttr(trn.id)}')">Без результатов</button>
        <button class="res-btn-save" onclick="saveResults()">💾 Сохранить результаты</button>
      </div>
    </div>`;
}

function _slotHtml(slot, idx, pMap) {
  const medals = ['🥇','🥈','🥉'];
  const medal  = medals[slot.place - 1] || `#${slot.place}`;
  const isGold = slot.place === 1;

  const players = slot.playerIds
    .map(pid => pMap?.get(String(pid)))
    .filter(Boolean);

  const playersHtml = players.length
    ? players.map(p => `
        <span class="res-badge">
          ${esc(p.name)}
          <button class="res-badge-rm"
            onclick="resRemovePlayer('${escAttr(String(p.id))}', ${idx})">✕</button>
        </span>`).join('')
    : `<span class="res-slot-empty">— нет игрока —</span>`;

  return `
    <div class="res-slot${isGold ? ' res-slot--gold' : ''}">
      <div class="res-slot-hdr">
        <span class="res-slot-place">${medal} Место ${slot.place}</span>
        <div class="res-pts-wrap">
          <span class="res-pts-label">Очки:</span>
          <input class="res-pts-inp" type="number" min="0" value="${slot.pts}"
            onchange="resChangePoints(${idx}, this.value)">
        </div>
      </div>
      <div class="res-slot-players">${playersHtml}</div>
    </div>`;
}

function _reRenderSlots() {
  const el = document.getElementById('res-slots');
  if (!el || !_resState) return;
  const db   = loadPlayerDB();
  const pMap = new Map();
  db.forEach(p => pMap.set(String(p.id), p));
  el.innerHTML = _resState.slots.map((slot, idx) => _slotHtml(slot, idx, pMap)).join('');
}

// ── Actions ───────────────────────────────────────────────────

function resSetTrnType(type) {
  if (!_resState) return;
  _resState.type = type;
  // Re-render full modal
  const overlay = document.getElementById('res-modal-overlay');
  if (overlay) overlay.innerHTML = _resModalHtml();
}

function resFilterPlayers(q) {
  if (!_resState) return;
  _resState.filterQ = q;
  const list = document.getElementById('res-player-list');
  if (!list) return;
  const db = loadPlayerDB();
  const usedIds = new Set(_resState.slots.flatMap(s => s.playerIds));
  const { type } = _resState;
  const typeFilter = type === 'Mix' ? () => true : type === 'W' ? p => p.gender === 'W' : p => p.gender === 'M';
  const lq = q.toLowerCase();
  const available = db
    .filter(typeFilter)
    .filter(p => !usedIds.has(String(p.id)))
    .filter(p => !lq || p.name.toLowerCase().includes(lq))
    .sort((a, b) => (b.ratingM || b.ratingW || 0) - (a.ratingM || a.ratingW || 0));
  list.innerHTML = available.map(p => `
    <button class="res-badge" style="cursor:pointer"
      onclick="resAddPlayer('${escAttr(String(p.id))}')">
      ${esc(p.name)}
      <span style="font-size:10px;color:var(--muted)">+</span>
    </button>`).join('') ||
    `<div style="font-size:11px;color:var(--muted);padding:4px">${lq ? 'Не найдено' : 'Все добавлены'}</div>`;
}

function resAddPlayer(pid, slotIdx) {
  if (!_resState) return;
  const slots = _resState.slots;
  // Find first empty slot if slotIdx not provided
  let targetIdx = slotIdx != null ? slotIdx : slots.findIndex(s => s.playerIds.length === 0);
  if (targetIdx < 0) targetIdx = 0; // fallback to first slot

  // Check not already in any slot
  if (slots.some(s => s.playerIds.includes(String(pid)))) {
    showToast('Игрок уже добавлен');
    return;
  }

  slots[targetIdx].playerIds.push(String(pid));
  _reRenderSlots();
  resFilterPlayers(_resState.filterQ);
}

function resRemovePlayer(pid, slotIdx) {
  if (!_resState) return;
  _resState.slots[slotIdx].playerIds = _resState.slots[slotIdx].playerIds.filter(id => id !== String(pid));
  _reRenderSlots();
  resFilterPlayers(_resState.filterQ);
}

function resChangePoints(slotIdx, val) {
  if (!_resState) return;
  const n = parseInt(val, 10);
  _resState.slots[slotIdx].pts = isNaN(n) ? 0 : Math.max(0, n);
}

function resApplyPreset(key) {
  if (!_resState || !PRESETS[key]) return;
  const pts = PRESETS[key].pts;
  _resState.slots.forEach((slot, i) => {
    slot.pts = pts[i] ?? 0;
  });
  _reRenderSlots();
}

function resOpenNewPlayerForm(slotIdx) {
  if (!_resState) return;
  _resState.showNewPlayerForm = true;
  _resState.newPlayerSlot     = slotIdx ?? _resState.slots.findIndex(s => s.playerIds.length === 0);
  _resState.newPlayerName     = '';
  _resState.newPlayerGender   = _resState.type === 'W' ? 'W' : 'M';
  const overlay = document.getElementById('res-modal-overlay');
  if (overlay) overlay.innerHTML = _resModalHtml();
}

function resCloseNewPlayerForm() {
  if (!_resState) return;
  _resState.showNewPlayerForm = false;
  const overlay = document.getElementById('res-modal-overlay');
  if (overlay) overlay.innerHTML = _resModalHtml();
}

function resCreateNewPlayer() {
  if (!_resState) return;
  const name   = (document.getElementById('res-new-name')?.value || _resState.newPlayerName).trim();
  const gender = document.getElementById('res-new-gender')?.value || _resState.newPlayerGender;
  if (!name) { showToast('Введите имя игрока'); return; }
  const p = upsertPlayerInDB({ name, gender });
  if (!p) { showToast('Ошибка добавления игрока'); return; }
  resCloseNewPlayerForm();
  resAddPlayer(String(p.id), _resState.newPlayerSlot);
  showToast(`✅ ${name} добавлен`);
}

function finishTrnNoResults(trnId) {
  showConfirm('Завершить турнир без сохранения результатов?').then(ok => {
    if (!ok) return;
    const arr = getTournaments();
    const t   = arr.find(x => x.id === trnId);
    if (!t) return;
    t.status = 'finished';
    saveTournaments(arr);
    saveState();
    closeResultsModal();
    recalcAllPlayerStats(/*silent*/ true);
    _refreshRosterTrn();
    showToast('✅ Турнир завершён');
  });
}

function saveResults() {
  if (!_resState) return;
  const { trnId, slots, isFirstSave } = _resState;

  const filledSlots = slots.filter(s => s.playerIds.length > 0);
  if (filledSlots.length < 1) {
    showToast('⚠️ Заполните хотя бы одно место');
    return;
  }

  const arr = getTournaments();
  const t   = arr.find(x => x.id === trnId);
  if (!t) { showToast('❌ Турнир не найден'); return; }

  // Build winners array
  const now = new Date().toISOString();
  t.winners = filledSlots.map(s => ({
    place:     s.place,
    points:    s.pts,
    playerIds: [...s.playerIds],
  }));
  t.status = 'finished';

  // Append audit entry
  if (!Array.isArray(t.history)) t.history = [];
  t.history.push({
    ts:              now,
    action:          isFirstSave ? 'results_saved' : 'results_updated',
    winnersSnapshot: t.winners.map(w => ({ ...w, playerIds: [...w.playerIds] })),
  });

  saveTournaments(arr);
  saveState();
  closeResultsModal();
  recalcAllPlayerStats(/*silent*/ true);
  _refreshRosterTrn();
  showToast(isFirstSave ? '✅ Результаты сохранены' : '✅ Результаты обновлены');
}
