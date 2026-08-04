export function normalizeBrazilianPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('55') && [10, 11].includes(digits.length - 2)) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  }

  const normalized = `55${digits}`;
  return /^\d{13}$/.test(normalized) ? normalized : null;
}

export function buildWhatsappUrl(phone: string, message: string): string | null {
  const normalizedPhone = normalizeBrazilianPhone(phone);

  if (normalizedPhone === null) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
