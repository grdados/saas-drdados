import { EstoqueTipoPage } from "@/components/estoque/EstoqueTipoPage";

export default function EstoqueInsumosPage() {
  return (
    <EstoqueTipoPage
      tipo="insumos"
      title="Estoque de insumos"
      description="Controle as entradas de insumos vindas dos faturamentos e o valor consolidado por deposito."
    />
  );
}

