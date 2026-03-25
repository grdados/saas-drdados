export function toUpperText(v: string): string {
  // Use locale-aware uppercase for Portuguese (accents, ç, etc.).
  return (v ?? "").toLocaleUpperCase("pt-BR");
}

