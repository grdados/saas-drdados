from datetime import date, timedelta

from rest_framework import serializers

from .models import BillingSubscription


class CreateSubscriptionSerializer(serializers.Serializer):
    module_code = serializers.ChoiceField(
        choices=["erp", "crm", "power_bi", "landing_page"],
        default="crm",
    )
    billing_type = serializers.ChoiceField(choices=["BOLETO", "PIX", "UNDEFINED"], default="BOLETO")
    cycle = serializers.ChoiceField(choices=["WEEKLY", "BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"], default="MONTHLY")
    auto_renew = serializers.BooleanField(default=True)
    value = serializers.DecimalField(max_digits=12, decimal_places=2)
    next_due_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, max_length=200)

    def validate(self, attrs):
        if not attrs.get("next_due_date"):
            attrs["next_due_date"] = date.today() + timedelta(days=1)
        return attrs


class BillingSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingSubscription
        fields = [
            "id",
            "asaas_subscription_id",
            "asaas_customer_id",
            "module_code",
            "status",
            "billing_type",
            "cycle",
            "auto_renew",
            "value",
            "next_due_date",
            "created_at",
            "updated_at",
        ]
