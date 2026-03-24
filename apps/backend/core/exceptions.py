import logging
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    """
    DRF exception handler customizado.

    Objetivo:
    - Para erros nao tratados (que normalmente virariam HTML 500 do Django),
      retornar JSON padrao para o frontend.
    - Logar o traceback para o Render mostrar no Logs.
    """

    response = drf_exception_handler(exc, context)
    if response is not None:
        # If DRF produced a 5xx response, still log it for visibility.
        try:
            if getattr(response, "status_code", 0) >= 500:
                request = context.get("request")
                method = getattr(request, "method", "?")
                path = getattr(request, "path", "?")
                error_id = uuid.uuid4().hex[:10]
                logger.exception("API 5xx (%s %s) error_id=%s", method, path, error_id)
                # Attach an id so frontend can reference it.
                if isinstance(getattr(response, "data", None), dict):
                    response.data.setdefault("error_id", error_id)
        except Exception:
            # Never break the response because of logging instrumentation.
            pass
        return response

    request = context.get("request")
    method = getattr(request, "method", "?")
    path = getattr(request, "path", "?")

    error_id = uuid.uuid4().hex[:10]
    logger.exception("Unhandled API exception (%s %s) error_id=%s", method, path, error_id)

    return Response(
        {"detail": "Erro interno no servidor.", "code": "internal_error", "error_id": error_id},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
