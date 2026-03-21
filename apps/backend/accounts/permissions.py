from .models import UserCompany


def get_current_company(user):
    membership = (
        UserCompany.objects.select_related("company")
        .filter(user=user, is_active=True)
        .order_by("id")
        .first()
    )
    return membership.company if membership else None
