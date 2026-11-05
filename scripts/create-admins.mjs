// Cria (ou atualiza) usuários administradores no ArqueoFrotas.
//
// NÃO coloque a senha aqui nem no repositório. A senha é lida do ambiente,
// então você a digita na VPS na hora de rodar — ela nunca sai da VPS.
//
// Uso na VPS (dentro de /var/www/arqueofrotas, com o .env de produção):
//
//   ADMIN_PW='suaSenhaForte' node --env-file=.env scripts/create-admins.mjs
//
// (--env-file carrega o DATABASE_URL do .env; precisa de Node >= 20.6.
//  Se a sua versão não tiver --env-file, use:
//    export $(grep -v '^#' .env | xargs) && ADMIN_PW='...' node scripts/create-admins.mjs )
//
// É idempotente: se o e-mail já existir, apenas promove a admin, (re)define a
// senha e reativa a conta. Rodar de novo troca a senha dos três.

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const scrypt = promisify(scryptCb);

// Mesmo formato de server/_core/password.ts: scrypt$<saltHex>$<hashHex>
async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const ADMINS = [
  { email: "silvio@arqueoproject.onmicrosoft.com", name: "Silvio" },
  { email: "gerson@arqueoproject.onmicrosoft.com", name: "Gerson" },
  { email: "lucas.santana@arqueoproject.onmicrosoft.com", name: "Lucas Santana" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  const pw = process.env.ADMIN_PW;

  if (!url) {
    console.error("ERRO: DATABASE_URL não definido (rode com --env-file=.env).");
    process.exit(1);
  }
  if (!pw || pw.length < 8) {
    console.error("ERRO: defina ADMIN_PW com ao menos 8 caracteres (ex.: ADMIN_PW='...').");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  try {
    for (const { email, name } of ADMINS) {
      const normalized = email.trim().toLowerCase();
      const passwordHash = await hashPassword(pw);

      const [rows] = await conn.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [normalized]
      );

      if (rows.length > 0) {
        const id = rows[0].id;
        await conn.execute(
          "UPDATE users SET passwordHash = ?, loginMethod = 'local', role = 'admin', active = 1 WHERE id = ?",
          [passwordHash, id]
        );
        console.log(`atualizado  (id ${id})  ${normalized}  -> admin, senha redefinida`);
      } else {
        const openId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const [res] = await conn.execute(
          "INSERT INTO users (openId, name, email, passwordHash, loginMethod, role, active) VALUES (?, ?, ?, ?, 'local', 'admin', 1)",
          [openId, name, normalized, passwordHash]
        );
        console.log(`criado      (id ${res.insertId})  ${normalized}  -> admin`);
      }
    }
    console.log("\nPronto. Os três entram com o e-mail e a senha que você definiu.");
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Falhou:", err.message);
  process.exit(1);
});
