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
        """
        for field in self._meta.fields:
            # EmailField/URLField herdam de CharField: nao devemos modificar.
            if isinstance(field, (models.EmailField, models.URLField)):
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


class CentroCusto(CompanyNamedModel):
    pass


class Operacao(CompanyNamedModel):
    class Kind(models.TextChoices):
        CREDIT = "credit", "Credito"
        DEBIT = "debit", "Debito"
        TRANSFER = "transfer", "Transferencia"

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
        DRAFT = "draft", "Rascunho"
        OPEN = "open", "Em aberto"
        CONFIRMED = "confirmed", "Confirmado"
        CANCELED = "canceled", "Cancelado"

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    code = models.CharField(max_length=60, blank=True, default="")  # numero/codigo do pedido

    grupo = models.ForeignKey("erp.GrupoCompra", null=True, blank=True, on_delete=models.PROTECT)
    produtor = models.ForeignKey("erp.Produtor", null=True, blank=True, on_delete=models.PROTECT)
    fornecedor = models.ForeignKey("erp.Fornecedor", null=True, blank=True, on_delete=models.PROTECT)
    safra = models.ForeignKey("erp.Safra", null=True, blank=True, on_delete=models.PROTECT)
    due_date = models.DateField(null=True, blank=True)
    operacao = models.ForeignKey("erp.Operacao", null=True, blank=True, on_delete=models.PROTECT)

    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

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
    price = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_item = models.DecimalField(max_digits=14, decimal_places=2, default=0)

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
    pass
