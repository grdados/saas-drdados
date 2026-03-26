from datetime import date
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
    payment_increment = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, write_only=True, min_value=0)

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
    produto = serializers.SerializerMethodField()

    class Meta:
        model = models.FaturamentoCompraItem
        fields = [
            "id",
            "pedido_item_id",
            "produto",
            "quantity",
            "price",
            "total_item",
            "created_at",
            "updated_at",
        ]

    def get_produto(self, obj):
        if getattr(obj, "produto_id", None):
            return {"id": obj.produto_id, "name": obj.produto.name}
        if getattr(obj, "pedido_item_id", None) and getattr(obj.pedido_item, "produto_id", None):
            return {"id": obj.pedido_item.produto_id, "name": obj.pedido_item.produto.name}
        return None

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("pedido_item"), company, "pedido_item_id")
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
            qty = it.get("quantity") or Decimal("0")
            price = it.get("price") or Decimal("0")

            if not pedido_item:
                raise serializers.ValidationError({"items": "pedido_item_id é obrigatório."})
            if not getattr(fat, "pedido_id", None) or pedido_item.pedido_id != fat.pedido_id:
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
            )
            remaining = (pedido_item.quantity or Decimal("0")) - billed
            if qty > remaining:
                raise serializers.ValidationError({"items": f"Quantidade acima do saldo a faturar para '{pedido_item.produto.name if pedido_item.produto_id else 'PRODUTO'}'."})

            total_item = (qty * price)
            obj = models.FaturamentoCompraItem.objects.create(
                company=fat.company,
                faturamento=fat,
                pedido_item=pedido_item,
                produto=pedido_item.produto,
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


class DepositoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Deposito
        fields = ["id", "name", "tipo", "is_active", "created_at", "updated_at"]
