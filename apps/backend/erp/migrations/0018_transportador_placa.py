from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0017_propriedade_produtores_m2m"),
    ]

    operations = [
        migrations.CreateModel(
            name="TransportadorPlaca",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plate", models.CharField(max_length=16)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="accounts.company")),
                ("transportador", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="placas", to="erp.transportador")),
            ],
            options={
                "ordering": ["plate"],
                "indexes": [
                    models.Index(fields=["company", "plate"], name="erp_transpo_company_7692ec_idx"),
                    models.Index(fields=["company", "transportador"], name="erp_transpo_company_5d34d0_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(fields=("company", "plate"), name="erp_transportador_placa_company_plate_uniq")
                ],
            },
        ),
    ]
