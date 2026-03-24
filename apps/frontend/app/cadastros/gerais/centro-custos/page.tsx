import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createCentroCusto, listCentrosCusto, updateCentroCusto } from "@/lib/api";

export default function CentroCustosPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Gerais"
      title="Centro de custos"
      description="Cadastre centros de custo para classificar e organizar despesas e receitas."
      fieldLabel="Custo"
      api={{
        list: listCentrosCusto,
        create: createCentroCusto,
        update: updateCentroCusto
      }}
    />
  );
}

