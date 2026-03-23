from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ProjectInquiry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=180)),
                ("company", models.CharField(max_length=180)),
                ("email", models.EmailField(max_length=254)),
                ("whatsapp", models.CharField(max_length=40)),
                (
                    "solution",
                    models.CharField(
                        choices=[
                            ("erp", "Solução ERP"),
                            ("crm", "Solução CRM"),
                            ("power_bi", "Dashboard Power BI"),
                            ("landing_page", "Landing Page"),
                        ],
                        max_length=20,
                    ),
                ),
                ("start_date", models.DateField(blank=True, null=True)),
                ("company_size", models.CharField(blank=True, max_length=60)),
                ("description", models.TextField(blank=True)),
                ("has_system", models.BooleanField(default=False)),
                (
                    "data_location",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("excel", "Excel/Planilhas"),
                            ("database", "Banco de Dados (SQL Server, MySQL)"),
                            ("erp", "Sistema ERP"),
                            ("api", "API / Sistema online"),
                            ("unknown", "Não sei / não organizado"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "data_access",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("direct_db", "Acesso direto ao banco de dados"),
                            ("export", "Exportação (Excel/CSV)"),
                            ("api", "API"),
                            ("integration", "Integração com sistema existente"),
                            ("unknown", "Não sei"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "update_frequency",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("real_time", "Tempo Real"),
                            ("hourly", "A cada hora"),
                            ("daily", "Diário"),
                            ("manual", "Manual"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "data_structure",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("structured", "Sim, bem estruturados"),
                            ("partial", "Parcialmente"),
                            ("not_organized", "Não, precisa organizar"),
                        ],
                        max_length=20,
                    ),
                ),
                ("objective", models.TextField(blank=True)),
                ("budget_range", models.CharField(blank=True, max_length=40)),
                ("needs_data_help", models.BooleanField(default=False)),
                ("score", models.PositiveIntegerField(default=0)),
                (
                    "temperature",
                    models.CharField(
                        choices=[("cold", "Frio"), ("warm", "Morno"), ("hot", "Quente")],
                        default="cold",
                        max_length=10,
                    ),
                ),
                ("meta", models.JSONField(blank=True, default=dict)),
            ],
            options={"ordering": ["-created_at"]},
        )
    ]

