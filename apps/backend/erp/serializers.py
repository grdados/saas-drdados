from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework import serializers

from accounts.permissions import get_current_company

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
GrupoProdutorSerializer = _mk_serializer(models.GrupoProdutor)


class ProdutorSerializer(serializers.ModelSerializer):
    grupo = GrupoProdutorSerializer(read_only=True)
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Produtor
        fields = [
            "id",
            "name",
            "registration",
            "cpf",
            "farm",
            "address",
            "google_location",
            "area_ha",
            "matricula",
            "city",
            "uf",
            "grupo",
            "grupo_id",
            "is_active",
            "created_at",
            "updated_at",
        ]
ClienteSerializer = _mk_serializer(models.Cliente)
FornecedorSerializer = _mk_serializer(models.Fornecedor)
TransportadorSerializer = _mk_serializer(models.Transportador)
CentroCustoSerializer = _mk_serializer(models.CentroCusto)


class OperacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Operacao
        fields = ["id", "name", "kind", "is_active", "created_at", "updated_at"]

BancoSerializer = _mk_serializer(models.Banco)


class ContaSerializer(serializers.ModelSerializer):
    banco_id = serializers.PrimaryKeyRelatedField(
        source="banco",
        queryset=models.Banco.objects.all(),
        required=False,
        allow_null=True,
    )
    produtor_id = serializers.PrimaryKeyRelatedField(
        source="produtor",
        queryset=models.Produtor.objects.all(),
        required=False,
        allow_null=True,
    )
    banco = serializers.SerializerMethodField()
    produtor = serializers.SerializerMethodField()

    class Meta:
        model = models.Conta
        fields = [
            "id",
            "name",
            "agencia",
            "banco",
            "banco_id",
            "produtor",
            "produtor_id",
            "saldo_inicial",
            "limite",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_banco(self, obj):
        if not getattr(obj, "banco_id", None):
            return None
        return {"id": obj.banco_id, "name": obj.banco.name}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}
MoedaSerializer = _mk_serializer(models.Moeda)
CaixaSerializer = _mk_serializer(models.Caixa)


class CondicaoFinanceiraSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CondicaoFinanceira
        fields = ["id", "name", "dias", "parcelas", "is_active", "created_at", "updated_at"]

CombustivelSerializer = _mk_serializer(models.Combustivel)


class CultivarSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Cultivar
        fields = [
            "id",
            "name",
            "description",
            "cycle",
            "maturity",
            "region_indicated",
            "brand",
            "is_active",
            "created_at",
            "updated_at",
        ]

DiversoSerializer = _mk_serializer(models.Diverso)
FabricanteSerializer = _mk_serializer(models.Fabricante)

CategoriaSerializer = _mk_serializer(models.Categoria)


def _validate_fk_company(fk_obj, company, label: str):
    if fk_obj is None or company is None:
        return
    if getattr(fk_obj, "company_id", None) != getattr(company, "id", None):
        raise serializers.ValidationError({label: "Registro de outra empresa."})


class InsumoSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        source="categoria", queryset=models.Categoria.objects.all(), allow_null=True, required=False
    )
    cultura = serializers.SerializerMethodField()
    cultura_id = serializers.PrimaryKeyRelatedField(
        source="cultura", queryset=models.Cultura.objects.all(), allow_null=True, required=False
    )
    fabricante = serializers.SerializerMethodField()
    fabricante_id = serializers.PrimaryKeyRelatedField(
        source="fabricante", queryset=models.Fabricante.objects.all(), allow_null=True, required=False
    )
    centro_custo = serializers.SerializerMethodField()
    centro_custo_id = serializers.PrimaryKeyRelatedField(
        source="centro_custo", queryset=models.CentroCusto.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Insumo
        fields = [
            "id",
            "name",
            "short_description",
            "unit",
            "categoria",
            "categoria_id",
            "cultura",
            "cultura_id",
            "fabricante",
            "fabricante_id",
            "centro_custo",
            "centro_custo_id",
            "has_seed_treatment",
            "tox_class",
            "active_ingredient",
            "dose",
            "density",
            "mapa_registry",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_cultura(self, obj):
        if not getattr(obj, "cultura_id", None):
            return None
        return {"id": obj.cultura_id, "name": obj.cultura.name}

    def get_fabricante(self, obj):
        if not getattr(obj, "fabricante_id", None):
            return None
        return {"id": obj.fabricante_id, "name": obj.fabricante.name}

    def get_centro_custo(self, obj):
        if not getattr(obj, "centro_custo_id", None):
            return None
        return {"id": obj.centro_custo_id, "name": obj.centro_custo.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("categoria"), company, "categoria_id")
        _validate_fk_company(attrs.get("cultura"), company, "cultura_id")
        _validate_fk_company(attrs.get("fabricante"), company, "fabricante_id")
        _validate_fk_company(attrs.get("centro_custo"), company, "centro_custo_id")
        return attrs


class ProdutoSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        source="categoria", queryset=models.Categoria.objects.all(), allow_null=True, required=False
    )
    cultura = serializers.SerializerMethodField()
    cultura_id = serializers.PrimaryKeyRelatedField(
        source="cultura", queryset=models.Cultura.objects.all(), allow_null=True, required=False
    )
    centro_custo = serializers.SerializerMethodField()
    centro_custo_id = serializers.PrimaryKeyRelatedField(
        source="centro_custo", queryset=models.CentroCusto.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Produto
        fields = [
            "id",
            "name",
            "short_description",
            "unit",
            "categoria",
            "categoria_id",
            "cultura",
            "cultura_id",
            "centro_custo",
            "centro_custo_id",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_cultura(self, obj):
        if not getattr(obj, "cultura_id", None):
            return None
        return {"id": obj.cultura_id, "name": obj.cultura.name}

    def get_centro_custo(self, obj):
        if not getattr(obj, "centro_custo_id", None):
            return None
        return {"id": obj.centro_custo_id, "name": obj.centro_custo.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("categoria"), company, "categoria_id")
        _validate_fk_company(attrs.get("cultura"), company, "cultura_id")
        _validate_fk_company(attrs.get("centro_custo"), company, "centro_custo_id")
        return attrs


class PecaSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        source="categoria", queryset=models.Categoria.objects.all(), allow_null=True, required=False
    )
    cultura = serializers.SerializerMethodField()
    cultura_id = serializers.PrimaryKeyRelatedField(
        source="cultura", queryset=models.Cultura.objects.all(), allow_null=True, required=False
    )
    fabricante = serializers.SerializerMethodField()
    fabricante_id = serializers.PrimaryKeyRelatedField(
        source="fabricante", queryset=models.Fabricante.objects.all(), allow_null=True, required=False
    )
    centro_custo = serializers.SerializerMethodField()
    centro_custo_id = serializers.PrimaryKeyRelatedField(
        source="centro_custo", queryset=models.CentroCusto.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Peca
        fields = [
            "id",
            "name",
            "short_description",
            "unit",
            "categoria",
            "categoria_id",
            "cultura",
            "cultura_id",
            "fabricante",
            "fabricante_id",
            "centro_custo",
            "centro_custo_id",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_cultura(self, obj):
        if not getattr(obj, "cultura_id", None):
            return None
        return {"id": obj.cultura_id, "name": obj.cultura.name}

    def get_fabricante(self, obj):
        if not getattr(obj, "fabricante_id", None):
            return None
        return {"id": obj.fabricante_id, "name": obj.fabricante.name}

    def get_centro_custo(self, obj):
        if not getattr(obj, "centro_custo_id", None):
            return None
        return {"id": obj.centro_custo_id, "name": obj.centro_custo.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("categoria"), company, "categoria_id")
        _validate_fk_company(attrs.get("cultura"), company, "cultura_id")
        _validate_fk_company(attrs.get("fabricante"), company, "fabricante_id")
        _validate_fk_company(attrs.get("centro_custo"), company, "centro_custo_id")
        return attrs


class PropriedadeSerializer(serializers.ModelSerializer):
    produtor = ProdutorSerializer(read_only=True)
    produtor_id = serializers.PrimaryKeyRelatedField(
      source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Propriedade
        fields = [
            "id",
            "name",
            "produtor",
            "produtor_id",
            "area_ha",
            "sicar",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TalhaoSerializer(serializers.ModelSerializer):
    propriedade = PropriedadeSerializer(read_only=True)
    propriedade_id = serializers.PrimaryKeyRelatedField(
        source="propriedade", queryset=models.Propriedade.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Talhao
        fields = [
            "id",
            "name",
            "propriedade",
            "propriedade_id",
            "area_ha",
            "map_location",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        """
        Regra: a soma das areas dos talhoes de uma propriedade nao pode ultrapassar a area da propriedade.
        Considera todos os talhoes (ativos ou nao) para evitar ultrapassar por "desativar" e criar novo.
        """
        propriedade = attrs.get("propriedade") or getattr(self.instance, "propriedade", None)
        area_ha = attrs.get("area_ha", getattr(self.instance, "area_ha", None))

        if propriedade is None or area_ha is None:
            return attrs

        qs = models.Talhao.objects.filter(company=propriedade.company, propriedade=propriedade)
        if self.instance and getattr(self.instance, "pk", None):
            qs = qs.exclude(pk=self.instance.pk)

        used = qs.aggregate(total=Coalesce(Sum("area_ha"), Decimal("0")))["total"] or Decimal("0")
        limit = propriedade.area_ha or Decimal("0")
        new_total = used + (area_ha if isinstance(area_ha, Decimal) else Decimal(str(area_ha)))

        if new_total > limit:
            remaining = limit - used
            raise serializers.ValidationError(
                {"area_ha": f"Area excede a area da propriedade. Disponivel: {remaining} ha."}
            )

        return attrs
MaquinaSerializer = _mk_serializer(models.Maquina)
BenfeitoriaSerializer = _mk_serializer(models.Benfeitoria)
BombaCombustivelSerializer = _mk_serializer(models.BombaCombustivel)
DepositoSerializer = _mk_serializer(models.Deposito)
