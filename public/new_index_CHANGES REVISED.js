/*SCRIPT DROP DOWN MENù - LATERALE DOVE DENTRO STA IL RESET BUTTON*/
      /* When the user clicks on the button, 
      toggle between hiding and showing the dropdown content */
      function myFunction() {
        document.getElementById("myDropdown").classList.toggle("show");
      }
      
      // Close the dropdown if the user clicks outside of it
      window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {
          var dropdowns = document.getElementsByClassName("dropdown-content");
          var i;
          for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
              openDropdown.classList.remove('show');
            }
          }
        }
      }

/*SCRIPT DEL RESET*/ 

function resetChoices() {
    try {
      // Resetta il cursore al default
      document.body.style.cursor = 'auto';
      
      // Verifica se la chiave esiste prima di rimuoverla
      if (localStorage.getItem('totalSum') !== null) {
        localStorage.removeItem('totalSum');
      }
      
      // Ricarica la pagina senza cache per evitare problemi
      window.location.reload(true);
    } catch (error) {
      console.error("Errore durante il reset:", error);
      alert("Si è verificato un errore durante il reset. Riprova.");
    }
  }
  
/*UPDATE IMAGE BASED ON SUM*/
function updateImageBasedOnSum() {
    // Ottieni la somma salvata
    const totalSum = localStorage.getItem('totalSum') || '';
  
    // Seleziona l'immagine e il messaggio
    const placeholder = document.getElementById('placeholder');
    const message = document.getElementById('message');
  
    // Controllo per le combinazioni - cambia immagini con compatibili 
    if (totalSum === 'AAA') {
      placeholder.src = 'images/img neutrale/neutral pfp 1.png';
      message.textContent = 'Combinazione AAA scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum === 'ABC') {
      placeholder.src = 'images/img neutrale/neutral pfp 2.png';
      message.textContent = 'Combinazione ABC scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum === 'BBB') { 
      placeholder.src = 'images/vvvortex.svg';
      message.textContent = 'Combinazione BBB scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    }else if (totalSum === 'CCC') { 
      placeholder.src = 'images/img neutrale/weblogo.svg';
      message.textContent = 'Combinazione CCC scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum.includes('A') && totalSum.includes('B') && totalSum.includes('C')) {
      placeholder.src = 'images/img neutrale/neutral pfp 1.png';
      message.textContent = 'Tutte le opzioni sono state selezionate!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else {
      message.textContent = 'Completa le scelte per vedere il risultato.';
    }
  }
  
  // Esegui al caricamento
  window.onload = updateImageBasedOnSum;

const ROUTING_BUG_FLAG_KEY = 'cybermid_route_bug_enabled_v1';
const STATE_MODEL_STORAGE_KEY = 'cybermid_state_model_v1';
const LAST_DELTA_STORAGE_KEY = 'cybermid_last_delta_v1';

const ROUTE_MAP = {
  up: {
    egregore: 'controindicazioni_egregore.html',
    transmigrator: 'controindicazioni_trasmigrator.html',
    inmate: 'controindicazioni_inmate.html',
    default: 'controindicazioni.html'
  },
  right: {
    egregore: 'dosaggio_egregore.html',
    transmigrator: 'dosaggio_trasmigrator.html',
    inmate: 'dosaggio_inmate.html',
    default: 'dosaggio.html'
  },
  down: {
    egregore: 'draggable_cards_egregore.html',
    transmigrator: 'draggable_cards_trasmigrator.html',
    inmate: 'draggable_cards_inmate.html',
    default: 'draggable_cards.html'
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

function formatSignedNumber(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) {
    return '+' + numeric;
  }
  return String(numeric);
}

function renderAvatarDeltaStatus(message, isError) {
  const statusEl = document.getElementById('avatar-delta-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b00020' : '#155724';
    return;
  }

  alert(message);
}

function handleAvatarDeltaClick(context) {
  if (!window.CybermidStateModel || typeof window.CybermidStateModel.computeDeltaFromInitialSnapshot !== 'function') {
    renderAvatarDeltaStatus('Delta function unavailable: state model is not ready.', true);
    return null;
  }

  const result = window.CybermidStateModel.computeDeltaFromInitialSnapshot();
  if (!result || !result.ok || !result.delta) {
    renderAvatarDeltaStatus('Initial snapshot missing: unable to calculate delta.', true);
    return result || null;
  }

  const payload = {
    context: context || 'unknown',
    computedAt: result.computedAt,
    delta: result.delta,
    initial: result.initial,
    current: result.current
  };

  localStorage.setItem(LAST_DELTA_STORAGE_KEY, JSON.stringify(payload));

  const delta = result.delta;
  renderAvatarDeltaStatus(
    'Delta computed. Egregore: ' + formatSignedNumber(delta.Egregore) +
      ', Trasmigrator: ' + formatSignedNumber(delta.Trasmigrator) +
      ', Inmate: ' + formatSignedNumber(delta.Inmate),
    false
  );

  window.dispatchEvent(new CustomEvent('cybermid:state:delta:computed', {
    detail: payload
  }));

  return payload;
}

window.setRoutingBugMode = setRoutingBugMode;
window.isRoutingBugModeEnabled = isRoutingBugModeEnabled;
window.resolveRouteByState = resolveRouteByState;
window.routeTriangleByState = routeTriangleByState;
window.handleAvatarDeltaClick = handleAvatarDeltaClick;
