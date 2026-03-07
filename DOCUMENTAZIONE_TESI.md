# CYBERMED - Descrizione Sintetica per Tesi

## Abstract
Il progetto **CYBERMED** e una web experience interattiva che esplora il rapporto tra utente, avatar e identita digitale attraverso una narrazione ipertestuale. L'applicazione guida il soggetto in un percorso composto da scelte, micro-interazioni e task visuali, producendo una dinamica adattiva basata su uno stato interno persistente.  
L'obiettivo e simulare, in chiave artistico-critica, come i comportamenti digitali possano alterare la rappresentazione del se online.

## Obiettivi del Progetto
1. Progettare un ambiente web narrativo che combini estetica, interazione e logica computazionale.
2. Modellare il comportamento utente tramite un sistema di punteggi incrementali.
3. Dimostrare un routing dinamico delle pagine in funzione dello stato corrente.
4. Integrare una persistenza locale e una sincronizzazione remota su Firebase Realtime Database.
5. Evidenziare, sul piano concettuale, i temi di frammentazione e trasformazione dell'identita virtuale.

## Architettura Tecnica
L'architettura segue un modello **frontend statico + persistenza client-side + backend leggero**.

- Frontend: pagine HTML/CSS/JavaScript vanilla ospitate nella cartella `public/`
- Modulo di stato: `public/state_model.js`
- Routing contestuale: `public/options.js`, `public/new_index_CHANGES REVISED.js`
- Interazioni specifiche: `dragndrop.js`, `counter.js`, `timer.js`
- Backend dati: Firebase Realtime Database via chiamate REST (`fetch`)
- Hosting: Firebase Hosting (`firebase.json`)

Le Cloud Functions sono presenti come scaffolding (`functions/`), ma nello stato attuale non espongono endpoint applicativi attivi.

## Modello Logico di Stato
Il progetto utilizza un modello triadico associato a tre archetipi narrativi:

- `Egregore`
- `Trasmigrator`
- `Inmate`

Ogni azione invoca la funzione `Variazione(code)`, che aggiorna i tre punteggi con delta predefiniti e mantiene i valori entro un intervallo `[0, 100]`.  
Il routing successivo seleziona la pagina coerente con il punteggio dominante (soglia principale: `> 50`).

## Flusso di Navigazione
Percorso base:

1. `index.html` (ingresso)
2. `IDENTITY_QUEST.html` (onboarding: status utente + durata sessione)
3. `new_index_CHANGES REVISED.html` (hub centrale)
4. Accesso alle tre aree funzionali:
   - `controindicazioni*.html`
   - `dosaggio*.html`
   - `draggable_cards*.html`
5. Ritorno dinamico verso la pagina archetipo (`egregore.html`, `transmigrator.html`, `inmate.html`) o fallback all'hub.

## Persistenza e Tracciamento
Il sistema conserva informazioni in `localStorage` e `sessionStorage`, tra cui:

- stato applicativo (`cybermid_state_model_v1`)
- id sessione utente
- cronologia sintetica delle uscite (`totalSum`)
- configurazione timer (`timerData`)
- dati interattivi delle card nelle pagine draggable

In parallelo, lo stato puo essere sincronizzato su Firebase Realtime Database nel path `sessioni`, tramite `putToFirebase`/`loadFromFirebase`.

## Componenti Interattive Principali
- **Timer globale**: limita la durata della sessione e blocca la navigazione alla scadenza.
- **Drag and drop**: utilizzato nelle pagine di controindicazioni per classificare elementi visivi.
- **Dosaggio testuale**: punti cliccabili e popup con commenti persistenti.
- **Lavagna card**: creazione, modifica, ridimensionamento e rimozione di card con persistenza locale.

## Considerazioni su Sicurezza e Limiti
- Le regole Realtime Database correnti (`database.rules.json`) sono impostate a `.read: false` e `.write: false`; se deployate, impediscono la scrittura dal frontend.
- Le regole Firestore risultano temporanee e aperte fino a data di scadenza (`firestore.rules`).
- Parte della logica JavaScript e duplicata in pagine multiple, con conseguente maggiore costo manutentivo.

## Sviluppi Futuri
1. Refactoring dei blocchi JS duplicati in moduli condivisi.
2. Introduzione di test automatici su routing e stato.
3. Revisione delle security rules Firebase in ottica production.
4. Uniformazione completa del flusso onboarding tra `IDENTITY_QUEST` e `welcome`.
5. Aggiunta di una pipeline di lint/build dedicata anche al frontend statico.

## Conclusione
CYBERMED costituisce un prototipo ibrido tra arte digitale e applicazione web interattiva, in cui la componente narrativa e sostenuta da un sistema computazionale semplice ma efficace. Il progetto dimostra come meccanismi di stato, routing dinamico e persistenza possano essere impiegati per tradurre concetti critici sull'identita digitale in un'esperienza partecipativa e misurabile.
