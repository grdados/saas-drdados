import os
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import ProjectInquirySerializer


def _compute_score(payload: dict) -> tuple[int, str]:
    score = 0

    solution = payload.get("solution")
    if solution in ("erp", "crm"):
        score += 20
    elif solution == "power_bi":
        score += 25
    elif solution == "landing_page":
        score += 10

    budget = (payload.get("budget_range") or "").strip()
    if budget.startswith("Acima"):
        score += 35
    elif budget.startswith("De 5.000"):
        score += 25
    elif budget.startswith("De 2.000 a 5.000"):
        score += 15
    elif budget.startswith("Até 2.000") or budget.startswith("Ate 2.000"):
        score += 10

    # Prazo mais curto tende a ser mais quente
    start_date = payload.get("start_date")
    if isinstance(start_date, date):
        delta = (start_date - date.today()).days
        if delta <= 14:
            score += 15
        elif delta <= 30:
            score += 10
        elif delta <= 60:
            score += 5

    if payload.get("needs_data_help"):
        score += 10

    if payload.get("update_frequency") in ("real_time", "hourly"):
        score += 10

    if payload.get("data_structure") == "structured":
        score += 10
    elif payload.get("data_structure") == "partial":
        score += 5

    if payload.get("has_system"):
        score += 5

    if score >= 70:
        return score, "hot"
    if score >= 40:
        return score, "warm"
    return score, "cold"


def _format_whatsapp_message(data: dict, score: int, temperature: str) -> str:
    # Mensagem curta e copiável (URL-encoded no frontend)
    lines = [
        "Novo pedido de projeto - GR Dados",
        f"Lead: {data.get('name')}",
        f"Empresa: {data.get('company')}",
        f"Email: {data.get('email')}",
        f"WhatsApp: {data.get('whatsapp')}",
        f"Solução: {data.get('solution')}",
        f"Início: {data.get('start_date') or '-'}",
        f"Tamanho: {data.get('company_size') or '-'}",
        f"Orçamento: {data.get('budget_range') or '-'}",
        f"Score: {score} ({temperature})",
        "",
        "Resumo do projeto:",
        (data.get("description") or "-")[:600],
    ]
    return "\n".join(lines).strip()


@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck(request):
    return Response({"status": "ok", "service": "grdados-backend"})


@api_view(["POST"])
@permission_classes([AllowAny])
def project_intake(request):
    serializer = ProjectInquirySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Compute scoring before saving.
    validated = dict(serializer.validated_data)
    score, temperature = _compute_score(validated)

    inquiry = serializer.save(score=score, temperature=temperature)

    lead_created = False
    lead_id = None
    try:
        from accounts.models import Company
        from crm.models import Lead

        internal_name = os.getenv("INTAKE_COMPANY_NAME", "GR Dados")
        internal_company, _ = Company.objects.get_or_create(name=internal_name)

        notes = _format_whatsapp_message(validated, score, temperature)
        lead = Lead.objects.create(
            company=internal_company,
            name=validated.get("name", ""),
            email=validated.get("email", ""),
            phone=validated.get("whatsapp", ""),
            source="project_intake",
            notes=notes,
        )
        lead_created = True
        lead_id = lead.id
    except Exception:
        # If CRM isn't available for any reason, still keep the inquiry stored.
        pass

    whatsapp_message = _format_whatsapp_message(validated, score, temperature)

    return Response(
        {
            "id": inquiry.id,
            "score": score,
            "temperature": temperature,
            "lead_created": lead_created,
            "lead_id": lead_id,
            "whatsapp_message": whatsapp_message,
        },
        status=status.HTTP_201_CREATED,
    )

