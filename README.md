# CYBERMED - Documentazione Progetto

## 1. Panoramica
CYBERMED e una web experience interattiva sul tema della identita digitale.  
Il progetto guida l'utente in un percorso narrativo con tre possibili archetipi:

- `Egregore`
- `Transmigrator`
- `Inmate`

Ogni scelta dell'utente modifica uno stato interno persistente (salvato in locale e opzionalmente sincronizzato su Firebase Realtime Database), e questo stato decide quali pagine vengono mostrate.

## 2. Stack Tecnico
- Frontend: HTML, CSS, JavaScript vanilla
- Librerie CDN: `AOS` (animazioni)
- Librerie CDN: `jQuery` (pagine `draggable_cards*`)
- Librerie CDN: `Tone.js` (audio in pagine specifiche)
- Persistenza locale: `localStorage` + `sessionStorage`
- Backend dati: Firebase Realtime Database via REST API (`fetch`)
- Hosting: Firebase Hosting (`firebase.json`, cartella `public/`)
- Cloud Functions: cartella presente (`functions/`) ma senza endpoint esportati attivi

## 3. Struttura Repository
Percorsi principali:

- `public/`: sito web statico pubblicato su Firebase Hosting
- `public/state_model.js`: modello stato centrale + integrazione Firebase
- `public/options.js`: routing per stato + utility di uscita (`updateSum`, `Route`)
- `public/new_index_CHANGES REVISED.js`: routing principale dalla homepage operativa
- `public/timer.js`: timer globale persistente e blocco navigazione a tempo scaduto
- `public/dragndrop.js`: drag and drop desktop/mobile per pagine controindicazioni
- `public/counter.js`: logica risultato nelle pagine con aree di drop
- `functions/`: boilerplate Cloud Functions
- `firebase.json`: config hosting e database rules file
- `database.rules.json`: regole Realtime Database
- `firestore.rules`: regole Firestore

## 4. Flusso Utente
Flusso tipico:

1. `public/index.html`
2. `public/IDENTITY_QUEST.html`
3. `public/new_index_CHANGES REVISED.html`
4. In base allo stato (`Egregore` / `Trasmigrator` / `Inmate`) l'utente entra nelle varianti:
5. `controindicazioni*.html`
6. `dosaggio*.html`
7. `draggable_cards*.html`
8. Le azioni finali richiamano `Route()` e riportano su pagina coerente con lo stato corrente

Note:

- `public/welcome.html` esiste e gestisce `userNumber`/`userStatus`, ma il flusso puo saltarla a seconda del routing invocato da `Route()`.
- Le varianti con suffisso (`_egregore`, `_inmate`, `_trasmigrator`) rappresentano versioni tematizzate della stessa sezione.

## 5. Modello Stato (Core Logico)
Il cuore applicativo e in `public/state_model.js`.

Struttura stato:

```json
{
  "Key": {
    "Utente": "session-user-id",
    "Stato": {
      "Trasmigrator": 0,
      "Egregore": 0,
      "Inmate": 0
    },
    "Timestamp": "ISO date"
  }
}
```

I valori sono limitati (`clamp`) tra `0` e `100`.

Nota: nel codice la chiave stato e scritta `Trasmigrator` (senza `n` dopo `Tra`), mentre in alcuni testi UI compare `Transmigrator`.

### 5.1 Codici Variazione
Chiamata principale: `window.Variazione(code)`

Mappa delta:

- `C`: `Egregore +10`, `Trasmigrator -5`, `Inmate -5`
- `U`: `Egregore -5`, `Trasmigrator +10`, `Inmate -5`
- `D`: `Egregore -10`, `Trasmigrator -5`, `Inmate +10`
- `A`: `Egregore -15`, `Trasmigrator -15`, `Inmate +30`
- `B`: `Egregore -15`, `Trasmigrator -15`, `Inmate -15`

Ogni variazione aggiorna anche il timestamp e notifica l'evento custom:

- `cybermid:state:changed`

## 6. Routing Dinamico
### 6.1 Routing da Homepage Operativa
In `public/new_index_CHANGES REVISED.js`:

- `up` -> controindicazioni
- `right` -> dosaggio
- `down` -> combinazioni / draggable cards

Se uno stato supera la soglia `> 50`, si apre la variante specifica di archetipo (`_egregore`, `_inmate`, `_trasmigrator`), altrimenti la pagina base.

### 6.2 Routing di Ritorno
In `public/options.js`:

- `Route()` chiama `routeTriangleByState('back')`
- `back` porta a `egregore.html` se `Egregore > 50`
- `back` porta a `transmigrator.html` se `Trasmigrator > 50`
- `back` porta a `inmate.html` se `Inmate > 50`
- fallback: `new_index_CHANGES REVISED.html`

## 7. Persistenza Dati
Chiavi principali usate nel browser:

- `cybermid_state_model_v1`: stato completo
- `cybermid_firebase_key_v1`: chiave sessione Firebase
- `cybermid_session_user_v1` (sessionStorage): id utente di sessione
- `cybermid_route_bug_enabled_v1`: modalita routing casuale (debug)
- `timerData`: stato timer globale
- `userStatus`, `userNumber`: dati onboarding/welcome
- `totalSum`: traccia sintetica delle uscite (`A/B/C` concatenate)
- `draggableCards_state_v1`: stato cards
- `draggableCards_deleted_v1`: cestino cards
- `draggableCards_counter_v1`: contatore cards
- `draggableCards_nextCreateIndex_v1`: offset creazione cards

## 8. Firebase
### 8.1 Hosting
Configurato in `firebase.json`:

- directory pubblica: `public`

### 8.2 Realtime Database
`public/state_model.js` usa:

- `FIREBASE_BASE_URL = https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app/`

Operazioni principali:

- `putToFirebase(path, key)` -> `PUT /{path}/{key}.json`
- `loadFromFirebase(path, key)` -> `GET /{path}/{key}.json`
- `getLastSessionKey(path)` -> trova sessione con timestamp piu recente
- `loadAndResendLastState('sessioni')` -> carica ultima sessione e riscrive
- `clearSessioni(path)` -> `DELETE /{path}.json`

### 8.3 Security Rules
- Realtime DB (`database.rules.json`): `.read: false` e `.write: false`

Se queste regole sono deployate in produzione, le chiamate REST dal frontend verranno rifiutate.

- Firestore (`firestore.rules`): permesso globale temporaneo fino al `2026-03-24`.

## 9. Pagine e Moduli Funzionali
### 9.1 Onboarding
- `public/index.html`: accesso iniziale
- `public/IDENTITY_QUEST.html`: scelta status + durata timer
- `public/welcome.html`: pagina di passaggio con contatore utente

### 9.2 Hub e Archetipi
- `public/new_index_CHANGES REVISED.html`
- `public/egregore.html`
- `public/inmate.html`
- `public/transmigrator.html`

### 9.3 Sezioni Interattive
- `public/controindicazioni*.html`: drag and drop immagini in aree, azioni `Confirm/Ignore/Repeat`, opzioni finali A/B/C

- `public/dosaggio*.html`: punti cliccabili casuali e popup con input testuale salvato in locale

- `public/draggable_cards*.html`: creazione/spostamento/ridimensionamento card, persistenza completa in localStorage, cancellazione singola e massiva

## 10. Setup Locale
Prerequisiti:

1. Node.js installato
2. Firebase CLI installata (`npm install -g firebase-tools`)
3. Login Firebase (`firebase login`)

Avvio rapido hosting locale (da root progetto):

```bash
firebase serve --only hosting
```

oppure:

```bash
firebase emulators:start --only hosting
```

Cloud Functions (attualmente boilerplate):

```bash
cd functions
npm install
npm run serve
```

## 11. Deploy
Deploy hosting:

```bash
firebase deploy --only hosting
```

Deploy functions (solo dopo configurazione completa in `firebase.json` e funzioni exportate):

```bash
cd functions
npm run deploy
```

Nota: `firebase.json` attuale non contiene sezione `functions`; prima del deploy funzioni va aggiunta la relativa configurazione.

## 12. Limiti e Note di Manutenzione
- Nella root esiste anche `new_index_CHANGES REVISED.html` fuori da `public/`; Firebase Hosting serve solo i file in `public/`.
- Molta logica e duplicata inline in piu pagine: utile pianificare una refactor in moduli condivisi.
- Alcuni script legacy o di prova risultano presenti (`progressBar.js`, `transizione.js`, `bg_drag_prova.js`) e potrebbero non essere usati nel flusso principale.
- `functions/index.js` non esporta endpoint HTTP attivi.

## 13. Possibili Miglioramenti
1. Centralizzare JS condiviso per ridurre duplicazioni.
2. Aggiungere test minimi per routing e variazioni stato.
3. Definire regole Realtime Database compatibili con l'uso frontend.
4. Allineare il flusso onboarding (`IDENTITY_QUEST` vs `welcome`) eliminando redirect concorrenti.
5. Introdurre una vera pipeline di build/lint anche per `public/`.
