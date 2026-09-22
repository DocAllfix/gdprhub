CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"destinatario" text NOT NULL,
	"oggetto" text NOT NULL,
	"corpo_testo" text NOT NULL,
	"corpo_html" text,
	"stato" text DEFAULT 'attesa' NOT NULL,
	"tentativi" integer DEFAULT 0 NOT NULL,
	"ultimo_errore" text,
	"creata_il" timestamp with time zone DEFAULT now() NOT NULL,
	"inviata_il" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_stato_idx" ON "outbox" USING btree ("stato","creata_il");