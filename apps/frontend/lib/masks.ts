function digitsOnly(input: string) {
  return (input || "").replace(/\D+/g, "");
}

export function maskCEP(input: string) {
  const d = digitsOnly(input).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function maskCPF(input: string) {
  const d = digitsOnly(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(input: string) {
  const d = digitsOnly(input).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskCpfCnpj(input: string) {
  const d = digitsOnly(input);
  return d.length <= 11 ? maskCPF(d) : maskCNPJ(d);
}

export function maskPhoneBR(input: string) {
  // (##) ####-#### or (##) #####-####
  const d = digitsOnly(input).slice(0, 11);
  if (d.length <= 2) return d;
  const area = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${area}) ${rest}`;
  if (rest.length <= 8) return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // 9-digit subscriber
  return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function unmask(input: string) {
  return digitsOnly(input);
}

