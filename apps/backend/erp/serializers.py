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

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        pedido = models.PedidoCompra.objects.create(**validated_data)
        self._upsert_items(pedido, items_data)
        return pedido

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if items_data is not None:
            self._upsert_items(instance, items_data)
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

    pedido = serializers.SerializerMethodField()
    pedido_id = serializers.PrimaryKeyRelatedField(
        source="pedido", queryset=models.PedidoCompra.objects.all(), allow_null=True, required=False
    )
    faturamento = serializers.SerializerMethodField()
    faturamento_id = serializers.PrimaryKeyRelatedField(
        source="faturamento", queryset=models.FaturamentoCompra.objects.all(), allow_null=True, required=False
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
            "total_value",
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
            "operacao",
            "operacao_id",
            "due_date",
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

    def validate(self, attrs):
        company = get_current_company(self.context["request"].user) if self.context.get("request") else None
        _validate_fk_company(attrs.get("grupo"), company, "grupo_id")
        _validate_fk_company(attrs.get("produtor"), company, "produtor_id")
        _validate_fk_company(attrs.get("pedido"), company, "pedido_id")
        _validate_fk_company(attrs.get("fornecedor"), company, "fornecedor_id")
        _validate_fk_company(attrs.get("operacao"), company, "operacao_id")
        return attrs

    def _recalc_pedido_status(self, pedido: models.PedidoCompra):
        items = models.PedidoCompraItem.objects.filter(pedido=pedido)
        if not items.exists():
            return
        all_delivered = True
        any_received = False
        for it in items:
            if it.received_quantity and it.received_quantity > 0:
                any_received = True
            if it.received_quantity < it.quantity:
                all_delivered = False
        if all_delivered:
            pedido.status = models.PedidoCompra.Status.DELIVERED
        elif any_received:
            pedido.status = models.PedidoCompra.Status.PARTIAL
        else:
            pedido.status = models.PedidoCompra.Status.PENDING
        pedido.save(update_fields=["status", "updated_at"])

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

            remaining = (pedido_item.quantity or Decimal("0")) - (pedido_item.received_quantity or Decimal("0"))
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

            # atualiza recebido/status do item do pedido
            pedido_item.received_quantity = (pedido_item.received_quantity or Decimal("0")) + qty
            if pedido_item.received_quantity >= pedido_item.quantity:
                pedido_item.status = models.PedidoCompraItem.ItemStatus.DELIVERED
            elif pedido_item.received_quantity > 0:
                pedido_item.status = models.PedidoCompraItem.ItemStatus.PARTIAL
            else:
                pedido_item.status = models.PedidoCompraItem.ItemStatus.PENDING
            pedido_item.save(update_fields=["received_quantity", "status", "updated_at"])

        fat.total_value = total
        fat.save(update_fields=["total_value", "updated_at"])

        if fat.pedido_id:
            self._recalc_pedido_status(fat.pedido)

        # gera/atualiza conta a pagar (1:1 por faturamento)
        models.ContaPagar.objects.update_or_create(
            faturamento=fat,
            defaults={
                "company": fat.company,
                "date": fat.date,
                "due_date": fat.due_date,
                "invoice_number": fat.invoice_number,
                "grupo": fat.grupo,
                "produtor": fat.produtor,
                "fornecedor": fat.fornecedor,
                "operacao": fat.operacao,
                "pedido": fat.pedido,
                "total_value": fat.total_value,
                "status": models.ContaPagar.Status.OPEN,
            },
        )

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
DepositoSerializer = _mk_serializer(models.Deposito)
