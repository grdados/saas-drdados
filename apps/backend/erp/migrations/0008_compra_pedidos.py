from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("erp", "0007_cliente_fornecedor_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="PedidoCompra",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("code", models.CharField(blank=True, default="", max_length=60)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Rascunho"),
                            ("open", "Em aberto"),
                            ("confirmed", "Confirmado"),
                            ("canceled", "Cancelado"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company"),
                ),
                (
                    "fornecedor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.fornecedor",
                    ),
                ),
                (
                    "grupo",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.grupocompra",
                    ),
                ),
                (
                    "operacao",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.operacao",
                    ),
                ),
                (
                    "produtor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.produtor",
                    ),
                ),
                (
                    "safra",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to="erp.safra",
                    ),
                ),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="PedidoCompraItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unit", models.CharField(blank=True, default="", max_length=24)),
                ("quantity", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("price", models.DecimalField(decimal_places=4, default=0, max_digits=14)),
                ("discount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("total_item", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company"),
                ),
                (
                    "pedido",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="items", to="erp.pedidocompra"
                    ),
                ),
                (
                    "produto",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.insumo"
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.AddIndex(
            model_name="pedidocompra",
            index=models.Index(fields=["company", "date"], name="erp_pedidoc_company_e3f8d7_idx"),
        ),
        migrations.AddIndex(
            model_name="pedidocompra",
            index=models.Index(fields=["company", "code"], name="erp_pedidoc_company_45f9b5_idx"),
        ),
        migrations.AddIndex(
            model_name="pedidocompraitem",
            index=models.Index(fields=["company", "pedido"], name="erp_pedidoc_company_7a4a2e_idx"),
        ),
    ]

