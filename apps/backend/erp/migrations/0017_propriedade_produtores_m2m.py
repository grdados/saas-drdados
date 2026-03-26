from django.db import migrations, models


def copy_produtor_to_produtores(apps, schema_editor):
    Propriedade = apps.get_model("erp", "Propriedade")
    for propriedade in Propriedade.objects.exclude(produtor_id__isnull=True).iterator():
        propriedade.produtores.add(propriedade.produtor_id)


def noop_reverse(apps, schema_editor):
    # Mantemos dados atuais no M2M ao reverter.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("erp", "0016_contrato_venda_e_conta_receber"),
    ]

    operations = [
        migrations.AddField(
            model_name="propriedade",
            name="produtores",
            field=models.ManyToManyField(blank=True, related_name="propriedades", to="erp.produtor"),
        ),
        migrations.RunPython(copy_produtor_to_produtores, noop_reverse),
    ]

