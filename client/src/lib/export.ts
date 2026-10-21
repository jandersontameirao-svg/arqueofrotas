/**
 * Utilitários para exportação de dados em CSV e PDF
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Logo do Grupo Arqueo em base64 (será carregada dinamicamente)
const LOGO_URL = "/icone-grupo-arqueo.svg";

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    alert("Não há dados para exportar");
    return;
  }

  // Create header row
  const headers = columns.map(col => col.label).join(";");

  // Create data rows
  const rows = data.map(item =>
    columns
      .map(col => {
        const value = item[col.key];
        // Handle different types
        if (value === null || value === undefined) return "";
        if (typeof value === "string") {
          // Escape quotes and wrap in quotes if contains special chars
          const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
          const escaped = safe.replace(/"/g, '""');
          if (
            escaped.includes(";") ||
            escaped.includes('"') ||
            escaped.includes("\n")
          ) {
            return `"${escaped}"`;
          }
          return escaped;
        }
        if (value instanceof Date) {
          return value.toLocaleDateString("pt-BR");
        }
        return String(value);
      })
      .join(";")
  );

  // Combine headers and rows
  const csv = [headers, ...rows].join("\n");

  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string,
  columns: { key: keyof T; label: string; width?: number }[],
  options?: {
    subtitle?: string;
    orientation?: "portrait" | "landscape";
  }
) {
  if (data.length === 0) {
    alert("Não há dados para exportar");
    return;
  }

  const orientation = options?.orientation ?? "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Cores do Grupo Arqueo
  const primaryColor: [number, number, number] = [139, 69, 19]; // Bordô/Marrom
  const accentColor: [number, number, number] = [255, 140, 0]; // Laranja

  // Header com fundo colorido
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 15);

  // Subtítulo
  if (options?.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(options.subtitle, margin, 22);
  }

  // Data de geração
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, margin, 30);

  // Nome da empresa
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ArqueoFrotas - Grupo Arqueo", pageWidth - margin, 15, {
    align: "right",
  });

  // Linha decorativa laranja
  doc.setFillColor(...accentColor);
  doc.rect(0, 35, pageWidth, 2, "F");

  // Preparar dados para a tabela
  const tableHeaders = columns.map(col => col.label);
  const tableData = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return "-";
      if (value instanceof Date) return value.toLocaleDateString("pt-BR");
      return String(value);
    })
  );

  // Tabela com estilo
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 42,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: columns.reduce(
      (acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        return acc;
      },
      {} as Record<number, { cellWidth: number }>
    ),
    didDrawPage: data => {
      // Footer em todas as páginas
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      const totalPages = doc.getNumberOfPages();

      // Linha do footer
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Texto do footer
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(
        `Página ${pageNumber} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(
        "ArqueoFrotas - Sistema de Gestão de Frotas",
        margin,
        pageHeight - 10
      );
      doc.text(
        new Date().toLocaleDateString("pt-BR"),
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" }
      );
    },
  });

  // Salvar o PDF
  doc.save(`${filename}.pdf`);
}

export function formatDateForExport(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTimeForExport(
  date: Date | string | null | undefined
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR");
}

export function formatCurrencyForExport(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
