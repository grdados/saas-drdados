from django.urls import path

from .views import AsaasWebhookView, CreateAsaasSubscriptionView, MySubscriptionView

urlpatterns = [
    path("subscriptions/create/", CreateAsaasSubscriptionView.as_view(), name="create_subscription"),
    path("subscriptions/me/", MySubscriptionView.as_view(), name="my_subscription"),
    path("webhooks/asaas/", AsaasWebhookView.as_view(), name="asaas_webhook"),
]
