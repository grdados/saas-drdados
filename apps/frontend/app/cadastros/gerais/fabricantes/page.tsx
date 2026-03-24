import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createFabricante, listFabricantes, updateFabricante } from "@/lib/api";

export default function FabricantesPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Gerais"
      title="Fabricantes"
      description="Cadastre fabricantes para organizar insumos, produtos e cultivares."
      fieldLabel="Fabricante"
      api={{
        list: listFabricantes,
        create: createFabricante,
        update: updateFabricante
      }}
    />
  );
}

