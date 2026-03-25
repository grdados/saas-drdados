from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0008_compra_pedidos"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pedidocompra",
            name="grupo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.grupoprodutor",
            ),
        ),
        migrations.AlterField(
            model_name="pedidocompra",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pendente"),
                    ("draft", "Rascunho"),
                    ("open", "Em aberto"),
                    ("confirmed", "Confirmado"),
                    ("canceled", "Cancelado"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]

