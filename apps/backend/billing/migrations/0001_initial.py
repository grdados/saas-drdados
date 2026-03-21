from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BillingWebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event", models.CharField(max_length=80)),
                ("external_id", models.CharField(blank=True, max_length=80)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BillingSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("asaas_subscription_id", models.CharField(max_length=40, unique=True)),
                ("asaas_customer_id", models.CharField(max_length=40)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("trialing", "Trialing"),
                            ("active", "Active"),
                            ("past_due", "Past Due"),
                            ("canceled", "Canceled"),
                            ("blocked", "Blocked"),
                        ],
                        default="trialing",
                        max_length=20,
                    ),
                ),
                ("billing_type", models.CharField(default="BOLETO", max_length=20)),
                ("cycle", models.CharField(default="MONTHLY", max_length=20)),
                ("value", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("next_due_date", models.DateField(blank=True, null=True)),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to="accounts.company"),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
