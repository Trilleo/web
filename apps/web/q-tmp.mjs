import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(process.argv[2]);
const r = await db.query(process.argv[3]);
console.log(JSON.stringify(r.rows, null, 1));
