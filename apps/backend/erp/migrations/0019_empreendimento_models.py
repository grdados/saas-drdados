from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_userprofile"),
        ("erp", "0018_transportador_placa"),
    ]

    operations = [
        migrations.CreateModel(
            name="Empreendimento",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("date", models.DateField(blank=True, null=True)),
                ("code", models.CharField(blank=True, default="", max_length=120)),
                ("unit", models.CharField(blank=True, default="SC", max_length=8)),
                ("sale_price", models.DecimalField(decimal_places=4, default=0, max_digits=14)),
                ("billing_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[("in_progress", "Em andamento"), ("closed", "Encerrado")],
                        default="in_progress",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                (
                    "centro_custo",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.centrocusto"),
                ),
                (
                    "produto",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto"),
                ),
                (
                    "propriedade",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.propriedade"),
                ),
                (
                    "safra",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.safra"),
                ),
            ],
            options={
                "ordering": ["-date", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="EmpreendimentoItem",
            fields=[
                ("id", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("unit", models.CharField(blank=True, default="SC", max_length=8)),
                ("area_ha", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("produtividade", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("plant_date", models.DateField(blank=True, null=True)),
                ("close_date", models.DateField(blank=True, null=True)),
                ("production_sc", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("production_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                (
                    "cultivar",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cultivar"),
                ),
                (
                    "empreendimento",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="erp.empreendimento"),
                ),
                (
                    "produto",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto"),
                ),
                (
                    "talhao",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.talhao"),
                ),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="empreendimento",
            index=models.Index(fields=["company", "date"], name="erp_empreend_company_ef31dc_idx"),
        ),
        migrations.AddIndex(
            model_name="empreendimento",
            index=models.Index(fields=["company", "code"], name="erp_empreend_company_ec13d5_idx"),
        ),
        migrations.AddIndex(
            model_name="empreendimento",
            index=models.Index(fields=["company", "status"], name="erp_empreend_company_2d9298_idx"),
        ),
        migrations.AddIndex(
            model_name="empreendimentoitem",
            index=models.Index(fields=["company", "empreendimento"], name="erp_empreend_company_a0ef8b_idx"),
        ),
        migrations.AddIndex(
            model_name="empreendimentoitem",
            index=models.Index(fields=["company", "talhao"], name="erp_empreend_company_2cc792_idx"),
        ),
    ]
