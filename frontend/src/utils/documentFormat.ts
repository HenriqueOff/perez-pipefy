// Mesma lógica de backend/src/utils/documentValidation.ts, reimplementada aqui só pra
// dar feedback visual imediato (máscara ao digitar) — a validação de verdade continua
// no backend, essa cópia nunca é a fonte da verdade.

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}
