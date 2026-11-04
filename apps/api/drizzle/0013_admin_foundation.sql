CREATE TYPE "public"."admin_role" AS ENUM('super', 'support', 'billing');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "admin_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email"),
	CONSTRAINT "admin_users_email_lowercase" CHECK ("email" = lower("email"))
);--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"actor_role" "admin_role" NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"org_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_unique" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_family_idx" ON "admin_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_user_created_idx" ON "audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
-- Platform-admin tables are not tenant data: no RLS, and no access for the tenant runtime roles.
-- Default privileges on app_owner tables grant app_user full DML, so revoke explicitly.
REVOKE ALL ON "admin_users", "admin_sessions", "audit_logs" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON "admin_users", "admin_sessions", "audit_logs" FROM app_user;--> statement-breakpoint
REVOKE ALL ON "admin_users", "admin_sessions", "audit_logs" FROM app_worker;--> statement-breakpoint
-- Grants for the platform-admin runtime role. The role itself (LOGIN NOSUPERUSER BYPASSRLS) is created
-- outside migrations (infra/postgres/init/01-roles.sql locally and in CI, deploy notes in production),
-- because app_owner has no CREATEROLE. If it does not exist yet this block is skipped; the API refuses to
-- start without these grants (AdminDatabaseRoleValidator).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO app_admin';
    EXECUTE 'GRANT SELECT ON public.organizations, public.branches, public.memberships, public.membership_branches, public.roles, public.subscriptions, public.plans, public.plan_features, public.orders, public.billing_events TO app_admin';
    -- users: every column except password_hash
    EXECUTE 'GRANT SELECT (id, email, name, locale, is_platform_admin, platform_role, last_login_at, last_org_id, created_at, updated_at) ON public.users TO app_admin';
    -- the only tenant-data writes: suspend/reactivate and subscription overrides
    EXECUTE 'GRANT UPDATE (status) ON public.organizations TO app_admin';
    EXECUTE 'GRANT UPDATE (plan_id, status, trial_ends_at, current_period_end, updated_at) ON public.subscriptions TO app_admin';
    -- admin identity plane (no DELETE anywhere; audit_logs is append-only)
    EXECUTE 'GRANT SELECT, UPDATE (last_login_at) ON public.admin_users TO app_admin';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.admin_sessions TO app_admin';
    EXECUTE 'GRANT SELECT, INSERT ON public.audit_logs TO app_admin';
  END IF;
END
$$;
