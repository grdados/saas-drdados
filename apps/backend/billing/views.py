from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from accounts.permissions import get_current_company
from billing.asaas import AsaasClient

from .models import BillingSubscription, BillingWebhookEvent
from .serializers import BillingSubscriptionSerializer, CreateSubscriptionSerializer


def _map_license_status(event_name: str) -> str | None:
    mapping = {
        "PAYMENT_RECEIVED": "active",
        "PAYMENT_CONFIRMED": "active",
        "PAYMENT_OVERDUE": "past_due",
        "PAYMENT_DELETED": "canceled",
        "PAYMENT_REFUNDED": "blocked",
        "SUBSCRIPTION_DELETED": "canceled",
        "SUBSCRIPTION_INACTIVATED": "canceled",
    }
    return mapping.get(event_name)


class CreateAsaasSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        company = get_current_company(request.user)
        if not company:
            return Response({"detail": "Empresa não encontrada para o usuário."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreateSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        asaas = AsaasClient()

        if not company.asaas_customer_id:
            customer = asaas.create_customer(
                name=company.name,
                email=request.user.email,
            )
            company.asaas_customer_id = customer["id"]
            company.save(update_fields=["asaas_customer_id"])

        subscription = asaas.create_subscription(
            customer_id=company.asaas_customer_id,
            billing_type=data["billing_type"],
            value=float(data["value"]),
            next_due_date=data["next_due_date"].isoformat(),
            cycle=data["cycle"],
            description=data.get("description")
            or f"Licenca GR Dados - {data.get('module_code', 'crm').upper()}",
        )

        local_subscription = BillingSubscription.objects.create(
            company=company,
            asaas_subscription_id=subscription["id"],
            asaas_customer_id=company.asaas_customer_id,
            module_code=data["module_code"],
            status="trialing",
            billing_type=data["billing_type"],
            cycle=data["cycle"],
            auto_renew=data.get("auto_renew", True),
            value=data["value"],
            next_due_date=data["next_due_date"],
            raw_payload=subscription,
        )
        return Response(BillingSubscriptionSerializer(local_subscription).data, status=status.HTTP_201_CREATED)


class MySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = get_current_company(request.user)
        if not company:
            return Response({"detail": "Empresa não encontrada para o usuário."}, status=status.HTTP_404_NOT_FOUND)
        sub = company.subscriptions.order_by("-created_at").first()
        if not sub:
            return Response({"detail": "Sem assinatura cadastrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BillingSubscriptionSerializer(sub).data)


class AsaasWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        received_token = request.headers.get("asaas-access-token", "")
        expected_token = settings.ASAAS_WEBHOOK_TOKEN
        if expected_token and received_token != expected_token:
            return Response({"detail": "Webhook token inválido."}, status=status.HTTP_401_UNAUTHORIZED)

        payload = request.data
        event_name = payload.get("event", "")
        payment = payload.get("payment", {}) or {}
        subscription_id = payment.get("subscription") or payload.get("id", "")
        customer_id = payment.get("customer", "")

        BillingWebhookEvent.objects.create(
            event=event_name,
            external_id=str(subscription_id or customer_id),
            payload=payload,
        )

        local_subscription = None
        if subscription_id:
            local_subscription = BillingSubscription.objects.filter(asaas_subscription_id=subscription_id).first()
        if not local_subscription and customer_id:
            local_subscription = BillingSubscription.objects.filter(asaas_customer_id=customer_id).first()

        if local_subscription:
            mapped = _map_license_status(event_name)
            if mapped:
                local_subscription.status = mapped
                local_subscription.raw_payload = payload
                local_subscription.save(update_fields=["status", "raw_payload", "updated_at"])
                company = local_subscription.company
                company.license_status = mapped
                company.save(update_fields=["license_status", "updated_at"])

        return Response({"received": True})
