import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { verifyPassword } from "./password";
import { sdk } from "./sdk";

/**
 * Local e-mail + password authentication.
 * Replaces the external (Manus) OAuth sign-in while keeping the existing
 * JWT session cookie machinery (sdk.createSessionToken / verifySession).
 */
export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Banco de dados indisponível" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Uniform error to avoid leaking which part failed.
      const invalid = () =>
        res.status(401).json({ error: "E-mail ou senha inválidos" });

      if (!user || !user.active) {
        invalid();
        return;
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        invalid();
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        ok: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.status(500).json({ error: "Falha ao autenticar" });
    }
  });
}
