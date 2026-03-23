from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ProjectInquiry(TimeStampedModel):
    class Solution(models.TextChoices):
        ERP = "erp", "Solução ERP"
        CRM = "crm", "Solução CRM"
        POWER_BI = "power_bi", "Dashboard Power BI"
        LANDING = "landing_page", "Landing Page"

    class DataLocation(models.TextChoices):
        EXCEL = "excel", "Excel/Planilhas"
        DATABASE = "database", "Banco de Dados (SQL Server, MySQL)"
        ERP = "erp", "Sistema ERP"
        API = "api", "API / Sistema online"
        UNKNOWN = "unknown", "Não sei / não organizado"

    class DataAccess(models.TextChoices):
        DIRECT_DB = "direct_db", "Acesso direto ao banco de dados"
        EXPORT = "export", "Exportação (Excel/CSV)"
        API = "api", "API"
        INTEGRATION = "integration", "Integração com sistema existente"
        UNKNOWN = "unknown", "Não sei"

    class UpdateFrequency(models.TextChoices):
        REAL_TIME = "real_time", "Tempo Real"
        HOURLY = "hourly", "A cada hora"
        DAILY = "daily", "Diário"
        MANUAL = "manual", "Manual"

    class DataStructure(models.TextChoices):
        STRUCTURED = "structured", "Sim, bem estruturados"
        PARTIAL = "partial", "Parcialmente"
        NOT_ORGANIZED = "not_organized", "Não, precisa organizar"

    class Temperature(models.TextChoices):
        COLD = "cold", "Frio"
        WARM = "warm", "Morno"
        HOT = "hot", "Quente"

    name = models.CharField(max_length=180)
    company = models.CharField(max_length=180)
    email = models.EmailField()
    whatsapp = models.CharField(max_length=40)

    solution = models.CharField(max_length=20, choices=Solution.choices)
    start_date = models.DateField(null=True, blank=True)
    company_size = models.CharField(max_length=60, blank=True)

    description = models.TextField(blank=True)
    has_system = models.BooleanField(default=False)

    data_location = models.CharField(max_length=20, choices=DataLocation.choices, blank=True)
    data_access = models.CharField(max_length=20, choices=DataAccess.choices, blank=True)
    update_frequency = models.CharField(max_length=20, choices=UpdateFrequency.choices, blank=True)
    data_structure = models.CharField(max_length=20, choices=DataStructure.choices, blank=True)

    objective = models.TextField(blank=True)
    budget_range = models.CharField(max_length=40, blank=True)
    needs_data_help = models.BooleanField(default=False)

    score = models.PositiveIntegerField(default=0)
    temperature = models.CharField(max_length=10, choices=Temperature.choices, default=Temperature.COLD)

    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} - {self.company} ({self.solution})"
