#!/usr/bin/env node
/**
 * Grant or revoke a Brigade admin role for an existing account.
 *
 * Admin is a row in connectpro_auth.user_roles, and the role list is baked into
 * the access token when someone logs in — so a change here only takes effect on
 * that person's NEXT login. Existing sessions keep the roles they were issued
 * with until the token expires.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/grant-admin.mjs you@example.com
 *   DATABASE_URL=... node scripts/grant-admin.mjs you@example.com --role MODERATOR
 *   DATABASE_URL=... node scripts/grant-admin.mjs you@example.com --revoke
 *   DATABASE_URL=... node scripts/grant-admin.mjs --list
 */
import pg from "pg";

/** Must stay in step with ADMIN_ROLES in apps/web/src/lib/connectpro/server.ts. */
const ADMIN_ROLES = ["SYSTEM_ADMIN", "MODERATOR"];

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const list = args.includes("--list");
const roleIndex = args.indexOf("--role");
const role = roleIndex >= 0 ? args[roleIndex + 1] : "SYSTEM_ADMIN";
const email = args.find((arg) => !arg.startsWith("--") && arg !== role);

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!list && !email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [--role SYSTEM_ADMIN|MODERATOR] [--revoke]");
  console.error("       node scripts/grant-admin.mjs --list");
  process.exit(1);
}
if (!list && !ADMIN_ROLES.includes(role)) {
  console.error(`Unknown role "${role}". Expected one of: ${ADMIN_ROLES.join(", ")}`);
  process.exit(1);
}

const schema = process.env.AUTH_SCHEMA?.trim() || "connectpro_auth";
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  if (list) {
    const { rows } = await client.query(
      `SELECT u.email, r.role
         FROM ${schema}.user_roles r
         JOIN ${schema}.users u ON u.id = r.user_id
        WHERE r.role = ANY($1::text[])
        ORDER BY u.email`,
      [ADMIN_ROLES],
    );
    if (rows.length === 0) {
      console.log("No admins yet.");
    } else {
      for (const row of rows) console.log(`${row.role}\t${row.email}`);
    }
    process.exit(0);
  }

  const { rows } = await client.query(
    `SELECT id, email FROM ${schema}.users WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );
  if (rows.length === 0) {
    console.error(`No account for ${email}. They need to sign up first.`);
    process.exit(1);
  }
  const user = rows[0];

  if (revoke) {
    const result = await client.query(
      `DELETE FROM ${schema}.user_roles WHERE user_id = $1 AND role = $2`,
      [user.id, role],
    );
    console.log(
      result.rowCount > 0
        ? `Revoked ${role} from ${user.email}. Takes effect on their next login.`
        : `${user.email} did not have ${role}.`,
    );
  } else {
    await client.query(
      `INSERT INTO ${schema}.user_roles (user_id, role) VALUES ($1, $2)
       ON CONFLICT (user_id, role) DO NOTHING`,
      [user.id, role],
    );
    console.log(`${user.email} is now ${role}.`);
    console.log("Log out and back in to pick it up, then open /admin.");
  }
} finally {
  await client.end();
}
