from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0024_romaneiograos_contrato"),
    ]

    operations = [
        migrations.AddField(
            model_name="notafiscalgraos",
            name="chave",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]

