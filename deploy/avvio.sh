#!/bin/sh
# L'avvio di un'istanza: prima lo schema, poi il server.
#
# L'ordine è la cosa che conta. Un server che parte prima delle migrazioni risponde con uno
# schema a metà, e uno schema a metà non dà errore subito — lo dà la prima volta che
# qualcuno apre la pagina sbagliata, quando ormai ha scritto dati.
#
# LE MIGRAZIONI GIRANO ANCHE QUI, non solo nel servizio `preparazione` che le applica alla
# prima installazione. Non è una ripetizione inutile: il caso che si vuole coprire è
# l'AGGIORNAMENTO, quando si tira un'immagine nuova su un'istanza già viva e nessuno pensa
# a lanciare un comando a parte. Il migratore tiene la propria tabella di controllo e salta
# ciò che ha già fatto, quindi il costo di riprovarci a ogni riavvio è una query.
#
# `set -e`: qualunque passo fallisca, il contenitore muore e Docker lo riavvia. Un'istanza
# che parte «quasi bene» è il modo in cui un cliente scopre un guasto tre settimane dopo.

set -e

echo "→ migrazioni"
node /migratore/migra.mjs

echo "→ server"
exec node ./apps/web/server.js
