export function filterRows<T extends object>(
  rows: T[],
  search: string,
  keys: string[]
): T[] {
  if (!search || !keys.length) return rows;
  const term = search.toLocaleLowerCase("pt-BR");
  return rows.filter(row =>
    keys.some(key =>
      String((row as Record<string, unknown>)[key] ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(term)
    )
  );
}
