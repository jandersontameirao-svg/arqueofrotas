import { saveCommand, type Command } from "./store";
export type Send = (
  kind: Command["kind"],
  payload: Record<string, unknown>
) => Promise<unknown>;
// No background pickup authorization. All attempts require an authenticated online check.
export async function synchronize(
  command: Command,
  authenticatedUserId: number,
  send: Send
): Promise<Command> {
  if (command.userId !== authenticatedUserId)
    throw new Error("Entre com o usuário que coletou este registro");
  if (
    command.state === "confirmed" ||
    command.state === "draft" ||
    command.state === "conflict"
  )
    return command;
  try {
    const result = await send(command.kind, {
      ...command.payload,
      idempotencyKey: command.id,
      requestId: command.id,
    });
    const blocked =
      !!result &&
      typeof result === "object" &&
      "status" in result &&
      result.status === "blocked";
    const updated: Command = {
      ...command,
      state: "confirmed",
      result,
      error: blocked
        ? "Inspeção confirmada com bloqueio. Retirada não autorizada."
        : undefined,
    };
    await saveCommand(updated);
    return updated;
  } catch (error) {
    const api = error as { data?: { code?: string }; message?: string };
    const code = api.data?.code;
    const retryable =
      !code ||
      ["UNAUTHORIZED", "INTERNAL_SERVER_ERROR", "TIMEOUT"].includes(code);
    const updated: Command = {
      ...command,
      state: retryable ? "pending" : "conflict",
      error:
        code === "UNAUTHORIZED"
          ? "Sessão expirada. Entre novamente com o mesmo usuário."
          : (api.message ??
            "Sem confirmação. Registro preservado para novo envio."),
    };
    await saveCommand(updated);
    return updated;
  }
}
