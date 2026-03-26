type ProdutorLabelSource = {
  name: string;
  propriedades?: Array<{ id?: number; name: string }> | null;
};

export function produtorDisplayLabel(produtor: ProdutorLabelSource) {
  const base = (produtor.name || "").trim();
  const propriedades = (produtor.propriedades ?? []).map((p) => (p.name || "").trim()).filter(Boolean);
  if (!propriedades.length) return base;
  return `${base} - ${propriedades[0]}`;
}
