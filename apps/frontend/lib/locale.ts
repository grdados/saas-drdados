export const APP_LOCALE = "pt-BR";
export const APP_TIME_ZONE = "America/Cuiaba";
export const APP_CURRENCY = "BRL";

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "currency",
  currency: APP_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrencyBRL(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(APP_LOCALE, options).format(Number.isFinite(value) ? value : 0);
}

export function formatDateBR(value: Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE
  }).format(value);
}

export function formatDateTimeBR(value: Date): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: APP_TIME_ZONE
  }).format(value);
}

