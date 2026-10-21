import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";

const socketPath = process.env.TEST_DB_SOCKET;
if (!socketPath || socketPath !== "/workspace/test-db.sock")
  throw new Error(
    "Only TEST_DB_SOCKET=/workspace/test-db.sock is allowed for the migration baseline"
  );
if (!process.argv.includes("--reset"))
  throw new Error(
    "Pass --reset to recreate only the isolated arqueofrotas_test baseline"
  );

const databaseName = "arqueofrotas_test";
const connection = await mysql.createConnection({
  user: "root",
  socketPath,
  multipleStatements: true,
});

await connection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
await connection.query(`CREATE DATABASE ${databaseName}`);
await connection.query(`USE ${databaseName}`);
await connection.query(
  "CREATE TABLE test_migrations (name VARCHAR(255) PRIMARY KEY)"
);

const journal = JSON.parse(
  await fs.readFile("drizzle/meta/_journal.json", "utf8")
) as { entries: Array<{ idx: number; tag: string }> };
const baselineEntries = journal.entries.filter(entry => entry.idx <= 8);

for (const entry of baselineEntries) {
  const migrationPath = path.join("drizzle", `${entry.tag}.sql`);
  const sql = await fs.readFile(migrationPath, "utf8");
  for (const statement of sql.split("--> statement-breakpoint"))
    if (statement.trim()) await connection.query(statement);
  await connection.query("INSERT INTO test_migrations (name) VALUES (?)", [
    entry.tag,
  ]);
  console.log("Applied baseline", entry.tag);
}

await connection.end();
