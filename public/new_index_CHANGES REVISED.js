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
const TOTAL_SUM_STORAGE_KEY = 'totalSum';
const SLOT_COUNT = 3;
const VALID_CHOICES = new Set(['A', 'B', 'C']);

const mappingRisultati = {
  AAA: {
    imagePath: 'images/img neutrale/neutral pfp 1.png',
    message: 'Pattern AAA: equilibrio lineare, assetto stabile e prevedibile.'
  },
  AAB: {
    imagePath: 'images/img neutrale/neutral pfp 2.png',
    message: 'Pattern AAB: prevale A con una lieve interferenza del canale B.'
  },
  AAC: {
    imagePath: 'images/img neutrale/neutral pfp 3.png',
    message: 'Pattern AAC: prevale A con una deviazione verso il canale C.'
  },
  BBA: {
    imagePath: 'images/img neutrale/neutral pfp 4.png',
    message: 'Pattern BBA: prevale B con un residuo del canale A.'
  },
  BBC: {
    imagePath: 'images/img neutrale/neutral pfp 5.png',
    message: 'Pattern BBC: prevale B con un innesto del canale C.'
  },
  CCA: {
    imagePath: 'images/img neutrale/neutral pfp 6.png',
    message: 'Pattern CCA: prevale C con un ritorno puntuale al canale A.'
  },
  CCB: {
    imagePath: 'images/img neutrale/neutral pfp 7.png',
    message: 'Pattern CCB: prevale C con modulazione secondaria su B.'
  },
  ABC: {
    imagePath: 'images/img neutrale/neutral pfp 8.png',
    message: 'Pattern ABC: triade completa, i tre canali sono tutti presenti.'
  },
  BBB: {
    imagePath: 'images/img neutrale/neutral pfp 9.png',
    message: 'Pattern BBB: ripetizione B dominante, comportamento coerente ma rigido.'
  },
  CCC: {
    imagePath: 'images/img neutrale/neutral pfp 10.png',
    message: 'Pattern CCC: ripetizione C dominante, forte polarizzazione del profilo.'
  }
};

function sanitizeCombination(rawValue) {
  return String(rawValue || '')
    .toUpperCase()
    .split('')
    .filter((char) => VALID_CHOICES.has(char))
    .join('');
}

function sortCombination(rawValue) {
  return sanitizeCombination(rawValue)
    .split('')
    .sort()
    .join('');
}

const mappingRisultatiOrdinato = Object.entries(mappingRisultati).reduce((acc, [key, value]) => {
  acc[sortCombination(key)] = value;
  return acc;
}, {});

function getMessageElement() {
  return document.getElementById('message') || document.getElementById('frase-avatar');
}

function updateImageBasedOnSum() {
    const totalSum = localStorage.getItem(TOTAL_SUM_STORAGE_KEY) || '';
    const placeholder = document.getElementById('placeholder');
    const message = getMessageElement();

    // Questo script e condiviso da piu pagine: aggiorna solo se i nodi UI esistono.
    if (!placeholder || !message) {
      return;
    }

    const sanitizedSum = sanitizeCombination(totalSum);
    if (sanitizedSum.length < SLOT_COUNT) {
      message.textContent = 'Complete 3/3 choices to reveal the result.';
      return;
    }

    const slotSelection = sanitizedSum.slice(-SLOT_COUNT);
    const sortedSelection = sortCombination(slotSelection);
    const result = mappingRisultatiOrdinato[sortedSelection];

    if (!result) {
      message.textContent = 'Unrecognized combination. Reset and try again with 3 choices A/B/C.';
      return;
    }

    placeholder.src = result.imagePath;
    placeholder.alt = 'Avatar resulting from combination ' + sortedSelection;
    placeholder.style.width = '300px';
    placeholder.style.height = 'auto';
    message.textContent = result.message;
  }
  
  // Execute on load without overwriting any other global handlers.
  window.addEventListener('DOMContentLoaded', updateImageBasedOnSum);

const ROUTING_BUG_FLAG_KEY = 'cybermid_route_bug_enabled_v1';
const STATE_MODEL_STORAGE_KEY = 'cybermid_state_model_v1';
const LAST_DELTA_STORAGE_KEY = 'cybermid_last_delta_v1';

const ROUTE_MAP = {
  up: {
    egregore: 'Side_Effects_egregore.html',
    transmigrator: 'Side_Effects_trasmigrator.html',
    inmate: 'Side_Effects_inmate.html',
    default: 'Side_Effects.html'
  },
  right: {
    egregore: 'Dosage_egregore.html',
    transmigrator: 'Dosage_trasmigrator.html',
    inmate: 'Dosage_inmate.html',
    default: 'Dosage.html'
  },
  down: {
    egregore: 'Check_Up_egregore.html',
    transmigrator: 'Check_Up_trasmigrator.html',
    inmate: 'Check_Up_inmate.html',
    default: 'Check_Up.html'
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
