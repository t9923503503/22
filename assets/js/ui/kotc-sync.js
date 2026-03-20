'use strict';

// ════════════════════════════════════════════════════════════
// KOTC SYNC UI — Thin wrapper that ensures the Supabase sync card
// is refreshed after integrations.js loads.
// Placed last in APP_SCRIPT_ORDER so all integration functions exist.
// ════════════════════════════════════════════════════════════

// Refresh sync card if it is already visible in the DOM.
(function _initKotcSync() {
  const el = document.getElementById('sb-sync-card');
  if (el && typeof sbRenderCard === 'function') {
    el.outerHTML = sbRenderCard();
  }
  const gsh = document.getElementById('gsh-card');
  if (gsh && typeof gshRefreshCard === 'function') {
    gshRefreshCard();
  }
})();
