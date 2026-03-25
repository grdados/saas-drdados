"use client";

import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createDeposito, listDepositos, updateDeposito } from "@/lib/api";

export default function DepositosPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Patrimonial"
      title="Depositos"
      description="Cadastre e mantenha os depositos para armazenagem dos produtos."
      fieldLabel="Deposito"
      api={{
        list: listDepositos,
        create: createDeposito,
        update: updateDeposito
      }}
    />
  );
}

