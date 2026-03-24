from rest_framework import serializers

from . import models


class _BaseSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ["id", "name", "is_active", "created_at", "updated_at"]


def _mk_serializer(model_cls):
    meta = type(
        "Meta",
        (),
        {
            "model": model_cls,
            "fields": _BaseSerializer.Meta.fields,
        },
    )
    return type(f"{model_cls.__name__}Serializer", (_BaseSerializer,), {"Meta": meta})


CulturaSerializer = _mk_serializer(models.Cultura)


class SafraSerializer(serializers.ModelSerializer):
    cultura_id = serializers.PrimaryKeyRelatedField(
        source="cultura",
        queryset=models.Cultura.objects.all(),
        required=False,
        allow_null=True,
    )
    cultura = serializers.SerializerMethodField()

    class Meta:
        model = models.Safra
        fields = [
            "id",
            "name",
            "year",
            "start_date",
            "end_date",
            "cultura",
            "cultura_id",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_cultura(self, obj):
        if not getattr(obj, "cultura_id", None):
            return None
        # cultura pode vir via select_related
        return {"id": obj.cultura_id, "name": obj.cultura.name}

GrupoCompraSerializer = _mk_serializer(models.GrupoCompra)
ProdutorSerializer = _mk_serializer(models.Produtor)
ClienteSerializer = _mk_serializer(models.Cliente)
FornecedorSerializer = _mk_serializer(models.Fornecedor)
TransportadorSerializer = _mk_serializer(models.Transportador)
CentroCustoSerializer = _mk_serializer(models.CentroCusto)
OperacaoSerializer = _mk_serializer(models.Operacao)

BancoSerializer = _mk_serializer(models.Banco)
ContaSerializer = _mk_serializer(models.Conta)
MoedaSerializer = _mk_serializer(models.Moeda)
CaixaSerializer = _mk_serializer(models.Caixa)
CondicaoFinanceiraSerializer = _mk_serializer(models.CondicaoFinanceira)

InsumoSerializer = _mk_serializer(models.Insumo)
ProdutoSerializer = _mk_serializer(models.Produto)
PecaSerializer = _mk_serializer(models.Peca)
CombustivelSerializer = _mk_serializer(models.Combustivel)
CultivarSerializer = _mk_serializer(models.Cultivar)
DiversoSerializer = _mk_serializer(models.Diverso)
FabricanteSerializer = _mk_serializer(models.Fabricante)

PropriedadeSerializer = _mk_serializer(models.Propriedade)
TalhaoSerializer = _mk_serializer(models.Talhao)
MaquinaSerializer = _mk_serializer(models.Maquina)
BenfeitoriaSerializer = _mk_serializer(models.Benfeitoria)
BombaCombustivelSerializer = _mk_serializer(models.BombaCombustivel)
DepositoSerializer = _mk_serializer(models.Deposito)
