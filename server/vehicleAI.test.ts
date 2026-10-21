import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            plate: "ABC1D23",
            brand: "Toyota",
            model: "Hilux 2.8 SRV",
            year: 2023,
            yearModel: 2024,
            color: "Branco",
            chassi: "9BWZZZ377VT004251",
            renavam: "01234567890",
            vehicleType: "caminhonete",
            fuel: "Diesel",
            engineCapacity: "2.8",
            ownerName: "Grupo Arqueo Ltda",
            ownerCpfCnpj: "12.345.678/0001-90",
          }),
        },
      },
    ],
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createGestorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "gestor-user",
    email: "gestor@arqueo.com",
    name: "Gestor Frota",
    loginMethod: "manus",
    role: "admin",
    active: true,
    unitId: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("vehicleAI.extractFromDocument", () => {
  it("extracts vehicle data from a document image successfully", async () => {
    const ctx = createGestorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vehicleAI.extractFromDocument({
      imageBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.plate).toBe("ABC1D23");
    expect(result.data!.brand).toBe("Toyota");
    expect(result.data!.model).toBe("Hilux 2.8 SRV");
    expect(result.data!.year).toBe(2023);
    expect(result.data!.color).toBe("Branco");
    expect(result.data!.chassi).toBe("9BWZZZ377VT004251");
    expect(result.data!.renavam).toBe("01234567890");
    expect(result.data!.vehicleType).toBe("caminhonete");
    expect(result.data!.ownerName).toBe("Grupo Arqueo Ltda");
  });

  it("handles invalid JSON response from LLM gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "This is not valid JSON",
          },
        },
      ],
    });

    const ctx = createGestorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vehicleAI.extractFromDocument({
      imageBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  it("handles markdown-wrapped JSON response", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content:
              "```json\n" +
              JSON.stringify({
                plate: "XYZ9A87",
                brand: "Fiat",
                model: "Strada",
                year: 2022,
                yearModel: 2022,
                color: "Prata",
                chassi: null,
                renavam: null,
                vehicleType: "caminhonete",
                fuel: "Flex",
                engineCapacity: "1.3",
                ownerName: null,
                ownerCpfCnpj: null,
              }) +
              "\n```",
          },
        },
      ],
    });

    const ctx = createGestorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.vehicleAI.extractFromDocument({
      imageBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    });

    expect(result.success).toBe(true);
    expect(result.data!.plate).toBe("XYZ9A87");
    expect(result.data!.brand).toBe("Fiat");
    expect(result.data!.model).toBe("Strada");
    expect(result.data!.chassi).toBeNull();
  });

  it("requires image input", async () => {
    const ctx = createGestorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.vehicleAI.extractFromDocument({
        imageBase64: "",
        mimeType: "image/png",
      })
    ).rejects.toThrow();
  });
});
