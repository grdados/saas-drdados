from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def backfill_status_and_balance(apps, schema_editor):
    ContaPagar = apps.get_model("erp", "ContaPagar")
    for cp in ContaPagar.objects.all().iterator():
        total = cp.total_value or Decimal("0")
        discount = cp.discount_value or Decimal("0")
        addition = cp.addition_value or Decimal("0")
        paid = cp.paid_value or Decimal("0")
        effective_total = total + addition - discount
        if effective_total < 0:
            effective_total = Decimal("0")
        if paid > effective_total:
            paid = effective_total
        balance = effective_total - paid
        if cp.status == "canceled":
            pass
        elif balance <= 0 and effective_total > 0:
            cp.status = "paid"
        elif paid > 0:
            cp.status = "partial"
        elif cp.due_date and cp.due_date < __import__("datetime").date.today():
            cp.status = "overdue"
        else:
            cp.status = "open"
        cp.paid_value = paid
        cp.balance_value = balance
        cp.save(update_fields=["status", "paid_value", "balance_value", "updated_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0012_contapagar_partial_and_faturamento_deposito"),
    ]

    operations = [
        migrations.AddField(
            model_name="contapagar",
            name="addition_value",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="conta",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.conta"),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="discount_value",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="payment_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="contapagar",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("pix", "PIX"),
                    ("boleto", "Boleto"),
                    ("transfer", "Transferencia"),
                    ("card", "Cartao"),
                    ("cash", "Dinheiro"),
                    ("other", "Outro"),
                ],
                default="pix",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="faturamentocompra",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("pix", "PIX"),
                    ("boleto", "Boleto"),
                    ("transfer", "Transferencia"),
                    ("card", "Cartao"),
                    ("cash", "Dinheiro"),
                    ("other", "Outro"),
                ],
                default="pix",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="contapagar",
            name="status",
            field=models.CharField(
                choices=[
                    ("open", "Em aberto"),
                    ("overdue", "Vencido"),
                    ("partial", "Parcial"),
                    ("paid", "Pago"),
                    ("canceled", "Cancelado"),
                ],
                default="open",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="faturamentocompra",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pendente"),
                    ("overdue", "Vencido"),
                    ("partial", "Parcial"),
                    ("paid", "Pago"),
                    ("canceled", "Cancelado"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_status_and_balance, migrations.RunPython.noop),
    ]

