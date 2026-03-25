import { EstoqueTipoPage } from "@/components/estoque/EstoqueTipoPage";

export default function EstoqueCombustivelPage() {
  return (
    <EstoqueTipoPage
      tipo="combustivel"
      title="Estoque de combustivel"
      description="Visualize as entradas de combustivel recebidas no faturamento por deposito e produto."
    />
  );
}

