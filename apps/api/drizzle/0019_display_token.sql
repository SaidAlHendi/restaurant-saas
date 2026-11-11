ALTER TABLE "public"."branches" ADD COLUMN "display_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_display_token_unique" ON "public"."branches" USING btree ("display_token") WHERE "display_token" IS NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.public_resolve_display(p_token text)
RETURNS TABLE (
  org_id uuid,
  branch_id uuid,
  org_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.org_id, b.id, o.status::text
  FROM public.branches b
  INNER JOIN public.organizations o ON o.id = b.org_id
  WHERE b.display_token = p_token
    AND b.display_token IS NOT NULL
    AND b.is_active = true
  LIMIT 1;
$$;--> statement-breakpoint
ALTER FUNCTION public.public_resolve_display(text) OWNER TO app_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.public_resolve_display(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.public_resolve_display(text) TO app_user;
