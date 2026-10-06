CREATE TYPE "public"."platform_role" AS ENUM('super', 'support', 'billing');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('trial', 'active', 'past_due', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text NOT NULL,
	"default_currency" text NOT NULL,
	"default_locale" text NOT NULL,
	"locales" text[] NOT NULL,
	"logo_key" text,
	"status" "org_status" DEFAULT 'trial' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"platform_role" "platform_role",
	"last_login_at" timestamptz,
	"last_org_id" uuid,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_last_org_id_organizations_id_fk" FOREIGN KEY ("last_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"expires_at" timestamptz NOT NULL,
	"revoked_at" timestamptz,
	"replaced_by" uuid,
	"user_agent" text,
	"ip" text,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"org_id" uuid,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"tax_rate_bp" integer DEFAULT 0 NOT NULL,
	"tax_inclusive" boolean DEFAULT false NOT NULL,
	"day_start_hour" integer DEFAULT 4 NOT NULL,
	"address" text,
	"receipt_header" text,
	"receipt_footer" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "branches_org_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"pin_hash" text,
	"all_branches" boolean DEFAULT true NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_user_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "membership_branches" (
	"membership_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	CONSTRAINT "membership_branches_membership_id_branch_id_pk" PRIMARY KEY("membership_id","branch_id")
);
--> statement-breakpoint
ALTER TABLE "membership_branches" ADD CONSTRAINT "membership_branches_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_branches" ADD CONSTRAINT "membership_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_branches" ADD CONSTRAINT "membership_branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.sync_role_permissions_org_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  role_org uuid;
BEGIN
  SELECT org_id INTO role_org FROM public.roles WHERE id = NEW.role_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'role_id % does not exist', NEW.role_id;
  END IF;
  NEW.org_id := role_org;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER role_permissions_sync_org_id
  BEFORE INSERT OR UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_permissions_org_id();
