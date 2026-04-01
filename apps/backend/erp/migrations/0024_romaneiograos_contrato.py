from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0023_rename_erp_catego_company_0c2dbd_idx_erp_categor_company_cfc2e9_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="romaneiograos",
            name="contrato",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="erp.contratovenda",
            ),
        ),
    ]
