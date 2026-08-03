-- Una relazione pubblicata non si tocca più, e il divieto sta nel DATABASE.
--
-- È il documento che il consulente consegna al consiglio, al cliente o a un ispettore, e
-- l'unica cosa del prodotto che qualcuno leggerà fra due anni, quando i dati saranno
-- cambiati e nessuno ricorderà com'erano. Se il programma potesse riscriverla non
-- certificherebbe niente: «relazione del 3 agosto» varrebbe quanto la parola di chi la
-- mostra.
--
-- Il trigger e non una revoca di privilegi, per la stessa ragione dei registri append-only:
-- in questo modello di distribuzione l'applicazione si collega spesso come proprietario
-- dello schema, e un GRANT non la fermerebbe. Il trigger ferma chiunque, compreso chi entra
-- con psql.
--
-- La bozza invece si rifà quante volte si vuole: è lì che si controlla prima di firmare.
-- L'unico passaggio consentito è bozza → pubblicata, e in quel momento si scrive la data.

CREATE OR REPLACE FUNCTION vieta_modifica_relazione_pubblicata() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.stato = 'pubblicata' THEN
      RAISE EXCEPTION
        'La relazione n. % è pubblicata: non si elimina. Un atto consegnato non si ritira dal registro.',
        OLD.numero
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.stato = 'pubblicata' THEN
    -- Passare da pubblicata a qualsiasi cosa è vietato, e lo è anche cambiare i numeri
    -- lasciando lo stato dov'è: sarebbe il modo elegante di riscrivere il passato.
    RAISE EXCEPTION
      'La relazione n. % è pubblicata: il suo contenuto è congelato. Se i dati sono cambiati se ne genera una nuova.',
      OLD.numero
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Da bozza si può solo restare bozza o pubblicare. E pubblicando, lo snapshot deve
  -- restare quello verificato: cambiarlo nello stesso momento renderebbe la firma una
  -- firma su un altro documento.
  IF NEW.stato = 'pubblicata' AND NEW.hash_snapshot IS DISTINCT FROM OLD.hash_snapshot THEN
    RAISE EXCEPTION
      'Non si può pubblicare cambiando lo snapshot nello stesso momento: si firmerebbe un documento diverso da quello riletto.'
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER report_immutabile
  BEFORE UPDATE OR DELETE ON report
  FOR EACH ROW EXECUTE FUNCTION vieta_modifica_relazione_pubblicata();

-- Il progressivo è per azienda e non globale: «Relazione n. 3 del 2026» si cita così, e
-- due aziende diverse hanno ciascuna la propria numerazione.
CREATE UNIQUE INDEX report_numero_per_azienda ON report (client_company_id, numero);
