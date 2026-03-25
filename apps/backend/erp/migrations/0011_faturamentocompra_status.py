from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0010_faturamento_contas_pagar"),
    ]

    operations = [
        migrations.AddField(
            model_name="faturamentocompra",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pendente"),
                    ("overdue", "Vencido"),
                    ("partial", "Parcial"),
                    ("paid", "Pago"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]

