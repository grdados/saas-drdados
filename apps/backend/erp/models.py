from django.db import models

from accounts.models import Company


class CompanyNamedModel(models.Model):
    """
    Modelo base para cadastros simples (nome + ativo) escopados por empresa.
    """

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    name = models.CharField(max_length=180)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["name"]
        indexes = [
            models.Index(fields=["company", "name"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        """
        Padroniza textos em CAIXA ALTA para evitar dados "misturados" (ex: Soja/soja/SOJA).
        Aplicamos em todos os CharField/TextField dos cadastros ERP, exceto URL/Email.
        Campos com `choices` (chaves tecnicas) nao devem ser alterados.
        """
        for field in self._meta.fields:
            # EmailField/URLField herdam de CharField: nao devemos modificar.
            if isinstance(field, (models.EmailField, models.URLField)):
                continue
            # Campos de escolha usam chaves tecnicas (ex: debit/credit/in_progress).
            # Se converter para maiusculo, quebra validacao e filtros no frontend.
            if getattr(field, "choices", None):
                continue
            if isinstance(field, (models.CharField, models.TextField)):
                attr = field.attname  # ex: "name", "short_description", etc.
                val = getattr(self, attr, None)
                if isinstance(val, str) and val:
                    setattr(self, attr, val.strip().upper())

        return super().save(*args, **kwargs)


# Cadastros (base)
class Cultura(CompanyNamedModel):
    pass


class Safra(CompanyNamedModel):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "Em andamento"
        FINISHED = "finished", "Finalizada"

    year = models.IntegerField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    cultura = models.ForeignKey("erp.Cultura", null=True, blank=True, on_delete=models.PROTECT)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.IN_PROGRESS)


class GrupoCompra(CompanyNamedModel):
    pass


class GrupoProdutor(CompanyNamedModel):
    cpf_cnpj = models.CharField(max_length=20, blank=True, default="")


class Produtor(CompanyNamedModel):
    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    registration = models.CharField(max_length=80, blank=True, default="")
    cpf = models.CharField(max_length=20, blank=True, default="")
    farm = models.CharField(max_length=180, blank=True, default="")
    address = models.CharField(max_length=240, blank=True, default="")
    google_location = models.URLField(blank=True, default="")
    area_ha = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    matricula = models.CharField(max_length=80, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    uf = models.CharField(max_length=2, blank=True, default="")


class Cliente(CompanyNamedModel):
    doc = models.CharField(max_length=20, blank=True, default="")  # CPF/CNPJ
    ie = models.CharField(max_length=40, blank=True, default="")  # Inscricao estadual
    address = models.CharField(max_length=240, blank=True, default="")
    cep = models.CharField(max_length=12, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    uf = models.CharField(max_length=2, blank=True, default="")


class Fornecedor(CompanyNamedModel):
    doc = models.CharField(max_length=20, blank=True, default="")  # CPF/CNPJ
    ie = models.CharField(max_length=40, blank=True, default="")  # Inscricao estadual
    address = models.CharField(max_length=240, blank=True, default="")
    cep = models.CharField(max_length=12, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    uf = models.CharField(max_length=2, blank=True, default="")


class Transportador(CompanyNamedModel):
    pass


class TransportadorPlaca(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    transportador = models.ForeignKey("erp.Transportador", related_name="placas", on_delete=models.CASCADE)
    plate = models.CharField(max_length=16)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["plate"]
        constraints = [
            models.UniqueConstraint(fields=["company", "plate"], name="erp_transportador_placa_company_plate_uniq"),
        ]
        indexes = [
            models.Index(fields=["company", "plate"]),
            models.Index(fields=["company", "transportador"]),
        ]

    def save(self, *args, **kwargs):
        if isinstance(self.plate, str) and self.plate:
            self.plate = self.plate.strip().upper()
        return super().save(*args, **kwargs)


class CentroCusto(CompanyNamedModel):
    pass


class Operacao(CompanyNamedModel):
    class Kind(models.TextChoices):
        CREDIT = "credit", "Credito"
        DEBIT = "debit", "Debito"
        TRANSFER = "transfer", "Transferencia"
        REMESSA_DEPOSITO = "remessa_deposito", "Remessa p/ Deposito"
        A_FIXAR = "a_fixar", "A Fixar"
        DEVOLUCAO = "devolucao", "Devolucao"
        VENDA = "venda", "Venda"

    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.CREDIT)


# Financeiro
class Banco(CompanyNamedModel):
    pass


class Conta(CompanyNamedModel):
    banco = models.ForeignKey("erp.Banco", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    agencia = models.CharField(max_length=32, blank=True, default="")
    saldo_inicial = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    limite = models.DecimalField(max_digits=14, decimal_places=2, default=0)


class Moeda(CompanyNamedModel):
    pass


class Caixa(CompanyNamedModel):
    pass


class CondicaoFinanceira(CompanyNamedModel):
    dias = models.IntegerField(default=0)
    parcelas = models.IntegerField(default=1)


# Compra
class PedidoCompra(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        DRAFT = "draft", "Rascunho"
        OPEN = "open", "Em aberto"
        PARTIAL = "partial", "Parcial"
        DELIVERED = "delivered", "Entregue"
        CONFIRMED = "confirmed", "Confirmado"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    code = models.CharField(max_length=60, blank=True, default="")  # numero/codigo do pedido

    # Grupo de produtores (gerencial)
    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    fornecedor = models.ForeignKey("erp.Fornecedor", null=True, blank=True, on_delete=models.PROTECT)
    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    due_date = models.DateField(null=True, blank=True)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "code"]),
        ]

    def __str__(self) -> str:
        return self.code or f"PEDIDO {self.id}"


class PedidoCompraItem(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    pedido = models.ForeignKey("erp.PedidoCompra", related_name="items", on_delete=models.CASCADE)

    produto = models.ForeignKey("erp.Insumo", null=True, blank=True, on_delete=models.PROTECT)
    unit = models.CharField(max_length=24, blank=True, default="")
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_item = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class ItemStatus(models.TextChoices):
        PENDING = "pending", "Pendente"
        PARTIAL = "partial", "Parcial"
        DELIVERED = "delivered", "Entregue"

    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["company", "pedido"]),
        ]

    def __str__(self) -> str:
        return f"ITEM {self.id} ({self.pedido_id})"

    def save(self, *args, **kwargs):
        # Mantem company consistente com o pedido (multi-tenant)
        if self.pedido_id and not self.company_id:
            self.company_id = self.pedido.company_id
        if isinstance(self.unit, str) and self.unit:
            self.unit = self.unit.strip().upper()
        return super().save(*args, **kwargs)


class FaturamentoCompra(models.Model):
    """
    Nota fiscal de recebimento do produto (faturamento do pedido de compra).
    """

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    invoice_number = models.CharField(max_length=60, blank=True, default="")  # NF

    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    pedido = models.ForeignKey("erp.PedidoCompra", null=True, blank=True, on_delete=models.PROTECT)

    fornecedor = models.ForeignKey("erp.Fornecedor", null=True, blank=True, on_delete=models.PROTECT)
    deposito = models.ForeignKey("erp.Deposito", null=True, blank=True, on_delete=models.PROTECT)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)
    due_date = models.DateField(null=True, blank=True)

    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        OVERDUE = "overdue", "Vencido"
        PARTIAL = "partial", "Parcial"
        PAID = "paid", "Pago"
        CANCELED = "canceled", "Cancelado"

    class PaymentMethod(models.TextChoices):
        PIX = "pix", "PIX"
        BOLETO = "boleto", "Boleto"
        TRANSFER = "transfer", "Transferencia"
        CARD = "card", "Cartao"
        CASH = "cash", "Dinheiro"
        OTHER = "other", "Outro"

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.PIX)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "invoice_number"]),
        ]

    def __str__(self) -> str:
        return self.invoice_number or f"FAT {self.id}"


class FaturamentoCompraItem(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    faturamento = models.ForeignKey("erp.FaturamentoCompra", related_name="items", on_delete=models.CASCADE)

    pedido_item = models.ForeignKey("erp.PedidoCompraItem", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Insumo", null=True, blank=True, on_delete=models.PROTECT)
    peca = models.ForeignKey("erp.Peca", null=True, blank=True, on_delete=models.PROTECT)

    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    price = models.DecimalField(max_digits=14, decimal_places=5, default=0)
    total_item = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["company", "faturamento"]),
            models.Index(fields=["company", "pedido_item"]),
            models.Index(fields=["company", "peca"]),
        ]

    def __str__(self) -> str:
        return f"FAT ITEM {self.id}"


class ContaPagar(models.Model):
    class Origem(models.TextChoices):
        PEDIDO = "pedido", "Pedido"
        NOTA_FISCAL = "nota_fiscal", "Nota Fiscal"

    class Status(models.TextChoices):
        OPEN = "open", "Em aberto"
        OVERDUE = "overdue", "Vencido"
        PARTIAL = "partial", "Parcial"
        PAID = "paid", "Pago"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    invoice_number = models.CharField(max_length=60, blank=True, default="")

    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    fornecedor = models.ForeignKey("erp.Fornecedor", null=True, blank=True, on_delete=models.PROTECT)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    pedido = models.ForeignKey("erp.PedidoCompra", null=True, blank=True, on_delete=models.PROTECT)
    faturamento = models.ForeignKey("erp.FaturamentoCompra", null=True, blank=True, on_delete=models.PROTECT)
    origem = models.CharField(max_length=20, choices=Origem.choices, default=Origem.NOTA_FISCAL)

    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    addition_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=FaturamentoCompra.PaymentMethod.choices, default=FaturamentoCompra.PaymentMethod.PIX)
    conta = models.ForeignKey("erp.Conta", null=True, blank=True, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-due_date", "-id"]
        indexes = [
            models.Index(fields=["company", "due_date"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return f"CP {self.id}"


class Empreendimento(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "Em andamento"
        CLOSED = "closed", "Encerrado"

    id = models.CharField(max_length=64, primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    code = models.CharField(max_length=120, blank=True, default="")

    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    propriedade = models.ForeignKey("erp.Propriedade", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    centro_custo = models.ForeignKey("erp.CentroCusto", null=True, blank=True, on_delete=models.PROTECT)

    unit = models.CharField(max_length=8, blank=True, default="SC")
    sale_price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    billing_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return self.code or self.id

    def save(self, *args, **kwargs):
        if isinstance(self.code, str):
            self.code = self.code.strip().upper()
        if isinstance(self.unit, str):
            self.unit = self.unit.strip().upper()
        return super().save(*args, **kwargs)


class EmpreendimentoItem(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    empreendimento = models.ForeignKey("erp.Empreendimento", related_name="items", on_delete=models.CASCADE)

    talhao = models.ForeignKey("erp.Talhao", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    cultivar = models.ForeignKey("erp.Cultivar", null=True, blank=True, on_delete=models.PROTECT)

    unit = models.CharField(max_length=8, blank=True, default="SC")
    area_ha = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    produtividade = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    plant_date = models.DateField(null=True, blank=True)
    close_date = models.DateField(null=True, blank=True)
    production_sc = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    production_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["company", "empreendimento"]),
            models.Index(fields=["company", "talhao"]),
        ]

    def save(self, *args, **kwargs):
        if self.empreendimento_id and not self.company_id:
            self.company_id = self.empreendimento.company_id
        if isinstance(self.unit, str):
            self.unit = self.unit.strip().upper()
        return super().save(*args, **kwargs)


class ContratoVenda(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        PARTIAL = "partial", "Parcial"
        DELIVERED = "delivered", "Entregue"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    code = models.CharField(max_length=60, blank=True, default="")

    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    cliente = models.ForeignKey("erp.Cliente", null=True, blank=True, on_delete=models.PROTECT)
    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    due_date = models.DateField(null=True, blank=True)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    notes = models.TextField(blank=True, default="")
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "code"]),
        ]

    def __str__(self) -> str:
        return self.code or f"CONTRATO {self.id}"


class ContratoVendaItem(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    contrato = models.ForeignKey("erp.ContratoVenda", related_name="items", on_delete=models.CASCADE)

    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    unit = models.CharField(max_length=24, blank=True, default="")
    quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    delivered_quantity = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_item = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class ItemStatus(models.TextChoices):
        PENDING = "pending", "Pendente"
        PARTIAL = "partial", "Parcial"
        DELIVERED = "delivered", "Entregue"

    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["company", "contrato"]),
        ]

    def __str__(self) -> str:
        return f"CONTRATO ITEM {self.id} ({self.contrato_id})"

    def save(self, *args, **kwargs):
        if self.contrato_id and not self.company_id:
            self.company_id = self.contrato.company_id
        if isinstance(self.unit, str) and self.unit:
            self.unit = self.unit.strip().upper()
        return super().save(*args, **kwargs)


class ContaReceber(models.Model):
    class Origem(models.TextChoices):
        CONTRATO = "contrato", "Contrato"
        NOTA_FISCAL = "nota_fiscal", "Nota Fiscal"
        DUPLICATA = "duplicata", "Duplicata"

    class Status(models.TextChoices):
        OPEN = "open", "Em aberto"
        OVERDUE = "overdue", "Vencido"
        PARTIAL = "partial", "Parcial"
        PAID = "paid", "Pago"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    document_number = models.CharField(max_length=60, blank=True, default="")

    grupo = models.ForeignKey("erp.GrupoProdutor", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    cliente = models.ForeignKey("erp.Cliente", null=True, blank=True, on_delete=models.PROTECT)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)
    contrato = models.ForeignKey("erp.ContratoVenda", null=True, blank=True, on_delete=models.PROTECT)
    origem = models.CharField(max_length=20, choices=Origem.choices, default=Origem.CONTRATO)

    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    addition_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    receive_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=FaturamentoCompra.PaymentMethod.choices, default=FaturamentoCompra.PaymentMethod.PIX)
    conta = models.ForeignKey("erp.Conta", null=True, blank=True, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-due_date", "-id"]
        indexes = [
            models.Index(fields=["company", "due_date"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return f"CR {self.id}"


# Estoque
class Categoria(CompanyNamedModel):
    pass


class Insumo(CompanyNamedModel):
    short_description = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=24, blank=True, default="")
    categoria = models.ForeignKey("erp.Categoria", null=True, blank=True, on_delete=models.PROTECT)
    cultura = models.ForeignKey("erp.Cultura", null=True, blank=True, on_delete=models.PROTECT)
    fabricante = models.ForeignKey("erp.Fabricante", null=True, blank=True, on_delete=models.PROTECT)
    centro_custo = models.ForeignKey("erp.CentroCusto", null=True, blank=True, on_delete=models.PROTECT)

    has_seed_treatment = models.BooleanField(default=False)
    tox_class = models.CharField(max_length=80, blank=True, default="")
    active_ingredient = models.CharField(max_length=180, blank=True, default="")
    dose = models.CharField(max_length=80, blank=True, default="")
    density = models.CharField(max_length=80, blank=True, default="")
    mapa_registry = models.CharField(max_length=80, blank=True, default="")


class Produto(CompanyNamedModel):
    short_description = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=24, blank=True, default="")
    categoria = models.ForeignKey("erp.Categoria", null=True, blank=True, on_delete=models.PROTECT)
    cultura = models.ForeignKey("erp.Cultura", null=True, blank=True, on_delete=models.PROTECT)
    centro_custo = models.ForeignKey("erp.CentroCusto", null=True, blank=True, on_delete=models.PROTECT)


class Peca(CompanyNamedModel):
    short_description = models.CharField(max_length=120, blank=True, default="")
    unit = models.CharField(max_length=24, blank=True, default="")
    categoria = models.ForeignKey("erp.Categoria", null=True, blank=True, on_delete=models.PROTECT)
    cultura = models.ForeignKey("erp.Cultura", null=True, blank=True, on_delete=models.PROTECT)
    fabricante = models.ForeignKey("erp.Fabricante", null=True, blank=True, on_delete=models.PROTECT)
    centro_custo = models.ForeignKey("erp.CentroCusto", null=True, blank=True, on_delete=models.PROTECT)


class Combustivel(CompanyNamedModel):
    pass


class Cultivar(CompanyNamedModel):
    description = models.TextField(blank=True, default="")
    cycle = models.CharField(max_length=80, blank=True, default="")
    maturity = models.CharField(max_length=80, blank=True, default="")
    region_indicated = models.CharField(max_length=180, blank=True, default="")
    brand = models.CharField(max_length=120, blank=True, default="")


class Diverso(CompanyNamedModel):
    pass


class Fabricante(CompanyNamedModel):
    pass


# Patrimonio
class Propriedade(CompanyNamedModel):
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    produtores = models.ManyToManyField("erp.Produtor", blank=True, related_name="propriedades")
    area_ha = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sicar = models.CharField(max_length=80, blank=True, default="")


class Talhao(CompanyNamedModel):
    propriedade = models.ForeignKey("erp.Propriedade", null=True, blank=True, on_delete=models.PROTECT)
    area_ha = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    map_location = models.URLField(blank=True, default="")


class Maquina(CompanyNamedModel):
    pass


class Benfeitoria(CompanyNamedModel):
    pass


class BombaCombustivel(CompanyNamedModel):
    pass


class Deposito(CompanyNamedModel):
    class Tipo(models.TextChoices):
        INSUMOS = "insumos", "Insumos"
        GRAOS = "graos", "Graos"
        COMBUSTIVEL = "combustivel", "Combustivel"

    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.INSUMOS)


class RomaneioGraos(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        OK = "ok", "OK"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    code = models.CharField(max_length=60, blank=True, default="")
    nfp = models.CharField(max_length=60, blank=True, default="")

    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    cliente = models.ForeignKey("erp.Cliente", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    deposito = models.ForeignKey("erp.Deposito", null=True, blank=True, on_delete=models.PROTECT)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    quantity_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "nfp"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return self.code or self.nfp or f"ROM {self.id}"

    def save(self, *args, **kwargs):
        if isinstance(self.code, str) and self.code:
            self.code = self.code.strip().upper()
        if isinstance(self.nfp, str) and self.nfp:
            self.nfp = self.nfp.strip().upper()
        return super().save(*args, **kwargs)


class NotaFiscalGraos(models.Model):
    class Tipo(models.TextChoices):
        ENTRADA = "entrada", "Entrada"
        SAIDA = "saida", "Saida"

    class Finalidade(models.TextChoices):
        REMESSA_DEPOSITO = "remessa_deposito", "Remessa para deposito"
        A_FIXAR = "a_fixar", "A Fixar"
        DEVOLUCAO = "devolucao", "Devolucao"
        VENDA = "venda", "Venda"

    class Status(models.TextChoices):
        EM_DEPOSITO = "em_deposito", "Em deposito"
        A_FIXAR = "a_fixar", "A fixar"
        FIXADO_PARCIAL = "fixado_parcial", "Fixado parcial"
        FIXADO = "fixado", "Fixado"
        PENDENTE = "pendente", "Pendente"
        VENCIDO = "vencido", "Vencido"
        RECEBIDO = "recebido", "Recebido"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    finalidade = models.CharField(max_length=24, choices=Finalidade.choices)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDENTE)

    date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    number = models.CharField(max_length=60, blank=True, default="")

    romaneio = models.ForeignKey("erp.RomaneioGraos", null=True, blank=True, on_delete=models.PROTECT, related_name="notas")
    nota_entrada_ref = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="notas_saida")

    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    cliente = models.ForeignKey("erp.Cliente", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    deposito = models.ForeignKey("erp.Deposito", null=True, blank=True, on_delete=models.PROTECT)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    quantity_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    price = models.DecimalField(max_digits=14, decimal_places=5, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["company", "date"]),
            models.Index(fields=["company", "number"]),
            models.Index(fields=["company", "tipo"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return self.number or f"NF GRAOS {self.id}"

    def save(self, *args, **kwargs):
        if isinstance(self.number, str) and self.number:
            self.number = self.number.strip().upper()
        return super().save(*args, **kwargs)


class EstoqueGraosSaldo(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    cliente = models.ForeignKey("erp.Cliente", null=True, blank=True, on_delete=models.PROTECT)
    produto = models.ForeignKey("erp.Produto", null=True, blank=True, on_delete=models.PROTECT)
    deposito = models.ForeignKey("erp.Deposito", null=True, blank=True, on_delete=models.PROTECT)

    saldo_em_deposito_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    saldo_a_fixar_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    total_devolucao_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    total_vendas_kg = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "safra", "produtor", "cliente", "produto", "deposito"],
                name="erp_estoque_graos_saldo_unique_chave",
            )
        ]
        indexes = [
            models.Index(fields=["company", "safra"]),
            models.Index(fields=["company", "produto"]),
            models.Index(fields=["company", "deposito"]),
        ]

    def __str__(self) -> str:
        return f"SALDO GRAOS {self.id}"
