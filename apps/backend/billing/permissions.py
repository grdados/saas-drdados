from rest_framework.permissions import BasePermission
from django.db.utils import OperationalError, ProgrammingError

from accounts.permissions import get_current_company, has_active_license
from billing.models import BillingSubscription


def has_active_module(user, module_code: str) -> bool:
    company = get_current_company(user)
    if not company:
        return False
    if not has_active_license(user):
        return False

    # Em ambientes onde a migracao ainda nao foi aplicada (ex: coluna module_code),
    # a consulta pode falhar com erro de banco e virar 500. Aqui preferimos falhar
    # com "sem acesso ao modulo" (403) e deixar o erro para os logs/ops corrigirem.
    try:
        return BillingSubscription.objects.filter(
            company=company,
            status="active",
            module_code=module_code,
        ).exists()
    except (OperationalError, ProgrammingError):
        return False


class HasModuleAccess(BasePermission):
    """
    Bloqueia acesso ao modulo se nao houver assinatura ativa/paga para ele.
    Use em endpoints do ERP/CRM/BI, etc.
    """

    message = "Modulo nao liberado. Compre e confirme o pagamento para acessar."

    def __init__(self, module_code: str):
        self.module_code = module_code

    # DRF espera classes em `permission_classes` e chama `permission()` internamente.
    # Como aqui usamos um construtor com parametro (HasModuleAccess("erp")), acabamos
    # passando uma instancia. Tornamos a instancia "callable" para o DRF obter a
    # propria instancia sem quebrar.
    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_active_module(request.user, self.module_code)
