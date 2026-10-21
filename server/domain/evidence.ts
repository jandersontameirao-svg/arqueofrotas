import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { evidenceFiles } from "../../drizzle/schema";
import type { Database } from "./runtime";

export function decodePhoto(data: string, fileName?: string) {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]*)$/.exec(data);
  const encoded = match ? match[2] : data;
  if (
    encoded.length > 12_000_000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
    encoded.length % 4 !== 0
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Foto inválida ou maior que 8 MB",
    });
  }
  const buffer = Buffer.from(encoded, "base64");
  let mimeType: string;
  let extension: string;
  if (buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    mimeType = "image/jpeg";
    extension = "jpg";
  } else if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mimeType = "image/png";
    extension = "png";
  } else if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    mimeType = "image/webp";
    extension = "webp";
  } else
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use uma foto JPEG, PNG ou WebP válida",
    });
  if (
    !buffer.length ||
    buffer.length > 8 * 1024 * 1024 ||
    (match && match[1] !== mimeType)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Conteúdo da foto não corresponde ao tipo ou tamanho permitido",
    });
  }
  const safeName = (fileName || `foto.${extension}`)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-240);
  return {
    buffer,
    mimeType,
    fileName: safeName,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}
export async function persistPhoto(
  db: Database,
  userId: number,
  vehicleId: number,
  data: string,
  fileName?: string
) {
  const photo = decodePhoto(data, fileName);
  const id = randomUUID();
  await db
    .insert(evidenceFiles)
    .values({
      id,
      userId,
      vehicleId,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
      content: photo.buffer.toString("base64"),
      sha256: photo.sha256,
    });
  return {
    url: `/api/evidence/${id}`,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    size: photo.buffer.length,
  };
}
