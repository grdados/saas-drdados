from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0005_gerencial_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Categoria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=180)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
            ],
            options={
                "ordering": ["name"],
                "indexes": [models.Index(fields=["company", "name"], name="erp_catego_company_0c2dbd_idx")],
            },
        ),
        migrations.AddField(
            model_name="insumo",
            name="short_description",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="insumo",
            name="unit",
            field=models.CharField(blank=True, default="", max_length=24),
        ),
        migrations.AddField(
            model_name="insumo",
            name="categoria",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.categoria"),
        ),
        migrations.AddField(
            model_name="insumo",
            name="cultura",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cultura"),
        ),
        migrations.AddField(
            model_name="insumo",
            name="fabricante",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.fabricante"),
        ),
        migrations.AddField(
            model_name="insumo",
            name="centro_custo",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.centrocusto"),
        ),
        migrations.AddField(
            model_name="insumo",
            name="has_seed_treatment",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="insumo",
            name="tox_class",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="insumo",
            name="active_ingredient",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="insumo",
            name="dose",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="insumo",
            name="density",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="insumo",
            name="mapa_registry",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="peca",
            name="short_description",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="peca",
            name="unit",
            field=models.CharField(blank=True, default="", max_length=24),
        ),
        migrations.AddField(
            model_name="peca",
            name="categoria",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.categoria"),
        ),
        migrations.AddField(
            model_name="peca",
            name="cultura",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cultura"),
        ),
        migrations.AddField(
            model_name="peca",
            name="fabricante",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.fabricante"),
        ),
        migrations.AddField(
            model_name="peca",
            name="centro_custo",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.centrocusto"),
        ),
        migrations.AddField(
            model_name="produto",
            name="short_description",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="produto",
            name="unit",
            field=models.CharField(blank=True, default="", max_length=24),
        ),
        migrations.AddField(
            model_name="produto",
            name="categoria",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.categoria"),
        ),
        migrations.AddField(
            model_name="produto",
            name="cultura",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cultura"),
        ),
        migrations.AddField(
            model_name="produto",
            name="centro_custo",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.centrocusto"),
        ),
    ]

