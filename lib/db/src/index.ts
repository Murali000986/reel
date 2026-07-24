import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Handle client errors to prevent unhandled exception crashes
pool.on('error', (err) => {
  console.error('Postgres connection pool error:', err);
});

// Enable Supabase Realtime for messages/conversations on startup
(async () => {
  try {
    const client = await pool.connect();
    try {
      const pubCheck = await client.query(`SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime';`);
      if (pubCheck.rowCount === 0) {
        await client.query(`CREATE PUBLICATION supabase_realtime;`);
      }
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE messages;`).catch(() => {});
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE conversations;`).catch(() => {});
      console.log('Supabase realtime publication verified successfully.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to setup realtime publication:', err.message);
  }
})();

export const db = drizzle(pool, { schema });

export * from "./schema";
