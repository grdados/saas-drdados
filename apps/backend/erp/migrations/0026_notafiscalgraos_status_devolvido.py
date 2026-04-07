from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0025_notafiscalgraos_chave"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notafiscalgraos",
            name="status",
            field=models.CharField(
                choices=[
                    ("em_deposito", "Em deposito"),
                    ("devolvido", "Devolvido"),
                    ("a_fixar", "A fixar"),
                    ("fixado_parcial", "Fixado parcial"),
                    ("fixado", "Fixado"),
                    ("pendente", "Pendente"),
                    ("vencido", "Vencido"),
                    ("recebido", "Recebido"),
                    ("canceled", "Cancelado"),
                ],
                default="pendente",
                max_length=24,
            ),
        ),
    ]

