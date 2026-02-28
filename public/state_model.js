(function (global) {
  const LOCAL_STORAGE_KEY = 'cybermid_state_model_v1';
  const FIREBASE_KEY_STORAGE = 'cybermid_firebase_key_v1';
  const SESSION_STORAGE_KEY = 'cybermid_session_user_v1';
  const MIN_VALUE = 0;
  const MAX_VALUE = 100;

  const VARIATIONS = {
    C: { Egregore: 10, Trasmigrator: -5, Inmate: -5 },
    U: { Egregore: -5, Trasmigrator: 10, Inmate: -5 },
    D: { Egregore: -10, Trasmigrator: -5, Inmate: 10 },
    A: { Egregore: -15, Trasmigrator: -15, Inmate: 30 }
  };

  function clamp(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return MIN_VALUE;
    }
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, numeric));
  }

  function generateSessionUserId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
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

  function saveModel(model) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(model));
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

    global.dispatchEvent(new CustomEvent('cybermid:state:changed', {
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

  async function postToFirebase(firebaseBaseUrl, path) {
    const sanitizedBase = String(firebaseBaseUrl || '').replace(/\/$/, '');
    const sanitizedPath = String(path || 'sessioni').replace(/^\/+|\/+$/g, '');
    const response = await fetch(`${sanitizedBase}/${sanitizedPath}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload())
    });

    if (!response.ok) {
      throw new Error(`POST Firebase fallita: ${response.status}`);
    }

    const result = await response.json();
    if (result && result.name) {
      setFirebaseKey(result.name);
    }

    return result;
  }

  async function loadFromFirebase(firebaseBaseUrl, path, key) {
    const resolvedKey = key || getFirebaseKey();
    if (!resolvedKey) {
      throw new Error('Chiave Firebase non disponibile');
    }

    const sanitizedBase = String(firebaseBaseUrl || '').replace(/\/$/, '');
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

  const api = {
    MIN_VALUE,
    MAX_VALUE,
    getModel,
    resetModel,
    Variazione: applyVariation,
    buildPayload,
    buildEnvelope,
    getFirebaseKey,
    setFirebaseKey,
    postToFirebase,
    loadFromFirebase
  };

  global.CybermidStateModel = api;
  global.Variazione = applyVariation;

  loadModel();
})(window);