from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0006_estoque_categorias_items"),
    ]

    operations = [
        migrations.AddField(
            model_name="cliente",
            name="doc",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="cliente",
            name="ie",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="cliente",
            name="address",
            field=models.CharField(blank=True, default="", max_length=240),
        ),
        migrations.AddField(
            model_name="cliente",
            name="cep",
            field=models.CharField(blank=True, default="", max_length=12),
        ),
        migrations.AddField(
            model_name="cliente",
            name="city",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="cliente",
            name="uf",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="doc",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="ie",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="address",
            field=models.CharField(blank=True, default="", max_length=240),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="cep",
            field=models.CharField(blank=True, default="", max_length=12),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="city",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="fornecedor",
            name="uf",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
    ]

