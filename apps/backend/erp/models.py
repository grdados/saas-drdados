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
    pass


class Fornecedor(CompanyNamedModel):
    pass


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
