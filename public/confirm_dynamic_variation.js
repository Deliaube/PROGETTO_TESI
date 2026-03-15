(function (window) {
  'use strict';

  const STATE_STORAGE_KEY = 'cybermid_state_model_v1';
  const MIN_VALUE = 0;
  const MAX_VALUE = 100;

  // Le prime 3 aree mappano ai 3 stati; dropArea4 è Neutrale
  const DROP_TO_STATE_KEY = {
    dropArea1: 'Egregore',
    dropArea2: 'Trasmigrator',
    dropArea3: 'Inmate'
  };

  const STATE_KEYS = ['Egregore', 'Trasmigrator', 'Inmate'];

  function clamp(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return MIN_VALUE;
    }
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, numeric));
  }

  function readModelSafe() {
    if (window.CybermidStateModel && typeof window.CybermidStateModel.getModel === 'function') {
      try {
        return window.CybermidStateModel.getModel();
      } catch (error) {}
    }

    try {
      const raw = localStorage.getItem(STATE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeModel(model) {
    const src = model && model.Key ? model : {};
    const stato = src.Key && src.Key.Stato ? src.Key.Stato : {};

    return {
      Key: {
        Utente: (src.Key && src.Key.Utente) || 'anonymous',
        Stato: {
          Egregore: clamp(stato.Egregore),
          Trasmigrator: clamp(stato.Trasmigrator),
          Inmate: clamp(stato.Inmate)
        },
        Timestamp: (src.Key && src.Key.Timestamp) || new Date().toISOString()
      }
    };
  }

  function writeModel(model) {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(model));

    window.dispatchEvent(new CustomEvent('cybermid:state:changed', {
      detail: {
        action: 'CONFIRM_DND_DELTA',
        model: model
      }
    }));

    // Sync best-effort verso Firebase se disponibile nel modello applicativo
    if (
      window.CybermidStateModel &&
      typeof window.CybermidStateModel.putToFirebase === 'function'
    ) {
      window.CybermidStateModel.putToFirebase('sessioni').catch(function (error) {
        console.warn('[confirm_dynamic_variation] Firebase sync failed:', error);
      });
    }
  }

  function getDropCounts() {
    const areas = ['dropArea1', 'dropArea2', 'dropArea3', 'dropArea4'];
    const result = {};

    areas.forEach(function (areaId) {
      const area = document.getElementById(areaId);
      result[areaId] = area ? area.querySelectorAll('.draggable').length : 0;
    });

    return result;
  }

  function computeDynamicDelta(dropCounts) {
    const delta = {
      Egregore: 0,
      Trasmigrator: 0,
      Inmate: 0
    };

    Object.entries(dropCounts || {}).forEach(function (entry) {
      const areaId = entry[0];
      const count = Number(entry[1]) || 0;
      if (count <= 0) {
        return;
      }

      const targetStateKey = DROP_TO_STATE_KEY[areaId];
      if (!targetStateKey) {
        // dropArea4 (Neutrale): -5 a tutti gli stati per ogni draggable
        STATE_KEYS.forEach(function (stateKey) {
          delta[stateKey] -= 5 * count;
        });
        return;
      }

      STATE_KEYS.forEach(function (stateKey) {
        if (stateKey === targetStateKey) {
          delta[stateKey] += 5 * count;
        } else {
          delta[stateKey] -= 5 * count;
        }
      });
    });

    return delta;
  }

  function applyDynamicDeltaOnConfirm() {
    const model = normalizeModel(readModelSafe());
    const counts = getDropCounts();
    const delta = computeDynamicDelta(counts);

    model.Key.Stato.Egregore = clamp((Number(model.Key.Stato.Egregore) || 0) + delta.Egregore);
    model.Key.Stato.Trasmigrator = clamp((Number(model.Key.Stato.Trasmigrator) || 0) + delta.Trasmigrator);
    model.Key.Stato.Inmate = clamp((Number(model.Key.Stato.Inmate) || 0) + delta.Inmate);
    model.Key.Timestamp = new Date().toISOString();

    writeModel(model);

    console.debug('[confirm_dynamic_variation] counts:', counts, 'delta:', delta, 'stato:', model.Key.Stato);
  }

  function install() {
    bindConfirmButton(document.getElementById('confirmBtn'));
    bindConfirmButton(document.getElementById('confirmButton'));

    if (window.__confirmDynamicVariationDelegatedBound) {
      return;
    }
    window.__confirmDynamicVariationDelegatedBound = true;

    // Fallback: intercetta anche click dinamici su eventuali bottoni reinseriti nel DOM
    document.addEventListener('click', function (event) {
      const target = event && event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest('#confirmBtn, #confirmButton');
      if (!button) {
        return;
      }
      bindConfirmButton(button);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})(window);
