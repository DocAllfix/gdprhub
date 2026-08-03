CREATE TABLE "registro" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_company_id" text NOT NULL,
	"tipo" text NOT NULL,
	"numero" text NOT NULL,
	"conosciuto_il" timestamp with time zone NOT NULL,
	"avvenuto_il" timestamp with time zone,
	"titolo" text NOT NULL,
	"descrizione" text,
	"stato" text DEFAULT 'aperto' NOT NULL,
	"assolto_il" timestamp with time zone,
	"esito" text,
	"dettagli" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aperto_da" text,
	"creato_il" timestamp with time zone DEFAULT now() NOT NULL,
	"aggiornato_il" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_client_company_id_client_company_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."client_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_aperto_da_user_id_fk" FOREIGN KEY ("aperto_da") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registro_org_idx" ON "registro" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "registro_azienda_tipo_idx" ON "registro" USING btree ("client_company_id","tipo");