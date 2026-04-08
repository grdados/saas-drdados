from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("erp", "0027_contareceber_origem_fixacao"),
    ]

    operations = [
        migrations.CreateModel(
            name="AbastecimentoCombustivel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("km", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("quantity_liters", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("unit_price", models.DecimalField(decimal_places=5, default=0, max_digits=14)),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "centro_custo",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.centrocusto"),
                ),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                (
                    "deposito",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.deposito"),
                ),
                (
                    "empreendimento",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.empreendimento"),
                ),
                (
                    "operacao",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao"),
                ),
                (
                    "veiculo",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.transportadorplaca"),
                ),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "date"], name="erp_abastec_company_645848_idx"),
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "deposito"], name="erp_abastec_company_bf445f_idx"),
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "centro_custo"], name="erp_abastec_company_17188f_idx"),
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "veiculo"], name="erp_abastec_company_e4daea_idx"),
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "empreendimento"], name="erp_abastec_company_fd9874_idx"),
        ),
    ]
