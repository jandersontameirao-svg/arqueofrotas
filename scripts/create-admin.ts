/**
 * Interactive admin bootstrap.
 *
 * Creates (or promotes) an admin user with a local password. The password is
 * typed interactively with hidden input — it is never passed as an argument and
 * never printed.
 *
 *   DATABASE_URL="mysql://user:pass@127.0.0.1:3306/arqueofrotas" pnpm tsx scripts/create-admin.ts
 */
import "dotenv/config";
import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/_core/password";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve =>
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

function askHidden(question: string): Promise<string> {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (buf: Buffer) => {
      const char = buf.toString("utf8");
      if (char === "\n" || char === "\r" || char === "\u0004") {
        if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        // Ctrl+C
        stdout.write("\n");
        process.exit(1);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL é obrigatória. Defina antes de rodar este script.");
    process.exit(1);
  }

  const name = await ask("Nome do admin: ");
  const email = (await ask("E-mail do admin: ")).toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("E-mail inválido.");
    process.exit(1);
  }
  const password = await askHidden("Senha (mín. 8 caracteres): ");
  if (password.length < 8) {
    console.error("A senha deve ter ao menos 8 caracteres.");
    process.exit(1);
  }
  const confirm = await askHidden("Confirme a senha: ");
  if (password !== confirm) {
    console.error("As senhas não conferem.");
    process.exit(1);
  }

  const db = drizzle(url);
  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        name,
        passwordHash,
        role: "admin",
        active: true,
        loginMethod: "local",
      })
      .where(eq(users.id, existing.id));
    console.log(`Admin atualizado (id=${existing.id}, email=${email}).`);
  } else {
    const openId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const result = await db.insert(users).values({
      openId,
      name,
      email,
      passwordHash,
      role: "admin",
      active: true,
      loginMethod: "local",
    });
    console.log(`Admin criado (id=${result[0].insertId}, email=${email}).`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Falha ao criar admin:", err);
  process.exit(1);
});
