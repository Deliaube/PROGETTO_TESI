(function (window) {
  'use strict';

  const NOTES_NODE = 'Notes';
  const FALLBACK_BASE_URL = 'https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app';
  const SAVE_DEBOUNCE_MS = 350;
  const saveTimers = new Map();
  const statusByTextarea = new WeakMap();

  function sanitizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
  }

  function resolveBaseUrl() {
    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.FIREBASE_BASE_URL === 'string'
    ) {
      const fromStateModel = sanitizeBaseUrl(window.CybermidStateModel.FIREBASE_BASE_URL);
      if (fromStateModel) {
        return fromStateModel;
      }
    }

    return sanitizeBaseUrl(FALLBACK_BASE_URL);
  }

  function buildNoteUrl(pointId) {
    const safePointId = encodeURIComponent(String(pointId || '').trim());
    if (!safePointId) {
      throw new Error('point-id-missing');
    }

    const baseUrl = resolveBaseUrl();
    if (!baseUrl) {
      throw new Error('firebase-base-url-missing');
    }

    return baseUrl + '/' + NOTES_NODE + '/' + safePointId + '.json';
  }

  function ensureStatusElement(textarea) {
    if (!textarea || !textarea.parentElement) {
      return null;
    }

    const fromMap = statusByTextarea.get(textarea);
    if (fromMap) {
      return fromMap;
    }

    const existing = textarea.parentElement.querySelector('.dosaggio-note-status');
    if (existing) {
      statusByTextarea.set(textarea, existing);
      return existing;
    }

    const status = document.createElement('p');
    status.className = 'dosaggio-note-status';
    status.setAttribute('aria-live', 'polite');
    status.style.margin = '8px 0 0';
    status.style.fontSize = '12px';
    status.style.color = '#333';
    status.textContent = '';

    textarea.parentElement.appendChild(status);
    statusByTextarea.set(textarea, status);
    return status;
  }

  function setStatus(textarea, message, isError) {
    const status = ensureStatusElement(textarea);
    if (!status) {
      return;
    }

    status.textContent = String(message || '');
    status.style.color = isError ? '#b00020' : '#333';
  }

  function normalizeFetchedNote(payload) {
    if (payload === null || typeof payload === 'undefined') {
      return '';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object') {
      if (typeof payload.text === 'string') {
        return payload.text;
      }
      if (typeof payload.note === 'string') {
        return payload.note;
      }
    }

    return '';
  }

  async function loadNote(pointId) {
    const noteUrl = buildNoteUrl(pointId);
    const response = await fetch(noteUrl);

    if (!response.ok) {
      throw new Error('Inserisci qui la tua nota: ');
    }

    const payload = await response.json();

    return {
      pointId: String(pointId),
      found: payload !== null,
      text: normalizeFetchedNote(payload)
    };
  }

  async function saveNote(pointId, text) {
    const noteUrl = buildNoteUrl(pointId);
    const payload = {
      text: String(text || ''),
      updatedAt: new Date().toISOString()
    };

    const response = await fetch(noteUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('PUT Notes failed: ' + response.status);
    }

    return payload;
  }

  function clearPendingSave(pointId) {
    const key = String(pointId || '');
    const timer = saveTimers.get(key);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    saveTimers.delete(key);
  }

  function queueSave(pointId, text, textarea) {
    const key = String(pointId || '').trim();
    if (!key) {
      setStatus(textarea, 'No point selected: note not saved.', true);
      return;
    }

    clearPendingSave(key);
    setStatus(textarea, 'Saving to Firebase...', false);

    const timer = setTimeout(async function () {
      try {
        await saveNote(key, text);
        setStatus(textarea, 'Note saved to Notes/' + key + '.', false);
      } catch (error) {
        const reason = error && error.message ? error.message : 'unknown-error';
        setStatus(textarea, 'Save error on Firebase: ' + reason, true);
      } finally {
        saveTimers.delete(key);
      }
    }, SAVE_DEBOUNCE_MS);

    saveTimers.set(key, timer);
  }

  window.DosaggioNote = {
    NODE_NAME: NOTES_NODE,
    loadNote: loadNote,
    saveNote: saveNote,
    queueSave: queueSave,
    setStatus: setStatus
  };
})(window);
