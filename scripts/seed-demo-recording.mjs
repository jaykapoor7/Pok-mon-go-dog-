/* Seeds only the dedicated preview database. DATABASE_URL must never point at production. */
import { readFileSync } from "node:fs";
import pg from "pg";
const url = process.env.DEMO_DATABASE_URL;
if (!url || !process.env.DEMO_NGO_ID) throw new Error("Set DEMO_DATABASE_URL and DEMO_NGO_ID (preview only).");
if (/prod|production/i.test(url) || process.env.ALLOW_PRODUCTION_DEMO_SEED === "true") throw new Error("Refusing to seed a production-looking database.");
const sql = readFileSync("supabase/demo-recording-fixtures.sql", "utf8").replaceAll("__DEMO_NGO_ID__", process.env.DEMO_NGO_ID);
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") ? false : { rejectUnauthorized: false } });
await client.connect(); await client.query(sql); await client.end(); console.log("Demo recording workspace seeded.");
