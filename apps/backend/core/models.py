from django.conf import settings
from django.db import models

from accounts.models import Company


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


class BackupArchive(TimeStampedModel):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        SCHEDULED = "scheduled", "Scheduled"

    class RestoreStatus(models.TextChoices):
        NEVER = "never", "Never"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="backup_archives")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_backup_archives",
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    filename = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    file_size = models.PositiveBigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64)
    payload_checksum_sha256 = models.CharField(max_length=64)
    manifest = models.JSONField(default=dict, blank=True)
    restore_count = models.PositiveIntegerField(default=0)
    last_restored_at = models.DateTimeField(null=True, blank=True)
    latest_restore_status = models.CharField(
        max_length=20, choices=RestoreStatus.choices, default=RestoreStatus.NEVER
    )
    latest_restore_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "created_at"]),
        ]

    def __str__(self) -> str:
        return self.filename


class BackupSchedule(TimeStampedModel):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="backup_schedule")
    enabled = models.BooleanField(default=False)
    frequency = models.CharField(max_length=20, choices=Frequency.choices, default=Frequency.DAILY)
    weekday = models.PositiveSmallIntegerField(default=0)
    run_hour = models.PositiveSmallIntegerField(default=2)
    run_minute = models.PositiveSmallIntegerField(default=0)
    keep_last_n = models.PositiveSmallIntegerField(default=10)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["company_id"]

    def __str__(self) -> str:
        return f"backup-schedule:{self.company_id}"
