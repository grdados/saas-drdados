from django.contrib import admin

from .models import BillingSubscription, BillingWebhookEvent

admin.site.register(BillingSubscription)
admin.site.register(BillingWebhookEvent)
