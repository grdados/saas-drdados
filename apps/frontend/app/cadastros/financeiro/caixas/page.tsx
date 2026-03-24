 "use client";

import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createCaixa, listCaixas, updateCaixa } from "@/lib/api";

export default function CaixasPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Financeiro"
      title="Caixas"
      description="Cadastre caixas para controlar entradas e saidas."
      fieldLabel="Caixa"
      api={{
        list: listCaixas,
        create: createCaixa,
        update: updateCaixa
      }}
    />
  );
}
