/**
 * Reseed demo users after schema migration wiped them.
 * Run from repo root: pnpm --filter @workspace/scripts exec tsx ./src/reseed-users.ts
 */
import { createHash } from "crypto";

// Minimal bcrypt-like hashing using node's built-in crypto won't work for real bcrypt.
// We'll call bcryptjs directly since it's a pure-JS package available via drizzle's deps.

// We'll use a direct approach: call the running API to create users via a workaround.
// Since there's no public registration, we'll use @libsql/client to write directly to SQLite.

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../lib/db/src/schema/index.js";
import { eq } from "drizzle-orm";

// bcryptjs is available as a transitive dep
const bcryptjs = await import("bcryptjs");

const DB_PATH = new URL("../../artifacts/api-server/dev.db", import.meta.url).pathname
  .replace(/^\/([A-Z]:)/, "$1"); // fix Windows path

const client = createClient({ url: `file:${DB_PATH}` });
const db = drizzle(client, { schema });

const DEMO_USERS = [
  { email: "admin@kidspeak.com",       role: "admin",         name: "Admin",          password: "admin123" },
  { email: "sarah@kidspeak.com",       role: "teacher",       name: "Sarah Benali",   password: "admin123" },
  { email: "emma.parent@kidspeak.com", role: "parent",        name: "Emma Parent",    password: "admin123" },
  { email: "amina@kidspeak.com",       role: "psychologist",  name: "Amina Chaouch",  password: "admin123" },
  { email: "karim@kidspeak.com",       role: "accountant",    name: "Karim Bouzidi",  password: "admin123" },
  { email: "designer@kidspeak.com",    role: "designer",      name: "Design User",    password: "admin123" },
  { email: "marketer@kidspeak.com",    role: "marketer",      name: "Marketer User",  password: "admin123" },
  { email: "youcef@kidspeak.com",      role: "photographer",  name: "Youcef Saadi",   password: "admin123" },
] as const;

console.log("🌱 Reseeding demo users...\n");

let created = 0;
let updated = 0;

for (const u of DEMO_USERS) {
  const hash = await bcryptjs.hash(u.password, 10);
  const existing = await db.select({ id: schema.usersTable.id })
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, u.email));

  if (existing.length > 0) {
    // Update password hash
    await db.update(schema.usersTable)
      .set({ passwordHash: hash, name: u.name, role: u.role as any, status: "active" })
      .where(eq(schema.usersTable.email, u.email));
    console.log(`  ✓ Updated: ${u.email} (${u.role})`);
    updated++;
  } else {
    await db.insert(schema.usersTable).values({
      email: u.email,
      name: u.name,
      role: u.role as any,
      passwordHash: hash,
      status: "active",
    });
    console.log(`  + Created: ${u.email} (${u.role})`);
    created++;
  }
}

console.log(`\n✅ Done. Created: ${created}, Updated: ${updated}`);
client.close();
