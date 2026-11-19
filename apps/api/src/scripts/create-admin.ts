/**
 * One-time CLI to create a platform admin. Intentionally NOT part of db:seed or any repo seed data.
 *
 *   pnpm --filter @app/api admin:create --email you@example.com --name "Your Name" --role super
 *
 * The password is read from the ADMIN_PASSWORD env var, or from --password (which lands in shell history,
 * so prefer the env var). Runs as the migration role (app_owner): app_admin cannot insert admin users.
 */
import * as argon2 from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { createAdminUserInputSchema } from '@app/shared';

import { loadEnv } from '../config/env';
import { adminUsers } from '../core/db/schema/admin';
import { isPgUniqueViolation } from '../lib/pg-errors';
import { newUuidV7 } from '../lib/uuid';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      out[key] = value;
      i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const parsed = createAdminUserInputSchema.safeParse({
    email: args['email'],
    password: args['password'] ?? process.env['ADMIN_PASSWORD'],
    name: args['name'] ?? 'Platform Admin',
    role: args['role'] ?? 'super',
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(
      `${issues}. Usage: ADMIN_PASSWORD=... admin:create --email <email> [--name <name>] [--role super|support|billing] (password min 12 chars)`,
    );
  }
  const input = parsed.data;
  const env = loadEnv();
  const pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL });
  try {
    const db = drizzle(pool);
    const id = newUuidV7();
    await db.insert(adminUsers).values({
      id,
      email: input.email.toLowerCase(),
      passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
      name: input.name,
      role: input.role,
    });
    console.log(`Created admin ${input.email.toLowerCase()} (${input.role}) with id ${id}`);
  } catch (err: unknown) {
    if (isPgUniqueViolation(err, 'admin_users_email_unique')) {
      throw new Error(`An admin with email ${input.email} already exists`);
    }
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
