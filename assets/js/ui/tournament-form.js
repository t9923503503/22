'use strict';

// ════════════════════════════════════════════════════════════
// TOURNAMENT FORM — Add / edit tournament in Roster tab.
// Extracted from core.js (lines 171–302).
// ════════════════════════════════════════════════════════════

let rosterTrnFormOpen = false;
let rosterTrnEditId   = null;

function openTrnAdd() {
  rosterTrnEditId   = null;
  rosterTrnFormOpen = true;
  _refreshRosterTrn();
}

function openTrnEdit(trnId) {
  rosterTrnEditId   = trnId;
  rosterTrnFormOpen = true;
  _refreshRosterTrn();
}

function closeTrnForm() {
  rosterTrnFormOpen = false;
  rosterTrnEditId   = null;
  _refreshRosterTrn();
}

function submitTournamentForm() {
  const v = id => document.getElementById(id)?.value ?? '';
  const name     = v('trnf-name').trim();
  const date     = v('trnf-date');
  const time     = v('trnf-time');
  const location = v('trnf-location').trim();
  const format   = v('trnf-format') || 'King of the Court';
  const division = v('trnf-division') || 'Мужской';
  const level    = v('trnf-level') || 'medium';
  const capacity = parseInt(v('trnf-capacity'), 10) || 24;
  const prize    = v('trnf-prize').trim();

  const addErr = id => document.getElementById(id)?.classList.add('error');

  if (!name) {
    addErr('trnf-name');
    showToast('⚠️ Введите название турнира');
    return;
  }
  if (capacity < 4) {
    showToast('⚠️ Минимальная вместимость — 4 участника');
    return;
  }
  if (capacity > 999) {
    showToast('⚠️ Максимальная вместимость — 999');
    return;
  }

  const arr = getTournaments();

  if (rosterTrnEditId !== null) {
    const idx = arr.findIndex(t => t.id === rosterTrnEditId);
    if (idx !== -1) {
      const existing = arr[idx];
      arr[idx] = {
        ...existing,
        name, date, time, location, format, division, level,
        capacity, prize,
      };
    }
  } else {
    const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    arr.push({
      id, name, date, time, location, format, division, level,
      capacity, prize,
      status: 'open',
      participants: [],
      waitlist: [],
      winners: [],
    });
  }

  saveTournaments(arr);
  saveState();
  closeTrnForm();
  showToast(rosterTrnEditId ? '✅ Турнир обновлён' : '✅ Турнир добавлен');
}

function cloneTrn(trnId) {
  const arr = getTournaments();
  const src = arr.find(t => t.id === trnId);
  if (!src) return;
  const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  arr.push({
    ...src,
    id,
    name: src.name + ' (копия)',
    status: 'open',
    participants: [],
    waitlist: [],
    winners: [],
  });
  saveTournaments(arr);
  saveState();
  _refreshRosterTrn();
  showToast('📋 Турнир скопирован');
}

function finishTrn(trnId) {
  showConfirm('Завершить турнир без записи результатов?').then(ok => {
    if (!ok) return;
    const arr = getTournaments();
    const t   = arr.find(x => x.id === trnId);
    if (!t) return;
    t.status = 'finished';
    saveTournaments(arr);
    saveState();
    recalcAllPlayerStats(/*silent*/ true);
    _refreshRosterTrn();
    showToast('✅ Турнир завершён');
  });
}

function deleteTrn(trnId) {
  showConfirm('Удалить турнир? Это действие нельзя отменить.').then(ok => {
    if (!ok) return;
    saveTournaments(getTournaments().filter(t => t.id !== trnId));
    saveState();
    _refreshRosterTrn();
    showToast('Турнир удалён');
  });
}
