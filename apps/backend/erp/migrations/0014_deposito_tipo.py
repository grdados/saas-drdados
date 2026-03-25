from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0013_contapagar_payment_cycle_and_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="deposito",
            name="tipo",
            field=models.CharField(
                choices=[("insumos", "Insumos"), ("graos", "Graos"), ("combustivel", "Combustivel")],
                default="insumos",
                max_length=20,
            ),
        ),
    ]

