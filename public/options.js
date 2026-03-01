function updateSum(value) {
    // Recupera la somma attuale da localStorage
    const totalSum = localStorage.getItem('totalSum') || '';
    // Aggiorna la somma concatenando la scelta fatta
    const newSum = totalSum + value;
    // Salva la nuova somma in localStorage
    localStorage.setItem('totalSum', newSum);
    console.log(`Somma aggiornata: ${newSum}`); // Log per debugging
    // Dopo aver aggiornato la somma, effettua il routing
    routeTriangleByState('back');
}


// Esegui al caricamento (placeholder, evita errori se non definita)
function updateImageBasedOnSum() {}
window.onload = updateImageBasedOnSum;

const ROUTING_BUG_FLAG_KEY = 'cybermid_route_bug_enabled_v1';
const STATE_MODEL_STORAGE_KEY = 'cybermid_state_model_v1';

const ROUTE_MAP = {
  back: {
    egregore: 'egregore.html',
    transmigrator: 'trasmigrator.html',
    inmate: 'inmate.html',
    default: 'new_index_CHANGES REVISED.html'
  }
};

function setRoutingBugMode(enabled) {
  localStorage.setItem(ROUTING_BUG_FLAG_KEY, enabled ? '1' : '0');
  return enabled;
}

function isRoutingBugModeEnabled() {
  return localStorage.getItem(ROUTING_BUG_FLAG_KEY) === '1';
}

function readStateModelSafe() {
  if (window.CybermidStateModel && typeof window.CybermidStateModel.getModel === 'function') {
    return window.CybermidStateModel.getModel();
  }

  try {
    const raw = localStorage.getItem(STATE_MODEL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function resolveRouteByState(direction) {
  const group = ROUTE_MAP[direction] || ROUTE_MAP.up;
  const candidates = [group.egregore, group.transmigrator, group.inmate, group.default];

  if (isRoutingBugModeEnabled()) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const model = readStateModelSafe();
  const stato = model && model.Key && model.Key.Stato ? model.Key.Stato : {};

  const egregore = Number(stato.Egregore) || 0;
  const transmigrator = Number(stato.Trasmigrator) || 0;
  const inmate = Number(stato.Inmate) || 0;

  if (egregore > 50) {
    return group.egregore;
  }
  if (transmigrator > 50) {
    return group.transmigrator;
  }
  if (inmate > 50) {
    return group.inmate;
  }

  return group.default;
}

function routeTriangleByState(direction) {
  const targetPage = resolveRouteByState(direction);
  window.location.href = targetPage;
}

window.setRoutingBugMode = setRoutingBugMode;
window.isRoutingBugModeEnabled = isRoutingBugModeEnabled;
window.resolveRouteByState = resolveRouteByState;
window.routeTriangleByState = routeTriangleByState;
