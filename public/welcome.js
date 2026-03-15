// Function to manage user counter and display user status
function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$|\s+/g, '');
}

function sanitizeKeySegment(value) {
  return String(value || '').trim().replace(/[.#$\[\]\/]/g, '_');
}

function getBaseUrl() {
  const DEFAULT_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app/';
  if (window.CybermidStateModel && typeof window.CybermidStateModel.FIREBASE_BASE_URL === 'string') {
    return sanitizeBaseUrl(window.CybermidStateModel.FIREBASE_BASE_URL);
  }
  return DEFAULT_BASE_URL;
}

async function initializeUserCounter() {
  const baseUrl = getBaseUrl();
  let userId = '';
  if (window.CybermidCardsSync && typeof window.CybermidCardsSync.getCurrentUserId === 'function') {
    userId = String(window.CybermidCardsSync.getCurrentUserId() || '').trim();
  }

  // If no userId (anonymous), generate or reuse a persistent clientId stored in localStorage
  if (!userId) {
    try {
      let clientId = localStorage.getItem('clientId');
      if (!clientId) {
        clientId = 'client-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();
        localStorage.setItem('clientId', clientId);
      }
      userId = clientId;
    } catch (e) {
      // if localStorage not available, fallback to a volatile id (will not persist)
      userId = 'client-volatile-' + Math.random().toString(36).slice(2, 8);
    }
  }

  // Fallback helpers using localStorage (keeps backward compatibility)
  function readLocalNumber() {
    try {
      const v = localStorage.getItem('userNumber');
      return v ? parseInt(v) || 0 : 0;
    } catch (e) { return 0; }
  }

  function writeLocalNumber(n) {
    try { localStorage.setItem('userNumber', String(n)); } catch (e) {}
  }

  // Try to read from Realtime DB if we have a userId
  let number = 0;
  let completed = false;
  let step = 'intro';

  // Use a shared node for all clients: /welcome/global.json
  if (userId) {
    try {
      const url = getBaseUrl() + 'welcome/global.json';
      console.debug('[welcome] GET (shared)', url);
      const resp = await fetch(url);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.state && Number.isFinite(Number(data.state.counter))) {
          number = Number(data.state.counter) || 0;
        }
        if (data && typeof data.completed === 'boolean') {
          completed = !!data.completed;
        }
        if (data && data.state && typeof data.state.step === 'string') {
          step = data.state.step;
        }
      }
    } catch (error) {
      console.error('[welcome] GET failed:', error);
      number = 0; // will fallback below
    }
  }

  // If no value from DB, fallback to localStorage
  if (!number) {
    number = readLocalNumber();
  }

  // Increment
  number = (Number(number) || 0) + 1;

  // Persist: always attempt DB using userId (real uid or generated clientId); fallback to localStorage on error
  if (userId) {
    const safeUser = sanitizeKeySegment(userId);
    const payload = {
      lastSeen: Math.round(Date.now()),
      completed: !!completed,
      state: {
        step: step,
        counter: number
      }
    };
    try {
      const url = getBaseUrl() + 'welcome/global.json';
      console.debug('[welcome] PUT (shared)', url, payload);
      const resp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        let body = null;
        try { body = await resp.text(); } catch (e) {}
        console.error('[welcome] PUT failed:', resp.status, body);
        writeLocalNumber(number);
      }
    } catch (error) {
      console.error('[welcome] PUT error:', error);
      writeLocalNumber(number);
    }
  } else {
    writeLocalNumber(number);
  }

  // Update UI
  const elNumber = document.getElementById('userNumber');
  if (elNumber) elNumber.textContent = String(number);

  const elStatus = document.getElementById('userStatus');
  const statusText = completed ? 'Completed' : 'User';
  if (elStatus) elStatus.textContent = statusText;
}

// Run when page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeUserCounter();
  // Initialize AOS animation after content is loaded
  AOS.init();
});
