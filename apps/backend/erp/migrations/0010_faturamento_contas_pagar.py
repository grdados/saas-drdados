from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0009_pedido_compra_grupo_produtor_status_pending"),
    ]

    operations = [
        migrations.AddField(
            model_name="pedidocompraitem",
            name="received_quantity",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="pedidocompraitem",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pendente"), ("partial", "Parcial"), ("delivered", "Entregue")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="FaturamentoCompra",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("invoice_number", models.CharField(blank=True, default="", max_length=60)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="billing.company")),
                ("fornecedor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.fornecedor")),
                ("grupo", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.grupoprodutor")),
                ("operacao", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao")),
                ("pedido", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.pedidocompra")),
                ("produtor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor")),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
        migrations.CreateModel(
            name="FaturamentoCompraItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("price", models.DecimalField(decimal_places=5, default=0, max_digits=14)),
                ("total_item", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="billing.company")),
                ("faturamento", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="erp.faturamentocompra")),
                ("pedido_item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.pedidocompraitem")),
                ("produto", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.insumo")),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="ContaPagar",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("invoice_number", models.CharField(blank=True, default="", max_length=60)),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("status", models.CharField(choices=[("open", "Em aberto"), ("paid", "Pago"), ("canceled", "Cancelado")], default="open", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="billing.company")),
                ("faturamento", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.faturamentocompra")),
                ("fornecedor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.fornecedor")),
                ("grupo", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.grupoprodutor")),
                ("operacao", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao")),
                ("pedido", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.pedidocompra")),
                ("produtor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor")),
            ],
            options={
                "ordering": ["-due_date", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="faturamentocompra",
            index=models.Index(fields=["company", "date"], name="erp_faturam_company_1c7ef5_idx"),
        ),
        migrations.AddIndex(
            model_name="faturamentocompra",
            index=models.Index(fields=["company", "invoice_number"], name="erp_faturam_company_a93aaf_idx"),
        ),
        migrations.AddIndex(
            model_name="faturamentocompraitem",
            index=models.Index(fields=["company", "faturamento"], name="erp_faturam_company_1f8c4d_idx"),
        ),
        migrations.AddIndex(
            model_name="faturamentocompraitem",
            index=models.Index(fields=["company", "pedido_item"], name="erp_faturam_company_20bf96_idx"),
        ),
        migrations.AddIndex(
            model_name="contapagar",
            index=models.Index(fields=["company", "due_date"], name="erp_contap_company_5fdf40_idx"),
        ),
        migrations.AddIndex(
            model_name="contapagar",
            index=models.Index(fields=["company", "status"], name="erp_contap_company_e4660b_idx"),
        ),
    ]

