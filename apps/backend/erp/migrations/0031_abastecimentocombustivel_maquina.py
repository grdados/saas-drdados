from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0030_maquina_campos_completos"),
    ]

    operations = [
        migrations.AddField(
            model_name="abastecimentocombustivel",
            name="maquina",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.maquina",
            ),
        ),
        migrations.AddIndex(
            model_name="abastecimentocombustivel",
            index=models.Index(fields=["company", "maquina"], name="erp_abastec_company_95f304_idx"),
        ),
    ]
