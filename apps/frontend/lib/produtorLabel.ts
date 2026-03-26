type ProdutorLabelSource = {
  name: string;
  propriedades?: Array<{ id?: number; name: string }> | null;
};

export function produtorDisplayLabel(produtor: ProdutorLabelSource) {
  return (produtor.name || "").trim();
}
