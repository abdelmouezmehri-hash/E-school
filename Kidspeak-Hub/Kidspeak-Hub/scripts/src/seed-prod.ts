import bcrypt from "bcryptjs";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const users = [
  { email: "admin@kidspeak.com",        role: "admin",        name: "Admin" },
  { email: "sarah@kidspeak.com",        role: "teacher",      name: "Sarah Benali" },
  { email: "emma.parent@kidspeak.com",  role: "parent",       name: "Emma Parent" },
  { email: "amina@kidspeak.com",        role: "psychologist", name: "Amina Cherif" },
  { email: "karim@kidspeak.com",        role: "accountant",   name: "Karim Meziane" },
];

for (const u of users) {
  const hash = await bcrypt.hash("admin123", 10);
  await client.query(
    `INSERT INTO users (email, password_hash, role, name, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    [u.email, hash, u.role, u.name]
  );
  console.log("✓", u.email);
}

await client.end();
console.log("Done!");
