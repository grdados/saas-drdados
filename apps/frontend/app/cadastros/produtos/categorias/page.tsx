"use client";

import { SimpleCadastroPage } from "@/components/cadastros/SimpleCadastroPage";
import { createCategoria, listCategorias, updateCategoria } from "@/lib/api";

export default function CategoriasPage() {
  return (
    <SimpleCadastroPage
      breadcrumb="Cadastros · Produtos"
      title="Categorias"
      description="Cadastre categorias para organizar insumos, pecas e produtos."
      fieldLabel="Categoria"
      api={{
        list: listCategorias,
        create: createCategoria,
        update: updateCategoria
      }}
    />
  );
}

