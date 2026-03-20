'use strict';

// ════════════════════════════════════════════════════════════
// STATS RECALC — Recalculates per-player rating from tournament results.
// Extracted from core.js (lines 692–759).
// ════════════════════════════════════════════════════════════

/**
 * Build a Map<playerId, playerObject> for fast lookups.
 * @param {Array} db
 * @returns {Map}
 */
function _buildPlayerMap(db) {
  const m = new Map();
  db.forEach(p => m.set(String(p.id), p));
  return m;
}

/**
 * Recalculate all player rating stats from scratch using kotc3_tournaments.
 * Resets ratingM/W/Mix, tournamentsM/W/Mix, wins, totalPts, tournaments, then
 * re-applies every finished tournament's winners array.
 *
 * @param {boolean} silent  If true, no toast is shown on completion.
 */
function recalcAllPlayerStats(silent) {
  const db = loadPlayerDB();
  if (!db.length) return;

  // Reset per-gender rating fields
  db.forEach(p => {
    p.ratingM       = 0;
    p.ratingW       = 0;
    p.ratingMix     = 0;
    p.tournamentsM  = 0;
    p.tournamentsW  = 0;
    p.tournamentsMix = 0;
    p.wins          = 0;
    p.totalPts      = 0;
    p.tournaments   = 0;
  });

  const pMap = _buildPlayerMap(db);

  const finished = getTournaments().filter(t => t.status === 'finished');

  finished.forEach(trn => {
    if (!Array.isArray(trn.winners)) return;
    const type = divisionToType(trn.division); // 'M' | 'W' | 'Mix'
    const ratingField = type === 'M' ? 'ratingM' : type === 'W' ? 'ratingW' : 'ratingMix';
    const trnField    = type === 'M' ? 'tournamentsM' : type === 'W' ? 'tournamentsW' : 'tournamentsMix';

    // Track which players participated in this tournament (avoid duplicates)
    const seenInTrn = new Set();

    trn.winners
      .filter(w => w && typeof w === 'object' && Array.isArray(w.playerIds))
      .forEach(slot => {
        const pts = typeof slot.points === 'number' ? slot.points : 0;
        const ratingPts = calculateRanking(slot.place || 99);
        slot.playerIds.forEach(pid => {
          const p = pMap.get(String(pid));
          if (!p) return;
          p[ratingField] = (p[ratingField] || 0) + ratingPts;
          p.totalPts     = (p.totalPts     || 0) + pts;
          if (!seenInTrn.has(pid)) {
            seenInTrn.add(pid);
            p[trnField]    = (p[trnField]    || 0) + 1;
            p.tournaments  = (p.tournaments  || 0) + 1;
          }
          if (slot.place === 1) p.wins = (p.wins || 0) + 1;
        });
      });
  });

  savePlayerDB(db);

  if (!silent) {
    showToast(`✅ Статистика пересчитана (${finished.length} турниров)`);
  }
}
