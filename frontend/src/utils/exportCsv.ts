/** Exporta como CSV (não .xlsx) de propósito: abre direto no Excel/Google Sheets sem
 * precisar de nenhuma biblioteca extra no bundle, e é o formato mais universal. */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  // BOM (﻿) faz o Excel abrir acentos/UTF-8 corretamente em vez de interpretar como Latin-1.
  const csvContent = '﻿' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
