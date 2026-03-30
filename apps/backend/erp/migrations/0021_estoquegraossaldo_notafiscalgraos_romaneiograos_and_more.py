import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_userprofile"),
        ("erp", "0020_faturamentocompraitem_peca"),
    ]

    operations = [
        migrations.CreateModel(
            name="EstoqueGraosSaldo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("saldo_em_deposito_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("saldo_a_fixar_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("total_devolucao_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("total_vendas_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-updated_at", "-id"]},
        ),
        migrations.CreateModel(
            name="NotaFiscalGraos",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tipo", models.CharField(choices=[("entrada", "Entrada"), ("saida", "Saida")], max_length=20)),
                (
                    "finalidade",
                    models.CharField(
                        choices=[
                            ("remessa_deposito", "Remessa para deposito"),
                            ("a_fixar", "A Fixar"),
                            ("devolucao", "Devolucao"),
                            ("venda", "Venda"),
                        ],
                        max_length=24,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("em_deposito", "Em deposito"),
                            ("a_fixar", "A fixar"),
                            ("fixado_parcial", "Fixado parcial"),
                            ("fixado", "Fixado"),
                            ("pendente", "Pendente"),
                            ("vencido", "Vencido"),
                            ("recebido", "Recebido"),
                            ("canceled", "Cancelado"),
                        ],
                        default="pendente",
                        max_length=24,
                    ),
                ),
                ("date", models.DateField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("number", models.CharField(blank=True, default="", max_length=60)),
                ("quantity_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("price", models.DecimalField(decimal_places=5, default=0, max_digits=14)),
                ("discount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("total_value", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-date", "-id"]},
        ),
        migrations.CreateModel(
            name="RomaneioGraos",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(blank=True, null=True)),
                ("code", models.CharField(blank=True, default="", max_length=60)),
                ("nfp", models.CharField(blank=True, default="", max_length=60)),
                ("quantity_kg", models.DecimalField(decimal_places=3, default=0, max_digits=14)),
                ("status", models.CharField(choices=[("pending", "Pendente"), ("ok", "OK")], default="pending", max_length=20)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-date", "-id"]},
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="cliente",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cliente"),
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="company",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company"),
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="deposito",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.deposito"),
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="produto",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto"),
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="produtor",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor"),
        ),
        migrations.AddField(
            model_name="estoquegraossaldo",
            name="safra",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.safra"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="cliente",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cliente"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="company",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="deposito",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.deposito"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="nota_entrada_ref",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="notas_saida", to="erp.notafiscalgraos"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="operacao",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="produto",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="produtor",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="safra",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.safra"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="cliente",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.cliente"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="company",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="deposito",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.deposito"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="operacao",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.operacao"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="produto",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produto"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="produtor",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.produtor"),
        ),
        migrations.AddField(
            model_name="romaneiograos",
            name="safra",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.safra"),
        ),
        migrations.AddField(
            model_name="notafiscalgraos",
            name="romaneio",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="notas", to="erp.romaneiograos"),
        ),
        migrations.AddIndex(
            model_name="estoquegraossaldo",
            index=models.Index(fields=["company", "safra"], name="erp_estoque_company_a6b808_idx"),
        ),
        migrations.AddIndex(
            model_name="estoquegraossaldo",
            index=models.Index(fields=["company", "produto"], name="erp_estoque_company_8585a4_idx"),
        ),
        migrations.AddIndex(
            model_name="estoquegraossaldo",
            index=models.Index(fields=["company", "deposito"], name="erp_estoque_company_0e2290_idx"),
        ),
        migrations.AddConstraint(
            model_name="estoquegraossaldo",
            constraint=models.UniqueConstraint(fields=("company", "safra", "produtor", "cliente", "produto", "deposito"), name="erp_estoque_graos_saldo_unique_chave"),
        ),
        migrations.AddIndex(
            model_name="romaneiograos",
            index=models.Index(fields=["company", "date"], name="erp_romanei_company_97f9fa_idx"),
        ),
        migrations.AddIndex(
            model_name="romaneiograos",
            index=models.Index(fields=["company", "nfp"], name="erp_romanei_company_da4ecb_idx"),
        ),
        migrations.AddIndex(
            model_name="romaneiograos",
            index=models.Index(fields=["company", "status"], name="erp_romanei_company_3c9389_idx"),
        ),
        migrations.AddIndex(
            model_name="notafiscalgraos",
            index=models.Index(fields=["company", "date"], name="erp_notafis_company_a9c5b1_idx"),
        ),
        migrations.AddIndex(
            model_name="notafiscalgraos",
            index=models.Index(fields=["company", "number"], name="erp_notafis_company_316b04_idx"),
        ),
        migrations.AddIndex(
            model_name="notafiscalgraos",
            index=models.Index(fields=["company", "tipo"], name="erp_notafis_company_061b5f_idx"),
        ),
        migrations.AddIndex(
            model_name="notafiscalgraos",
            index=models.Index(fields=["company", "status"], name="erp_notafis_company_cf8fcd_idx"),
        ),
    ]
