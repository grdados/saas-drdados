import logging

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
        return response

    request = context.get("request")
    method = getattr(request, "method", "?")
    path = getattr(request, "path", "?")

    logger.exception("Unhandled API exception (%s %s)", method, path)

    return Response(
        {"detail": "Erro interno no servidor.", "code": "internal_error"},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )

