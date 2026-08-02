-- Append-only imposto dal DATABASE, non dal codice applicativo.
--
-- `audit_log` e `instance_history` sono i due registri su cui si regge la dimostrabilità:
-- l'audit dice chi ha fatto cosa, lo storico rende VERO il trend che nei prototipi era
-- generato con aritmetica sul dato di oggi (e nel 231 con Math.random()).
--
-- Un registro che il codice può riscrivere non è un registro. Si usa un trigger e non una
-- revoca di privilegi perché in questo modello di distribuzione l'applicazione si collega
-- spesso come proprietario dello schema, e un GRANT non lo fermerebbe: il trigger sì, per
-- chiunque, compreso chi entra con psql.

CREATE OR REPLACE FUNCTION vieta_modifica_registro() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'La tabella % è append-only: % non è consentito. Si aggiunge una riga, non si corregge il passato.',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION vieta_modifica_registro();

CREATE TRIGGER instance_history_append_only
  BEFORE UPDATE OR DELETE ON instance_history
  FOR EACH ROW EXECUTE FUNCTION vieta_modifica_registro();

-- Coerenza del modello: un adempimento escluso deve dire perché.
-- È il controllo che impedisce di pubblicare una relazione con esclusioni non spiegate,
-- e vale anche per chi scrive direttamente sul database.
ALTER TABLE obligation_instance
  ADD CONSTRAINT obligation_instance_na_motivata
  CHECK (
    stato <> 'Non applicabile'
    OR (motivazione_non_applicabile IS NOT NULL AND length(trim(motivazione_non_applicabile)) > 0)
  );

-- La periodicità «periodica» richiede i mesi; le altre non li ammettono.
-- Senza questo vincolo si può salvare un adempimento periodico senza cadenza, e la scadenza
-- non si deriva più: l'obbligo sparisce silenziosamente dallo scadenzario.
ALTER TABLE obligation_template
  ADD CONSTRAINT obligation_template_periodicita_coerente
  CHECK (
    (periodicita_tipo = 'periodica' AND periodicita_mesi IS NOT NULL AND periodicita_mesi > 0)
    OR (periodicita_tipo <> 'periodica' AND periodicita_mesi IS NULL)
  );

-- Il collegamento fra domini deve attraversarli davvero: un arco che resta dentro un solo
-- dominio non è un ponte, è una duplicazione mascherata.
CREATE OR REPLACE FUNCTION vieta_collegamento_interno() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  dominio_da text;
  dominio_a  text;
BEGIN
  SELECT dominio INTO dominio_da FROM obligation_template WHERE id = NEW.da_template_id;
  SELECT dominio INTO dominio_a  FROM obligation_template WHERE id = NEW.a_template_id;
  IF dominio_da = dominio_a THEN
    RAISE EXCEPTION 'Collegamento interno al dominio %: un ponte deve attraversare due decreti.', dominio_da
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER obligation_link_cross_dominio
  BEFORE INSERT OR UPDATE ON obligation_link
  FOR EACH ROW EXECUTE FUNCTION vieta_collegamento_interno();
