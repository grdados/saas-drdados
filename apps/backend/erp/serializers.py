from datetime import date
from decimal import Decimal
from uuid import uuid4

from django.db import transaction
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


def _compute_status_for_conta(due_date, total_value: Decimal, paid_value: Decimal) -> str:
    total = total_value if total_value > Decimal("0") else Decimal("0")
    paid = paid_value if paid_value > Decimal("0") else Decimal("0")
    if paid >= total and total > Decimal("0"):
        return models.ContaPagar.Status.PAID
    if paid > Decimal("0"):
        return models.ContaPagar.Status.PARTIAL
    if due_date and due_date < date.today():
        return models.ContaPagar.Status.OVERDUE
    return models.ContaPagar.Status.OPEN


def _to_kg(quantity: Decimal, unit: str) -> Decimal:
    u = (unit or "").strip().upper()
    if u.startswith("SC"):
        return (quantity or Decimal("0")) * Decimal("60")
    return quantity or Decimal("0")


def _avg_price_kg_from_contrato(contrato: models.ContratoVenda) -> Decimal:
    items = list(models.ContratoVendaItem.objects.filter(contrato=contrato))
    qty_kg_total = Decimal("0")
    total_value = Decimal("0")
    for item in items:
        qty_kg = _to_kg(item.quantity or Decimal("0"), item.unit or "KG")
        line_total = item.total_item if item.total_item is not None else (item.quantity or Decimal("0")) * (item.price or Decimal("0"))
        qty_kg_total += qty_kg
        total_value += line_total or Decimal("0")
    if qty_kg_total <= Decimal("0"):
        return Decimal("0")
    return total_value / qty_kg_total


def _sync_conta_receber_nota_venda(nota: models.NotaFiscalGraos):
    if not nota:
        return
    if nota.tipo != models.NotaFiscalGraos.Tipo.SAIDA:
        return
    if nota.finalidade != models.NotaFiscalGraos.Finalidade.VENDA:
        return
    if nota.status == models.NotaFiscalGraos.Status.CANCELED:
        models.ContaReceber.objects.filter(
            company=nota.company,
            origem=models.ContaReceber.Origem.NOTA_FISCAL,
            document_number=(nota.number or "").strip().upper(),
        ).delete()
        return

    conta = (
        models.ContaReceber.objects.filter(
            company=nota.company,
            origem=models.ContaReceber.Origem.NOTA_FISCAL,
            document_number=(nota.number or "").strip().upper(),
        )
        .order_by("id")
        .first()
    )
    if conta is None:
        conta = models.ContaReceber(
            company=nota.company,
            origem=models.ContaReceber.Origem.NOTA_FISCAL,
            payment_method=models.FaturamentoCompra.PaymentMethod.PIX,
            received_value=Decimal("0"),
            discount_value=Decimal("0"),
            addition_value=Decimal("0"),
        )

    total = nota.total_value or Decimal("0")
    received = conta.received_value or Decimal("0")
    if received > total:
        total = received

    conta.date = nota.date
    conta.due_date = nota.due_date
    conta.document_number = (nota.number or "").strip().upper()
    conta.produtor = nota.produtor
    conta.cliente = nota.cliente
    conta.operacao = nota.operacao
    conta.total_value = total
    conta.balance_value = max(Decimal("0"), total - received)
    conta.status = _compute_status_for_conta(conta.due_date, total, received)
    if received <= 0:
        conta.receive_date = None
    conta.save()


def _sync_conta_receber_contrato(contrato: models.ContratoVenda):
    if not contrato:
        return

    conta = (
        models.ContaReceber.objects.filter(
            contrato=contrato,
            origem=models.ContaReceber.Origem.CONTRATO,
        )
        .order_by("id")
        .first()
    )
    if conta is None:
        conta = models.ContaReceber(
            company=contrato.company,
            contrato=contrato,
            origem=models.ContaReceber.Origem.CONTRATO,
            payment_method=models.FaturamentoCompra.PaymentMethod.PIX,
            received_value=Decimal("0"),
            discount_value=Decimal("0"),
            addition_value=Decimal("0"),
        )

    sold_qs = models.NotaFiscalGraos.objects.filter(
            company=contrato.company,
            tipo=models.NotaFiscalGraos.Tipo.ENTRADA,
            romaneio__contrato=contrato,
        ).exclude(status=models.NotaFiscalGraos.Status.CANCELED)
    avg_price_kg = _avg_price_kg_from_contrato(contrato)
    sold_total = Decimal("0")
    for nf in sold_qs:
        line_total = nf.total_value or Decimal("0")
        if line_total <= Decimal("0") and avg_price_kg > Decimal("0"):
            line_total = (nf.quantity_kg or Decimal("0")) * avg_price_kg
        sold_total += line_total

    received = conta.received_value or Decimal("0")
    total_base = sold_total if sold_total > Decimal("0") else (contrato.total_value or Decimal("0"))
    if received > total_base:
        total_base = received

    conta.date = contrato.date
    conta.due_date = contrato.due_date
    conta.document_number = contrato.code or f"CTV-{contrato.id}"
    conta.grupo = contrato.grupo
    conta.produtor = contrato.produtor
    conta.cliente = contrato.cliente
    conta.operacao = contrato.operacao
    conta.total_value = total_base
    conta.balance_value = max(Decimal("0"), total_base - received)
    conta.status = _compute_status_for_conta(conta.due_date, total_base, received)
    if received <= 0:
        conta.receive_date = None
    conta.save()


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


class GrupoProdutorSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.GrupoProdutor
        fields = [
            "id",
            "name",
            "cpf_cnpj",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ProdutorSerializer(serializers.ModelSerializer):
    grupo = GrupoProdutorSerializer(read_only=True)
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )
    propriedades = serializers.SerializerMethodField()

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
            "propriedades",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_propriedades(self, obj):
        by_fk = getattr(obj, "propriedade_set", models.Propriedade.objects.none()).all()
        by_m2m = getattr(obj, "propriedades", models.Propriedade.objects.none()).all()
        merged = {}
        for p in list(by_fk) + list(by_m2m):
            merged[p.id] = {"id": p.id, "name": p.name}
        return sorted(merged.values(), key=lambda x: x["name"])
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Cliente
        fields = [
            "id",
            "name",
            "doc",
            "ie",
            "address",
            "cep",
            "city",
            "uf",
            "is_active",
            "created_at",
            "updated_at",
        ]


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Fornecedor
        fields = [
            "id",
            "name",
            "doc",
            "ie",
            "address",
            "cep",
            "city",
            "uf",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TransportadorPlacaSerializer(serializers.ModelSerializer):
    transportador = serializers.SerializerMethodField()
    transportador_id = serializers.PrimaryKeyRelatedField(
        source="transportador",
        queryset=models.Transportador.objects.all(),
        allow_null=False,
        required=True,
    )

    class Meta:
        model = models.TransportadorPlaca
        fields = [
            "id",
            "transportador",
            "transportador_id",
            "plate",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_transportador(self, obj):
        if not getattr(obj, "transportador_id", None):
            return None
        return {"id": obj.transportador_id, "name": obj.transportador.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("transportador"), company, "transportador_id")
        return attrs


class TransportadorSerializer(serializers.ModelSerializer):
    placas = serializers.SerializerMethodField()

    class Meta:
        model = models.Transportador
        fields = ["id", "name", "placas", "is_active", "created_at", "updated_at"]

    def get_placas(self, obj):
        rel = getattr(obj, "placas", None)
        if rel is None:
            return []
        return [
            {"id": p.id, "plate": p.plate, "is_active": p.is_active}
            for p in rel.all().order_by("plate")
        ]


CentroCustoSerializer = _mk_serializer(models.CentroCusto)


class OperacaoSerializer(serializers.ModelSerializer):
    @staticmethod
    def _normalize_kind(value: str) -> str:
        raw = str(value or "").strip().lower()
        alias = {
            "credito": models.Operacao.Kind.CREDIT,
            "crédito": models.Operacao.Kind.CREDIT,
            "debito": models.Operacao.Kind.DEBIT,
            "débito": models.Operacao.Kind.DEBIT,
            "transferencia": models.Operacao.Kind.TRANSFER,
            "transferência": models.Operacao.Kind.TRANSFER,
            "remessa p/ deposito": models.Operacao.Kind.REMESSA_DEPOSITO,
            "remessa p/ depósito": models.Operacao.Kind.REMESSA_DEPOSITO,
            "remessa para deposito": models.Operacao.Kind.REMESSA_DEPOSITO,
            "remessa para depósito": models.Operacao.Kind.REMESSA_DEPOSITO,
            "afixar": models.Operacao.Kind.A_FIXAR,
            "a fixar": models.Operacao.Kind.A_FIXAR,
            "devolucao": models.Operacao.Kind.DEVOLUCAO,
            "devolução": models.Operacao.Kind.DEVOLUCAO,
        }
        return alias.get(raw, raw)

    def validate_kind(self, value):
        normalized = self._normalize_kind(value)
        allowed = {choice for choice, _ in models.Operacao.Kind.choices}
        if normalized not in allowed:
            raise serializers.ValidationError("Tipo de operacao invalido.")
        return normalized

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["kind"] = self._normalize_kind(data.get("kind", ""))
        return data

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


class PedidoCompraItemSerializer(serializers.ModelSerializer):
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(
        source="produto", queryset=models.Insumo.objects.all(), allow_null=True, required=False
    )
    total_item = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = models.PedidoCompraItem
        fields = [
            "id",
            "produto",
            "produto_id",
            "unit",
            "quantity",
            "received_quantity",
            "price",
            "discount",
            "total_item",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("produto"), company, "produto_id")

        qty = attrs.get("quantity")
        price = attrs.get("price")
        discount = attrs.get("discount") or Decimal("0")
        # total_item sempre calculado (na create/update do PedidoCompra)
        if qty is not None and qty < 0:
            raise serializers.ValidationError({"quantity": "Quantidade nao pode ser negativa."})
        if price is not None and price < 0:
            raise serializers.ValidationError({"price": "Preco nao pode ser negativo."})
        if discount < 0:
            raise serializers.ValidationError({"discount": "Desconto nao pode ser negativo."})
        return attrs


class PedidoCompraSerializer(serializers.ModelSerializer):
    grupo = serializers.SerializerMethodField()
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(
        source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False
    )
    fornecedor = serializers.SerializerMethodField()
    fornecedor_id = serializers.PrimaryKeyRelatedField(
        source="fornecedor", queryset=models.Fornecedor.objects.all(), allow_null=True, required=False
    )
    safra = serializers.SerializerMethodField()
    safra_id = serializers.PrimaryKeyRelatedField(
        source="safra", queryset=models.Safra.objects.all(), allow_null=True, required=False
    )
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(
        source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False
    )

    items = PedidoCompraItemSerializer(many=True, required=False)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = models.PedidoCompra
        fields = [
            "id",
            "date",
            "code",
            "grupo",
            "grupo_id",
            "produtor",
            "produtor_id",
            "fornecedor",
            "fornecedor_id",
            "safra",
            "safra_id",
            "due_date",
            "operacao",
            "operacao_id",
            "total_value",
            "status",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_grupo(self, obj):
        if not getattr(obj, "grupo_id", None):
            return None
        return {"id": obj.grupo_id, "name": obj.grupo.name, "cpf_cnpj": getattr(obj.grupo, "cpf_cnpj", "")}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_fornecedor(self, obj):
        if not getattr(obj, "fornecedor_id", None):
            return None
        return {"id": obj.fornecedor_id, "name": obj.fornecedor.name}

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("grupo"), company, "grupo_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("fornecedor"), company, "fornecedor_id")
        _validate_fk_company(attrs.get("safra"), company, "safra_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")
        return attrs

    def _upsert_items(self, pedido: models.PedidoCompra, items_data):
        # Recria itens quando enviados (MVP simples).
        models.PedidoCompraItem.objects.filter(pedido=pedido).delete()
        total = Decimal("0")
        for it in items_data or []:
            qty = it.get("quantity") or Decimal("0")
            price = it.get("price") or Decimal("0")
            discount = it.get("discount") or Decimal("0")
            total_item = (qty * price) - discount
            if total_item < 0:
                total_item = Decimal("0")
            obj = models.PedidoCompraItem.objects.create(
                company=pedido.company,
                pedido=pedido,
                produto=it.get("produto"),
                unit=(it.get("unit") or "").strip(),
                quantity=qty,
                price=price,
                discount=discount,
                total_item=total_item,
            )
            total += obj.total_item
        pedido.total_value = total
        pedido.save(update_fields=["total_value", "updated_at"])

    def _sync_conta_origem_pedido(self, pedido: models.PedidoCompra):
        conta = (
            models.ContaPagar.objects.filter(
                pedido=pedido,
                faturamento__isnull=True,
                origem=models.ContaPagar.Origem.PEDIDO,
            )
            .order_by("id")
            .first()
        )
        if conta is None:
            conta = models.ContaPagar(
                company=pedido.company,
                pedido=pedido,
                faturamento=None,
                origem=models.ContaPagar.Origem.PEDIDO,
                payment_method=models.FaturamentoCompra.PaymentMethod.PIX,
                paid_value=Decimal("0"),
                discount_value=Decimal("0"),
                addition_value=Decimal("0"),
            )

        paid = conta.paid_value or Decimal("0")
        total = pedido.total_value or Decimal("0")
        faturado_total = (
            models.FaturamentoCompra.objects.filter(pedido=pedido)
            .exclude(status=models.FaturamentoCompra.Status.CANCELED)
            .aggregate(v=Coalesce(Sum("total_value"), Decimal("0")))["v"]
            or Decimal("0")
        )
        if paid <= 0:
            remaining = total - faturado_total
            total = remaining if remaining > 0 else Decimal("0")
        if paid > total:
            total = paid
        conta.date = pedido.date
        conta.due_date = pedido.due_date
        conta.invoice_number = pedido.code or f"PED-{pedido.id}"
        conta.grupo = pedido.grupo
        conta.produtor = pedido.produtor
        conta.fornecedor = pedido.fornecedor
        conta.operacao = pedido.operacao
        conta.total_value = total
        conta.balance_value = max(Decimal("0"), total - paid)
        conta.status = _compute_status_for_conta(conta.due_date, conta.total_value, paid)
        if paid <= 0:
            conta.payment_date = None
        if (conta.total_value or Decimal("0")) <= 0 and paid <= 0:
            if conta.pk:
                conta.delete()
            return
        conta.save()

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        pedido = models.PedidoCompra.objects.create(**validated_data)
        self._upsert_items(pedido, items_data)
        self._sync_conta_origem_pedido(pedido)
        return pedido

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            self._upsert_items(instance, items_data)
        self._sync_conta_origem_pedido(instance)
        return instance


class EmpreendimentoItemSerializer(serializers.ModelSerializer):
    talhao = serializers.SerializerMethodField()
    talhao_id = serializers.PrimaryKeyRelatedField(
        source="talhao", queryset=models.Talhao.objects.all(), allow_null=True, required=False
    )
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(
        source="produto", queryset=models.Produto.objects.all(), allow_null=True, required=False
    )
    cultivar = serializers.SerializerMethodField()
    cultivar_id = serializers.PrimaryKeyRelatedField(
        source="cultivar", queryset=models.Cultivar.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.EmpreendimentoItem
        fields = [
            "id",
            "talhao",
            "talhao_id",
            "produto",
            "produto_id",
            "cultivar",
            "cultivar_id",
            "unit",
            "area_ha",
            "produtividade",
            "plant_date",
            "close_date",
            "production_sc",
            "production_kg",
            "created_at",
            "updated_at",
        ]

    def get_talhao(self, obj):
        if not getattr(obj, "talhao_id", None):
            return None
        return {"id": obj.talhao_id, "name": obj.talhao.name}

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def get_cultivar(self, obj):
        if not getattr(obj, "cultivar_id", None):
            return None
        return {"id": obj.cultivar_id, "name": obj.cultivar.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("talhao"), company, "talhao_id")
        _validate_fk_company(attrs.get("produto"), company, "produto_id")
        _validate_fk_company(attrs.get("cultivar"), company, "cultivar_id")
        return attrs


class EmpreendimentoSerializer(serializers.ModelSerializer):
    safra = serializers.SerializerMethodField()
    safra_id = serializers.PrimaryKeyRelatedField(
        source="safra", queryset=models.Safra.objects.all(), allow_null=True, required=False
    )
    propriedade = serializers.SerializerMethodField()
    propriedade_id = serializers.PrimaryKeyRelatedField(
        source="propriedade", queryset=models.Propriedade.objects.all(), allow_null=True, required=False
    )
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(
        source="produto", queryset=models.Produto.objects.all(), allow_null=True, required=False
    )
    centro_custo = serializers.SerializerMethodField()
    centro_custo_id = serializers.PrimaryKeyRelatedField(
        source="centro_custo", queryset=models.CentroCusto.objects.all(), allow_null=True, required=False
    )
    items = EmpreendimentoItemSerializer(many=True, required=False)

    class Meta:
        model = models.Empreendimento
        fields = [
            "id",
            "date",
            "code",
            "safra",
            "safra_id",
            "propriedade",
            "propriedade_id",
            "produto",
            "produto_id",
            "centro_custo",
            "centro_custo_id",
            "unit",
            "sale_price",
            "billing_value",
            "status",
            "notes",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_propriedade(self, obj):
        if not getattr(obj, "propriedade_id", None):
            return None
        return {"id": obj.propriedade_id, "name": obj.propriedade.name}

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def get_centro_custo(self, obj):
        if not getattr(obj, "centro_custo_id", None):
            return None
        return {"id": obj.centro_custo_id, "name": obj.centro_custo.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("safra"), company, "safra_id")
        _validate_fk_company(attrs.get("propriedade"), company, "propriedade_id")
        _validate_fk_company(attrs.get("produto"), company, "produto_id")
        _validate_fk_company(attrs.get("centro_custo"), company, "centro_custo_id")
        return attrs

    def _upsert_items(self, empreendimento: models.Empreendimento, items_data):
        models.EmpreendimentoItem.objects.filter(empreendimento=empreendimento).delete()
        for it in items_data or []:
            models.EmpreendimentoItem.objects.create(
                id=(it.get("id") or f"row-{uuid4().hex[:10]}"),
                company=empreendimento.company,
                empreendimento=empreendimento,
                talhao=it.get("talhao"),
                produto=it.get("produto"),
                cultivar=it.get("cultivar"),
                unit=(it.get("unit") or "").strip().upper(),
                area_ha=it.get("area_ha") or Decimal("0"),
                produtividade=it.get("produtividade") or Decimal("0"),
                plant_date=it.get("plant_date") or None,
                close_date=it.get("close_date") or None,
                production_sc=it.get("production_sc") or Decimal("0"),
                production_kg=it.get("production_kg") or Decimal("0"),
            )

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        empreendimento = models.Empreendimento.objects.create(**validated_data)
        self._upsert_items(empreendimento, items_data)
        return empreendimento

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            self._upsert_items(instance, items_data)
        return instance


class ChuvaSerializer(serializers.ModelSerializer):
    empreendimento = serializers.SerializerMethodField()
    empreendimento_id = serializers.PrimaryKeyRelatedField(
        source="empreendimento", queryset=models.Empreendimento.objects.all(), allow_null=False, required=True
    )
    talhao = serializers.SerializerMethodField()
    talhao_id = serializers.PrimaryKeyRelatedField(
        source="talhao", queryset=models.Talhao.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.Chuva
        fields = [
            "id",
            "date",
            "empreendimento",
            "empreendimento_id",
            "talhao",
            "talhao_id",
            "pluviometro_id",
            "tipo",
            "volume_mm",
            "created_at",
            "updated_at",
        ]

    def get_empreendimento(self, obj):
        if not getattr(obj, "empreendimento_id", None):
            return None
        return {"id": obj.empreendimento_id, "code": obj.empreendimento.code}

    def get_talhao(self, obj):
        if not getattr(obj, "talhao_id", None):
            return None
        return {"id": obj.talhao_id, "name": obj.talhao.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("empreendimento"), company, "empreendimento_id")
        _validate_fk_company(attrs.get("talhao"), company, "talhao_id")
        pluviometro_id = (attrs.get("pluviometro_id") or "").strip()
        if not pluviometro_id:
            raise serializers.ValidationError({"pluviometro_id": "Informe o ID do pluviometro."})
        empreendimento = attrs.get("empreendimento")
        talhao = attrs.get("talhao")
        if empreendimento and talhao:
            belongs = models.EmpreendimentoItem.objects.filter(
                empreendimento=empreendimento,
                talhao=talhao,
            ).exists()
            if not belongs:
                raise serializers.ValidationError(
                    {"talhao_id": "Talhao nao vinculado ao empreendimento selecionado."}
                )
        return attrs


class ContratoVendaItemSerializer(serializers.ModelSerializer):
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(
        source="produto", queryset=models.Produto.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = models.ContratoVendaItem
        fields = [
            "id",
            "produto",
            "produto_id",
            "unit",
            "quantity",
            "delivered_quantity",
            "price",
            "discount",
            "total_item",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def validate(self, attrs):
        qty = attrs.get("quantity")
        price = attrs.get("price")
        discount = attrs.get("discount") or Decimal("0")
        if qty is not None and qty < 0:
            raise serializers.ValidationError({"quantity": "Quantidade nao pode ser negativa."})
        if price is not None and price < 0:
            raise serializers.ValidationError({"price": "Preco nao pode ser negativo."})
        if discount < 0:
            raise serializers.ValidationError({"discount": "Desconto nao pode ser negativo."})
        return attrs


class ContratoVendaSerializer(serializers.ModelSerializer):
    grupo = serializers.SerializerMethodField()
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(
        source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False
    )
    cliente = serializers.SerializerMethodField()
    cliente_id = serializers.PrimaryKeyRelatedField(
        source="cliente", queryset=models.Cliente.objects.all(), allow_null=True, required=False
    )
    safra = serializers.SerializerMethodField()
    safra_id = serializers.PrimaryKeyRelatedField(
        source="safra", queryset=models.Safra.objects.all(), allow_null=True, required=False
    )
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(
        source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False
    )
    items = ContratoVendaItemSerializer(many=True, required=False)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = models.ContratoVenda
        fields = [
            "id",
            "date",
            "code",
            "grupo",
            "grupo_id",
            "produtor",
            "produtor_id",
            "cliente",
            "cliente_id",
            "safra",
            "safra_id",
            "due_date",
            "operacao",
            "operacao_id",
            "status",
            "notes",
            "total_value",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_grupo(self, obj):
        if not getattr(obj, "grupo_id", None):
            return None
        return {"id": obj.grupo_id, "name": obj.grupo.name, "cpf_cnpj": getattr(obj.grupo, "cpf_cnpj", "")}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_cliente(self, obj):
        if not getattr(obj, "cliente_id", None):
            return None
        return {"id": obj.cliente_id, "name": obj.cliente.name}

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("grupo"), company, "grupo_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("cliente"), company, "cliente_id")
        _validate_fk_company(attrs.get("safra"), company, "safra_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")
        return attrs

    def _upsert_items(self, contrato: models.ContratoVenda, items_data):
        models.ContratoVendaItem.objects.filter(contrato=contrato).delete()
        total = Decimal("0")
        for it in items_data or []:
            qty = it.get("quantity") or Decimal("0")
            price = it.get("price") or Decimal("0")
            discount = it.get("discount") or Decimal("0")
            total_item = (qty * price) - discount
            if total_item < 0:
                total_item = Decimal("0")
            obj = models.ContratoVendaItem.objects.create(
                company=contrato.company,
                contrato=contrato,
                produto=it.get("produto"),
                unit=(it.get("unit") or "").strip(),
                quantity=qty,
                delivered_quantity=Decimal("0"),
                price=price,
                discount=discount,
                total_item=total_item,
            )
            total += obj.total_item
        contrato.total_value = total
        contrato.save(update_fields=["total_value", "updated_at"])

    def _sync_conta_receber_contrato(self, contrato: models.ContratoVenda):
        _sync_conta_receber_contrato(contrato)

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        contrato = models.ContratoVenda.objects.create(**validated_data)
        self._upsert_items(contrato, items_data)
        self._sync_conta_receber_contrato(contrato)
        return contrato

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            self._upsert_items(instance, items_data)
        self._sync_conta_receber_contrato(instance)
        return instance


class ContaReceberSerializer(serializers.ModelSerializer):
    grupo = serializers.SerializerMethodField()
    produtor = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    operacao = serializers.SerializerMethodField()
    contrato = serializers.SerializerMethodField()
    conta = serializers.SerializerMethodField()
    conta_id = serializers.PrimaryKeyRelatedField(
        source="conta", queryset=models.Conta.objects.all(), allow_null=True, required=False
    )
    receive_increment = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, write_only=True, min_value=Decimal("0")
    )

    class Meta:
        model = models.ContaReceber
        fields = [
            "id",
            "date",
            "due_date",
            "document_number",
            "grupo",
            "produtor",
            "cliente",
            "operacao",
            "contrato",
            "origem",
            "total_value",
            "received_value",
            "balance_value",
            "discount_value",
            "addition_value",
            "receive_date",
            "payment_method",
            "conta",
            "conta_id",
            "receive_increment",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_grupo(self, obj):
        if not getattr(obj, "grupo_id", None):
            return None
        return {"id": obj.grupo_id, "name": obj.grupo.name}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_cliente(self, obj):
        if not getattr(obj, "cliente_id", None):
            return None
        return {"id": obj.cliente_id, "name": obj.cliente.name}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def get_contrato(self, obj):
        if not getattr(obj, "contrato_id", None):
            return None
        return {"id": obj.contrato_id, "code": obj.contrato.code}

    def get_conta(self, obj):
        if not getattr(obj, "conta_id", None):
            return None
        return {"id": obj.conta_id, "name": obj.conta.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("conta"), company, "conta_id")

        current_total = getattr(self.instance, "total_value", Decimal("0")) if self.instance else Decimal("0")
        current_received = getattr(self.instance, "received_value", Decimal("0")) if self.instance else Decimal("0")
        current_discount = getattr(self.instance, "discount_value", Decimal("0")) if self.instance else Decimal("0")
        current_addition = getattr(self.instance, "addition_value", Decimal("0")) if self.instance else Decimal("0")
        total = attrs.get("total_value", current_total) or Decimal("0")
        received = attrs.get("received_value", current_received) or Decimal("0")
        discount = attrs.get("discount_value", current_discount) or Decimal("0")
        addition = attrs.get("addition_value", current_addition) or Decimal("0")
        increment = attrs.get("receive_increment")

        if received < 0:
            raise serializers.ValidationError({"received_value": "Valor recebido nao pode ser negativo."})
        if discount < 0:
            raise serializers.ValidationError({"discount_value": "Desconto nao pode ser negativo."})
        if addition < 0:
            raise serializers.ValidationError({"addition_value": "Acrescimo nao pode ser negativo."})
        if increment is not None and increment < 0:
            raise serializers.ValidationError({"receive_increment": "Valor de recebimento nao pode ser negativo."})

        effective_total = total + addition - discount
        if effective_total < 0:
            effective_total = Decimal("0")
        if received > effective_total:
            raise serializers.ValidationError({"received_value": "Valor recebido nao pode ser maior que o valor total ajustado."})
        return attrs

    def update(self, instance, validated_data):
        increment = validated_data.pop("receive_increment", None)
        obj = super().update(instance, validated_data)
        total = obj.total_value or Decimal("0")
        discount = obj.discount_value or Decimal("0")
        addition = obj.addition_value or Decimal("0")
        received = obj.received_value or Decimal("0")
        if increment is not None:
            received += increment
        if received < 0:
            received = Decimal("0")

        effective_total = total + addition - discount
        if effective_total < 0:
            effective_total = Decimal("0")
        if received > effective_total:
            received = effective_total

        if obj.status == models.ContaReceber.Status.CANCELED:
            pass
        elif effective_total > 0 and received >= effective_total:
            obj.status = models.ContaReceber.Status.PAID
        elif received > 0:
            obj.status = models.ContaReceber.Status.PARTIAL
        elif obj.due_date and obj.due_date < date.today():
            obj.status = models.ContaReceber.Status.OVERDUE
        else:
            obj.status = models.ContaReceber.Status.OPEN

        obj.received_value = received
        obj.balance_value = max(Decimal("0"), effective_total - received)
        if received > 0 and not obj.receive_date:
            obj.receive_date = date.today()
        if received <= 0:
            obj.receive_date = None
        obj.save(update_fields=["status", "received_value", "balance_value", "receive_date", "updated_at"])
        return obj

CombustivelSerializer = _mk_serializer(models.Combustivel)


class ContaPagarSerializer(serializers.ModelSerializer):
    grupo = serializers.SerializerMethodField()
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(
        source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False
    )
    fornecedor = serializers.SerializerMethodField()
    fornecedor_id = serializers.PrimaryKeyRelatedField(
        source="fornecedor", queryset=models.Fornecedor.objects.all(), allow_null=True, required=False
    )
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(
        source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False
    )
    conta = serializers.SerializerMethodField()
    conta_id = serializers.PrimaryKeyRelatedField(
        source="conta", queryset=models.Conta.objects.all(), allow_null=True, required=False
    )

    pedido = serializers.SerializerMethodField()
    pedido_id = serializers.PrimaryKeyRelatedField(
        source="pedido", queryset=models.PedidoCompra.objects.all(), allow_null=True, required=False
    )
    faturamento = serializers.SerializerMethodField()
    faturamento_id = serializers.PrimaryKeyRelatedField(
        source="faturamento", queryset=models.FaturamentoCompra.objects.all(), allow_null=True, required=False
    )
    payment_increment = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, write_only=True, min_value=Decimal("0")
    )

    class Meta:
        model = models.ContaPagar
        fields = [
            "id",
            "date",
            "due_date",
            "invoice_number",
            "grupo",
            "grupo_id",
            "produtor",
            "produtor_id",
            "fornecedor",
            "fornecedor_id",
            "operacao",
            "operacao_id",
            "pedido",
            "pedido_id",
            "faturamento",
            "faturamento_id",
            "origem",
            "total_value",
            "paid_value",
            "balance_value",
            "discount_value",
            "addition_value",
            "payment_date",
            "payment_method",
            "conta",
            "conta_id",
            "payment_increment",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_grupo(self, obj):
        if not getattr(obj, "grupo_id", None):
            return None
        return {"id": obj.grupo_id, "name": obj.grupo.name, "cpf_cnpj": getattr(obj.grupo, "cpf_cnpj", "")}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_fornecedor(self, obj):
        if not getattr(obj, "fornecedor_id", None):
            return None
        return {"id": obj.fornecedor_id, "name": obj.fornecedor.name}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def get_pedido(self, obj):
        if not getattr(obj, "pedido_id", None):
            return None
        return {"id": obj.pedido_id, "code": obj.pedido.code}

    def get_faturamento(self, obj):
        if not getattr(obj, "faturamento_id", None):
            return None
        return {"id": obj.faturamento_id, "invoice_number": obj.faturamento.invoice_number}

    def get_conta(self, obj):
        if not getattr(obj, "conta_id", None):
            return None
        return {"id": obj.conta_id, "name": obj.conta.name}

    def _map_faturamento_status(self, conta_status: str, due_date):
        if conta_status == models.ContaPagar.Status.PAID:
            return models.FaturamentoCompra.Status.PAID
        if conta_status == models.ContaPagar.Status.PARTIAL:
            return models.FaturamentoCompra.Status.PARTIAL
        if conta_status == models.ContaPagar.Status.OVERDUE:
            return models.FaturamentoCompra.Status.OVERDUE
        if conta_status == models.ContaPagar.Status.CANCELED:
            return models.FaturamentoCompra.Status.CANCELED
        if due_date and due_date < date.today():
            return models.FaturamentoCompra.Status.OVERDUE
        return models.FaturamentoCompra.Status.PENDING

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("conta"), company, "conta_id")

        current_total = getattr(self.instance, "total_value", Decimal("0")) if self.instance else Decimal("0")
        current_paid = getattr(self.instance, "paid_value", Decimal("0")) if self.instance else Decimal("0")
        current_discount = getattr(self.instance, "discount_value", Decimal("0")) if self.instance else Decimal("0")
        current_addition = getattr(self.instance, "addition_value", Decimal("0")) if self.instance else Decimal("0")
        total = attrs.get("total_value", current_total) or Decimal("0")
        paid = attrs.get("paid_value", current_paid) or Decimal("0")
        discount = attrs.get("discount_value", current_discount) or Decimal("0")
        addition = attrs.get("addition_value", current_addition) or Decimal("0")
        increment = attrs.get("payment_increment")

        if paid < 0:
            raise serializers.ValidationError({"paid_value": "Valor pago nao pode ser negativo."})
        if discount < 0:
            raise serializers.ValidationError({"discount_value": "Desconto nao pode ser negativo."})
        if addition < 0:
            raise serializers.ValidationError({"addition_value": "Acrescimo nao pode ser negativo."})
        if increment is not None and increment < 0:
            raise serializers.ValidationError({"payment_increment": "Valor de pagamento nao pode ser negativo."})

        effective_total = total + addition - discount
        if effective_total < 0:
            effective_total = Decimal("0")
        if paid > effective_total:
            raise serializers.ValidationError({"paid_value": "Valor pago nao pode ser maior que o valor total ajustado."})
        return attrs

    def update(self, instance, validated_data):
        increment = validated_data.pop("payment_increment", None)
        obj = super().update(instance, validated_data)
        total = obj.total_value or Decimal("0")
        discount = obj.discount_value or Decimal("0")
        addition = obj.addition_value or Decimal("0")
        paid = obj.paid_value or Decimal("0")
        if increment is not None:
            paid += increment
        if paid < 0:
            paid = Decimal("0")
        effective_total = total + addition - discount
        if effective_total < 0:
            effective_total = Decimal("0")
        if paid > effective_total:
            paid = effective_total

        if obj.status == models.ContaPagar.Status.CANCELED:
            # keep canceled status untouched
            pass
        elif effective_total > 0 and paid >= effective_total:
            obj.status = models.ContaPagar.Status.PAID
        elif paid > 0:
            obj.status = models.ContaPagar.Status.PARTIAL
        elif obj.due_date and obj.due_date < date.today():
            obj.status = models.ContaPagar.Status.OVERDUE
        else:
            obj.status = models.ContaPagar.Status.OPEN

        obj.paid_value = paid
        obj.balance_value = max(Decimal("0"), effective_total - paid)
        if paid > 0 and not obj.payment_date:
            obj.payment_date = date.today()
        if paid <= 0:
            obj.payment_date = None
        obj.save(update_fields=["status", "paid_value", "balance_value", "payment_date", "updated_at"])

        if obj.faturamento_id:
            fat = obj.faturamento
            next_status = self._map_faturamento_status(obj.status, obj.due_date)
            if fat.status != next_status:
                fat.status = next_status
                fat.save(update_fields=["status", "updated_at"])
        return obj


class FaturamentoCompraItemSerializer(serializers.ModelSerializer):
    pedido_item_id = serializers.PrimaryKeyRelatedField(
        source="pedido_item", queryset=models.PedidoCompraItem.objects.all(), allow_null=True, required=False
    )
    produto_id = serializers.PrimaryKeyRelatedField(
        source="produto", queryset=models.Insumo.objects.all(), allow_null=True, required=False
    )
    peca_id = serializers.PrimaryKeyRelatedField(
        source="peca", queryset=models.Peca.objects.all(), allow_null=True, required=False
    )
    produto = serializers.SerializerMethodField()

    class Meta:
        model = models.FaturamentoCompraItem
        fields = [
            "id",
            "pedido_item_id",
            "produto_id",
            "peca_id",
            "produto",
            "quantity",
            "price",
            "total_item",
            "created_at",
            "updated_at",
        ]

    def get_produto(self, obj):
        if getattr(obj, "peca_id", None):
            return {"id": obj.peca_id, "name": obj.peca.name}
        if getattr(obj, "produto_id", None):
            return {"id": obj.produto_id, "name": obj.produto.name}
        if getattr(obj, "pedido_item_id", None) and getattr(obj.pedido_item, "produto_id", None):
            return {"id": obj.pedido_item.produto_id, "name": obj.pedido_item.produto.name}
        return None

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("pedido_item"), company, "pedido_item_id")
        _validate_fk_company(attrs.get("produto"), company, "produto_id")
        _validate_fk_company(attrs.get("peca"), company, "peca_id")
        if not attrs.get("pedido_item") and not attrs.get("produto") and not attrs.get("peca"):
            raise serializers.ValidationError({"items": "Informe pedido_item_id, produto_id ou peca_id."})
        qty = attrs.get("quantity")
        if qty is not None and qty <= 0:
            raise serializers.ValidationError({"quantity": "Quantidade deve ser maior que zero."})
        return attrs


class FaturamentoCompraSerializer(serializers.ModelSerializer):
    grupo = serializers.SerializerMethodField()
    grupo_id = serializers.PrimaryKeyRelatedField(
        source="grupo", queryset=models.GrupoProdutor.objects.all(), allow_null=True, required=False
    )
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(
        source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False
    )
    pedido = serializers.SerializerMethodField()
    pedido_id = serializers.PrimaryKeyRelatedField(
        source="pedido", queryset=models.PedidoCompra.objects.all(), allow_null=True, required=False
    )
    fornecedor = serializers.SerializerMethodField()
    fornecedor_id = serializers.PrimaryKeyRelatedField(
        source="fornecedor", queryset=models.Fornecedor.objects.all(), allow_null=True, required=False
    )
    deposito = serializers.SerializerMethodField()
    deposito_id = serializers.PrimaryKeyRelatedField(
        source="deposito", queryset=models.Deposito.objects.all(), allow_null=True, required=False
    )
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(
        source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False
    )

    items = FaturamentoCompraItemSerializer(many=True, required=False)
    total_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = models.FaturamentoCompra
        fields = [
            "id",
            "date",
            "invoice_number",
            "grupo",
            "grupo_id",
            "produtor",
            "produtor_id",
            "pedido",
            "pedido_id",
            "fornecedor",
            "fornecedor_id",
            "deposito",
            "deposito_id",
            "operacao",
            "operacao_id",
            "payment_method",
            "due_date",
            "status",
            "total_value",
            "items",
            "created_at",
            "updated_at",
        ]

    def get_grupo(self, obj):
        if not getattr(obj, "grupo_id", None):
            return None
        return {"id": obj.grupo_id, "name": obj.grupo.name, "cpf_cnpj": getattr(obj.grupo, "cpf_cnpj", "")}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_pedido(self, obj):
        if not getattr(obj, "pedido_id", None):
            return None
        return {"id": obj.pedido_id, "code": obj.pedido.code}

    def get_fornecedor(self, obj):
        if not getattr(obj, "fornecedor_id", None):
            return None
        return {"id": obj.fornecedor_id, "name": obj.fornecedor.name}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def get_deposito(self, obj):
        if not getattr(obj, "deposito_id", None):
            return None
        return {"id": obj.deposito_id, "name": obj.deposito.name}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("grupo"), company, "grupo_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("pedido"), company, "pedido_id")
        _validate_fk_company(attrs.get("fornecedor"), company, "fornecedor_id")
        _validate_fk_company(attrs.get("deposito"), company, "deposito_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")
        return attrs

    def _recalc_pedido_status(self, pedido: models.PedidoCompra):
        items = models.PedidoCompraItem.objects.filter(pedido=pedido)
        if not items.exists():
            return
        all_delivered = True
        any_received = False
        for it in items:
            # Recalcula recebido real a partir dos faturamentos (desconsidera cancelados)
            billed = (
                models.FaturamentoCompraItem.objects.filter(
                    pedido_item=it,
                    faturamento__status__in=[
                        models.FaturamentoCompra.Status.PENDING,
                        models.FaturamentoCompra.Status.OVERDUE,
                        models.FaturamentoCompra.Status.PARTIAL,
                        models.FaturamentoCompra.Status.PAID,
                    ],
                ).aggregate(v=Coalesce(Sum("quantity"), Decimal("0")))["v"]
                or Decimal("0")
            )
            if it.received_quantity != billed:
                it.received_quantity = billed
                if billed >= (it.quantity or Decimal("0")):
                    it.status = models.PedidoCompraItem.ItemStatus.DELIVERED
                elif billed > 0:
                    it.status = models.PedidoCompraItem.ItemStatus.PARTIAL
                else:
                    it.status = models.PedidoCompraItem.ItemStatus.PENDING
                it.save(update_fields=["received_quantity", "status", "updated_at"])

            if billed > 0:
                any_received = True
            if billed < (it.quantity or Decimal("0")):
                all_delivered = False
        if all_delivered:
            pedido.status = models.PedidoCompra.Status.DELIVERED
        elif any_received:
            pedido.status = models.PedidoCompra.Status.PARTIAL
        else:
            pedido.status = models.PedidoCompra.Status.PENDING
        pedido.save(update_fields=["status", "updated_at"])

    def _upsert_conta_origem_nf(self, fat: models.FaturamentoCompra):
        conta = (
            models.ContaPagar.objects.filter(faturamento=fat, origem=models.ContaPagar.Origem.NOTA_FISCAL)
            .order_by("id")
            .first()
        )
        if conta is None:
            conta = models.ContaPagar(
                company=fat.company,
                faturamento=fat,
                pedido=fat.pedido,
                origem=models.ContaPagar.Origem.NOTA_FISCAL,
                paid_value=Decimal("0"),
                discount_value=Decimal("0"),
                addition_value=Decimal("0"),
            )
        paid = conta.paid_value or Decimal("0")
        total = fat.total_value or Decimal("0")
        if paid > total:
            total = paid
        conta.date = fat.date
        conta.due_date = fat.due_date
        conta.invoice_number = fat.invoice_number
        conta.grupo = fat.grupo
        conta.produtor = fat.produtor
        conta.fornecedor = fat.fornecedor
        conta.operacao = fat.operacao
        conta.payment_method = fat.payment_method
        conta.pedido = fat.pedido
        conta.total_value = total
        conta.balance_value = max(Decimal("0"), total - paid)
        conta.status = _compute_status_for_conta(conta.due_date, conta.total_value, paid)
        if paid <= 0:
            conta.payment_date = None
        conta.save()

    def _sync_contas_por_pedido(self, pedido: models.PedidoCompra):
        pedido_contas = models.ContaPagar.objects.filter(
            pedido=pedido,
            faturamento__isnull=True,
            origem=models.ContaPagar.Origem.PEDIDO,
        ).order_by("id")
        conta_pedido = pedido_contas.first()
        if pedido_contas.count() > 1:
            for extra in pedido_contas[1:]:
                if (extra.paid_value or Decimal("0")) <= 0:
                    extra.delete()

        has_payment_on_pedido = bool(conta_pedido and (conta_pedido.paid_value or Decimal("0")) > 0)
        faturamentos = models.FaturamentoCompra.objects.filter(pedido=pedido).exclude(
            status=models.FaturamentoCompra.Status.CANCELED
        )

        if has_payment_on_pedido:
            models.ContaPagar.objects.filter(
                pedido=pedido,
                origem=models.ContaPagar.Origem.NOTA_FISCAL,
                paid_value__lte=0,
            ).delete()
            total = pedido.total_value or Decimal("0")
            paid = conta_pedido.paid_value or Decimal("0")
            if paid > total:
                total = paid
            conta_pedido.date = pedido.date
            conta_pedido.due_date = pedido.due_date
            conta_pedido.invoice_number = pedido.code or f"PED-{pedido.id}"
            conta_pedido.grupo = pedido.grupo
            conta_pedido.produtor = pedido.produtor
            conta_pedido.fornecedor = pedido.fornecedor
            conta_pedido.operacao = pedido.operacao
            conta_pedido.total_value = total
            conta_pedido.balance_value = max(Decimal("0"), total - paid)
            conta_pedido.status = _compute_status_for_conta(conta_pedido.due_date, total, paid)
            if paid <= 0:
                conta_pedido.payment_date = None
            conta_pedido.save()
            return

        for fat in faturamentos:
            self._upsert_conta_origem_nf(fat)

        faturado_total = (
            faturamentos.aggregate(v=Coalesce(Sum("total_value"), Decimal("0")))["v"]
            or Decimal("0")
        )
        remaining = (pedido.total_value or Decimal("0")) - faturado_total
        if remaining < 0:
            remaining = Decimal("0")

        if remaining <= 0:
            models.ContaPagar.objects.filter(
                pedido=pedido,
                faturamento__isnull=True,
                origem=models.ContaPagar.Origem.PEDIDO,
                paid_value__lte=0,
            ).delete()
        else:
            if conta_pedido is None:
                conta_pedido = models.ContaPagar(
                    company=pedido.company,
                    pedido=pedido,
                    faturamento=None,
                    origem=models.ContaPagar.Origem.PEDIDO,
                    paid_value=Decimal("0"),
                    discount_value=Decimal("0"),
                    addition_value=Decimal("0"),
                    payment_method=models.FaturamentoCompra.PaymentMethod.PIX,
                )
            paid = conta_pedido.paid_value or Decimal("0")
            total = remaining if remaining > paid else paid
            conta_pedido.date = pedido.date
            conta_pedido.due_date = pedido.due_date
            conta_pedido.invoice_number = pedido.code or f"PED-{pedido.id}"
            conta_pedido.grupo = pedido.grupo
            conta_pedido.produtor = pedido.produtor
            conta_pedido.fornecedor = pedido.fornecedor
            conta_pedido.operacao = pedido.operacao
            conta_pedido.total_value = total
            conta_pedido.balance_value = max(Decimal("0"), total - paid)
            conta_pedido.status = _compute_status_for_conta(conta_pedido.due_date, total, paid)
            if paid <= 0:
                conta_pedido.payment_date = None
            conta_pedido.save()

        # remove contas de NF sem referência ativa e sem pagamento
        models.ContaPagar.objects.filter(
            pedido=pedido,
            origem=models.ContaPagar.Origem.NOTA_FISCAL,
            paid_value__lte=0,
        ).exclude(faturamento__in=faturamentos).delete()

    def _apply_items(self, fat: models.FaturamentoCompra, items_data):
        # Aplica itens e atualiza saldos recebidos no pedido.
        total = Decimal("0")
        for it in items_data or []:
            pedido_item: models.PedidoCompraItem | None = it.get("pedido_item")
            produto: models.Insumo | None = it.get("produto")
            peca: models.Peca | None = it.get("peca")
            qty = it.get("quantity") or Decimal("0")
            price = it.get("price") or Decimal("0")

            if not pedido_item and not (produto or peca):
                raise serializers.ValidationError({"items": "Informe pedido_item_id, produto_id ou peca_id."})
            if pedido_item and (not getattr(fat, "pedido_id", None) or pedido_item.pedido_id != fat.pedido_id):
                raise serializers.ValidationError({"items": "Item não pertence ao pedido selecionado."})

            billed = (
                models.FaturamentoCompraItem.objects.filter(
                    pedido_item=pedido_item,
                    faturamento__status__in=[
                        models.FaturamentoCompra.Status.PENDING,
                        models.FaturamentoCompra.Status.OVERDUE,
                        models.FaturamentoCompra.Status.PARTIAL,
                        models.FaturamentoCompra.Status.PAID,
                    ],
                )
                .exclude(faturamento_id=fat.id)
                .aggregate(v=Coalesce(Sum("quantity"), Decimal("0")))["v"]
                or Decimal("0")
            ) if pedido_item else Decimal("0")
            remaining = (pedido_item.quantity or Decimal("0")) - billed if pedido_item else Decimal("0")
            if pedido_item and qty > remaining:
                raise serializers.ValidationError({"items": f"Quantidade acima do saldo a faturar para '{pedido_item.produto.name if pedido_item.produto_id else 'PRODUTO'}'."})

            total_item = (qty * price)
            obj = models.FaturamentoCompraItem.objects.create(
                company=fat.company,
                faturamento=fat,
                pedido_item=pedido_item,
                produto=pedido_item.produto if pedido_item else produto,
                peca=peca,
                quantity=qty,
                price=price,
                total_item=total_item,
            )
            total += obj.total_item

            # recebido/status é recalculado ao final por _recalc_pedido_status()

        fat.total_value = total
        fat.save(update_fields=["total_value", "updated_at"])

        if fat.pedido_id:
            self._recalc_pedido_status(fat.pedido)

        if fat.pedido_id:
            self._sync_contas_por_pedido(fat.pedido)
        else:
            self._upsert_conta_origem_nf(fat)
        if fat.status != models.FaturamentoCompra.Status.PENDING:
            fat.status = models.FaturamentoCompra.Status.PENDING
            fat.save(update_fields=["status", "updated_at"])

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        fat = models.FaturamentoCompra.objects.create(**validated_data)
        # preencher dados derivados do pedido quando necessário
        if fat.pedido_id:
            if not fat.fornecedor_id:
                fat.fornecedor_id = fat.pedido.fornecedor_id
            if not fat.operacao_id:
                fat.operacao_id = fat.pedido.operacao_id
            if not fat.due_date:
                fat.due_date = fat.pedido.due_date
            if not fat.grupo_id:
                fat.grupo_id = fat.pedido.grupo_id
            if not fat.produtor_id:
                fat.produtor_id = fat.pedido.produtor_id
            fat.save(update_fields=["fornecedor", "operacao", "due_date", "grupo", "produtor", "updated_at"])

        self._apply_items(fat, items_data)
        return fat

    def update(self, instance, validated_data):
        # rollback de quantidades recebidas dos itens antigos
        old_items = list(models.FaturamentoCompraItem.objects.filter(faturamento=instance).select_related("pedido_item"))
        for oi in old_items:
            if oi.pedido_item_id:
                pi = oi.pedido_item
                pi.received_quantity = (pi.received_quantity or Decimal("0")) - (oi.quantity or Decimal("0"))
                if pi.received_quantity <= 0:
                    pi.received_quantity = Decimal("0")
                if pi.received_quantity >= pi.quantity:
                    pi.status = models.PedidoCompraItem.ItemStatus.DELIVERED
                elif pi.received_quantity > 0:
                    pi.status = models.PedidoCompraItem.ItemStatus.PARTIAL
                else:
                    pi.status = models.PedidoCompraItem.ItemStatus.PENDING
                pi.save(update_fields=["received_quantity", "status", "updated_at"])
        models.FaturamentoCompraItem.objects.filter(faturamento=instance).delete()

        items_data = validated_data.pop("items", [])
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        self._apply_items(instance, items_data)
        return instance


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
    produtores = ProdutorSerializer(many=True, read_only=True)
    produtores_ids = serializers.PrimaryKeyRelatedField(
        source="produtores", queryset=models.Produtor.objects.all(), many=True, required=False
    )

    class Meta:
        model = models.Propriedade
        fields = [
            "id",
            "name",
            "produtor",
            "produtor_id",
            "produtores",
            "produtores_ids",
            "area_ha",
            "sicar",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        for idx, produtor in enumerate(attrs.get("produtores") or []):
            _validate_fk_company(produtor, company, f"produtores_ids[{idx}]")
        return attrs

    def create(self, validated_data):
        produtores = validated_data.pop("produtores", [])
        obj = super().create(validated_data)
        if produtores:
            obj.produtores.set(produtores)
        if not obj.produtor_id and produtores:
            obj.produtor = produtores[0]
            obj.save(update_fields=["produtor", "updated_at"])
        return obj

    def update(self, instance, validated_data):
        produtores = validated_data.pop("produtores", None)
        obj = super().update(instance, validated_data)
        if produtores is not None:
            obj.produtores.set(produtores)
            if not obj.produtor_id and produtores:
                obj.produtor = produtores[0]
                obj.save(update_fields=["produtor", "updated_at"])
        return obj


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


class DepositoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Deposito
        fields = ["id", "name", "tipo", "is_active", "created_at", "updated_at"]


class RomaneioGraosSerializer(serializers.ModelSerializer):
    safra = serializers.SerializerMethodField()
    safra_id = serializers.PrimaryKeyRelatedField(source="safra", queryset=models.Safra.objects.all(), allow_null=True, required=False)
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False)
    cliente = serializers.SerializerMethodField()
    cliente_id = serializers.PrimaryKeyRelatedField(source="cliente", queryset=models.Cliente.objects.all(), allow_null=True, required=False)
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(source="produto", queryset=models.Produto.objects.all(), allow_null=True, required=False)
    contrato = serializers.SerializerMethodField()
    contrato_id = serializers.PrimaryKeyRelatedField(source="contrato", queryset=models.ContratoVenda.objects.all(), allow_null=True, required=False)
    deposito = serializers.SerializerMethodField()
    deposito_id = serializers.PrimaryKeyRelatedField(source="deposito", queryset=models.Deposito.objects.all(), allow_null=True, required=False)
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False)

    class Meta:
        model = models.RomaneioGraos
        fields = [
            "id",
            "date",
            "code",
            "nfp",
            "safra",
            "safra_id",
            "produtor",
            "produtor_id",
            "cliente",
            "cliente_id",
            "produto",
            "produto_id",
            "contrato",
            "contrato_id",
            "deposito",
            "deposito_id",
            "operacao",
            "operacao_id",
            "quantity_kg",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_cliente(self, obj):
        if not getattr(obj, "cliente_id", None):
            return None
        return {"id": obj.cliente_id, "name": obj.cliente.name}

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def get_deposito(self, obj):
        if not getattr(obj, "deposito_id", None):
            return None
        return {"id": obj.deposito_id, "name": obj.deposito.name, "tipo": obj.deposito.tipo}

    def get_contrato(self, obj):
        if not getattr(obj, "contrato_id", None):
            return None
        return {"id": obj.contrato_id, "code": obj.contrato.code}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("safra"), company, "safra_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("cliente"), company, "cliente_id")
        _validate_fk_company(attrs.get("produto"), company, "produto_id")
        _validate_fk_company(attrs.get("contrato"), company, "contrato_id")
        _validate_fk_company(attrs.get("deposito"), company, "deposito_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")
        return attrs


class EstoqueGraosSaldoSerializer(serializers.ModelSerializer):
    safra = serializers.SerializerMethodField()
    produtor = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    produto = serializers.SerializerMethodField()
    deposito = serializers.SerializerMethodField()

    class Meta:
        model = models.EstoqueGraosSaldo
        fields = [
            "id",
            "safra",
            "produtor",
            "cliente",
            "produto",
            "deposito",
            "saldo_em_deposito_kg",
            "saldo_a_fixar_kg",
            "total_devolucao_kg",
            "total_vendas_kg",
            "created_at",
            "updated_at",
        ]

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_cliente(self, obj):
        if not getattr(obj, "cliente_id", None):
            return None
        return {"id": obj.cliente_id, "name": obj.cliente.name}

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def get_deposito(self, obj):
        if not getattr(obj, "deposito_id", None):
            return None
        return {"id": obj.deposito_id, "name": obj.deposito.name, "tipo": obj.deposito.tipo}


class NotaFiscalGraosSerializer(serializers.ModelSerializer):
    romaneio = serializers.SerializerMethodField()
    romaneio_id = serializers.PrimaryKeyRelatedField(source="romaneio", queryset=models.RomaneioGraos.objects.all(), allow_null=True, required=False)
    nota_entrada_ref = serializers.SerializerMethodField()
    nota_entrada_ref_id = serializers.PrimaryKeyRelatedField(source="nota_entrada_ref", queryset=models.NotaFiscalGraos.objects.all(), allow_null=True, required=False)
    safra = serializers.SerializerMethodField()
    safra_id = serializers.PrimaryKeyRelatedField(source="safra", queryset=models.Safra.objects.all(), allow_null=True, required=False)
    produtor = serializers.SerializerMethodField()
    produtor_id = serializers.PrimaryKeyRelatedField(source="produtor", queryset=models.Produtor.objects.all(), allow_null=True, required=False)
    cliente = serializers.SerializerMethodField()
    cliente_id = serializers.PrimaryKeyRelatedField(source="cliente", queryset=models.Cliente.objects.all(), allow_null=True, required=False)
    produto = serializers.SerializerMethodField()
    produto_id = serializers.PrimaryKeyRelatedField(source="produto", queryset=models.Produto.objects.all(), allow_null=True, required=False)
    deposito = serializers.SerializerMethodField()
    deposito_id = serializers.PrimaryKeyRelatedField(source="deposito", queryset=models.Deposito.objects.all(), allow_null=True, required=False)
    operacao = serializers.SerializerMethodField()
    operacao_id = serializers.PrimaryKeyRelatedField(source="operacao", queryset=models.Operacao.objects.all(), allow_null=True, required=False)

    class Meta:
        model = models.NotaFiscalGraos
        fields = [
            "id",
            "tipo",
            "finalidade",
            "status",
            "date",
            "due_date",
            "number",
            "chave",
            "romaneio",
            "romaneio_id",
            "nota_entrada_ref",
            "nota_entrada_ref_id",
            "safra",
            "safra_id",
            "produtor",
            "produtor_id",
            "cliente",
            "cliente_id",
            "produto",
            "produto_id",
            "deposito",
            "deposito_id",
            "operacao",
            "operacao_id",
            "quantity_kg",
            "price",
            "discount",
            "total_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["total_value"]

    def get_romaneio(self, obj):
        if not getattr(obj, "romaneio_id", None):
            return None
        return {"id": obj.romaneio_id, "code": obj.romaneio.code, "nfp": obj.romaneio.nfp}

    def get_nota_entrada_ref(self, obj):
        if not getattr(obj, "nota_entrada_ref_id", None):
            return None
        return {"id": obj.nota_entrada_ref_id, "number": obj.nota_entrada_ref.number}

    def get_safra(self, obj):
        if not getattr(obj, "safra_id", None):
            return None
        return {"id": obj.safra_id, "name": obj.safra.name}

    def get_produtor(self, obj):
        if not getattr(obj, "produtor_id", None):
            return None
        return {"id": obj.produtor_id, "name": obj.produtor.name}

    def get_cliente(self, obj):
        if not getattr(obj, "cliente_id", None):
            return None
        return {"id": obj.cliente_id, "name": obj.cliente.name}

    def get_produto(self, obj):
        if not getattr(obj, "produto_id", None):
            return None
        return {"id": obj.produto_id, "name": obj.produto.name}

    def get_deposito(self, obj):
        if not getattr(obj, "deposito_id", None):
            return None
        return {"id": obj.deposito_id, "name": obj.deposito.name, "tipo": obj.deposito.tipo}

    def get_operacao(self, obj):
        if not getattr(obj, "operacao_id", None):
            return None
        return {"id": obj.operacao_id, "name": obj.operacao.name, "kind": obj.operacao.kind}

    def _copy_context_from_reference(self, attrs):
        ref = attrs.get("nota_entrada_ref")
        if not ref:
            return
        attrs.setdefault("safra", ref.safra)
        attrs.setdefault("produtor", ref.produtor)
        attrs.setdefault("cliente", ref.cliente)
        attrs.setdefault("produto", ref.produto)
        attrs.setdefault("deposito", ref.deposito)

    def _copy_context_from_romaneio(self, attrs):
        rom = attrs.get("romaneio")
        if not rom:
            return
        attrs.setdefault("safra", rom.safra)
        attrs.setdefault("produtor", rom.produtor)
        attrs.setdefault("cliente", rom.cliente)
        attrs.setdefault("produto", rom.produto)
        attrs.setdefault("deposito", rom.deposito)
        attrs.setdefault("operacao", rom.operacao)

    def _validate_saida_saldo(self, attrs):
        if attrs.get("tipo") != models.NotaFiscalGraos.Tipo.SAIDA:
            return
        entrada = attrs.get("nota_entrada_ref")
        if not entrada:
            raise serializers.ValidationError({"nota_entrada_ref_id": "Informe a NF de entrada de referencia."})
        qty = attrs.get("quantity_kg") or Decimal("0")
        if qty <= 0:
            raise serializers.ValidationError({"quantity_kg": "Quantidade deve ser maior que zero."})
        if entrada.tipo != models.NotaFiscalGraos.Tipo.ENTRADA:
            raise serializers.ValidationError({"nota_entrada_ref_id": "A referencia deve ser uma NF de entrada."})
        used_qs = models.NotaFiscalGraos.objects.filter(
            nota_entrada_ref=entrada,
            tipo=models.NotaFiscalGraos.Tipo.SAIDA,
        ).exclude(status=models.NotaFiscalGraos.Status.CANCELED)
        if self.instance and self.instance.pk:
            used_qs = used_qs.exclude(pk=self.instance.pk)
        used = used_qs.aggregate(v=Coalesce(Sum("quantity_kg"), Decimal("0")))["v"] or Decimal("0")
        available = (entrada.quantity_kg or Decimal("0")) - used
        if qty > available:
            raise serializers.ValidationError(
                {"quantity_kg": f"Quantidade acima do saldo disponivel da entrada. Disponivel: {available} KG."}
            )

        finalidade = attrs.get("finalidade", getattr(self.instance, "finalidade", None))
        if (
            finalidade == models.NotaFiscalGraos.Finalidade.VENDA
            and entrada.finalidade == models.NotaFiscalGraos.Finalidade.REMESSA_DEPOSITO
        ):
            devolvido = (
                used_qs.filter(finalidade=models.NotaFiscalGraos.Finalidade.DEVOLUCAO)
                .aggregate(v=Coalesce(Sum("quantity_kg"), Decimal("0")))["v"]
                or Decimal("0")
            )
            vendido = (
                used_qs.filter(finalidade=models.NotaFiscalGraos.Finalidade.VENDA)
                .aggregate(v=Coalesce(Sum("quantity_kg"), Decimal("0")))["v"]
                or Decimal("0")
            )
            available_for_sale = devolvido - vendido
            if available_for_sale < 0:
                available_for_sale = Decimal("0")
            if qty > available_for_sale:
                raise serializers.ValidationError(
                    {
                        "quantity_kg": (
                            "Para Remessa p/ Depósito, venda permitida apenas até o volume já devolvido. "
                            f"Disponível para venda: {available_for_sale} KG."
                        )
                    }
                )

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("romaneio"), company, "romaneio_id")
        _validate_fk_company(attrs.get("nota_entrada_ref"), company, "nota_entrada_ref_id")
        _validate_fk_company(attrs.get("safra"), company, "safra_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("cliente"), company, "cliente_id")
        _validate_fk_company(attrs.get("produto"), company, "produto_id")
        _validate_fk_company(attrs.get("deposito"), company, "deposito_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")

        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        finalidade = attrs.get("finalidade", getattr(self.instance, "finalidade", None))

        if tipo == models.NotaFiscalGraos.Tipo.ENTRADA and finalidade not in {
            models.NotaFiscalGraos.Finalidade.REMESSA_DEPOSITO,
            models.NotaFiscalGraos.Finalidade.A_FIXAR,
        }:
            raise serializers.ValidationError({"finalidade": "Entrada aceita apenas Remessa para deposito ou A Fixar."})

        if tipo == models.NotaFiscalGraos.Tipo.SAIDA and finalidade not in {
            models.NotaFiscalGraos.Finalidade.DEVOLUCAO,
            models.NotaFiscalGraos.Finalidade.VENDA,
        }:
            raise serializers.ValidationError({"finalidade": "Saida aceita apenas Devolucao ou Venda."})

        self._copy_context_from_romaneio(attrs)
        self._copy_context_from_reference(attrs)
        self._validate_saida_saldo(attrs)

        qty = attrs.get("quantity_kg", getattr(self.instance, "quantity_kg", Decimal("0"))) or Decimal("0")
        price = attrs.get("price", getattr(self.instance, "price", Decimal("0"))) or Decimal("0")
        discount = attrs.get("discount", getattr(self.instance, "discount", Decimal("0"))) or Decimal("0")
        total = (qty * price) - discount
        attrs["total_value"] = total if total > 0 else Decimal("0")
        return attrs

    @classmethod
    def rebuild_company_grain_state(cls, company):
        # 1) recalcula status das NFs de entrada/saida.
        entradas = models.NotaFiscalGraos.objects.filter(
            company=company,
            tipo=models.NotaFiscalGraos.Tipo.ENTRADA,
        ).exclude(status=models.NotaFiscalGraos.Status.CANCELED)
        for entrada in entradas:
            is_direct_contract_sale = bool(getattr(entrada.romaneio, "contrato_id", None))
            if is_direct_contract_sale:
                if entrada.status != models.NotaFiscalGraos.Status.FIXADO:
                    entrada.status = models.NotaFiscalGraos.Status.FIXADO
                    entrada.save(update_fields=["status", "updated_at"])
                continue

            saidas = models.NotaFiscalGraos.objects.filter(
                company=company,
                tipo=models.NotaFiscalGraos.Tipo.SAIDA,
                nota_entrada_ref=entrada,
            ).exclude(status=models.NotaFiscalGraos.Status.CANCELED)
            consumed = saidas.aggregate(v=Coalesce(Sum("quantity_kg"), Decimal("0")))["v"] or Decimal("0")
            total_entrada = entrada.quantity_kg or Decimal("0")
            remaining = total_entrada - consumed
            if remaining < 0:
                remaining = Decimal("0")

            if remaining <= 0 and total_entrada > 0:
                new_status = models.NotaFiscalGraos.Status.FIXADO
            elif consumed > 0:
                new_status = models.NotaFiscalGraos.Status.FIXADO_PARCIAL
            else:
                new_status = (
                    models.NotaFiscalGraos.Status.EM_DEPOSITO
                    if entrada.finalidade == models.NotaFiscalGraos.Finalidade.REMESSA_DEPOSITO
                    else models.NotaFiscalGraos.Status.A_FIXAR
                )
            if entrada.status != new_status:
                entrada.status = new_status
                entrada.save(update_fields=["status", "updated_at"])

        saidas = models.NotaFiscalGraos.objects.filter(
            company=company,
            tipo=models.NotaFiscalGraos.Tipo.SAIDA,
        ).exclude(status=models.NotaFiscalGraos.Status.CANCELED)
        for saida in saidas:
            new_status = models.NotaFiscalGraos.Status.PENDENTE
            if saida.due_date and saida.due_date < date.today():
                new_status = models.NotaFiscalGraos.Status.VENCIDO
            if saida.status != new_status:
                saida.status = new_status
                saida.save(update_fields=["status", "updated_at"])

        # 2) sincroniza status de romaneio: OK se possuir pelo menos uma NF de entrada ativa.
        models.RomaneioGraos.objects.filter(company=company).update(status=models.RomaneioGraos.Status.PENDING)
        rom_ids = (
            models.NotaFiscalGraos.objects.filter(
                company=company,
                tipo=models.NotaFiscalGraos.Tipo.ENTRADA,
                romaneio__isnull=False,
            )
            .exclude(status=models.NotaFiscalGraos.Status.CANCELED)
            .values_list("romaneio_id", flat=True)
            .distinct()
        )
        if rom_ids:
            models.RomaneioGraos.objects.filter(company=company, id__in=rom_ids).update(status=models.RomaneioGraos.Status.OK)

        # 3) reconstrói saldos por chave.
        models.EstoqueGraosSaldo.objects.filter(company=company).delete()
        saldos = {}

        for entrada in entradas:
            if getattr(entrada.romaneio, "contrato_id", None):
                # Venda direta por contrato: nao compoe saldo de estoque.
                continue
            key = (
                entrada.safra_id,
                entrada.produtor_id,
                entrada.cliente_id,
                entrada.produto_id,
                entrada.deposito_id,
            )
            if key not in saldos:
                saldos[key] = {
                    "saldo_em_deposito_kg": Decimal("0"),
                    "saldo_a_fixar_kg": Decimal("0"),
                    "total_devolucao_kg": Decimal("0"),
                    "total_vendas_kg": Decimal("0"),
                }
            consumed = (
                models.NotaFiscalGraos.objects.filter(
                    company=company,
                    tipo=models.NotaFiscalGraos.Tipo.SAIDA,
                    nota_entrada_ref=entrada,
                )
                .exclude(status=models.NotaFiscalGraos.Status.CANCELED)
                .aggregate(v=Coalesce(Sum("quantity_kg"), Decimal("0")))["v"]
                or Decimal("0")
            )
            remaining = (entrada.quantity_kg or Decimal("0")) - consumed
            if remaining < 0:
                remaining = Decimal("0")

            if entrada.finalidade == models.NotaFiscalGraos.Finalidade.REMESSA_DEPOSITO:
                saldos[key]["saldo_em_deposito_kg"] += remaining
            else:
                saldos[key]["saldo_a_fixar_kg"] += remaining

        for saida in saidas:
            key = (
                saida.safra_id,
                saida.produtor_id,
                saida.cliente_id,
                saida.produto_id,
                saida.deposito_id,
            )
            if key not in saldos:
                saldos[key] = {
                    "saldo_em_deposito_kg": Decimal("0"),
                    "saldo_a_fixar_kg": Decimal("0"),
                    "total_devolucao_kg": Decimal("0"),
                    "total_vendas_kg": Decimal("0"),
                }
            if saida.finalidade == models.NotaFiscalGraos.Finalidade.DEVOLUCAO:
                saldos[key]["total_devolucao_kg"] += saida.quantity_kg or Decimal("0")
            elif saida.finalidade == models.NotaFiscalGraos.Finalidade.VENDA:
                saldos[key]["total_vendas_kg"] += saida.quantity_kg or Decimal("0")

        for key, values in saldos.items():
            models.EstoqueGraosSaldo.objects.create(
                company=company,
                safra_id=key[0],
                produtor_id=key[1],
                cliente_id=key[2],
                produto_id=key[3],
                deposito_id=key[4],
                saldo_em_deposito_kg=values["saldo_em_deposito_kg"],
                saldo_a_fixar_kg=values["saldo_a_fixar_kg"],
                total_devolucao_kg=values["total_devolucao_kg"],
                total_vendas_kg=values["total_vendas_kg"],
            )

    def create(self, validated_data):
        with transaction.atomic():
            obj = models.NotaFiscalGraos.objects.create(**validated_data)
            self.rebuild_company_grain_state(obj.company)
            _sync_conta_receber_nota_venda(obj)
            contrato = getattr(obj.romaneio, "contrato", None)
            if contrato is not None:
                _sync_conta_receber_contrato(contrato)
            return obj

    def update(self, instance, validated_data):
        with transaction.atomic():
            previous_contrato = getattr(instance.romaneio, "contrato", None)
            for k, v in validated_data.items():
                setattr(instance, k, v)
            instance.save()
            self.rebuild_company_grain_state(instance.company)
            _sync_conta_receber_nota_venda(instance)
            current_contrato = getattr(instance.romaneio, "contrato", None)
            if previous_contrato is not None:
                _sync_conta_receber_contrato(previous_contrato)
            if current_contrato is not None and (
                previous_contrato is None or current_contrato.id != previous_contrato.id
            ):
                _sync_conta_receber_contrato(current_contrato)
            return instance
