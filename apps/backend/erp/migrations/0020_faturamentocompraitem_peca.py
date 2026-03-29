from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0019_empreendimento_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="faturamentocompraitem",
            name="peca",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to="erp.peca"),
        ),
        migrations.AddIndex(
            model_name="faturamentocompraitem",
            index=models.Index(fields=["company", "peca"], name="erp_faturam_company_7cfc11_idx"),
        ),
    ]
