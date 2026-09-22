# L'immagine di un'istanza cliente.
#
# Un deploy dedicato per cliente dietro Caddy, sul modello di WhistleBlower. Non è un SaaS
# multi-cliente messo in un contenitore: è la stessa applicazione, con il suo database e i
# suoi volumi, che gira per un solo studio.
#
# TRE STADI, e ognuno esiste per una ragione misurabile:
#
#   dipendenze  scarica i pacchetti UNA VOLTA, e cambia solo quando cambiano i lockfile.
#               Copiare i sorgenti prima di `pnpm install` significherebbe riscaricare
#               tutto a ogni virgola cambiata in un componente.
#   compilato   costruisce l'output `standalone` di Next: il server e i soli moduli che
#               traccia davvero, invece dell'intero `node_modules`.
#   istanza     l'immagine che gira. Ha Chromium (serve ai PDF) e nient'altro: niente
#               pnpm, niente compilatore, niente sorgenti.
#
# COMPILARE NON RICHIEDE UN DATABASE, e non è scontato: fino a ieri questo progetto apriva
# la connessione all'importazione del modulo, quindi `next build` pretendeva una
# `DATABASE_URL` vera. Un'immagine si costruisce prima di sapere a quale database parlerà,
# e i segreti di un cliente non devono mai entrare in un contesto di build.

# ---------------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS dipendenze
WORKDIR /costruzione
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Solo i manifesti: questo strato si riusa finché i lockfile non cambiano.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/engine/package.json ./packages/engine/
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS compilato
WORKDIR /costruzione
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY --from=dipendenze /costruzione/node_modules ./node_modules
COPY --from=dipendenze /costruzione/apps/web/node_modules ./apps/web/node_modules
COPY --from=dipendenze /costruzione/packages/engine/node_modules ./packages/engine/node_modules
COPY . .

# `NEXT_TELEMETRY_DISABLED`: un'istanza di un cliente non chiama casa. Vale come principio
# in un prodotto che vende conformità, non come ottimizzazione.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ---------------------------------------------------------------------------------------
# Gli STRUMENTI di prima installazione: creare l'amministratore, seminare il catalogo,
# generare le credenziali di consegna. Girano una volta sola, all'onboarding di un cliente,
# e non hanno niente a che fare con il servizio che sta in piedi.
#
# Vivono in un'immagine a parte perché hanno bisogno dei SORGENTI TypeScript e di `tsx`:
# metterli nell'immagine di servizio significherebbe trascinarsi un compilatore e l'intero
# `node_modules` dentro ciò che gira ventiquattro ore al giorno, per comandi che si usano
# il primo giorno. È la stessa divisione del riferimento WhistleBlower, dove `init_db.py`
# gira nell'immagine che ha già tutto.
FROM compilato AS strumenti
WORKDIR /costruzione
ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm --filter web db:migrate && pnpm --filter web db:bootstrap && pnpm --filter web db:seed"]

# ---------------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS istanza
WORKDIR /app

# Chromium di sistema, per i PDF. Il driver `local` lo usa attraverso `PDF_CHROMIUM_PATH`:
# su Vercel si usa il Chromium compresso di @sparticuz, che qui sarebbe solo un peso.
#
# I font NON sono un dettaglio: un Chromium senza font di sistema rende i PDF con caratteri
# di ripiego, e lo spike della Fase 0 lo ha scoperto sul serverless. Il documento incorpora
# comunque i propri font — questi servono a tutto il resto, a partire dai fogli di stile.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       chromium \
       fonts-liberation \
       ca-certificates \
       postgresql-client \
       tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PDF_DRIVER=local
ENV PDF_CHROMIUM_PATH=/usr/bin/chromium
# I nomi sono quelli dello schema di `lib/env.ts`, e non un'approssimazione.
#
# `STORAGE_PATH` non lo leggeva NESSUNO: zod scarta le chiavi sconosciute in silenzio, e
# l'archivio ripiegava su `process.cwd()/.archivio` = `/app/.archivio`, cioè il layer
# effimero del contenitore invece del volume montato qui sotto. Le evidenze sparivano a ogni
# `up --build`, e `backup.sh` ne salvava zero senza lamentarsi: il database continuava a
# dichiarare l'impronta di file che non esistevano più.
#
# `disk` era peggio ancora, perché non è un ripiego ma un ERRORE: l'enum ammette `blob` e
# `fs`, la validazione falliva all'importazione del modulo e il contenitore moriva a ogni
# avvio. Non si era mai visto perché questa immagine non era mai stata avviata fino in fondo.
ENV STORAGE_DRIVER=fs
ENV ARCHIVIO_RADICE=/dati/archivio

# L'output `standalone` porta con sé il server e i moduli tracciati. `static` e `public`
# restano fuori dalla tracciatura e vanno copiati a parte: senza, l'applicazione parte e
# risponde senza un solo foglio di stile — ed è un guasto che sembra di rendering.
COPY --from=compilato /costruzione/apps/web/.next/standalone ./
COPY --from=compilato /costruzione/apps/web/.next/static ./apps/web/.next/static
COPY --from=compilato /costruzione/apps/web/public ./apps/web/public

# CIO' CHE `standalone` SI PORTA DIETRO E NON DEVE RESTARE.
#
# L'intestazione di questo stadio promette «Chromium e nient'altro: niente pnpm, niente
# compilatore, niente sorgenti». Non era vero, e non si vede leggendo il Dockerfile: si vede
# solo elencando `.next/standalone/apps/web` dopo una build. Dentro ci sono `src/` per
# intero, i sette script di collaudo — fra cui `percorso.mjs`, che contiene la sequenza di
# accesso automatizzato all'applicazione — e le configurazioni di Playwright e Vitest.
#
# Non e' sfruttabile da solo: Playwright non e' installato qui e non ci sono segreti dentro.
# Ma e' superficie inutile su una macchina che non controlliamo, e spiega a chiunque legga
# l'immagine come si entra nell'applicazione e con quale utenza.
#
# SI CANCELLA QUI, e non con `outputFileTracingExcludes` in `next.config.ts`: quella via e'
# stata provata e NON funziona: la copia della cartella dell'applicazione dentro
# `standalone` non passa dalla tracciatura, e la configurazione sarebbe rimasta a dichiarare
# una cosa che non faceva. Una riga di configurazione decorativa e' peggio di una assente.
#
# Le evidenze (`.archivio`) non compaiono qui perche' le ferma gia' il `.dockerignore`: non
# entrano nel contesto, quindi Next non le trova da copiare. Il `.gitignore` non basterebbe,
# perche' il contesto di build e' il filesystem e non l'indice di git.
RUN rm -rf ./apps/web/src \
           ./apps/web/scripts \
           ./apps/web/.archivio \
           ./apps/web/playwright.config.ts \
           ./apps/web/vitest.config.ts \
           ./apps/web/drizzle.config.ts \
           ./apps/web/eslint.config.mjs \
           ./apps/web/postcss.config.mjs \
           ./apps/web/components.json \
           ./apps/web/tsconfig.json \
           ./apps/web/tsconfig.tsbuildinfo

# IL MIGRATORE, CON LE PROPRIE DIPENDENZE.
#
# `migra.mjs` importa `drizzle-orm` e `postgres` come PACCHETTI, e il suo commento diceva
# che «stanno gia' nell'immagine perche' l'applicazione li importa». Non e' vero, e non si
# vede leggendo: Next li IMPACCHETTA dentro `.next/server`, non li copia in `node_modules`.
# Nell'immagine costruita non c'era ne' `drizzle-orm` ne' `postgres`.
#
# L'effetto era un crash-loop muto. `avvio.sh` ha `set -e`: il fallimento delle migrazioni
# uccideva il contenitore, Docker lo riavviava, e l'applicazione non ha MAI servito una
# richiesta. Si e' scoperto al primo avvio vero dell'immagine.
#
# Le versioni si leggono da `apps/web/package.json`, che resta l'unica fonte: scriverle qui
# a mano sarebbero due posti che divergono al primo aggiornamento.
#
# Sta in una cartella PROPRIA e non in `/app` perche' la risoluzione ESM non guarda
# `NODE_PATH`: un modulo si cerca a partire dalla cartella del file che lo importa.
COPY --from=compilato /costruzione/apps/web/package.json /tmp/web.json
RUN mkdir -p /migratore && cd /migratore   && npm install --omit=dev --no-audit --no-fund --loglevel=error        "drizzle-orm@$(node -p "require('/tmp/web.json').dependencies['drizzle-orm']")"        "postgres@$(node -p "require('/tmp/web.json').dependencies['postgres']")"   && rm /tmp/web.json

# Le migrazioni restano fuori dal bundle perche' sono file di dati, non moduli importati:
# la tracciatura di Next non le vedrebbe mai.
COPY --from=compilato /costruzione/apps/web/src/lib/db/migrations /migratore/migrazioni
COPY deploy/migra.mjs /migratore/migra.mjs
COPY deploy/avvio.sh ./avvio.sh
RUN chmod +x ./avvio.sh

# NON SI GIRA DA ROOT. `node` esiste già nell'immagine ufficiale; gli si dà la proprietà
# solo di ciò che deve scrivere.
RUN mkdir -p /dati/archivio && chown -R node:node /dati /app
USER node

EXPOSE 3000

# `tini` come PID 1: senza, i processi figli di Chromium restano zombie a ogni PDF, e
# un'istanza che ne genera qualche decina al giorno esaurisce la tabella dei processi.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./avvio.sh"]
