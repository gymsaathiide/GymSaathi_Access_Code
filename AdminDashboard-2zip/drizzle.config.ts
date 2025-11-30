process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set for drizzle-kit");
}

const url = new URL(connectionString);
url.searchParams.delete('sslmode');
const cleanConnectionString = url.toString();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: cleanConnectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
