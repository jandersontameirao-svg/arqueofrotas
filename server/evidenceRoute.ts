import type { Express } from "express";
import { eq, and } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { evidenceFiles, serviceOrders } from "../drizzle/schema";
export function registerEvidenceRoute(app: Express) {
  app.get("/api/evidence/:id", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.active) {
        res.sendStatus(401);
        return;
      }
      const db = await getDb();
      if (!db) {
        res.sendStatus(503);
        return;
      }
      const [file] = await db
        .select()
        .from(evidenceFiles)
        .where(eq(evidenceFiles.id, req.params.id));
      if (!file || (user.role === "motorista" && file.userId !== user.id)) {
        res.sendStatus(404);
        return;
      }
      if (user.role === "manutencao" && file.userId !== user.id) {
        const assigned = await db
          .select({ id: serviceOrders.id })
          .from(serviceOrders)
          .where(
            and(
              eq(serviceOrders.vehicleId, file.vehicleId),
              eq(serviceOrders.assignedToId, user.id),
              eq(serviceOrders.isDeleted, false)
            )
          )
          .limit(1);
        if (!assigned.length) {
          res.sendStatus(404);
          return;
        }
      }
      res.set({
        "Content-Type": file.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${file.fileName}"`,
      });
      res.send(Buffer.from(file.content, "base64"));
    } catch {
      res.sendStatus(401);
    }
  });
}
