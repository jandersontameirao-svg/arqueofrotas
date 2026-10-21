import mysql from "mysql2/promise";
import fs from "node:fs/promises";
const socketPath = process.env.TEST_DB_SOCKET;
if (!socketPath || !socketPath.startsWith("/workspace/"))
  throw new Error("Only an explicit isolated workspace socket is allowed");
const connection = await mysql.createConnection({
  user: "root",
  socketPath,
  multipleStatements: true,
});
const name = "arqueofrotas_test";
if (process.argv.includes("--reset"))
  await connection.query(`DROP DATABASE IF EXISTS ${name}`);
await connection.query(`CREATE DATABASE IF NOT EXISTS ${name}`);
await connection.query(`USE ${name}`);
await connection.query(
  "CREATE TABLE IF NOT EXISTS test_migrations (name VARCHAR(255) PRIMARY KEY)"
);
const journal = JSON.parse(
  await fs.readFile("drizzle/meta/_journal.json", "utf8")
);
for (const entry of journal.entries) {
  const [rows] = await connection.query(
    "SELECT name FROM test_migrations WHERE name=?",
    [entry.tag]
  );
  if ((rows as unknown[]).length) {
    console.log("Verified", entry.tag);
    continue;
  }
  const sql = await fs.readFile(`drizzle/${entry.tag}.sql`, "utf8");
  for (const statement of sql.split("--> statement-breakpoint"))
    if (statement.trim()) await connection.query(statement);
  await connection.query("INSERT INTO test_migrations (name) VALUES (?)", [
    entry.tag,
  ]);
  console.log("Applied", entry.tag);
}
await connection.end();
