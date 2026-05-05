import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — ensure the database is provisioned");
}

/**
 * Explicit provider switch.
 * Set DATABASE_PROVIDER=postgresql to generate PostgreSQL DDL.
 * Defaults to "sqlite".
 */
const provider = (process.env.DATABASE_PROVIDER ?? "sqlite") as "sqlite" | "postgresql";

if (provider !== "sqlite" && provider !== "postgresql") {
  throw new Error(
    `Invalid DATABASE_PROVIDER "${provider}". Must be "sqlite" or "postgresql".`,
  );
}

const url = process.env.DATABASE_URL;

export default defineConfig(
  provider === "postgresql"
    ? {
        schema: "./src/schema/index.ts",
        dialect: "postgresql",
        dbCredentials: { url },
      }
    : {
        schema: "./src/schema/index.ts",
        dialect: "sqlite",
        dbCredentials: { url },
      },
);
