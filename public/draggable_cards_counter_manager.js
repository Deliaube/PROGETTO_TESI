(function (window) {
  'use strict';

  function toSafeNonNegativeInt(value, fallback) {
    var numeric = parseInt(String(value == null ? '' : value), 10);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return fallback;
    }
    return numeric;
  }

  function extractNumericCardSuffix(cardId) {
    var match = /(\d+)$/.exec(String(cardId || '').trim());
    if (!match) {
      return 0;
    }
    return toSafeNonNegativeInt(match[1], 0);
  }

  function createCounterManager(options) {
    var safeOptions = options || {};
    var counterKey = String(safeOptions.counterKey || 'draggableCards_counter_v1');
    var counter = toSafeNonNegativeInt(safeOptions.initialCounter, 0);

    function get() {
      return counter;
    }

    function set(value) {
      counter = toSafeNonNegativeInt(value, 0);
      return counter;
    }

    function syncFromId(cardId) {
      var suffix = extractNumericCardSuffix(cardId);
      counter = Math.max(counter, suffix);
      return counter;
    }

    function persist() {
      localStorage.setItem(counterKey, String(counter));
      return counter;
    }

    function nextUniqueId(selector) {
      var query = selector || '.draggable';
      var usedIds = new Set(
        Array.from(document.querySelectorAll(query))
          .map(function (card) {
            return String((card && card.id) || '').trim();
          })
          .filter(Boolean)
      );

      var attempts = 0;
      while (attempts < 5000) {
        attempts += 1;
        counter = Math.max(0, counter) + 1;
        var candidateId = 'card-' + counter;
        if (!usedIds.has(candidateId)) {
          persist();
          return candidateId;
        }
      }

      return 'card-extra-' + Math.random().toString(36).slice(2, 8) + 'x';
    }

    function normalizeSeedIds(cards) {
      var usedIds = new Set();
      var list = Array.isArray(cards) ? cards : [];

      list.forEach(function (card, idx) {
        var resolvedId = card && card.id ? String(card.id).trim() : 'card-' + (idx + 1);
        if (!resolvedId) {
          resolvedId = 'card-' + (idx + 1);
        }

        if (usedIds.has(resolvedId)) {
          resolvedId = 'card-seed-' + (idx + 1);
        }

        while (usedIds.has(resolvedId)) {
          resolvedId = resolvedId + '-dup';
        }

        if (card) {
          card.id = resolvedId;
        }
        usedIds.add(resolvedId);
        syncFromId(resolvedId);
      });

      return list;
    }

    return {
      get: get,
      set: set,
      syncFromId: syncFromId,
      persist: persist,
      nextUniqueId: nextUniqueId,
      normalizeSeedIds: normalizeSeedIds,
      toSafeNonNegativeInt: toSafeNonNegativeInt
    };
  }

  window.CybermidCardsCounterManager = {
    toSafeNonNegativeInt: toSafeNonNegativeInt,
    extractNumericCardSuffix: extractNumericCardSuffix,
    createCounterManager: createCounterManager
  };
})(window);
