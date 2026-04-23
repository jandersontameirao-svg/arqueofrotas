const mysql = require('mysql2/promise');
// Parse DATABASE_URL correctly, stripping query params from database name
const url = process.env.DATABASE_URL || '';
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
if (!m) { console.log('No DB URL or parse error. URL:', url.substring(0,60)); process.exit(1); }
const [,user,pass,host,port,db] = m;
console.log('Connecting to', host, port, db);
async function run() {
  const conn = await mysql.createConnection({
    host, port: parseInt(port), user, password: pass, database: db,
    ssl: { rejectUnauthorized: false }
  });
  const [rows] = await conn.query('DESCRIBE checklists');
  console.log('Columns:', rows.map(x => x.Field).join(', '));
  const hasIsDeleted = rows.some(x => x.Field === 'isDeleted');
  if (!hasIsDeleted) {
    console.log('Adding isDeleted, deletedAt, deletedById columns...');
    await conn.query('ALTER TABLE checklists ADD COLUMN isDeleted BOOLEAN NOT NULL DEFAULT false, ADD COLUMN deletedAt TIMESTAMP NULL, ADD COLUMN deletedById INT NULL');
    console.log('Done!');
  } else {
    console.log('isDeleted already exists — no changes needed');
  }
  await conn.end();
}
run().catch(e => console.error('Error:', e.message));
