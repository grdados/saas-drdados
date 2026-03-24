from rest_framework.permissions import BasePermission
from django.conf import settings

from .models import UserCompany


def get_current_company(user):
    membership = (
        UserCompany.objects.select_related("company")
        .filter(user=user, is_active=True)
        .order_by("id")
        .first()
    )
    return membership.company if membership else None


def has_active_license(user) -> bool:
    company = get_current_company(user)
    if not company:
        return False

    # Regra SaaS: acesso ao sistema apenas após confirmação/liberação da licença.
    # Em DEV, podemos permitir "trialing" via env ALLOW_TRIAL_LICENSES=1.
    if getattr(settings, "ALLOW_TRIAL_LICENSES", False):
        return company.license_status in {"trialing", "active"}

    return company.license_status == "active"


class HasActiveLicense(BasePermission):
    message = "Licenca inativa. Regularize a assinatura para continuar."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_active_license(request.user)
