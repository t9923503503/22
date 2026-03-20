'use strict';

// ════════════════════════════════════════════════════════════
// PLAYERS SCREEN CONTROLS — Tab / sort / search handlers.
// Extracted from core.js (lines 1–78).
// ════════════════════════════════════════════════════════════

function setPlayersGender(g) {
  playersGender = g;
  const s = document.getElementById('screen-players');
  if (s) s.innerHTML = renderPlayers();
}

function setPlayersSort(sort) {
  playersSort = sort;
  const s = document.getElementById('screen-players');
  if (s) s.innerHTML = renderPlayers();
}

function setPlayersSearch(q) {
  playersSearch = q;
  const s = document.getElementById('screen-players');
  if (s) s.innerHTML = renderPlayers();
}

function refreshPlayersScreen() {
  const s = document.getElementById('screen-players');
  if (s) s.innerHTML = renderPlayers();
}

// ── Roster name-input autocomplete ──────────────────────────
// Shows a small dropdown below a text input using the player DB.

let _acTarget = null; // {el, ci, gender, idx}

function rosterAcShow(inputEl, ci, gender, idx) {
  rosterAcHide();
  _acTarget = { el: inputEl, ci, gender, idx };

  const q = inputEl.value.trim().toLowerCase();
  if (!q) return;

  const db = loadPlayerDB();
  const matches = db
    .filter(p => p.gender === gender && p.name.toLowerCase().includes(q))
    .slice(0, 8);

  if (!matches.length) return;

  const rect = inputEl.getBoundingClientRect();
  const list = document.createElement('ul');
  list.id = 'roster-ac-list';
  list.style.cssText = [
    'position:fixed',
    `top:${rect.bottom + window.scrollY}px`,
    `left:${rect.left + window.scrollX}px`,
    `width:${rect.width}px`,
    'background:#13132a',
    'border:1px solid #2a2a44',
    'border-radius:8px',
    'margin:0',
    'padding:4px 0',
    'list-style:none',
    'z-index:9999',
    'box-shadow:0 8px 24px rgba(0,0,0,.5)',
    'max-height:220px',
    'overflow-y:auto',
  ].join(';');

  matches.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;color:#fff;transition:background .1s';
    li.addEventListener('mouseenter', () => { li.style.background = 'rgba(255,215,0,.1)'; });
    li.addEventListener('mouseleave', () => { li.style.background = ''; });
    li.addEventListener('mousedown', e => {
      e.preventDefault();
      rosterAcPick(p.name);
    });
    list.appendChild(li);
  });

  document.body.appendChild(list);
}

function rosterAcHide() {
  document.getElementById('roster-ac-list')?.remove();
  _acTarget = null;
}

function rosterAcPick(name) {
  if (!_acTarget) return;
  const { el } = _acTarget;
  el.value = name;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  rosterAcHide();
}

// Hide autocomplete when clicking outside — runs once at file load.
document.addEventListener('click', e => {
  if (!e.target.closest('#roster-ac-list')) rosterAcHide();
});
