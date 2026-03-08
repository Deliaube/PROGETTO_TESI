const FIREBASE_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app/';

// Recupera la chiave della sessione più recente dal db Firebase
async function getLastSessionKey(path) {
    const sanitizedBase = String(FIREBASE_BASE_URL || '').replace(/\/$/, '');
    const sanitizedPath = String(path || 'sessioni').replace(/^\/+|\/+$/g, '');
    const res = await fetch(`${sanitizedBase}/${sanitizedPath}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    let lastKey = null;
    let lastTimestamp = null;
    for (const [key, value] of Object.entries(data)) {
      if (value && value.Timestamp) {
        if (!lastTimestamp || value.Timestamp > lastTimestamp) {
          lastTimestamp = value.Timestamp;
          lastKey = key;
        }
      }
    }
    return lastKey;
  }

// Carica l'ultimo stato dal db e lo reinvia.
async function loadAndResendLastState(path) {
    const lastKey = await getLastSessionKey(path);
    if (!lastKey) {
      await window.CybermidStateModel.putToFirebase(path);
      return;
    }

    await window.CybermidStateModel.loadFromFirebase(path, lastKey);
    await window.CybermidStateModel.putToFirebase(path);
  }
(function (window) {
  const LOCAL_STORAGE_KEY = 'cybermid_state_model_v1';
  const FIREBASE_KEY_STORAGE = 'cybermid_firebase_key_v1';
  const SESSION_STORAGE_KEY = 'cybermid_session_user_v1';
  const INITIAL_SNAPSHOT_STORAGE_KEY = 'cybermid_initial_snapshot_v1';
  const STATE_CACHE_NAME = 'cybermid_state_cache_v1';
  const STATE_CACHE_ENTRY_URL = '/__cybermid_state_cache__.json';
  const INITIAL_SNAPSHOT_CACHE_ENTRY_URL = '/__cybermid_initial_snapshot_cache__.json';
  const MIN_VALUE = 0;
  const MAX_VALUE = 100;

  const VARIATIONS = {
    C: { Egregore: 10, Trasmigrator: -5, Inmate: -5 },
    U: { Egregore: -5, Trasmigrator: 10, Inmate: -5 },
    D: { Egregore: -10, Trasmigrator: -5, Inmate: 10 },
    A: { Egregore: -15, Trasmigrator: -15, Inmate: 30 },
    B: { Egregore: -15, Trasmigrator: -15, Inmate: -15 }
  };

  function clamp(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return MIN_VALUE;
    }
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, numeric));
  }

  function generateSessionUserId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'sess_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getOrCreateSessionUserId() {
    let userId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!userId) {
      userId = generateSessionUserId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, userId);
    }
    return userId;
  }

  function defaultModel() {
    return {
      Key: {
        Utente: getOrCreateSessionUserId(),
        Stato: {
          Trasmigrator: 0,
          Egregore: 0,
          Inmate: 0
        },
        Timestamp: new Date().toISOString()
      }
    };
  }

  function normalizeModel(model) {
    const base = defaultModel();
    const source = model && model.Key ? model : base;

    return {
      Key: {
        Utente: source.Key.Utente || base.Key.Utente,
        Stato: {
          Trasmigrator: clamp(source.Key.Stato && source.Key.Stato.Trasmigrator),
          Egregore: clamp(source.Key.Stato && source.Key.Stato.Egregore),
          Inmate: clamp(source.Key.Stato && source.Key.Stato.Inmate)
        },
        Timestamp: source.Key.Timestamp || base.Key.Timestamp
      }
    };
  }

  function isCacheStorageAvailable() {
    return typeof window !== 'undefined' &&
      typeof window.caches !== 'undefined' &&
      typeof window.caches.open === 'function';
  }

  async function saveModelToCache(model) {
    if (!isCacheStorageAvailable()) {
      return false;
    }

    try {
      const cache = await window.caches.open(STATE_CACHE_NAME);
      const response = new Response(JSON.stringify(model), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(STATE_CACHE_ENTRY_URL, response);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function loadModelFromCacheStorage() {
    if (!isCacheStorageAvailable()) {
      return null;
    }

    try {
      const cache = await window.caches.open(STATE_CACHE_NAME);
      const response = await cache.match(STATE_CACHE_ENTRY_URL);
      if (!response) {
        return null;
      }

      const cachedModel = await response.json();
      return normalizeModel(cachedModel);
    } catch (error) {
      return null;
    }
  }

  async function saveInitialSnapshotToCache(snapshot) {
    if (!isCacheStorageAvailable()) {
      return false;
    }

    try {
      const cache = await window.caches.open(STATE_CACHE_NAME);
      const response = new Response(JSON.stringify(snapshot), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(INITIAL_SNAPSHOT_CACHE_ENTRY_URL, response);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function loadInitialSnapshotFromCacheStorage() {
    if (!isCacheStorageAvailable()) {
      return null;
    }

    try {
      const cache = await window.caches.open(STATE_CACHE_NAME);
      const response = await cache.match(INITIAL_SNAPSHOT_CACHE_ENTRY_URL);
      if (!response) {
        return null;
      }

      const cachedSnapshot = await response.json();
      return normalizeModel(cachedSnapshot);
    } catch (error) {
      return null;
    }
  }

  function saveInitialSnapshot(snapshot) {
    const normalizedSnapshot = normalizeModel(snapshot);
    localStorage.setItem(INITIAL_SNAPSHOT_STORAGE_KEY, JSON.stringify(normalizedSnapshot));
    saveInitialSnapshotToCache(normalizedSnapshot);
    return normalizedSnapshot;
  }

  function getInitialSnapshot() {
    try {
      const raw = localStorage.getItem(INITIAL_SNAPSHOT_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizeModel(parsed);
      localStorage.setItem(INITIAL_SNAPSHOT_STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      localStorage.removeItem(INITIAL_SNAPSHOT_STORAGE_KEY);
      return null;
    }
  }

  function captureInitialSnapshot(options) {
    const shouldOverwrite = !!(options && options.overwrite === true);
    const existingSnapshot = getInitialSnapshot();

    if (existingSnapshot && !shouldOverwrite) {
      return {
        created: false,
        snapshot: existingSnapshot
      };
    }

    const currentModel = getModel();
    const snapshot = saveInitialSnapshot(currentModel);

    return {
      created: true,
      snapshot: snapshot
    };
  }

  function clearInitialSnapshot() {
    localStorage.removeItem(INITIAL_SNAPSHOT_STORAGE_KEY);

    if (isCacheStorageAvailable()) {
      window.caches
        .open(STATE_CACHE_NAME)
        .then((cache) => cache.delete(INITIAL_SNAPSHOT_CACHE_ENTRY_URL))
        .catch(() => {});
    }

    return true;
  }

  function buildStateDelta(initialState, currentState) {
    return {
      Egregore: (Number(currentState.Egregore) || 0) - (Number(initialState.Egregore) || 0),
      Trasmigrator: (Number(currentState.Trasmigrator) || 0) - (Number(initialState.Trasmigrator) || 0),
      Inmate: (Number(currentState.Inmate) || 0) - (Number(initialState.Inmate) || 0)
    };
  }

  function computeDeltaFromInitialSnapshot(currentModel) {
    const initialSnapshot = getInitialSnapshot();
    const currentSnapshot = normalizeModel(currentModel || getModel());

    if (!initialSnapshot) {
      return {
        ok: false,
        reason: 'INITIAL_SNAPSHOT_MISSING',
        message: 'Initial snapshot is not available.',
        initial: null,
        current: currentSnapshot,
        delta: null,
        computedAt: new Date().toISOString()
      };
    }

    const initialState = initialSnapshot.Key && initialSnapshot.Key.Stato ? initialSnapshot.Key.Stato : {};
    const currentState = currentSnapshot.Key && currentSnapshot.Key.Stato ? currentSnapshot.Key.Stato : {};

    return {
      ok: true,
      initial: initialSnapshot,
      current: currentSnapshot,
      delta: buildStateDelta(initialState, currentState),
      computedAt: new Date().toISOString()
    };
  }

  function saveModel(model) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
    saveModelToCache(model);
  }

  function loadModel() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        const fresh = defaultModel();
        saveModel(fresh);
        return fresh;
      }

      const parsed = JSON.parse(raw);
      const normalized = normalizeModel(parsed);
      saveModel(normalized);
      return normalized;
    } catch (error) {
      const fresh = defaultModel();
      saveModel(fresh);
      return fresh;
    }
  }

  function updateTimestamp(model) {
    model.Key.Timestamp = new Date().toISOString();
  }

  function applyVariation(code) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const delta = VARIATIONS[normalizedCode];
    if (!delta) {
      return getModel();
    }

    const model = loadModel();
    model.Key.Stato.Egregore = clamp(model.Key.Stato.Egregore + delta.Egregore);
    model.Key.Stato.Trasmigrator = clamp(model.Key.Stato.Trasmigrator + delta.Trasmigrator);
    model.Key.Stato.Inmate = clamp(model.Key.Stato.Inmate + delta.Inmate);
    updateTimestamp(model);
    saveModel(model);

    window.dispatchEvent(new CustomEvent('cybermid:state:changed', {
      detail: {
        action: normalizedCode,
        model: model
      }
    }));

    return model;
  }

  function getModel() {
    return loadModel();
  }

  function resetModel() {
    const fresh = defaultModel();
    saveModel(fresh);
    localStorage.removeItem(FIREBASE_KEY_STORAGE);
    return fresh;
  }

  function getFirebaseKey() {
    return localStorage.getItem(FIREBASE_KEY_STORAGE) || '';
  }

  function setFirebaseKey(key) {
    if (!key) {
      return '';
    }
    localStorage.setItem(FIREBASE_KEY_STORAGE, key);
    return key;
  }

  function buildPayload() {
    return getModel().Key;
  }

  function buildEnvelope(customKey) {
    const resolvedKey = customKey || getFirebaseKey() || 'Key';
    const payload = buildPayload();
    return {
      [resolvedKey]: payload
    };
  }


  async function putToFirebase(path, key) {
    const sanitizedBase = String(FIREBASE_BASE_URL || '').replace(/\/$/, '');
    const sanitizedPath = String(path || 'sessioni').replace(/^\/+|\/+$/g, '');
    const resolvedKey = key || getFirebaseKey() || getOrCreateSessionUserId();
    const response = await fetch(`${sanitizedBase}/${sanitizedPath}/${resolvedKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    if (!response.ok) {
      throw new Error(`PUT Firebase fallita: ${response.status}`);
    }

    const result = await response.json();
    setFirebaseKey(resolvedKey);
    return result;
  }

  async function loadFromFirebase(path, key) {
    const resolvedKey = key || getFirebaseKey();
    if (!resolvedKey) {
      throw new Error('Chiave Firebase non disponibile');
    }

    const sanitizedBase = String(FIREBASE_BASE_URL || '').replace(/\/$/, '');
    const sanitizedPath = String(path || 'sessioni').replace(/^\/+|\/+$/g, '');
    const response = await fetch(`${sanitizedBase}/${sanitizedPath}/${resolvedKey}.json`);

    if (!response.ok) {
      throw new Error(`GET Firebase fallita: ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      return null;
    }

    const model = normalizeModel({ Key: data });
    saveModel(model);
    return model;
  }

  async function clearSessioni(path) {
    const sanitizedBase = String(FIREBASE_BASE_URL || '').replace(/\/$/, '');
    const sanitizedPath = String(path || 'sessioni').replace(/^\/+|\/+$/g, '');
    if (!sanitizedBase) {
      throw new Error('URL Firebase non valido');
    }

    const response = await fetch(`${sanitizedBase}/${sanitizedPath}.json`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`DELETE Firebase fallita: ${response.status}`);
    }

    localStorage.removeItem(FIREBASE_KEY_STORAGE);
    return true;
  }

  const api = {
    FIREBASE_BASE_URL,
    MIN_VALUE,
    MAX_VALUE,
    getModel,
    resetModel,
    Variazione: applyVariation,
    buildPayload,
    buildEnvelope,
    loadModelFromCacheStorage,
    loadInitialSnapshotFromCacheStorage,
    captureInitialSnapshot,
    getInitialSnapshot,
    clearInitialSnapshot,
    computeDeltaFromInitialSnapshot,
    getFirebaseKey,
    setFirebaseKey,
    putToFirebase,
    loadFromFirebase,
    clearSessioni,
    getLastSessionKey,
    loadAndResendLastState
  };

  window.CybermidStateModel = api;
  window.Variazione = applyVariation;

  loadModel();
})(window);