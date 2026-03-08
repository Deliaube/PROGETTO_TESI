(function (window) {
  'use strict';

  const DEFAULT_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app';
  const DB_ROOT_PATH = 'cardsByUser';
  const LOCAL_CACHE_KEY = 'cybermid_cards_cache_v1';
  const CACHE_STORAGE_NAME = 'cybermid_cards_cache_v1';
  const CACHE_STORAGE_URL = '/__cybermid_cards_cache__.json';
  const DRAG_STATE_KEY = 'draggableCards_state_v1';
  const DRAG_COUNTER_KEY = 'draggableCards_counter_v1';
  const SESSION_USER_KEY = 'cybermid_session_user_v1';

  const syncState = {
    enabled: false,
    timerId: 0,
    pollId: 0,
    lastSerializedCards: '',
    lastCounter: '',
    previousIds: new Set()
  };

  function sanitizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function sanitizeKeySegment(value) {
    return String(value || '').trim().replace(/[.#$\[\]/]/g, '_');
  }

  function isCacheStorageAvailable() {
    return typeof window !== 'undefined' &&
      typeof window.caches !== 'undefined' &&
      typeof window.caches.open === 'function';
  }

  function getBaseUrl() {
    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.FIREBASE_BASE_URL === 'string'
    ) {
      return sanitizeBaseUrl(window.CybermidStateModel.FIREBASE_BASE_URL);
    }

    return sanitizeBaseUrl(DEFAULT_BASE_URL);
  }

  function readStateModelSafe() {
    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.getModel === 'function'
    ) {
      try {
        return window.CybermidStateModel.getModel();
      } catch (error) {
        // Fallback su storage diretto.
      }
    }

    try {
      const raw = localStorage.getItem('cybermid_state_model_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function getCurrentUserId() {
    const model = readStateModelSafe();
    const fromModel = model && model.Key && model.Key.Utente ? String(model.Key.Utente).trim() : '';
    if (fromModel) {
      return sanitizeKeySegment(fromModel);
    }

    const fromSession = sessionStorage.getItem(SESSION_USER_KEY);
    if (fromSession) {
      return sanitizeKeySegment(fromSession);
    }

    return '';
  }

  function toNumber(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return numeric;
  }

  function htmlToText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = String(html || '');
    return String(temp.textContent || temp.innerText || '').trim();
  }

  function deriveCounterFromCards(cards) {
    let maxCounter = 0;
    const list = Array.isArray(cards) ? cards : [];

    list.forEach(function (card, index) {
      const id = String((card && card.id) || '');
      const match = /-(\d+)$/.exec(id);
      const parsed = match ? Number(match[1]) : 0;
      maxCounter = Math.max(maxCounter, parsed || index + 1);
    });

    return Math.max(maxCounter, list.length);
  }

  function normalizeCardShape(rawCard, index) {
    const fallbackId = 'card-' + (index + 1);
    const safeId = sanitizeKeySegment(rawCard && rawCard.id ? rawCard.id : fallbackId) || fallbackId;
    const contentHTML = String((rawCard && rawCard.contentHTML) || '');

    return {
      id: safeId,
      left: toNumber(rawCard && rawCard.left, 12),
      top: toNumber(rawCard && rawCard.top, 12),
      zIndex: Math.round(toNumber(rawCard && rawCard.zIndex, 0)),
      width: toNumber(rawCard && rawCard.width, 0),
      height: toNumber(rawCard && rawCard.height, 0),
      headerText: String((rawCard && rawCard.headerText) || ''),
      contentHTML: contentHTML,
      colorClass: String((rawCard && rawCard.colorClass) || 'postit-yellow'),
      timestamp: Math.round(toNumber(rawCard && rawCard.timestamp, Date.now()))
    };
  }

  function sortByTimestampDesc(cards) {
    return cards.slice().sort(function (a, b) {
      return (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0);
    });
  }

  function loadCardsFromLocalCache() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(function (card, index) {
        return normalizeCardShape(card, index);
      });
    } catch (error) {
      return [];
    }
  }

  function saveCardsToLocalCache(cards) {
    const normalized = (Array.isArray(cards) ? cards : []).map(function (card, index) {
      return normalizeCardShape(card, index);
    });

    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async function saveCardsToCacheStorage(cards) {
    if (!isCacheStorageAvailable()) {
      return false;
    }

    try {
      const cache = await window.caches.open(CACHE_STORAGE_NAME);
      const response = new Response(JSON.stringify(cards || []), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(CACHE_STORAGE_URL, response);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function loadCardsFromCacheStorage() {
    if (!isCacheStorageAvailable()) {
      return [];
    }

    try {
      const cache = await window.caches.open(CACHE_STORAGE_NAME);
      const response = await cache.match(CACHE_STORAGE_URL);
      if (!response) {
        return [];
      }

      const parsed = await response.json();
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(function (card, index) {
        return normalizeCardShape(card, index);
      });
    } catch (error) {
      return [];
    }
  }

  function getDragStateCards() {
    try {
      const raw = localStorage.getItem(DRAG_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(function (card, index) {
        return normalizeCardShape(card, index);
      });
    } catch (error) {
      return [];
    }
  }

  function setDragStateCards(cards) {
    const normalized = (Array.isArray(cards) ? cards : []).map(function (card, index) {
      return normalizeCardShape(card, index);
    });

    localStorage.setItem(DRAG_STATE_KEY, JSON.stringify(normalized));

    const maxCounter = deriveCounterFromCards(normalized);
    localStorage.setItem(DRAG_COUNTER_KEY, String(maxCounter));

    return normalized;
  }

  function mapDbCards(dbMap) {
    if (!dbMap || typeof dbMap !== 'object') {
      return [];
    }

    const cards = [];
    Object.entries(dbMap).forEach(function (entry, index) {
      const cardId = entry[0];
      const raw = entry[1] || {};
      cards.push(normalizeCardShape(Object.assign({}, raw, { id: cardId }), index));
    });

    return cards;
  }

  function buildUserPath(userId) {
    const safeUserId = sanitizeKeySegment(userId);
    return DB_ROOT_PATH + '/' + safeUserId;
  }

  async function fetchCardsForUser(userId) {
    const baseUrl = getBaseUrl();
    const safeUserId = sanitizeKeySegment(userId);

    if (!baseUrl || !safeUserId) {
      return [];
    }

    const response = await fetch(baseUrl + '/' + buildUserPath(safeUserId) + '/cards.json');
    if (!response.ok) {
      throw new Error('GET cards fallita: ' + response.status);
    }

    const data = await response.json();
    return mapDbCards(data);
  }

  async function preloadLatestCardsToCache(limit) {
    const userId = getCurrentUserId();
    if (!userId) {
      saveCardsToLocalCache([]);
      await saveCardsToCacheStorage([]);
      return [];
    }

    const allCards = await fetchCardsForUser(userId);
    const maxItems = Math.max(1, Number(limit) || 10);
    const latest = sortByTimestampDesc(allCards).slice(0, maxItems);

    saveCardsToLocalCache(latest);
    await saveCardsToCacheStorage(latest);

    return latest;
  }

  function applyCachedCardsToLocalState(options) {
    const safeOptions = options || {};
    const overwrite = safeOptions.overwrite !== false;
    const limit = Math.max(1, Number(safeOptions.limit) || 10);

    const existing = getDragStateCards();
    if (existing.length && !overwrite) {
      return 0;
    }

    const cached = loadCardsFromLocalCache();
    if (!cached.length) {
      return 0;
    }

    const limited = sortByTimestampDesc(cached).slice(0, limit);
    setDragStateCards(limited);
    return limited.length;
  }

  function makeDbCardPayload(userId, card) {
    const normalized = normalizeCardShape(card, 0);
    return {
      utente: sanitizeKeySegment(userId),
      testo: htmlToText(normalized.contentHTML),
      headerText: normalized.headerText,
      contentHTML: normalized.contentHTML,
      colorClass: normalized.colorClass,
      left: normalized.left,
      top: normalized.top,
      zIndex: normalized.zIndex,
      width: normalized.width,
      height: normalized.height,
      timestamp: Math.round(Date.now())
    };
  }

  async function upsertCardForUser(userId, card) {
    const safeUserId = sanitizeKeySegment(userId);
    const safeCardId = sanitizeKeySegment(card && card.id);
    const baseUrl = getBaseUrl();

    if (!baseUrl || !safeUserId || !safeCardId) {
      return false;
    }

    const payload = makeDbCardPayload(safeUserId, card);

    const response = await fetch(baseUrl + '/' + buildUserPath(safeUserId) + '/cards/' + safeCardId + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('PUT card fallita: ' + response.status);
    }

    return true;
  }

  async function deleteCardForUser(userId, cardId) {
    const safeUserId = sanitizeKeySegment(userId);
    const safeCardId = sanitizeKeySegment(cardId);
    const baseUrl = getBaseUrl();

    if (!baseUrl || !safeUserId || !safeCardId) {
      return false;
    }

    const response = await fetch(baseUrl + '/' + buildUserPath(safeUserId) + '/cards/' + safeCardId + '.json', {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('DELETE card fallita: ' + response.status);
    }

    return true;
  }

  async function updateUserMeta(userId, totalCreated) {
    const safeUserId = sanitizeKeySegment(userId);
    const baseUrl = getBaseUrl();

    if (!baseUrl || !safeUserId) {
      return false;
    }

    const payload = {
      utente: safeUserId,
      numeroCardsCreato: Math.max(0, Number(totalCreated) || 0),
      timestamp: Math.round(Date.now())
    };

    const response = await fetch(baseUrl + '/' + buildUserPath(safeUserId) + '/meta.json', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('PATCH meta fallita: ' + response.status);
    }

    return true;
  }

  async function deleteAllCardsForCurrentUser() {
    const userId = getCurrentUserId();
    const safeUserId = sanitizeKeySegment(userId);
    const baseUrl = getBaseUrl();

    if (!baseUrl || !safeUserId) {
      return false;
    }

    const response = await fetch(baseUrl + '/' + buildUserPath(safeUserId) + '/cards.json', {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('DELETE all cards fallita: ' + response.status);
    }

    await updateUserMeta(safeUserId, 0);

    saveCardsToLocalCache([]);
    await saveCardsToCacheStorage([]);
    syncState.previousIds = new Set();

    return true;
  }

  async function syncFromLocalStateNow() {
    const userId = getCurrentUserId();
    if (!userId) {
      return false;
    }

    const cards = getDragStateCards();
    const currentIds = new Set();

    for (const card of cards) {
      const safeCardId = sanitizeKeySegment(card.id);
      if (!safeCardId) {
        continue;
      }
      currentIds.add(safeCardId);
      await upsertCardForUser(userId, card);
    }

    for (const oldId of Array.from(syncState.previousIds)) {
      if (!currentIds.has(oldId)) {
        await deleteCardForUser(userId, oldId);
      }
    }

    const counterRaw = localStorage.getItem(DRAG_COUNTER_KEY);
    const totalCreated = Math.max(cards.length, Number(counterRaw) || 0);
    await updateUserMeta(userId, totalCreated);

    syncState.previousIds = currentIds;

    const latest = sortByTimestampDesc(cards).slice(0, 10);
    saveCardsToLocalCache(latest);
    await saveCardsToCacheStorage(latest);

    return true;
  }

  function scheduleSync() {
    if (!syncState.enabled) {
      return;
    }

    if (syncState.timerId) {
      window.clearTimeout(syncState.timerId);
    }

    syncState.timerId = window.setTimeout(function () {
      void syncFromLocalStateNow().catch(function (error) {
        console.error('[cards_sync] Sync failed:', error);
      });
    }, 700);
  }

  function installSyncPoller() {
    if (syncState.pollId) {
      return;
    }

    syncState.pollId = window.setInterval(function () {
      const nowCards = localStorage.getItem(DRAG_STATE_KEY) || '';
      const nowCounter = localStorage.getItem(DRAG_COUNTER_KEY) || '';

      if (nowCards !== syncState.lastSerializedCards || nowCounter !== syncState.lastCounter) {
        syncState.lastSerializedCards = nowCards;
        syncState.lastCounter = nowCounter;
        scheduleSync();
      }
    }, 600);
  }

  function bindCleanerFullDelete() {
    const bind = function () {
      const cleanerBtn = document.getElementById('cleanerBtn');
      if (!cleanerBtn || cleanerBtn.dataset.dbSyncBound === '1') {
        return;
      }

      cleanerBtn.dataset.dbSyncBound = '1';
      cleanerBtn.addEventListener('click', function () {
        const beforeCount = getDragStateCards().length;

        window.setTimeout(function () {
          const afterCount = getDragStateCards().length;
          if (beforeCount > 0 && afterCount === 0) {
            void deleteAllCardsForCurrentUser().catch(function (error) {
              console.error('[cards_sync] Full cleaner delete failed:', error);
            });
          }
        }, 500);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  function enableDraggableCardsRealtimeSync() {
    if (syncState.enabled) {
      return true;
    }

    syncState.enabled = true;

    const currentCards = getDragStateCards();
    syncState.previousIds = new Set(
      currentCards.map(function (card) {
        return sanitizeKeySegment(card.id);
      }).filter(Boolean)
    );

    syncState.lastSerializedCards = localStorage.getItem(DRAG_STATE_KEY) || '';
    syncState.lastCounter = localStorage.getItem(DRAG_COUNTER_KEY) || '';

    installSyncPoller();
    bindCleanerFullDelete();
    scheduleSync();

    return true;
  }

  const api = {
    preloadLatestCardsToCache: preloadLatestCardsToCache,
    loadCardsFromCache: loadCardsFromLocalCache,
    loadCardsFromCacheStorage: loadCardsFromCacheStorage,
    applyCachedCardsToLocalState: applyCachedCardsToLocalState,
    enableDraggableCardsRealtimeSync: enableDraggableCardsRealtimeSync,
    syncFromLocalStateNow: syncFromLocalStateNow,
    deleteAllCardsForCurrentUser: deleteAllCardsForCurrentUser,
    getCurrentUserId: getCurrentUserId,
    keys: {
      cache: LOCAL_CACHE_KEY,
      dragState: DRAG_STATE_KEY,
      dragCounter: DRAG_COUNTER_KEY
    }
  };

  window.CybermidCardsSync = api;
})(window);
