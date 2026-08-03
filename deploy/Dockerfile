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
ENV STORAGE_DRIVER=disk
ENV STORAGE_PATH=/dati/archivio

# L'output `standalone` porta con sé il server e i moduli tracciati. `static` e `public`
# restano fuori dalla tracciatura e vanno copiati a parte: senza, l'applicazione parte e
# risponde senza un solo foglio di stile — ed è un guasto che sembra di rendering.
COPY --from=compilato /costruzione/apps/web/.next/standalone ./
COPY --from=compilato /costruzione/apps/web/.next/static ./apps/web/.next/static
COPY --from=compilato /costruzione/apps/web/public ./apps/web/public

# Le migrazioni e chi le applica. Restano fuori dal bundle perché sono file di dati, non
# moduli importati: la tracciatura di Next non le vedrebbe mai.
COPY --from=compilato /costruzione/apps/web/src/lib/db/migrations ./migrazioni
COPY deploy/migra.mjs ./migra.mjs
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
