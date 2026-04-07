from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0026_notafiscalgraos_status_devolvido"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contareceber",
            name="origem",
            field=models.CharField(
                choices=[
                    ("contrato", "Contrato"),
                    ("nota_fiscal", "Nota Fiscal"),
                    ("fixacao", "FixaÃ§Ã£o"),
                    ("duplicata", "Duplicata"),
                ],
                default="contrato",
                max_length=20,
            ),
        ),
    ]

