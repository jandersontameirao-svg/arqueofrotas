import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";

const socketPath = process.env.TEST_DB_SOCKET;
if (!socketPath || socketPath !== "/workspace/test-db.sock")
  throw new Error(
    "Only TEST_DB_SOCKET=/workspace/test-db.sock is allowed for review migration tests"
  );

const databaseName = "arqueofrotas_test";
const connection = await mysql.createConnection({
  user: "root",
  socketPath,
  database: databaseName,
});

const journal = JSON.parse(
  await fs.readFile("drizzle/meta/_journal.json", "utf8")
) as { entries: Array<{ idx: number; tag: string }> };
const baselineEntries = journal.entries.filter(entry => entry.idx <= 8);
const reviewEntries = journal.entries.filter(
  entry => entry.idx >= 9 && entry.idx <= 12
);
const [rows] = await connection.query<{ name: string }[]>(
  "SELECT name FROM test_migrations ORDER BY name"
);
const applied = new Set(rows.map(row => row.name));

for (const entry of baselineEntries)
  if (!applied.has(entry.tag))
    throw new Error(
      `Baseline migration ${entry.tag} is missing; recreate the isolated baseline before this test`
    );
for (const entry of reviewEntries)
  if (applied.has(entry.tag))
    throw new Error(
      `Review migration ${entry.tag} is already applied; recreate the isolated baseline before this test`
    );

for (const entry of reviewEntries) {
  const migrationPath = path.join("drizzle", `${entry.tag}.sql`);
  const sql = await fs.readFile(migrationPath, "utf8");
  for (const statement of sql.split("--> statement-breakpoint"))
    if (statement.trim()) await connection.query(statement);
  await connection.query("INSERT INTO test_migrations (name) VALUES (?)", [
    entry.tag,
  ]);
  console.log("Applied review", entry.tag);
}

await connection.end();
