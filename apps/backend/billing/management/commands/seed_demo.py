from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from accounts.models import Company, UserCompany
from billing.models import BillingSubscription


class Command(BaseCommand):
    help = "Cria uma empresa/usuario e assinaturas DEMO (status active) para desenvolvimento e apresentacao."

    def handle(self, *args, **options):
        User = get_user_model()

        email = "demo@grdados.com"
        password = "Demo12345!"

        company, _ = Company.objects.get_or_create(
            name="GR Dados Demo",
            defaults={
                "trade_name": "GR Dados",
                "license_status": "active",
            },
        )
        if company.license_status != "active":
            company.license_status = "active"
            company.save(update_fields=["license_status", "updated_at"])

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
                "first_name": "Demo",
            },
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])

        UserCompany.objects.get_or_create(
            user=user,
            company=company,
            defaults={"role": UserCompany.Role.OWNER, "is_active": True},
        )

        # Assinaturas DEMO (uma por modulo) - IDs ficticios (nao chamam Asaas).
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

        self.stdout.write(self.style.SUCCESS("DEMO criado/atualizado com sucesso."))
        self.stdout.write(f"Login: {email}")
        self.stdout.write(f"Senha: {password}")

