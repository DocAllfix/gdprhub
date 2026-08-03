CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_company_id" text NOT NULL,
	"ambito" text NOT NULL,
	"stato" text DEFAULT 'bozza' NOT NULL,
	"numero" integer NOT NULL,
	"data_riferimento" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"hash_snapshot" text NOT NULL,
	"generata_da" text,
	"generata_il" timestamp with time zone DEFAULT now() NOT NULL,
	"pubblicata_il" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_client_company_id_client_company_id_fk" FOREIGN KEY ("client_company_id") REFERENCES "public"."client_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_generata_da_user_id_fk" FOREIGN KEY ("generata_da") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_org_idx" ON "report" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "report_azienda_idx" ON "report" USING btree ("client_company_id");