export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

export const formatBrPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatCurrencyInputBRL = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseCurrencyBRL = (formatted: string): number => {
  if (!formatted) return 0;
  const clean = formatted.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.round(val * 100) / 100;
};

export const formatBRL = (amount: number): string => {
  return (amount || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

export interface StructuredAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const EMPTY_STRUCTURED_ADDRESS: StructuredAddress = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export const formatStructuredAddress = (addr: StructuredAddress): string => {
  const street = addr.street.trim();
  const number = addr.number.trim();
  const complement = addr.complement.trim();
  const neighborhood = addr.neighborhood.trim();
  const city = addr.city.trim();
  const state = addr.state.trim().toUpperCase();
  const cepDigits = addr.cep.replace(/\D/g, '');

  const parts: string[] = [];

  if (street) {
    let streetPart = street;
    if (number) streetPart += `, nº ${number}`;
    if (complement) streetPart += ` (${complement})`;
    parts.push(streetPart);
  } else if (number || complement) {
    parts.push([number ? `nº ${number}` : '', complement].filter(Boolean).join(' '));
  }

  if (neighborhood) {
    parts.push(`Bairro ${neighborhood}`);
  }

  if (city || state) {
    parts.push(city && state ? `${city}/${state}` : city || state);
  }

  if (cepDigits.length === 8) {
    parts.push(`CEP ${formatCEP(cepDigits)}`);
  }

  return parts.join(' - ').slice(0, 300);
};

export const parseStructuredAddress = (raw?: string): StructuredAddress => {
  if (!raw || !raw.trim()) return { ...EMPTY_STRUCTURED_ADDRESS };

  const result: StructuredAddress = { ...EMPTY_STRUCTURED_ADDRESS };
  let remaining = raw.trim();

  // Extract CEP if present
  const cepMatch = remaining.match(/(?:\s*-\s*)?CEP\s*(\d{5}-?\d{3})/i);
  if (cepMatch) {
    result.cep = formatCEP(cepMatch[1]);
    remaining = remaining.replace(cepMatch[0], '').trim();
  }

  // Extract City/UF at end (e.g., " - São Paulo/SP")
  const cityStateMatch = remaining.match(/(?:\s*-\s*)([^-/]+)\/([A-Za-z]{2})$/);
  if (cityStateMatch) {
    result.city = cityStateMatch[1].trim();
    result.state = cityStateMatch[2].trim().toUpperCase();
    remaining = remaining.slice(0, cityStateMatch.index).trim();
  }

  // Extract Bairro (e.g., " - Bairro Centro")
  const bairroMatch = remaining.match(/(?:\s*-\s*)Bairro\s+(.+)$/i);
  if (bairroMatch) {
    result.neighborhood = bairroMatch[1].trim();
    remaining = remaining.slice(0, bairroMatch.index).trim();
  }

  // Extract complement in parentheses at end of street part
  const compMatch = remaining.match(/\s*\(([^)]+)\)$/);
  if (compMatch) {
    result.complement = compMatch[1].trim();
    remaining = remaining.slice(0, compMatch.index).trim();
  }

  // Extract number (", nº 123")
  const numMatch = remaining.match(/,\s*nº\s*([^,]+)$/i);
  if (numMatch) {
    result.number = numMatch[1].trim();
    remaining = remaining.slice(0, numMatch.index).trim();
  }

  result.street = remaining;
  return result;
};

export interface CepLookupResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const lookupAddressByCEP = async (rawCep: string): Promise<CepLookupResult | null> => {
  const digits = rawCep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  // Primary: ViaCEP
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return {
          cep: formatCEP(digits),
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: (data.uf || '').toUpperCase(),
        };
      }
      if (data?.erro) {
        return null;
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback: BrasilAPI
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.city) {
        return {
          cep: formatCEP(digits),
          street: data.street || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: (data.state || '').toUpperCase(),
        };
      }
    }
  } catch {
    return null;
  }

  return null;
};

