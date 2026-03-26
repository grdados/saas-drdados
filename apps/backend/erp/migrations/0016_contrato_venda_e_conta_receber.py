from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0015_contapagar_origem"),
    ]

    operations = [
        migrations.CreateModel(
            name="ContratoVenda",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("code", models.CharField(blank=True, default="", max_length=60)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pendente"),
                            ("partial", "Parcial"),
                            ("delivered", "Entregue"),
                            ("canceled", "Cancelado"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("cliente", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cliente")),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                ("grupo", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.grupoprodutor")),
                ("operacao", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao")),
                ("produtor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor")),
                ("safra", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.safra")),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="ContaReceber",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("document_number", models.CharField(blank=True, default="", max_length=60)),
                (
                    "origem",
                    models.CharField(
                        choices=[("contrato", "Contrato"), ("nota_fiscal", "Nota Fiscal"), ("duplicata", "Duplicata")],
                        default="contrato",
                        max_length=20,
                    ),
                ),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("received_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("balance_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("discount_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("addition_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("receive_date", models.DateField(blank=True, null=True)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[
                            ("pix", "PIX"),
                            ("boleto", "BOLETO"),
                            ("transfer", "TRANSFERENCIA"),
                            ("card", "CARTAO"),
                            ("cash", "DINHEIRO"),
                            ("other", "OUTRO"),
                        ],
                        default="pix",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("cliente", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cliente")),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                ("conta", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.conta")),
                ("contrato", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.contratovenda")),
                ("grupo", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.grupoprodutor")),
                ("operacao", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao")),
                ("produtor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor")),
            ],
            options={
                "ordering": ["-due_date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="ContratoVendaItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unit", models.CharField(blank=True, default="", max_length=24)),
                ("quantity", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("delivered_quantity", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("price", models.DecimalField(decimal_places=4, default=0, max_digits=14)),
                ("discount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("total_item", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pendente"), ("partial", "Parcial"), ("delivered", "Entregue")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                ("contrato", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="erp.contratovenda")),
                ("produto", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto")),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.AddIndex(
            model_name="contratovenda",
            index=models.Index(fields=["company", "date"], name="erp_contrat_company_7f3bc4_idx"),
        ),
        migrations.AddIndex(
            model_name="contratovenda",
            index=models.Index(fields=["company", "code"], name="erp_contrat_company_7807ef_idx"),
        ),
        migrations.AddIndex(
            model_name="contareceber",
            index=models.Index(fields=["company", "due_date"], name="erp_contare_company_282490_idx"),
        ),
        migrations.AddIndex(
            model_name="contareceber",
            index=models.Index(fields=["company", "status"], name="erp_contare_company_1bc9f9_idx"),
        ),
        migrations.AddIndex(
            model_name="contratovendaitem",
            index=models.Index(fields=["company", "contrato"], name="erp_contrat_company_4c5cad_idx"),
        ),
    ]

