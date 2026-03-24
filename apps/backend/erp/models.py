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


class Produtor(CompanyNamedModel):
    pass


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
class Insumo(CompanyNamedModel):
    pass


class Produto(CompanyNamedModel):
    pass


class Peca(CompanyNamedModel):
    pass


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
    pass


class Talhao(CompanyNamedModel):
    pass


class Maquina(CompanyNamedModel):
    pass


class Benfeitoria(CompanyNamedModel):
    pass


class BombaCombustivel(CompanyNamedModel):
    pass


class Deposito(CompanyNamedModel):
    pass
