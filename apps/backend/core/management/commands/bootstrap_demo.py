import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Company, UserCompany
from billing.models import BillingSubscription


class Command(BaseCommand):
    help = "Create/update a DEMO company + user + active module subscriptions (guarded by SEED_DEMO=1)."

    def handle(self, *args, **options):
        if (os.getenv("SEED_DEMO", "0") or "0").strip() != "1":
            self.stdout.write("bootstrap_demo: skipped (SEED_DEMO != 1).")
            return

        demo_email = (os.getenv("DEMO_EMAIL", "demo@grdados.com") or "").strip().lower()
        demo_password = os.getenv("DEMO_PASSWORD", "Demo12345!") or "Demo12345!"
        demo_company_name = (os.getenv("DEMO_COMPANY_NAME", "GR Dados Demo") or "").strip()

        if not demo_email:
            self.stdout.write("bootstrap_demo: skipped (DEMO_EMAIL empty).")
            return

        User = get_user_model()

        company, _ = Company.objects.get_or_create(
            name=demo_company_name,
            defaults={
                "trade_name": "GR Dados",
                "license_status": "active",
            },
        )
        if company.license_status != "active":
            company.license_status = "active"
            company.save(update_fields=["license_status", "updated_at"])

        # Default Django user model uses username; this template uses username=email for auth.
        user = User.objects.filter(username=demo_email).first() or User.objects.filter(email=demo_email).first()
        created = False
        if not user:
            user = User(username=demo_email, email=demo_email, first_name="Demo")
            created = True

        # Always reset the password when running bootstrap (so it's deterministic for demos).
        user.set_password(demo_password)
        user.save()

        UserCompany.objects.get_or_create(
            user=user,
            company=company,
            defaults={"role": UserCompany.Role.OWNER, "is_active": True},
        )

        for module_code in ["erp", "crm", "power_bi", "landing_page"]:
            BillingSubscription.objects.get_or_create(
                company=company,
                module_code=module_code,
                asaas_subscription_id=f"sub_demo_{module_code}",
                defaults={
                    "asaas_customer_id": company.asaas_customer_id or "cus_demo",
                    "status": "active",
                    "billing_type": "UNDEFINED",
                    "cycle": "SEMIANNUALLY",
                    "auto_renew": True,
                    "value": 0,
                    "raw_payload": {"demo": True, "module_code": module_code},
                },
            )

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"bootstrap_demo: {action} demo user '{demo_email}'"))
        self.stdout.write(self.style.SUCCESS(f"bootstrap_demo: company '{demo_company_name}' ready"))

