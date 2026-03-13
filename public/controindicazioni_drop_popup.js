(function (window) {
  'use strict';

  const DEFAULT_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app';
  const FEELING_ROOT_PATH = 'feeling';
  const LOCAL_STATE_KEY = 'cybermid_state_model_v1';
  const POPUP_ID = 'dropFeelingPopup';
  const AUTO_HIDE_MS = 3200;
  const ACTION_LIKE = 'mi piace';
  const ACTION_DISLIKE = 'non mi piace';
  const ALLOWED_ACTIONS = new Set([ACTION_LIKE, ACTION_DISLIKE]);

  // Mapping richiesto: S/A/N/I sono prefissi generici (S1..S48, A1..A48, ...).
  const DROP_AREA_COMBO_MAP = {
    dropArea1: 'S',
    dropArea2: 'I',
    dropArea3: 'A',
    dropArea4: 'N'
  };

  const DROP_AREA_LABEL_MAP = {
    dropArea1: 'Egregore',
    dropArea2: 'Trasmigrator',
    dropArea3: 'Inmate',
    dropArea4: 'Neutrale'
  };

  const COMBO_LABEL_MAP = {
    S: 'Egregore',
    A: 'Inmate',
    N: 'Neutrale',
    I: 'Trasmigrator'
  };

  let hideTimer = 0;

  function sanitizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function sanitizePath(path) {
    return String(path || '').trim().replace(/^\/+|\/+$/g, '');
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

  function normalizeAction(action) {
    return String(action || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function pickRandom(items) {
    if (!Array.isArray(items) || !items.length) {
      return null;
    }
    const index = Math.floor(Math.random() * items.length);
    return items[index];
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

  function resolveCurrentUserComboByThreshold() {
    const model = readStateModelSafe();
    const stato = model && model.Key && model.Key.Stato ? model.Key.Stato : {};

    const scores = {
      S: Number(stato.Egregore) || 0,
      A: Number(stato.Inmate) || 0,
      I: Number(stato.Trasmigrator) || 0
    };

    const entries = Object.entries(scores).map(function (pair) {
      return {
        comboCode: pair[0],
        value: pair[1]
      };
    });

    const maxValue = entries.reduce(function (acc, item) {
      return Math.max(acc, item.value);
    }, 0);

    if (maxValue <= 50) {
      return {
        comboCode: 'N',
        label: COMBO_LABEL_MAP.N,
        reason: 'no-state-over-50',
        scores: scores
      };
    }

    const winners = entries.filter(function (item) {
      return item.value === maxValue && item.value > 50;
    });

    if (winners.length !== 1) {
      return {
        comboCode: 'N',
        label: COMBO_LABEL_MAP.N,
        reason: 'tie-over-50',
        scores: scores
      };
    }

    const winnerCombo = winners[0].comboCode;
    return {
      comboCode: winnerCombo,
      label: COMBO_LABEL_MAP[winnerCombo] || winnerCombo,
      reason: 'dominant-over-50',
      scores: scores
    };
  }

  function parseFeelingEntries(payload) {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidates = [];

    for (const [entryId, rawEntry] of Object.entries(payload)) {
      const id = String(entryId || '').trim().toUpperCase();
      if (!/^([AISN])([1-9]|[1-3][0-9]|4[0-8])$/.test(id)) {
        continue;
      }

      const comboCode = id.charAt(0);

      if (!rawEntry || typeof rawEntry !== 'object') {
        continue;
      }

      const action = normalizeAction(rawEntry.Azione || rawEntry.azione || '');
      if (!ALLOWED_ACTIONS.has(action)) {
        continue;
      }

      const text = String(rawEntry.testo || rawEntry.Testo || '').trim();
      if (!text) {
        continue;
      }

      candidates.push({
        id: id,
        comboCode: comboCode,
        action: action,
        text: text
      });
    }

    return candidates;
  }

  function buildSelectionPool(entries, areaComboCode, currentComboCode) {
    const areaLikes = entries.filter(function (entry) {
      return entry.comboCode === areaComboCode && entry.action === ACTION_LIKE;
    });

    if (areaComboCode === currentComboCode) {
      return {
        rule: 'same-state-like-only',
        pool: areaLikes,
        areaLikeCount: areaLikes.length,
        currentDislikeCount: 0
      };
    }

    const currentDislikes = entries.filter(function (entry) {
      return entry.comboCode === currentComboCode && entry.action === ACTION_DISLIKE;
    });

    const uniqueMap = new Map();
    for (const item of areaLikes.concat(currentDislikes)) {
      uniqueMap.set(item.id, item);
    }

    return {
      rule: 'mixed-area-like-plus-current-dislike',
      pool: Array.from(uniqueMap.values()),
      areaLikeCount: areaLikes.length,
      currentDislikeCount: currentDislikes.length
    };
  }

  async function readFeelingTextByCombo(areaComboCode, currentStateInfo) {
    const normalizedAreaCombo = String(areaComboCode || '').trim().toUpperCase();
    const safePath = sanitizePath(FEELING_ROOT_PATH);
    const baseUrl = getBaseUrl();
    const currentInfo = currentStateInfo || resolveCurrentUserComboByThreshold();
    const normalizedCurrentCombo = String(currentInfo.comboCode || 'N').trim().toUpperCase();

    if (!baseUrl) {
      return {
        ok: false,
        message: 'Firebase base url non disponibile.',
        path: safePath,
        areaComboCode: normalizedAreaCombo,
        currentComboCode: normalizedCurrentCombo
      };
    }

    const response = await fetch(baseUrl + '/' + safePath + '.json');
    if (!response.ok) {
      return {
        ok: false,
        message: 'Richiesta Firebase fallita: ' + response.status,
        path: safePath,
        areaComboCode: normalizedAreaCombo,
        currentComboCode: normalizedCurrentCombo
      };
    }

    const data = await response.json();
    const entries = parseFeelingEntries(data);

    if (!entries.length) {
      return {
        ok: false,
        message: 'Nessun testo valido trovato nel dataset feeling.',
        path: safePath,
        areaComboCode: normalizedAreaCombo,
        currentComboCode: normalizedCurrentCombo
      };
    }

    const selection = buildSelectionPool(entries, normalizedAreaCombo, normalizedCurrentCombo);
    const selected = pickRandom(selection.pool);

    if (!selected) {
      return {
        ok: false,
        message: 'Nessun testo compatibile con la regola corrente.',
        path: safePath,
        areaComboCode: normalizedAreaCombo,
        currentComboCode: normalizedCurrentCombo,
        rule: selection.rule,
        areaLikeCount: selection.areaLikeCount,
        currentDislikeCount: selection.currentDislikeCount
      };
    }

    return {
      ok: true,
      text: selected.text,
      action: selected.action,
      entryId: selected.id,
      path: safePath,
      rule: selection.rule,
      areaComboCode: normalizedAreaCombo,
      currentComboCode: normalizedCurrentCombo,
      currentComboLabel: COMBO_LABEL_MAP[normalizedCurrentCombo] || normalizedCurrentCombo,
      areaLikeCount: selection.areaLikeCount,
      currentDislikeCount: selection.currentDislikeCount
    };
  }

  function ensurePopupElements() {
    let popup = document.getElementById(POPUP_ID);
    let textElement = null;

    if (!popup) {
      popup = document.createElement('div');
      popup.id = POPUP_ID;
      popup.className = 'popup-dark';
      popup.setAttribute('role', 'status');
      popup.setAttribute('aria-live', 'polite');

      textElement = document.createElement('p');
      popup.appendChild(textElement);

      document.body.appendChild(popup);
    } else {
      textElement = popup.querySelector('p');
      if (!textElement) {
        textElement = document.createElement('p');
        popup.appendChild(textElement);
      }
    }

    return {
      popup: popup,
      textElement: textElement
    };
  }

  function placePopupRandomly(popup) {
    // Mantiene il popup visibile evitando i bordi estremi.
    const topPercent = 10 + Math.random() * 70;
    const leftPercent = 8 + Math.random() * 76;

    popup.style.position = 'fixed';
    popup.style.top = topPercent + '%';
    popup.style.left = leftPercent + '%';
    popup.style.maxWidth = 'min(86vw, 520px)';
  }

  function showPopupMessage(message, isError) {
    const ui = ensurePopupElements();
    const popup = ui.popup;
    const textElement = ui.textElement;

    textElement.textContent = String(message || 'Messaggio non disponibile.');
    popup.style.display = 'block';
    popup.style.backgroundColor = isError ? '#7a0a0a' : '#000000';
    popup.style.color = isError ? '#f0b0b0' : '#ffffff';

    placePopupRandomly(popup);

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(function () {
      popup.style.display = 'none';
    }, AUTO_HIDE_MS);
  }

  function buildLoadingMessage() {
    return 'Caricamento messaggio...';
  }

  function buildSuccessMessage(text) {
    return String(text || 'Messaggio non disponibile.');
  }

  function buildErrorMessage(reason) {
    return 'Messaggio non disponibile: ' + String(reason || 'errore sconosciuto');
  }

  async function onDropAreaDropped(event) {
    const detail = event && event.detail ? event.detail : {};
    const dropAreaId = String(detail.dropAreaId || '').trim();

    if (!dropAreaId || !Object.prototype.hasOwnProperty.call(DROP_AREA_COMBO_MAP, dropAreaId)) {
      return;
    }

    const comboCode = DROP_AREA_COMBO_MAP[dropAreaId];
    const pathDescriptor = FEELING_ROOT_PATH + '/' + comboCode + '*';
    const currentStateInfo = resolveCurrentUserComboByThreshold();

    showPopupMessage(buildLoadingMessage(), false);

    try {
      const result = await readFeelingTextByCombo(comboCode, currentStateInfo);
      if (!result.ok) {
        showPopupMessage(buildErrorMessage(result.message), true);
        return;
      }

      showPopupMessage(buildSuccessMessage(result.text), false);
    } catch (error) {
      const reason = error && error.message ? error.message : 'Errore sconosciuto';
      showPopupMessage(buildErrorMessage(reason), true);
    }
  }

  function install() {
    if (window.__controindicazioniDropPopupInstalled) {
      return;
    }

    window.__controindicazioniDropPopupInstalled = true;
    window.addEventListener('cybermid:droparea:dropped', function (event) {
      void onDropAreaDropped(event);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.ControindicazioniDropFeeling = {
    areaComboMap: Object.assign({}, DROP_AREA_COMBO_MAP),
    areaPathMap: {
      dropArea1: FEELING_ROOT_PATH + '/S*',
      dropArea2: FEELING_ROOT_PATH + '/I*',
      dropArea3: FEELING_ROOT_PATH + '/A*',
      dropArea4: FEELING_ROOT_PATH + '/N*'
    },
    resolveCurrentUserComboByThreshold: resolveCurrentUserComboByThreshold,
    readFeelingTextByCombo: readFeelingTextByCombo
  };
})(window);
