# WikiBlank

Elaborato progettuale di **Tecnologie Web** (A.A. 2025/26) — **Traccia 4.B: WebTech's WikiBlank**.

WikiBlank è una piattaforma web ispirata al gioco dell'impiccato e basata su articoli enciclopedici: per ogni partita il sistema sceglie a caso una voce di Wikipedia e ne mostra il testo con **tutte le parole oscurate**. Il giocatore propone una parola alla volta (se compare nel testo viene rivelata in **tutte** le sue occorrenze) e può in qualsiasi momento provare a indovinare il **titolo**. La partita termina quando il titolo è corretto oppure quando il giocatore abbandona.

```
.
├── backend/    REST API (Node.js, Express, Sequelize + SQLite, JWT)
├── frontend/   Single Page Application (Angular) + test (unit ed End-to-End con Playwright)
└── README.md
```

## Requisiti della traccia e dove sono soddisfatti

| Requisito | Implementazione |
|---|---|
| Articolo casuale da API esterne, con testo oscurato | `backend/src/services/wiki/wikipediaProvider.js` (MediaWiki Action API, modulo `random` usato come generator: `rnnamespace=0`, `rnfilterredir=nonredirects`, `rnminsize`/`rnmaxsize`, più `prop=extracts` per il testo). Si scartano anche le voci con introduzione troppo breve/lunga o titolo lungo e si ritenta |
| Parola indovinata rivelata in tutte le occorrenze | `backend/src/services/gameEngine.js` (confronto senza distinzione di maiuscole e accenti) |
| Indovinare il titolo in qualsiasi momento; fine partita con titolo corretto o abbandono | `POST /games/{id}/title-guesses`, `POST /games/{id}/abandon` |
| **Stato della partita persistente lato server** (si riprende da un altro dispositivo) | Ogni partita è salvata nel database (tabella `Games`); il client non conserva nulla. Le partite in corso si riprendono da *Gioca → Riprendi* |
| Utenti registrati avviano le partite | Registrazione e login con JWT; `POST /games` richiede autenticazione |
| Utenti anche non registrati consultano le partite concluse e i dettagli (testo parzialmente scoperto, titolo corretto, tentativi, tempo) | Pagine pubbliche *Partite concluse* e *Dettaglio partita* (`GET /games`, `GET /games/{id}`) |
| Classifica in base al tempo medio per indovinare il titolo e al numero di partite vinte | `GET /rankings?sort=average-time\|won-games` e pagina *Classifica* |
| Back-end con API REST + front-end SPA responsive, con framework | Express + Angular; layout adattivo con media query (menu a hamburger su mobile) |
| Almeno 10 test End-to-End automatici | **40 test E2E web** + **41 test E2E della REST API** (Playwright) |
| Nessun CMS | — |

Il testo completo e il titolo di una partita **in corso non lasciano mai il server**: il client riceve solo il testo oscurato (le parole nascoste sono inviate come sola lunghezza). Questo impedisce di barare ispezionando le risposte di rete.

## Avvio dell'applicazione

Requisiti: **Node.js ≥ 20** (sviluppato con Node 22) e npm.

### 1. Back-end (REST API)

```bash
cd backend
npm install
cp .env.example .env        # facoltativo; in sviluppo, senza .env, il JWT_SECRET è casuale
npm start                   # http://localhost:3000
```

Variabili principali (`backend/.env.example`):

| Variabile | Significato |
|---|---|
| `JWT_SECRET` | Segreto per firmare i token. **Obbligatorio** con `NODE_ENV=production` |
| `DB_STORAGE` | File SQLite (default `./data/wikiblank.sqlite`; il file viene creato al primo avvio) |
| `FRONTEND_ORIGIN` | Origine consentita da CORS (default `http://localhost:4200`) |
| `WIKI_SOURCE` | `wikipedia` (default, serve Internet) oppure `fixtures` (6 articoli locali, per demo offline) |
| `WIKI_LANG` | Lingua di Wikipedia (default `it`) |

> **Demo senza Internet:** `WIKI_SOURCE=fixtures npm start`.

### 2. Front-end (Angular)

```bash
cd frontend
npm install
npm start                   # http://localhost:4200
```

Il front-end contatta il back-end all'indirizzo `http://localhost:3000` (costante `API_URL` in `frontend/src/app/config.ts`).

Per aprire l'app: <http://localhost:4200> → *Registrati* → *Accedi* → *Gioca → Nuova partita*.

## Test

### Test End-to-End (Playwright, TypeScript)

I test E2E sono in `frontend/e2e/`:

- `e2e/web/` — **test E2E web** (browser reale): registrazione/login/logout, rotte protette, avvio partita, parole indovinate/assenti/ripetute, validazione, titolo errato/corretto, abbandono, ripresa della partita dopo ricaricamento **e da un secondo contesto del browser (altro dispositivo)**, pagine pubbliche, classifica, layout mobile, pagina 404, **input vuoti** e **attacchi XSS**;
- `e2e/api/` — **test E2E della REST API**: richieste HTTP e verifica di codici di stato e corpi (registrazione, login con JWT, autorizzazioni 401/403, regole del gioco, paginazione e filtri, classifica, input vuoti e payload XSS).

```bash
cd frontend
npx playwright install          # una tantum: scarica i browser (chromium, firefox)
npm run e2e                     # esegue tutto (avvia da solo back-end di test e front-end)
npm run e2e:api                 # solo test della REST API
npm run e2e:web                 # solo test web
npm run e2e:report              # apre il report HTML
```


- **Isolamento**: ogni test gira in un `BrowserContext` nuovo (storage e cookie puliti) e crea i propri utenti con username univoci tramite API; nessuna dipendenza dall'ordine di esecuzione, quindi i test sono eseguiti in parallelo.
- **Determinismo / niente flakiness**: durante i test il back-end usa gli articoli locali (`WIKI_SOURCE=fixtures`, `WIKI_FIXTURE_MODE=fixed`, titolo sempre «Vesuvio») e un database in memoria. Si usano le *auto-waiting assertion* di Playwright (`expect(locator)...`), mai attese fisse.
- **Locator robusti** (layout-based): `getByRole`, `getByLabel`, `getByTestId` invece di coordinate o selettori CSS posizionali.
- Il test web non ripete il login in ogni scenario: la fixture `authedPage` inietta la sessione già ottenuta via API (il login via interfaccia ha test dedicati).
- Il back-end di test usa la porta **3000**: fermare l'eventuale back-end di sviluppo prima di lanciare i test.

### Unit test

```bash
cd frontend && npm test         # unit test Angular (Vitest + TestBed): 31 test
cd backend  && npm test         # unit test del motore di gioco e del provider Wikipedia con fetch simulato (node:test): 13 test
```

I test dei componenti usano **test double** (spy) al posto dei servizi reali (`ApiService`), così verificano un'unità in isolamento, senza dipendere dalla REST API.

## Architettura del back-end

```
backend/src/
├── app.js, server.js, config.js, db.js
├── models/          User, Game (Sequelize)
├── routes/          authRoutes, gameRoutes, rankingRoutes
├── controllers/     authController, gameController, rankingController
├── middleware/      auth (JWT), errors, rateLimit
└── services/        gameEngine (logica pura), wiki/ (provider Wikipedia e fixtures)
```

La specifica della API è in `backend/openapi.yaml` (OpenAPI 3.1).

### Endpoint

| Metodo e URI | Descrizione | Accesso |
|---|---|---|
| `POST /users` | Registra un utente | pubblico |
| `POST /login` | Login, restituisce un JWT | pubblico |
| `GET /games?status=&player=&page=&size=` | Elenco paginato (di default le partite concluse) | pubblico (`status=in-progress`: solo proprie) |
| `POST /games` | Avvia una nuova partita | autenticato |
| `GET /games/{id}` | Dettagli di una partita | pubblico se conclusa, altrimenti solo proprietario |
| `POST /games/{id}/word-guesses` | Propone una parola | proprietario |
| `POST /games/{id}/title-guesses` | Propone il titolo | proprietario |
| `POST /games/{id}/abandon` | Abbandona la partita | proprietario |
| `GET /rankings?sort=average-time\|won-games` | Classifica | pubblico |

### Regole di progettazione REST rispettate

| Regola | Applicazione |
|---|---|
| 401 per problemi di credenziali | Credenziali errate, token assente/non valido/scaduto → `401`. Operazioni non consentite a un utente autenticato → `403` |
| Nomi plurali per collezioni/store, singolari per i documenti | `/users`, `/games`, `/rankings`, `/games/{id}/word-guesses`, `/games/{id}/title-guesses`; il documento è identificato da `{id}` |
| Nomi dei controller con un verbo | `/login`, `/games/{id}/abandon` |
| Niente slash finale negli URI | Nessun URI termina con `/` |
| Niente nomi di funzioni CRUD negli URI | Nessun `create`, `get`, `update`, `delete`: si usano i metodi HTTP (es. la registrazione è `POST /users`) |
| Slash per le relazioni gerarchiche | `/games/{id}/word-guesses` (i tentativi appartengono a una partita) |
| `GET` solo per recuperare rappresentazioni | Tutte le operazioni che modificano lo stato usano `POST` |
| URI minuscoli, senza underscore, trattini per la leggibilità | `word-guesses`, `title-guesses`; valori dei filtri come `average-time`, `won-games`, `in-progress` |
| Query string per filtrare e paginare | `GET /games?status=won&player=mario&page=2&size=10` |
| API stateless | Nessuna sessione lato server: autenticazione con JWT nell'header `Authorization: Bearer` |
| Formato di errore uniforme | `{ "code": 404, "description": "..." }` |

Codici di stato usati: `200`, `201` (con header `Location` alla creazione di una partita), `400`, `401`, `403`, `404`, `409` (username già usato, parola già provata, partita già conclusa), `413`, `429`, `502` (servizio Wikipedia non disponibile).

## Sicurezza 

- **Autenticazione e autorizzazione**: JWT (HS256, scadenza 24 h) con algoritmo fissato in verifica; password con hash **bcrypt**; controllo di proprietà sulle partite (403 per le partite altrui). Risposte di login identiche per utente inesistente e password errata, con confronto bcrypt sempre eseguito (nessuna user enumeration via tempi di risposta). Il token è nell'header `Authorization` e non in un cookie: l'API non è soggetta a **CSRF**.
- **Input vuoti**: ogni campo vuoto (o composto solo da spazi) è bloccato dalla validazione lato client con un messaggio, senza inviare nulla; il server rifiuta comunque con `400` stringhe vuote, mancanti o di soli spazi.
- **Attacchi XSS testati**: test automatici inseriscono `<script>alert("xss")</script>`, `<img onerror=...>` e `<svg onload=...>` in login, registrazione, parole, titolo, filtro per giocatore, percorso e query string degli URL, verificando che non compaia alcun `alert`, che il markup non venga iniettato e che il server non rifletta il payload nelle risposte.
- **Validazione lato server di ogni input** (username, password, parole, titolo, parametri di paginazione e filtro): il client non è mai considerato affidabile; la validazione lato client serve solo per l'usabilità.
- **SQL injection**: nessuna query SQL costruita a mano; tutto passa dall'ORM Sequelize con query parametrizzate.
- **XSS**: Angular esegue l'escaping di ogni valore interpolato; non si usa `bypassSecurityTrust*`, `innerHTML` né `eval`. Il testo degli articoli è reso solo tramite interpolazione.
- **CORS**: solo le origini del front-end (`FRONTEND_ORIGIN`), non `*`. Intestazioni di sicurezza con **helmet**.
- **Rate limiting** su login (brute-force) e sulla creazione di partite (ogni partita genera una richiesta verso Wikipedia). Limite di 10 kB sul corpo delle richieste.
- **Nessuna fuga di informazioni di gioco**: titolo e testo completo di una partita in corso restano sul server.
- Errori `5xx` loggati sul server ma restituiti al client con un messaggio generico.

## Scelte di gioco

- **Parole**: un tentativo è una singola parola (lettere/cifre); il confronto ignora maiuscole e accenti («Università» = «universita»). Le parole dell'articolo sono tutte oscurate, numeri compresi.
- **Tentativi**: ogni parola nuova e ogni titolo proposto contano come un tentativo (le parole ripetute vengono rifiutate e *non* contano).
- **Tempo**: durata «a muro» tra l'avvio della partita e la sua conclusione.
- **Classifica**: contano solo le partite vinte. Con `sort=average-time` si ordina per tempo medio crescente (a parità, più vittorie); con `sort=won-games` per numero di vittorie decrescente (a parità, tempo medio inferiore).
- **Articoli**: introduzione dell'articolo in testo semplice, tra 600 e 4000 caratteri, titolo di al massimo 5 parole/40 caratteri e senza pagine di disambiguazione. La selezione avviene lato server, quindi il browser non contatta mai Wikipedia.
