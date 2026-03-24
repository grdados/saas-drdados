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
    pass


# Financeiro
class Banco(CompanyNamedModel):
    pass


class Conta(CompanyNamedModel):
    pass


class Moeda(CompanyNamedModel):
    pass


class Caixa(CompanyNamedModel):
    pass


class CondicaoFinanceira(CompanyNamedModel):
    pass


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
    pass


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
