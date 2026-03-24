from rest_framework.permissions import BasePermission

from accounts.permissions import get_current_company, has_active_license
from billing.models import BillingSubscription


def has_active_module(user, module_code: str) -> bool:
    company = get_current_company(user)
    if not company:
        return False
    if not has_active_license(user):
        return False
    return BillingSubscription.objects.filter(
        company=company,
        status="active",
        module_code=module_code,
    ).exists()


class HasModuleAccess(BasePermission):
    """
    Bloqueia acesso ao modulo se nao houver assinatura ativa/paga para ele.
    Use em endpoints do ERP/CRM/BI, etc.
    """

    message = "Modulo nao liberado. Compre e confirme o pagamento para acessar."

    def __init__(self, module_code: str):
        self.module_code = module_code

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_active_module(request.user, self.module_code)

