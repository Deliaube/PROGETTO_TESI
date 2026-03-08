(function (window) {
  'use strict';

  const DEFAULT_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app';
  const DEFAULT_PATH = 'feeling';
  const LOCAL_STATE_KEY = 'cybermid_state_model_v1';
  const CACHE_TTL_MS = 15000;

  // Mapping richiesto: A->Inmate, I->Trasmigrator, S->Egregore, N->Neutrale.
  const COMBO_BY_STATE = {
    Inmate: 'A',
    Trasmigrator: 'I',
    Egregore: 'S'
  };

  const ACTIONS = new Set([
    'crea',
    'cancella',
    'cancella tutto',
    'modifica',
    'mi piace',
    'non mi piace',
    'scelta'
  ]);

  let baseUrlOverride = '';
  let cache = {
    path: '',
    data: null,
    fetchedAt: 0
  };

  function sanitizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function sanitizePath(path) {
    return String(path || DEFAULT_PATH).trim().replace(/^\/+|\/+$/g, '');
  }

  function clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return min;
    }
    return Math.max(min, Math.min(max, num));
  }

  function normalizeAction(action) {
    return String(action || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function normalizeLevel(value) {
    const rounded = Math.round(Number(value));
    if (!Number.isFinite(rounded)) {
      return 0;
    }
    return clamp(rounded, 1, 5);
  }

  function pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  function getBaseUrl() {
    if (baseUrlOverride) {
      return baseUrlOverride;
    }

    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.FIREBASE_BASE_URL === 'string'
    ) {
      return sanitizeBaseUrl(window.CybermidStateModel.FIREBASE_BASE_URL);
    }

    return DEFAULT_BASE_URL;
  }

  function setBaseUrl(url) {
    baseUrlOverride = sanitizeBaseUrl(url);
    return baseUrlOverride;
  }

  function clearFeelingCache() {
    cache = {
      path: '',
      data: null,
      fetchedAt: 0
    };
  }

  function readStateModelSafe() {
    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.getModel === 'function'
    ) {
      try {
        return window.CybermidStateModel.getModel();
      } catch (error) {
        // Fallback su localStorage.
      }
    }

    try {
      const raw = localStorage.getItem(LOCAL_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getCurrentState() {
    const model = readStateModelSafe();
    const stato = model && model.Key && model.Key.Stato ? model.Key.Stato : {};

    return {
      Inmate: clamp(stato.Inmate, 0, 100),
      Trasmigrator: clamp(stato.Trasmigrator, 0, 100),
      Egregore: clamp(stato.Egregore, 0, 100)
    };
  }

  function resolveDominantState(stato) {
    const pairs = [
      { name: 'Inmate', value: Number(stato.Inmate) || 0 },
      { name: 'Trasmigrator', value: Number(stato.Trasmigrator) || 0 },
      { name: 'Egregore', value: Number(stato.Egregore) || 0 }
    ];

    let maxValue = -Infinity;
    for (const pair of pairs) {
      if (pair.value > maxValue) {
        maxValue = pair.value;
      }
    }

    const winners = pairs.filter((pair) => pair.value === maxValue);

    // Neutrale in caso di pareggio o tutti a zero.
    if (winners.length !== 1 || maxValue <= 0) {
      return {
        state: 'Neutrale',
        comboCode: 'N',
        value: Math.max(0, maxValue)
      };
    }

    return {
      state: winners[0].name,
      comboCode: COMBO_BY_STATE[winners[0].name] || 'N',
      value: winners[0].value
    };
  }

  function resolveLevelFromValue(value) {
    // Bucket scelti su range [0..100] in 5 livelli.
    if (value <= 60) return 1;
    if (value <= 70) return 2;
    if (value <= 80) return 3;
    if (value <= 90) return 4;
    return 5;
  }

  function getCurrentFeelingContext() {
    const stato = getCurrentState();
    const dominant = resolveDominantState(stato);

    return {
      stato: stato,
      statoPredominante: dominant.state,
      combinazione: dominant.comboCode,
      valorePredominante: dominant.value,
      livello: resolveLevelFromValue(dominant.value)
    };
  }

  async function readFeelingData(path, options) {
    const safeOptions = options || {};
    const safePath = sanitizePath(path || DEFAULT_PATH);
    const ttlMs = Number.isFinite(Number(safeOptions.ttlMs))
      ? Math.max(0, Number(safeOptions.ttlMs))
      : CACHE_TTL_MS;

    if (
      !safeOptions.forceReload &&
      cache.data &&
      cache.path === safePath &&
      Date.now() - cache.fetchedAt <= ttlMs
    ) {
      return cache.data;
    }

    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Firebase base url non disponibile');
    }

    const response = await fetch(baseUrl + '/' + safePath + '.json');
    if (!response.ok) {
      throw new Error('GET feeling fallita: ' + response.status);
    }

    const data = (await response.json()) || {};
    cache = {
      path: safePath,
      data: data,
      fetchedAt: Date.now()
    };

    return data;
  }

  function parseFeelingEntries(mapData) {
    if (!mapData || typeof mapData !== 'object') {
      return [];
    }

    const entries = [];

    for (const [id, raw] of Object.entries(mapData)) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }

      // Chiavi attese: A1..A48, I1..I48, S1..S48, N1..N48.
      const match = /^([AISN])([1-9]|[1-3][0-9]|4[0-8])$/i.exec(String(id).trim());
      const comboCode = match ? match[1].toUpperCase() : 'N';
      const comboIndex = match ? Number(match[2]) : 0;

      const azione = normalizeAction(raw.Azione || raw.azione || '');
      const livello = normalizeLevel(raw.livello);
      const testo = String(raw.testo || '').trim();

      if (!azione || !testo || livello < 1 || livello > 5) {
        continue;
      }

      entries.push({
        id: id,
        comboCode: comboCode,
        comboIndex: comboIndex,
        azione: azione,
        livello: livello,
        testo: testo,
        raw: raw
      });
    }

    return entries;
  }

  function filterEntries(entries, criteria) {
    return entries.filter((entry) => {
      if (criteria.azione && entry.azione !== criteria.azione) {
        return false;
      }
      if (criteria.comboCode && entry.comboCode !== criteria.comboCode) {
        return false;
      }
      if (criteria.livello && entry.livello !== criteria.livello) {
        return false;
      }
      return true;
    });
  }

  function pickEntryByPriority(entries, context, action) {
    const azione = normalizeAction(action);
    const comboCode = context.combinazione || 'N';
    const livello = normalizeLevel(context.livello) || 1;

    const pools = [
      filterEntries(entries, { azione: azione, comboCode: comboCode, livello: livello }),
      filterEntries(entries, { azione: azione, comboCode: comboCode }),
      filterEntries(entries, { azione: azione, comboCode: 'N', livello: livello }),
      filterEntries(entries, { azione: azione, comboCode: 'N' }),
      filterEntries(entries, { azione: azione, livello: livello }),
      filterEntries(entries, { azione: azione }),
      filterEntries(entries, { comboCode: comboCode, livello: livello }),
      filterEntries(entries, { comboCode: comboCode }),
      entries
    ];

    for (const pool of pools) {
      if (pool.length > 0) {
        return pickRandom(pool);
      }
    }

    return null;
  }

  async function getFeelingEntryByAction(action, options) {
    const safeOptions = options || {};
    const context = safeOptions.context || getCurrentFeelingContext();
    const data = await readFeelingData(safeOptions.path || DEFAULT_PATH, safeOptions);
    const entries = parseFeelingEntries(data);

    if (!entries.length) {
      return null;
    }

    const normalizedAction = normalizeAction(action);
    if (!normalizedAction) {
      throw new Error('Azione non valida');
    }

    if (ACTIONS.size > 0 && !ACTIONS.has(normalizedAction) && !safeOptions.allowUnknownAction) {
      throw new Error('Azione non supportata: ' + normalizedAction);
    }

    const selected = pickEntryByPriority(entries, context, normalizedAction);
    if (!selected) {
      return null;
    }

    return {
      id: selected.id,
      combinazione: selected.comboCode,
      indice: selected.comboIndex,
      azione: selected.azione,
      livello: selected.livello,
      testo: selected.testo,
      context: context
    };
  }

  async function getFeelingTextByAction(action, options) {
    const entry = await getFeelingEntryByAction(action, options);
    return entry ? entry.testo : '';
  }

  async function renderFeelingText(action, target, options) {
    const text = await getFeelingTextByAction(action, options);
    const element = typeof target === 'string' ? document.querySelector(target) : target;

    if (element && 'textContent' in element) {
      element.textContent = text;
    }

    return text;
  }

  function isSupportedAction(action) {
    return ACTIONS.has(normalizeAction(action));
  }

  const api = {
    DEFAULT_PATH: DEFAULT_PATH,
    ACTIONS: Array.from(ACTIONS),
    setBaseUrl: setBaseUrl,
    clearCache: clearFeelingCache,
    readFeelingData: readFeelingData,
    getCurrentFeelingContext: getCurrentFeelingContext,
    getFeelingEntryByAction: getFeelingEntryByAction,
    getFeelingTextByAction: getFeelingTextByAction,
    renderFeelingText: renderFeelingText,
    isSupportedAction: isSupportedAction,

    // Alias in italiano.
    leggiFeeling: readFeelingData,
    contestoFeelingCorrente: getCurrentFeelingContext,
    getTestoFeeling: getFeelingTextByAction,
    renderizzaTestoFeeling: renderFeelingText
  };

  window.FeelingService = api;
})(window);
