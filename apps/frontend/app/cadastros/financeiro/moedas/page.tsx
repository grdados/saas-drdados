import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createMoeda, listMoedas, updateMoeda } from "@/lib/api";

export default function MoedasPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Financeiro"
      title="Moedas"
      description="Cadastre moedas para operacoes e relatorios financeiros."
      fieldLabel="Moeda"
      api={{
        list: listMoedas,
        create: createMoeda,
        update: updateMoeda
      }}
    />
  );
}

