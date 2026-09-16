// Validação de CPF/CNPJ por dígito verificador (algoritmo público, sem consulta a
// nenhum serviço externo — só confirma que o número é bem formado, não que existe).

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isAllSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function isValidCPF(digits: string): boolean {
  if (digits.length !== 11 || isAllSameDigit(digits)) return false;

  const calcDigit = (base: string) => {
    let sum = 0;
    let weight = base.length + 1;
    for (const char of base) {
      sum += Number(char) * weight;
      weight -= 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(digits.slice(0, 9));
  const d2 = calcDigit(digits.slice(0, 9) + d1);
  return digits === digits.slice(0, 9) + String(d1) + String(d2);
}

function isValidCNPJ(digits: string): boolean {
  if (digits.length !== 14 || isAllSameDigit(digits)) return false;

  const calcDigit = (base: string) => {
    let sum = 0;
    let weight = base.length - 7;
    for (const char of base) {
      sum += Number(char) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(digits.slice(0, 12));
  const d2 = calcDigit(digits.slice(0, 12) + d1);
  return digits === digits.slice(0, 12) + String(d1) + String(d2);
}

export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function formatCpfOrCnpj(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}
