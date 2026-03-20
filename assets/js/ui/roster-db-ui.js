'use strict';

// ════════════════════════════════════════════════════════════
// ROSTER PLAYER DB UI — Inline player database management panel.
// Extracted from core.js (lines 80–169).
// ════════════════════════════════════════════════════════════

let rosterDbTab = 'M'; // 'M' | 'W'

function setRosterDbTab(tab) {
  rosterDbTab = tab;
  _refreshRdb();
}

function _refreshRdb() {
  const el = document.getElementById('roster-db-section');
  if (el) el.innerHTML = _rdbBodyHtml();
}

function rdbAdd(gender) {
  const inp = document.getElementById(`rdb-add-inp-${gender}`);
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) { showToast('Введите имя игрока'); return; }
  if (addPlayerToDB(name, gender)) {
    inp.value = '';
    showToast(`✅ ${name} добавлен в базу`);
    _refreshRdb();
  } else {
    showToast(`⚠️ ${name} уже есть в базе`);
  }
}

function rdbRemove(id) {
  const db = loadPlayerDB();
  const p  = db.find(x => String(x.id) === String(id));
  if (!p) return;
  showConfirm(`Удалить ${p.name} из базы?`).then(ok => {
    if (!ok) return;
    removePlayerFromDB(id);
    showToast(`Удалён: ${p.name}`);
    _refreshRdb();
  });
}

function rdbSetPts(id, val) {
  const db = loadPlayerDB();
  const p  = db.find(x => String(x.id) === String(id));
  if (!p) return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) return;
  if (rosterDbTab === 'W') p.ratingW = n;
  else if (rosterDbTab === 'Mix') p.ratingMix = n;
  else p.ratingM = n;
  savePlayerDB(db);
}

function rdbSetTrn(id, val) {
  const db = loadPlayerDB();
  const p  = db.find(x => String(x.id) === String(id));
  if (!p) return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) return;
  if (rosterDbTab === 'W') p.tournamentsW = n;
  else if (rosterDbTab === 'Mix') p.tournamentsMix = n;
  else p.tournamentsM = n;
  savePlayerDB(db);
}

function rdbAdjPts(id, delta) {
  const db = loadPlayerDB();
  const p  = db.find(x => String(x.id) === String(id));
  if (!p) return;
  const field = rosterDbTab === 'W' ? 'ratingW' : rosterDbTab === 'Mix' ? 'ratingMix' : 'ratingM';
  p[field] = Math.max(0, (p[field] || 0) + delta);
  savePlayerDB(db);
  _refreshRdb();
}

function _rdbBodyHtml() {
  const gender = rosterDbTab; // 'M' | 'W'
  const db     = loadPlayerDB();
  const ratingField = gender === 'W' ? 'ratingW' : gender === 'Mix' ? 'ratingMix' : 'ratingM';
  const trnField    = gender === 'W' ? 'tournamentsW' : gender === 'Mix' ? 'tournamentsMix' : 'tournamentsM';
  const list   = db
    .filter(p => gender === 'Mix' ? (p.ratingMix || 0) > 0 : p.gender === gender)
    .sort((a, b) => (b[ratingField] || 0) - (a[ratingField] || 0));

  const rankCls = i => i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : '';
  const medal   = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;

  const rows = list.length ? list.map((p, i) => `
    <div class="rdb-row">
      <div class="rdb-rank ${rankCls(i)}">${medal(i)}</div>
      <div class="rdb-name" onclick="showPlayerCard('${escAttr(p.name)}','${escAttr(p.gender)}')">${esc(p.name)}</div>
      <div class="rdb-trn">${p[trnField] || 0}</div>
      <div class="rdb-pts-wrap">
        <button class="rdb-adj" onclick="rdbAdjPts('${escAttr(String(p.id))}', -1)">−</button>
        <input class="rdb-pts-inp" type="number" min="0"
          value="${p[ratingField] || 0}"
          onchange="rdbSetPts('${escAttr(String(p.id))}', this.value)">
        <button class="rdb-adj" onclick="rdbAdjPts('${escAttr(String(p.id))}', 1)">+</button>
      </div>
      <button class="rdb-del" onclick="rdbRemove('${escAttr(String(p.id))}')">✕</button>
    </div>`).join('')
    : `<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Нет игроков</div>`;

  return `
    <div class="rdb-wrap">
      <div class="rdb-hdr">
        <div class="rdb-title">👤 БАЗА ИГРОКОВ <span>(${list.length})</span></div>
        <div class="rdb-tabs">
          <button class="rdb-tab ${gender==='M'?'active':''}" onclick="setRosterDbTab('M')">М</button>
          <button class="rdb-tab ${gender==='W'?'active':''}" onclick="setRosterDbTab('W')">Ж</button>
        </div>
      </div>
      <div class="rdb-add-row">
        <input id="rdb-add-inp-${gender}" class="rdb-add-inp" type="text"
          placeholder="Фамилия Имя"
          onkeydown="if(event.key==='Enter') rdbAdd('${gender}')">
        <button class="rdb-add-btn" onclick="rdbAdd('${gender}')">+ Добавить</button>
      </div>
      <div class="rdb-list">${rows}</div>
    </div>`;
}
