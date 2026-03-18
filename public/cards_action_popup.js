(function (window) {
  'use strict';

  const POPUP_ID = 'cardsActionPopup';
  const AUTO_HIDE_MS = 3800;
  const DEFAULT_PATH = 'feeling';
  const MIN_INTERVAL_MS = {
    crea: 900,
    modifica: 2200,
    cancella: 900,
    'cancella tutto': 1400
  };

  let hideTimer = 0;
  const lastShownAt = new Map();
  const lastTextByAction = new Map();

  function normalizeAction(action) {
    return String(action || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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

    return { popup: popup, textElement: textElement };
  }

  function placePopupRandomly(popup) {
    const topPercent = 10 + Math.random() * 70;
    const leftPercent = 8 + Math.random() * 76;

    popup.style.position = 'fixed';
    popup.style.top = topPercent + '%';
    popup.style.left = leftPercent + '%';
    popup.style.maxWidth = 'min(86vw, 520px)';
    popup.style.zIndex = '1001';
  }

  function showPopupMessage(message, isError) {
    const ui = ensurePopupElements();
    const popup = ui.popup;
    const textElement = ui.textElement;

    textElement.textContent = String(message || 'Messaggio non disponibile.');
    popup.style.display = 'block';
    popup.style.backgroundColor = isError ? '#7a0a0a' : '#000000';

    placePopupRandomly(popup);

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(function () {
      popup.style.display = 'none';
    }, AUTO_HIDE_MS);
  }

  function canShow(action) {
    const now = Date.now();
    const lastTime = lastShownAt.get(action) || 0;
    const minInterval = MIN_INTERVAL_MS[action] || 1200;
    if (now - lastTime < minInterval) {
      return false;
    }
    lastShownAt.set(action, now);
    return true;
  }

  function buildMissingMessage(reason, debugInfo) {
    const safeReason = String(reason || 'no-text').trim();
    const suffix = debugInfo ? ' [' + debugInfo + ']' : '';
    return 'Messaggio non disponibile: ' + safeReason + suffix;
  }

  function readCurrentComboCode() {
    if (window.FeelingService && typeof window.FeelingService.getCurrentFeelingContext === 'function') {
      try {
        const context = window.FeelingService.getCurrentFeelingContext();
        const combo = context && context.combinazione ? String(context.combinazione).toUpperCase() : 'N';
        return combo || 'N';
      } catch (error) {
        return 'N';
      }
    }
    return 'N';
  }

  function readCurrentStateLabel() {
    if (window.FeelingService && typeof window.FeelingService.getCurrentFeelingContext === 'function') {
      try {
        const context = window.FeelingService.getCurrentFeelingContext();
        const label = context && context.statoPredominante ? String(context.statoPredominante) : 'Neutrale';
        return label || 'Neutrale';
      } catch (error) {
        return 'Neutrale';
      }
    }
    return 'Neutrale';
  }

  function parseFeelingEntries(payload) {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const entries = [];

    for (const [id, raw] of Object.entries(payload)) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }

      const match = /^([AISN])([1-9]\d*)$/i.exec(String(id || '').trim());
      if (!match) {
        continue;
      }

      const comboCode = match[1].toUpperCase();
      const text = String(raw.Testo || raw.testo || '').trim();
      if (!text) {
        continue;
      }

      const entryAction = normalizeAction(raw.Azione || raw.azione || '');

      entries.push({
        id: String(id),
        comboCode: comboCode,
        testo: text,
        azione: entryAction
      });
    }

    return entries;
  }

  function pickRandomDifferent(pool, previousText) {
    if (!Array.isArray(pool) || pool.length === 0) {
      return '';
    }

    if (pool.length === 1) {
      return pool[0].testo || '';
    }

    const candidates = pool.filter(function (entry) {
      return entry.testo && entry.testo !== previousText;
    });

    const source = candidates.length ? candidates : pool;
    const index = Math.floor(Math.random() * source.length);
    return source[index].testo || '';
  }

  function buildPool(entries, comboCode, action) {
    const normalizedAction = normalizeAction(action);

    if (normalizedAction) {
      const byAction = entries.filter(function (entry) {
        return entry.comboCode === comboCode && entry.azione === normalizedAction;
      });
      if (byAction.length) {
        return byAction;
      }
    }

    const byCombo = entries.filter(function (entry) {
      return entry.comboCode === comboCode;
    });
    if (byCombo.length) {
      return byCombo;
    }

    if (comboCode !== 'N') {
      const neutral = entries.filter(function (entry) {
        return entry.comboCode === 'N';
      });
      if (neutral.length) {
        return neutral;
      }
    }

    return entries;
  }

  async function resolveText(action) {
    if (!window.FeelingService || typeof window.FeelingService.readFeelingData !== 'function') {
      return buildMissingMessage('FeelingService-not-available', 'stato=Neutrale combo=N');
    }

    try {
      const data = await window.FeelingService.readFeelingData(DEFAULT_PATH);
      const entries = parseFeelingEntries(data);
      if (!entries.length) {
        const debugInfo = 'stato=' + readCurrentStateLabel() + ' combo=' + readCurrentComboCode();
        return buildMissingMessage('empty-dataset', debugInfo);
      }

      const comboCode = readCurrentComboCode();
      const debugInfo = 'stato=' + readCurrentStateLabel() + ' combo=' + comboCode;
      const pool = buildPool(entries, comboCode, action);
      const lastText = lastTextByAction.get(action) || '';
      const candidate = pickRandomDifferent(pool, lastText);

      if (candidate) {
        lastTextByAction.set(action, candidate);
        return candidate; // + ' [' + debugInfo + ']';
      }

      return buildMissingMessage('empty-result', debugInfo);
    } catch (error) {
      const reason = error && error.message ? error.message : 'unknown-error';
      const debugInfo = 'stato=' + readCurrentStateLabel() + ' combo=' + readCurrentComboCode();
      return buildMissingMessage(reason, debugInfo);
    }
  }

  async function show(action) {
    const normalized = normalizeAction(action);
    if (!normalized) {
      return;
    }

    if (!canShow(normalized)) {
      return;
    }

    showPopupMessage('Caricamento messaggio...', false);

    try {
      const text = await resolveText(normalized);
      showPopupMessage(text, false);
    } catch (error) {
      const reason = error && error.message ? error.message : 'errore sconosciuto';
      showPopupMessage(buildMissingMessage(reason), true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.FeelingService && typeof window.FeelingService.readFeelingData === 'function') {
        window.FeelingService.readFeelingData(DEFAULT_PATH).catch(function () {
          // warm-up best effort
        });
      }
    });
  } else if (window.FeelingService && typeof window.FeelingService.readFeelingData === 'function') {
    window.FeelingService.readFeelingData(DEFAULT_PATH).catch(function () {
      // warm-up best effort
    });
  }

  window.CybermidCardsActionPopup = {
    show: show,
    normalizeAction: normalizeAction
  };
})(window);
