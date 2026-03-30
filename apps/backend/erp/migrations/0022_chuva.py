import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0021_estoquegraossaldo_notafiscalgraos_romaneiograos_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Chuva",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("chuvisco", "Chuvisco"),
                            ("chuva", "Chuva"),
                            ("tempestade", "Tempestade"),
                            ("granizo", "Granizo"),
                        ],
                        default="chuva",
                        max_length=20,
                    ),
                ),
                ("volume_mm", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                ("pluviometro_id", models.CharField(blank=True, default="", max_length=80)),
                (
                    "empreendimento",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chuvas", to="erp.empreendimento"),
                ),
                ("talhao", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.talhao")),
            ],
            options={"ordering": ["-date", "-id"]},
        ),
        migrations.AddIndex(
            model_name="chuva",
            index=models.Index(fields=["company", "date"], name="erp_chuva_company_216f7f_idx"),
        ),
        migrations.AddIndex(
            model_name="chuva",
            index=models.Index(fields=["company", "empreendimento"], name="erp_chuva_company_c66249_idx"),
        ),
        migrations.AddIndex(
            model_name="chuva",
            index=models.Index(fields=["company", "talhao"], name="erp_chuva_company_1d9e2c_idx"),
        ),
        migrations.AddIndex(
            model_name="chuva",
            index=models.Index(fields=["company", "pluviometro_id"], name="erp_chuva_company_7fa1aa_idx"),
        ),
        migrations.AddIndex(
            model_name="chuva",
            index=models.Index(fields=["company", "tipo"], name="erp_chuva_company_1581aa_idx"),
        ),
    ]
