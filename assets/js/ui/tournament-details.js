'use strict';

// ════════════════════════════════════════════════════════════
// TOURNAMENT DETAILS MODAL — Full details for a scheduled tournament.
// Defines openTrnDetails() used in home.js and components.js.
// Extracted from core.js (lines 1087–1184).
// ════════════════════════════════════════════════════════════

function openTrnDetails(trnId) {
  const trn = getTournaments().find(t => t.id === trnId);
  if (!trn) {
    showToast('❌ Турнир не найден');
    return;
  }

  const db   = loadPlayerDB();
  const pMap = new Map();
  db.forEach(p => pMap.set(String(p.id), p));

  const participants = (trn.participants || []).map(id => pMap.get(String(id))).filter(Boolean);
  const waitlist     = (trn.waitlist     || []).map(id => pMap.get(String(id))).filter(Boolean);
  const capacity     = trn.capacity || 0;
  const isFull       = participants.length >= capacity && capacity > 0;
  const remaining    = Math.max(0, capacity - participants.length);
  const fillPct      = capacity > 0 ? Math.min(100, (participants.length / capacity) * 100) : 0;

  const levelLabels  = { hard: 'Хард', medium: 'Средний', easy: 'Лайт' };
  const levelLbl     = levelLabels[trn.level] || (trn.level || '').toUpperCase() || '—';

  const statusColor = trn.status === 'open' ? '#4ade80' : trn.status === 'full' ? '#ff6b6b' : 'var(--muted)';
  const statusLabel = trn.status === 'open' ? '🟢 ОТКРЫТ' : trn.status === 'full' ? '🔴 ЗАПОЛНЕНО' : '⏹️ ' + (trn.status || '').toUpperCase();

  const dateStr = (() => {
    try { return typeof formatTrnDate === 'function' ? formatTrnDate(trn.date) : trn.date; }
    catch(e) { return trn.date || ''; }
  })();

  const participantsListHtml = participants.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">
        ${participants.map(p => `
          <span style="background:rgba(255,255,255,.07);border-radius:6px;padding:3px 8px;
            font-size:11px;color:#fff">${esc(p.name)}</span>`).join('')}
       </div>`
    : `<div style="font-size:11px;color:var(--muted);margin-top:6px">Нет участников</div>`;

  const waitlistHtml = waitlist.length
    ? `<div style="margin-top:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">
          Лист ожидания (${waitlist.length})
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${waitlist.map(p => `
            <span style="background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.15);
              border-radius:6px;padding:3px 8px;font-size:11px;color:#ffd700">${esc(p.name)}</span>`).join('')}
        </div>
       </div>`
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'trndet-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:flex-end;z-index:9999;padding:0';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.innerHTML = `
    <div style="background:#0d0d1a;border-radius:16px 16px 0 0;width:100%;
      max-height:88dvh;overflow-y:auto;padding:20px 16px 24px;
      box-shadow:0 -10px 40px rgba(0,0,0,.8);animation:slideUp .22s ease">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div style="min-width:0">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px">
            ${esc(levelLbl)} · ${esc(trn.division || '—')}
          </div>
          <h2 style="font-size:1.35rem;margin:0;color:#fff;font-weight:800;line-height:1.2">${esc(trn.name)}</h2>
          <div style="font-size:12px;color:var(--muted);margin-top:5px">
            📅 ${esc(dateStr)} · 🕐 ${esc(trn.time || '—')}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">
            📍 ${esc(trn.location || '—')}
          </div>
        </div>
        <button onclick="document.getElementById('trndet-overlay').remove()"
          style="background:rgba(255,255,255,.07);border:1px solid #2a2a44;color:#fff;
            border-radius:8px;width:32px;height:32px;font-size:16px;cursor:pointer;
            flex-shrink:0;margin-left:8px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Stats grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
        <div style="background:#1a1e24;padding:10px;border-radius:8px;border:1px solid #1e1e34">
          <div style="font-size:10px;color:var(--muted)">Формат</div>
          <div style="font-size:13px;color:#fff;font-weight:600;margin-top:3px">${esc(trn.format || '—')}</div>
        </div>
        <div style="background:#1a1e24;padding:10px;border-radius:8px;border:1px solid #1e1e34">
          <div style="font-size:10px;color:var(--muted)">Статус</div>
          <div style="font-size:13px;font-weight:600;margin-top:3px;color:${statusColor}">${statusLabel}</div>
        </div>
        <div style="background:#1a1e24;padding:10px;border-radius:8px;border:1px solid #1e1e34">
          <div style="font-size:10px;color:var(--muted)">Участники</div>
          <div style="font-size:13px;color:${isFull ? 'var(--red)' : '#4ade80'};font-weight:600;margin-top:3px">
            ${participants.length}/${capacity}
          </div>
        </div>
        ${trn.prize ? `
        <div style="background:#1a1e24;padding:10px;border-radius:8px;border:1px solid #1e1e34">
          <div style="font-size:10px;color:var(--muted)">Призовой фонд</div>
          <div style="font-size:13px;color:var(--gold);font-weight:600;margin-top:3px">${esc(trn.prize)}</div>
        </div>` : ''}
      </div>

      <!-- Capacity bar -->
      <div style="height:4px;background:#2a2a40;border-radius:3px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${fillPct}%;background:${isFull ? 'var(--red)' : 'linear-gradient(90deg,#4ade80,var(--gold))'};
          border-radius:3px;transition:width .3s"></div>
      </div>

      ${trn.description ? `
      <div style="background:#1a1e24;padding:10px 12px;border-radius:8px;border:1px solid #1e1e34;
        margin-bottom:12px;font-size:13px;color:var(--sub);line-height:1.5">
        ${esc(trn.description)}
      </div>` : ''}

      <!-- Participants list -->
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">
          Участники (${participants.length})
        </div>
        ${participantsListHtml}
      </div>

      ${waitlistHtml}

      <!-- Actions -->
      <div style="display:flex;gap:8px;margin-top:16px">
        ${trn.status !== 'finished' && trn.status !== 'cancelled' ? `
          <button onclick="openRegistrationModal('${escAttr(trn.id)}');document.getElementById('trndet-overlay').remove()"
            style="flex:1;padding:12px;background:var(--gold);color:#000;border:none;
              border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;
              font-family:var(--font-b,sans-serif)">
            ${isFull ? '📋 Лист ожидания' : '⚡ Записаться'}
          </button>` : ''}
        <button onclick="document.getElementById('trndet-overlay').remove()"
          style="flex:1;padding:12px;background:#2a2a44;color:#fff;border:none;
            border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;
            font-family:var(--font-b,sans-serif)">
          Закрыть
        </button>
      </div>
    </div>`;

  document.getElementById('trndet-overlay')?.remove();
  document.body.appendChild(overlay);
}
