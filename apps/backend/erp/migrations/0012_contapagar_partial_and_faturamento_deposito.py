from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def backfill_conta_pagar(apps, schema_editor):
    ContaPagar = apps.get_model("erp", "ContaPagar")
    for cp in ContaPagar.objects.all().iterator():
        total = cp.total_value or Decimal("0")
        paid = cp.paid_value or Decimal("0")
        if paid < 0:
            paid = Decimal("0")
        if paid > total:
            paid = total
        balance = total - paid
        if cp.status == "paid":
            paid = total
            balance = Decimal("0")
        elif balance == 0 and total > 0:
            cp.status = "paid"
        elif paid > 0:
            cp.status = "partial"
        elif cp.status not in {"open", "canceled"}:
            cp.status = "open"

        cp.paid_value = paid
        cp.balance_value = balance
        cp.save(update_fields=["paid_value", "balance_value", "status", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0011_faturamentocompra_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="faturamentocompra",
            name="deposito",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.deposito"),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="paid_value",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="balance_value",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name="contapagar",
            name="status",
            field=models.CharField(
                choices=[("open", "Em aberto"), ("partial", "Parcial"), ("paid", "Pago"), ("canceled", "Cancelado")],
                default="open",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_conta_pagar, migrations.RunPython.noop),
    ]
