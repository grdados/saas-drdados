# Ajuste manual:
# Esta migration foi gerada com várias operações de RenameIndex que variavam
# conforme o estado local do banco (nomes antigos não existentes em algumas bases).
# Mantemos apenas alterações de campo estáveis para evitar falha em migrate.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0022_chuva"),
    ]

    operations = [
        migrations.AlterField(
            model_name="contareceber",
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
            model_name="operacao",
            name="kind",
            field=models.CharField(
                choices=[
                    ("credit", "Credito"),
                    ("debit", "Debito"),
                    ("transfer", "Transferencia"),
                    ("remessa_deposito", "Remessa p/ Deposito"),
                    ("a_fixar", "A Fixar"),
                    ("devolucao", "Devolucao"),
                    ("venda", "Venda"),
                ],
                default="credit",
                max_length=16,
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
                    ("partial", "Parcial"),
                    ("delivered", "Entregue"),
                    ("confirmed", "Confirmado"),
                    ("canceled", "Cancelado"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
