CREATE TYPE "public"."baby_sex" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."diaper_type" AS ENUM('wet', 'dirty', 'both');--> statement-breakpoint
CREATE TYPE "public"."feed_side" AS ENUM('left', 'right', 'both');--> statement-breakpoint
CREATE TYPE "public"."feed_type" AS ENUM('breast', 'bottle');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'caregiver', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."temp_method" AS ENUM('armpit', 'oral', 'ear', 'forehead', 'rectal');--> statement-breakpoint
CREATE TYPE "public"."temp_unit" AS ENUM('c', 'f');--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "babies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"sex" "baby_sex" DEFAULT 'unspecified' NOT NULL,
	"birth_weight_grams" real,
	"birth_length_cm" real,
	"birth_head_circumference_cm" real,
	"photo_url" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diaper_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"type" "diaper_type" NOT NULL,
	"time" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"type" "feed_type" NOT NULL,
	"start_time" timestamp NOT NULL,
	"duration_minutes" integer,
	"side" "feed_side",
	"amount_ml" real,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"time" timestamp NOT NULL,
	"weight_grams" real,
	"height_cm" real,
	"head_circumference_cm" real,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'caregiver' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"code" text NOT NULL,
	"role" "member_role" DEFAULT 'caregiver' NOT NULL,
	"email" text,
	"created_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "medication_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"dose_amount" real,
	"dose_unit" text,
	"time" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"time" timestamp NOT NULL,
	"text" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temperature_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"baby_id" uuid NOT NULL,
	"logged_by_user_id" text NOT NULL,
	"value" real NOT NULL,
	"unit" "temp_unit" DEFAULT 'c' NOT NULL,
	"method" "temp_method",
	"time" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "babies" ADD CONSTRAINT "babies_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "babies" ADD CONSTRAINT "babies_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diaper_logs" ADD CONSTRAINT "diaper_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diaper_logs" ADD CONSTRAINT "diaper_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_logs" ADD CONSTRAINT "feed_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_logs" ADD CONSTRAINT "feed_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_logs" ADD CONSTRAINT "growth_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_logs" ADD CONSTRAINT "growth_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_baby_id_babies_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."babies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_logged_by_user_id_user_id_fk" FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "babies_household_idx" ON "babies" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "diaper_logs_baby_time_idx" ON "diaper_logs" USING btree ("baby_id","time");--> statement-breakpoint
CREATE INDEX "feed_logs_baby_time_idx" ON "feed_logs" USING btree ("baby_id","start_time");--> statement-breakpoint
CREATE INDEX "growth_logs_baby_time_idx" ON "growth_logs" USING btree ("baby_id","time");--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_household_user_unique" ON "household_members" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE INDEX "household_members_user_idx" ON "household_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invites_household_idx" ON "invites" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "medication_logs_baby_time_idx" ON "medication_logs" USING btree ("baby_id","time");--> statement-breakpoint
CREATE INDEX "notes_baby_time_idx" ON "notes" USING btree ("baby_id","time");--> statement-breakpoint
CREATE INDEX "sleep_logs_baby_time_idx" ON "sleep_logs" USING btree ("baby_id","start_time");--> statement-breakpoint
CREATE INDEX "temperature_logs_baby_time_idx" ON "temperature_logs" USING btree ("baby_id","time");