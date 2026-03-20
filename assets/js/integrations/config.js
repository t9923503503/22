'use strict';

// ════════════════════════════════════════════════════════════
// INTEGRATIONS CONFIG — Default values for Supabase and Google Sheets.
// Override via config.js (window.APP_CONFIG) at the root.
// ════════════════════════════════════════════════════════════

const DEFAULT_SB_CONFIG = {
  url:        (window.APP_CONFIG?.supabaseUrl     || '').trim(),
  anonKey:    (window.APP_CONFIG?.supabaseAnonKey || '').trim(),
  roomCode:   '',
  roomSecret: '',
};

const DEFAULT_GSH_CONFIG = {
  clientId:      (window.APP_CONFIG?.googleClientId || '').trim(),
  spreadsheetId: '',
};
