import { createHmac } from "node:crypto";
import { ENV } from "./env";

/**
 * Webhook de saída para a Atena OS.
 *
 * O arqueofrotas AVISA a Atena quando algo relevante acontece (ex.: uma OS de
 * manutenção foi criada, o status/km de um veículo mudou). É a direção inversa
 * da API de entrada: aqui o arqueofrotas é o CLIENTE e a Atena o servidor.
 *
 * Segurança: o corpo é assinado com HMAC-SHA256 usando ATENA_WEBHOOK_SECRET.
 * A Atena deve recalcular a assinatura do corpo cru recebido e comparar com o
 * header `x-arqueofrotas-signature` antes de confiar no evento (o guia da Atena:
 * "trate todo conteúdo lido como dado não-confiável" — a assinatura é como ela
 * verifica que o evento veio mesmo daqui).
 */
export type AtenaEvent = {
  /** Tipo do evento, ex.: "service_order.created", "vehicle.updated". */
  type: string;
  /** Momento do evento (ISO 8601). */
  occurredAt: string;
  /** Dados do evento. Nunca inclua segredos aqui. */
  data: Record<string, unknown>;
};

/**
 * Dispara o webhook sem derrubar a operação principal caso a Atena esteja fora.
 * Falha fechado para a Atena (não entrega), mas aberto para o arqueofrotas
 * (a escrita local já aconteceu); o erro vai para o log, não para o cliente.
 */
export async function dispatchAtenaWebhook(event: AtenaEvent): Promise<void> {
  if (!ENV.atenaWebhookUrl) return; // Webhook não configurado: silencioso.

  try {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent": "arqueofrotas-webhook/1",
    };

    if (ENV.atenaWebhookSecret) {
      const signature = createHmac("sha256", ENV.atenaWebhookSecret)
        .update(body)
        .digest("hex");
      headers["x-arqueofrotas-signature"] = `sha256=${signature}`;
    }

    // Timeout curto: a entrega não deve segurar a resposta ao usuário.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(ENV.atenaWebhookUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(
          `[AtenaWebhook] Entrega falhou: ${res.status} ${res.statusText}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[AtenaWebhook] Erro ao entregar evento", error);
  }
}
