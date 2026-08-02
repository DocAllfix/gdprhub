CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'consulente' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'consulente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_version" (
	"id" text PRIMARY KEY NOT NULL,
	"etichetta" text NOT NULL,
	"versione_app" text NOT NULL,
	"attiva" text DEFAULT 'no' NOT NULL,
	"seminata_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_version_etichetta_unique" UNIQUE("etichetta")
);
--> statement-breakpoint
CREATE TABLE "obligation_link" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog_version_id" text NOT NULL,
	"da_template_id" text NOT NULL,
	"a_template_id" text NOT NULL,
	"tipo" text NOT NULL,
	"riferimento" text NOT NULL,
	"motivo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligation_template" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog_version_id" text NOT NULL,
	"dominio" text NOT NULL,
	"codice" text NOT NULL,
	"titolo" text NOT NULL,
	"descrizione" text NOT NULL,
	"nota" text,
	"riferimento" text NOT NULL,
	"categoria" text NOT NULL,
	"ruolo" text NOT NULL,
	"periodicita_tipo" text NOT NULL,
	"periodicita_mesi" integer,
	"priorita_default" text NOT NULL,
	"rischio_default" integer
);
--> statement-breakpoint
CREATE TABLE "reato_presidio" (
	"id" text PRIMARY KEY NOT NULL,
	"reato_id" text NOT NULL,
	"template_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reato_presupposto" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog_version_id" text NOT NULL,
	"articolo" text NOT NULL,
	"titolo" text NOT NULL,
	"interdittive" text NOT NULL,
	"nota" text
);
--> statement-breakpoint
CREATE TABLE "sanction_parameter" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog_version_id" text NOT NULL,
	"dominio" text NOT NULL,
	"chiave" text NOT NULL,
	"valore" jsonb NOT NULL,
	"fonte" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_company_id" text NOT NULL,
	"dominio" text NOT NULL,
	"catalog_version_id" text NOT NULL,
	"titolo" text NOT NULL,
	"data_riferimento" text NOT NULL,
	"stato" text DEFAULT 'in_corso' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" text,
	"user_id" text,
	"azione" text NOT NULL,
	"entita" text,
	"entita_id" text,
	"dettagli" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_company" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"nome" text NOT NULL,
	"piva" text,
	"codice_fiscale" text,
	"ateco" text,
	"settore" text,
	"sede" text,
	"fatturato_annuo" integer,
	"numero_dipendenti" integer,
	"stato" text DEFAULT 'active' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"logo_storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_module" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_company_id" text NOT NULL,
	"dominio" text NOT NULL,
	"attivo" boolean DEFAULT true NOT NULL,
	"attivato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"obligation_instance_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"nome_file" text NOT NULL,
	"mime" text NOT NULL,
	"dimensione" integer NOT NULL,
	"hash_sha256" text NOT NULL,
	"versione" integer DEFAULT 1 NOT NULL,
	"valido_dal" text,
	"valido_al" text,
	"caricato_da" text,
	"caricato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"profilo" text DEFAULT 'consulente' NOT NULL,
	"mode" text DEFAULT 'full' NOT NULL,
	"brand_nome" text,
	"brand_logo_storage_key" text,
	"brand_colore" text,
	"catalog_version_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instance_config_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "instance_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"obligation_instance_id" text NOT NULL,
	"campo" text NOT NULL,
	"da" text,
	"a" text,
	"user_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obligation_instance" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"assessment_id" text NOT NULL,
	"template_id" text NOT NULL,
	"dominio" text NOT NULL,
	"codice" text NOT NULL,
	"stato" text DEFAULT 'Da fare' NOT NULL,
	"motivazione_non_applicabile" text,
	"ultima_esecuzione" text,
	"periodicita_tipo_override" text,
	"periodicita_mesi_override" integer,
	"scadenza_esplicita" text,
	"priorita" text NOT NULL,
	"rischio" integer,
	"owner_user_id" text,
	"owner_esterno" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_link" ADD CONSTRAINT "obligation_link_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_link" ADD CONSTRAINT "obligation_link_da_template_id_obligation_template_id_fk" FOREIGN KEY ("da_template_id") REFERENCES "public"."obligation_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_link" ADD CONSTRAINT "obligation_link_a_template_id_obligation_template_id_fk" FOREIGN KEY ("a_template_id") REFERENCES "public"."obligation_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_template" ADD CONSTRAINT "obligation_template_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reato_presidio" ADD CONSTRAINT "reato_presidio_reato_id_reato_presupposto_id_fk" FOREIGN KEY ("reato_id") REFERENCES "public"."reato_presupposto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reato_presidio" ADD CONSTRAINT "reato_presidio_template_id_obligation_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."obligation_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reato_presupposto" ADD CONSTRAINT "reato_presupposto_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanction_parameter" ADD CONSTRAINT "sanction_parameter_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_client_company_id_client_company_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."client_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_company" ADD CONSTRAINT "client_company_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_module" ADD CONSTRAINT "company_module_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_module" ADD CONSTRAINT "company_module_client_company_id_client_company_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."client_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_obligation_instance_id_obligation_instance_id_fk" FOREIGN KEY ("obligation_instance_id") REFERENCES "public"."obligation_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_caricato_da_user_id_fk" FOREIGN KEY ("caricato_da") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_config" ADD CONSTRAINT "instance_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_config" ADD CONSTRAINT "instance_config_catalog_version_id_catalog_version_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_history" ADD CONSTRAINT "instance_history_obligation_instance_id_obligation_instance_id_fk" FOREIGN KEY ("obligation_instance_id") REFERENCES "public"."obligation_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_history" ADD CONSTRAINT "instance_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_instance" ADD CONSTRAINT "obligation_instance_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_instance" ADD CONSTRAINT "obligation_instance_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_instance" ADD CONSTRAINT "obligation_instance_template_id_obligation_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."obligation_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obligation_instance" ADD CONSTRAINT "obligation_instance_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_org_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_org_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factor_user_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_link_uq" ON "obligation_link" USING btree ("da_template_id","a_template_id","tipo");--> statement-breakpoint
CREATE INDEX "obligation_link_a_idx" ON "obligation_link" USING btree ("a_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_template_uq" ON "obligation_template" USING btree ("catalog_version_id","dominio","codice");--> statement-breakpoint
CREATE INDEX "obligation_template_dominio_idx" ON "obligation_template" USING btree ("catalog_version_id","dominio");--> statement-breakpoint
CREATE UNIQUE INDEX "reato_presidio_uq" ON "reato_presidio" USING btree ("reato_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reato_presupposto_uq" ON "reato_presupposto" USING btree ("catalog_version_id","articolo");--> statement-breakpoint
CREATE UNIQUE INDEX "sanction_parameter_uq" ON "sanction_parameter" USING btree ("catalog_version_id","dominio","chiave");--> statement-breakpoint
CREATE INDEX "assessment_company_idx" ON "assessment" USING btree ("client_company_id","dominio");--> statement-breakpoint
CREATE INDEX "assessment_org_idx" ON "assessment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_org_idx" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "client_company_org_idx" ON "client_company" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_module_uq" ON "company_module" USING btree ("client_company_id","dominio");--> statement-breakpoint
CREATE INDEX "company_module_org_idx" ON "company_module" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "evidence_instance_idx" ON "evidence" USING btree ("obligation_instance_id");--> statement-breakpoint
CREATE INDEX "evidence_org_idx" ON "evidence" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "instance_history_instance_idx" ON "instance_history" USING btree ("obligation_instance_id","at");--> statement-breakpoint
CREATE INDEX "instance_history_org_idx" ON "instance_history" USING btree ("organization_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_instance_uq" ON "obligation_instance" USING btree ("assessment_id","template_id");--> statement-breakpoint
CREATE INDEX "obligation_instance_org_idx" ON "obligation_instance" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "obligation_instance_agenda_idx" ON "obligation_instance" USING btree ("organization_id","dominio","stato");