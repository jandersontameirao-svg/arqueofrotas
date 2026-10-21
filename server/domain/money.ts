import { TRPCError } from "@trpc/server";
export function decimalUnits(value: string, positive = false): bigint {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Use valor não negativo com até duas casas decimais",
    });
  const [whole, fraction = ""] = value.split(".");
  const units = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (positive && units === BigInt(0))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Quantidade deve ser positiva",
    });
  return units;
}
export function itemTotal(
  quantity: string,
  unitPrice?: string,
  totalPrice?: string
) {
  const qty = decimalUnits(quantity, true);
  if (unitPrice === undefined) {
    if (totalPrice !== undefined)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Informe o preço unitário para calcular o total",
      });
    return undefined;
  }
  const total = (qty * decimalUnits(unitPrice) + BigInt(50)) / BigInt(100);
  if (total > BigInt(9999999999))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Total excede o limite do campo",
    });
  if (totalPrice !== undefined && decimalUnits(totalPrice) !== total)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Total não confere com quantidade e preço unitário",
    });
  return `${total / BigInt(100)}.${String(total % BigInt(100)).padStart(2, "0")}`;
}
