export function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function csvDocument(rows: Record<string, unknown>[]) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  return (
    "\uFEFF" +
    [
      columns.map(csvCell).join(";"),
      ...rows.map(row => columns.map(c => csvCell(row[c])).join(";")),
    ].join("\r\n")
  );
}
