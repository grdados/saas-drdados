from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0004_operacao_conta_condicao_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="GrupoProdutor",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=180)),
                ("cpf_cnpj", models.CharField(blank=True, default="", max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
            ],
            options={
                "ordering": ["name"],
                "indexes": [models.Index(fields=["company", "name"], name="erp_grupopr_company_9f2f2c_idx")],
            },
        ),
        migrations.AddField(
            model_name="produtor",
            name="registration",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="produtor",
            name="cpf",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="produtor",
            name="farm",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="produtor",
            name="address",
            field=models.CharField(blank=True, default="", max_length=240),
        ),
        migrations.AddField(
            model_name="produtor",
            name="google_location",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="produtor",
            name="area_ha",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="produtor",
            name="matricula",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="produtor",
            name="city",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="produtor",
            name="uf",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
        migrations.AddField(
            model_name="produtor",
            name="grupo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.grupoprodutor",
            ),
        ),
        migrations.AddField(
            model_name="propriedade",
            name="produtor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.produtor",
            ),
        ),
        migrations.AddField(
            model_name="propriedade",
            name="area_ha",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="propriedade",
            name="sicar",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="talhao",
            name="propriedade",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.propriedade",
            ),
        ),
        migrations.AddField(
            model_name="talhao",
            name="area_ha",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="talhao",
            name="map_location",
            field=models.URLField(blank=True, default=""),
        ),
    ]

