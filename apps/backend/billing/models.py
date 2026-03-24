from django.db import models

from accounts.models import Company


class BillingSubscription(models.Model):
    class Status(models.TextChoices):
        TRIALING = "trialing", "Trialing"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELED = "canceled", "Canceled"
        BLOCKED = "blocked", "Blocked"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="subscriptions")
    asaas_subscription_id = models.CharField(max_length=40, unique=True)
    asaas_customer_id = models.CharField(max_length=40)
    module_code = models.CharField(
        max_length=30,
        default="crm",
        help_text="Modulo contratado: erp, crm, power_bi, landing_page",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIALING)
    billing_type = models.CharField(max_length=20, default="BOLETO")
    cycle = models.CharField(max_length=20, default="MONTHLY")
    auto_renew = models.BooleanField(default=True)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    next_due_date = models.DateField(null=True, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class BillingWebhookEvent(models.Model):
    event = models.CharField(max_length=80)
    external_id = models.CharField(max_length=80, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
