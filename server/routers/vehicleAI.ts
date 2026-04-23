import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// This router provides AI-powered vehicle data extraction from documents (CRLV, etc.)
// The flow is: upload image → AI extracts data → returns JSON for human review → user confirms → create vehicle

export const vehicleAIRouter = router({
  // Extract vehicle data from a document image (CRLV, etc.)
  extractFromDocument: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string().min(1, "Imagem é obrigatória"),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair dados de documentos de veículos brasileiros (CRLV, CRV, etc.).
Analise a imagem fornecida e extraia os seguintes campos. Retorne APENAS um JSON válido com os campos encontrados.
Se um campo não for encontrado, retorne null para ele.

Campos esperados:
- plate: string (placa do veículo, formato ABC-1234 ou ABC1D23)
- brand: string (marca/fabricante)
- model: string (modelo)
- year: number (ano de fabricação)
- yearModel: number (ano do modelo)
- color: string (cor)
- chassi: string (número do chassi)
- renavam: string (número do RENAVAM)
- vehicleType: string (tipo: "carro", "caminhonete", "moto", "van", "caminhao")
- fuel: string (combustível)
- engineCapacity: string (cilindrada)
- ownerName: string (nome do proprietário)
- ownerCpfCnpj: string (CPF/CNPJ do proprietário)

Retorne SOMENTE o JSON, sem markdown, sem explicações.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia os dados do veículo desta imagem de documento:",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        maxTokens: 2000,
      });

      const responseText =
        typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : Array.isArray(result.choices[0]?.message?.content)
          ? result.choices[0].message.content
              .filter((c): c is { type: "text"; text: string } => typeof c === "object" && "type" in c && c.type === "text")
              .map((c) => c.text)
              .join("")
          : "";

      // Parse JSON from response, handling possible markdown wrapping
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      try {
        const parsed = JSON.parse(cleanJson);
        return {
          success: true,
          data: {
            plate: parsed.plate || null,
            brand: parsed.brand || null,
            model: parsed.model || null,
            year: parsed.year ? Number(parsed.year) : null,
            yearModel: parsed.yearModel ? Number(parsed.yearModel) : null,
            color: parsed.color || null,
            chassi: parsed.chassi || null,
            renavam: parsed.renavam || null,
            vehicleType: parsed.vehicleType || null,
            fuel: parsed.fuel || null,
            engineCapacity: parsed.engineCapacity || null,
            ownerName: parsed.ownerName || null,
            ownerCpfCnpj: parsed.ownerCpfCnpj || null,
          },
          rawResponse: cleanJson,
        };
      } catch {
        return {
          success: false,
          data: null,
          rawResponse: responseText,
          error: "Não foi possível extrair os dados do documento. Tente com uma imagem mais nítida.",
        };
      }
    }),
});
