'use strict';

// ════════════════════════════════════════════════════════════
// PARTICIPANTS MODAL — Manage tournament participants & waitlist.
// Extracted from core.js (lines 761–1086).
// ════════════════════════════════════════════════════════════

let _ptTrnId = null;
let _ptSearch = '';

function openParticipantsModal(trnId) {
  _ptTrnId  = trnId;
  _ptSearch = '';
  document.getElementById('pt-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'pt-modal-overlay';
  overlay.className = 'pt-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeParticipantsModal(); });
  overlay.innerHTML = _renderPtModal();
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('pt-search-inp')?.focus(), 120);
}

function closeParticipantsModal() {
  document.getElementById('pt-modal-overlay')?.remove();
  _ptTrnId  = null;
  _ptSearch = '';
}

function _renderPtModal() {
  if (!_ptTrnId) return '';
  const trn = getTournaments().find(t => t.id === _ptTrnId);
  if (!trn) return '';

  const db   = loadPlayerDB();
  const pMap = new Map();
  db.forEach(p => pMap.set(String(p.id), p));

  const participants = (trn.participants || []).map(id => pMap.get(String(id))).filter(Boolean);
  const waitlist     = (trn.waitlist     || []).map(id => pMap.get(String(id))).filter(Boolean);
  const capacity     = trn.capacity || 0;
  const isFull       = participants.length >= capacity;
  const fillPct      = capacity > 0 ? Math.min(100, (participants.length / capacity) * 100) : 0;

  const ptIds = new Set([...trn.participants || [], ...trn.waitlist || []].map(String));

  // Search results
  const q = _ptSearch.toLowerCase();
  const searchResults = q.length >= 1
    ? db.filter(p => p.name.toLowerCase().includes(q))
       .slice(0, 12)
    : [];

  const srHtml = searchResults.length ? `
    <div class="pt-search-results">
      ${searchResults.map(p => {
        const inPt = ptIds.has(String(p.id));
        return `
          <div class="pt-sr-item" onclick="${inPt ? '' : `ptAddPlayer('${escAttr(String(p.id))}')`}"
              style="${inPt ? 'opacity:.5;cursor:default' : ''}">
            <span class="pt-sr-name">${esc(p.name)}</span>
            <span class="pt-sr-meta">${p.gender === 'M' ? '🏋️' : '👩'} · ${p.ratingM || p.ratingW || 0} рт.</span>
            <span class="pt-sr-badge ${p.gender}">${p.gender}</span>
            ${inPt ? '<span class="pt-sr-badge in">В СПИСКЕ</span>' : ''}
          </div>`;
      }).join('')}
    </div>` : '';

  const ptListHtml = participants.length
    ? participants.map((p, i) => `
        <div class="pt-item">
          <div class="pt-item-num">${i + 1}</div>
          <div class="pt-item-name" onclick="showPlayerCard('${escAttr(p.name)}','${escAttr(p.gender)}')"
              style="cursor:pointer">${esc(p.name)}</div>
          <span class="pt-item-g ${p.gender}">${p.gender}</span>
          <button class="pt-item-del"
            onclick="ptRemoveParticipant('${escAttr(String(p.id))}')">✕</button>
        </div>`).join('')
    : `<div class="pt-empty">Нет участников</div>`;

  const wlListHtml = waitlist.length
    ? waitlist.map((p, i) => `
        <div class="pt-item">
          <div class="pt-item-num">${i + 1}</div>
          <div class="pt-item-name">${esc(p.name)}</div>
          <span class="pt-item-g ${p.gender}">${p.gender}</span>
          <button class="pt-item-promote"
            onclick="ptPromoteWaitlist('${escAttr(String(p.id))}')">→ Участник</button>
          <button class="pt-item-del"
            onclick="ptRemoveWaitlist('${escAttr(String(p.id))}')">✕</button>
        </div>`).join('')
    : '';

  return `
    <div class="pt-modal">
      <div class="pt-hdr">
        <div class="pt-hdr-info">
          <div class="pt-hdr-title">👥 Участники</div>
          <div class="pt-hdr-sub">${esc(trn.name)}</div>
        </div>
        <button class="pt-close" onclick="closeParticipantsModal()">✕</button>
      </div>
      <div class="pt-body">
        <div class="pt-cap-bar">
          <div class="pt-cap-fill${isFull ? ' full' : ''}" style="width:${fillPct}%"></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">
          Занято: <b style="color:${isFull ? 'var(--red)' : '#fff'}">${participants.length}</b> / ${capacity}
          ${waitlist.length ? ` · Очередь: <b style="color:#ffd700">${waitlist.length}</b>` : ''}
        </div>

        <!-- Search -->
        <div class="pt-search-wrap">
          <span class="pt-search-ico">🔍</span>
          <input id="pt-search-inp" class="pt-search-inp" type="search"
            placeholder="Добавить игрока по имени…"
            value="${esc(_ptSearch)}"
            oninput="ptSetSearch(this.value)">
        </div>
        ${srHtml}

        <!-- Participants -->
        <div>
          <div class="pt-section-hdr">
            <span class="pt-section-ttl">Участники</span>
            <span class="pt-section-cnt">${participants.length}/${capacity}</span>
          </div>
          <div class="pt-list">${ptListHtml}</div>
        </div>

        ${waitlist.length ? `
        <div>
          <div class="pt-section-hdr">
            <span class="pt-section-ttl">Лист ожидания</span>
            <span class="pt-section-cnt">${waitlist.length}</span>
          </div>
          <div class="pt-list">${wlListHtml}</div>
        </div>` : ''}
      </div>
      <div class="pt-footer">
        <button class="pt-btn-export" onclick="ptExportCSV()">⬇️ CSV</button>
        <label class="pt-btn-import" style="cursor:pointer">
          📥 Импорт
          <input type="file" accept=".csv,.txt" style="display:none"
            onchange="ptImportCSV(this.files[0]);this.value=''">
        </label>
        <button class="pt-btn-close" onclick="closeParticipantsModal()">Закрыть</button>
      </div>
    </div>`;
}

function _refreshPtModal() {
  const overlay = document.getElementById('pt-modal-overlay');
  if (overlay) overlay.innerHTML = _renderPtModal();
}

function ptSetSearch(q) {
  _ptSearch = q;
  _refreshPtModal();
}

function ptAddPlayer(pid) {
  if (!_ptTrnId) return;
  const arr = getTournaments();
  const trn = arr.find(t => t.id === _ptTrnId);
  if (!trn) return;
  const sidStr = String(pid);
  if ((trn.participants || []).map(String).includes(sidStr) ||
      (trn.waitlist     || []).map(String).includes(sidStr)) {
    showToast('Игрок уже в списке');
    return;
  }
  if (!Array.isArray(trn.participants)) trn.participants = [];
  if (!Array.isArray(trn.waitlist))     trn.waitlist     = [];
  const isFull = trn.participants.length >= (trn.capacity || 999);
  if (isFull) {
    trn.waitlist.push(sidStr);
    showToast('Добавлен в лист ожидания');
  } else {
    trn.participants.push(sidStr);
    if (trn.participants.length >= (trn.capacity || 999)) trn.status = 'full';
    showToast('✅ Добавлен как участник');
  }
  saveTournaments(arr);
  saveState();
  _ptSearch = '';
  _refreshPtModal();
  _refreshRosterTrn();
}

function ptRemoveParticipant(pid) {
  if (!_ptTrnId) return;
  const arr = getTournaments();
  const trn = arr.find(t => t.id === _ptTrnId);
  if (!trn) return;
  const sidStr = String(pid);
  trn.participants = (trn.participants || []).filter(id => String(id) !== sidStr);
  if (trn.status === 'full' && trn.participants.length < (trn.capacity || 999)) {
    trn.status = 'open';
  }
  saveTournaments(arr);
  saveState();
  _refreshPtModal();
  _refreshRosterTrn();
}

function ptRemoveWaitlist(pid) {
  if (!_ptTrnId) return;
  const arr = getTournaments();
  const trn = arr.find(t => t.id === _ptTrnId);
  if (!trn) return;
  trn.waitlist = (trn.waitlist || []).filter(id => String(id) !== String(pid));
  saveTournaments(arr);
  saveState();
  _refreshPtModal();
  _refreshRosterTrn();
}

function ptPromoteWaitlist(pid) {
  if (!_ptTrnId) return;
  const arr = getTournaments();
  const trn = arr.find(t => t.id === _ptTrnId);
  if (!trn) return;
  const sidStr = String(pid);
  trn.waitlist = (trn.waitlist || []).filter(id => String(id) !== sidStr);
  if (!Array.isArray(trn.participants)) trn.participants = [];
  if (!trn.participants.map(String).includes(sidStr)) {
    trn.participants.push(sidStr);
    if (trn.participants.length >= (trn.capacity || 999)) trn.status = 'full';
  }
  saveTournaments(arr);
  saveState();
  showToast('✅ Перемещён в участники');
  _refreshPtModal();
  _refreshRosterTrn();
}

function ptExportCSV() {
  if (!_ptTrnId) return;
  const trn = getTournaments().find(t => t.id === _ptTrnId);
  if (!trn) return;
  const db = loadPlayerDB();
  const pMap = new Map();
  db.forEach(p => pMap.set(String(p.id), p));
  const csvSafe = v => {
    const s = String(v ?? '');
    if (/[,"\n=+\-@]/.test(s[0] || '')) return '"' + s.replace(/"/g, '""') + '"';
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [['Фамилия Имя', 'Пол', 'Рейтинг', 'Список']];
  (trn.participants || []).forEach(id => {
    const p = pMap.get(String(id));
    if (p) rows.push([csvSafe(p.name), p.gender, p.ratingM || p.ratingW || 0, 'участник']);
  });
  (trn.waitlist || []).forEach(id => {
    const p = pMap.get(String(id));
    if (p) rows.push([csvSafe(p.name), p.gender, p.ratingM || p.ratingW || 0, 'ожидание']);
  });
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `participants_${trn.id}.csv`
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ptImportCSV(file) {
  if (!file || !_ptTrnId) return;
  const arr = getTournaments();
  const trn = arr.find(t => t.id === _ptTrnId);
  if (!trn) return;
  const db  = loadPlayerDB();

  const reader = new FileReader();
  reader.onload = e => {
    const lines = (e.target.result || '').split('\n').filter(Boolean);
    let added = 0, skipped = 0;
    lines.forEach(line => {
      const cols = line.split(',');
      const rawName = (cols[0] || '').replace(/^["']|["']$/g, '').trim();
      if (!rawName || rawName.toLowerCase().includes('фамилия')) return; // skip header
      const p = db.find(x => x.name.toLowerCase() === rawName.toLowerCase());
      if (!p) { skipped++; return; }
      const pid = String(p.id);
      const allIds = [...(trn.participants || []).map(String), ...(trn.waitlist || []).map(String)];
      if (allIds.includes(pid)) { skipped++; return; }
      if (!Array.isArray(trn.participants)) trn.participants = [];
      if (trn.participants.length < (trn.capacity || 999)) {
        trn.participants.push(pid);
        added++;
      } else {
        if (!Array.isArray(trn.waitlist)) trn.waitlist = [];
        trn.waitlist.push(pid);
        added++;
      }
    });
    if (trn.participants.length >= (trn.capacity || 999)) trn.status = 'full';
    saveTournaments(arr);
    saveState();
    showToast(`✅ Импортировано: ${added}, пропущено: ${skipped}`);
    _refreshPtModal();
    _refreshRosterTrn();
  };
  reader.readAsText(file, 'utf-8');
}
