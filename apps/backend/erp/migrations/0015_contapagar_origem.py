from django.db import migrations, models


def backfill_origem_pedido(apps, schema_editor):
    ContaPagar = apps.get_model("erp", "ContaPagar")
    ContaPagar.objects.filter(pedido_id__isnull=False, faturamento_id__isnull=True).update(origem="pedido")


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0014_deposito_tipo"),
    ]

    operations = [
        migrations.AddField(
            model_name="contapagar",
            name="origem",
            field=models.CharField(
                choices=[("pedido", "Pedido"), ("nota_fiscal", "Nota Fiscal")],
                default="nota_fiscal",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_origem_pedido, migrations.RunPython.noop),
    ]

