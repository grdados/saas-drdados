 "use client";

import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createBanco, listBancos, updateBanco } from "@/lib/api";

export default function BancosPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Financeiro"
      title="Bancos"
      description="Cadastre bancos para vincular contas e lancamentos."
      fieldLabel="Banco"
      api={{
        list: listBancos,
        create: createBanco,
        update: updateBanco
      }}
    />
  );
}
