from django.contrib import admin

from . import models


_MODELS = [
    models.Cultura,
    models.Safra,
    models.GrupoCompra,
    models.Produtor,
    models.Cliente,
    models.Fornecedor,
    models.Transportador,
    models.CentroCusto,
    models.Operacao,
    models.Banco,
    models.Conta,
    models.Moeda,
    models.Caixa,
    models.CondicaoFinanceira,
    models.Insumo,
    models.Produto,
    models.Peca,
    models.Combustivel,
    models.Cultivar,
    models.Diverso,
    models.Fabricante,
    models.Propriedade,
    models.Talhao,
    models.Maquina,
    models.Benfeitoria,
    models.BombaCombustivel,
    models.Deposito,
]

for m in _MODELS:
    admin.site.register(m)

