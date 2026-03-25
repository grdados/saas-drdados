from django.db.utils import IntegrityError, OperationalError, ProgrammingError
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from accounts.permissions import get_current_company

from . import models, serializers


class CompanyScopedViewSet(viewsets.ModelViewSet):
    """
    CRUD simples para cadastros base do ERP.
    Tudo sempre filtrado por company_id (multi-tenant).
    """

    # TEMP (dev/unblock): sem bloqueio por licenca/modulo.
    # Vamos reintroduzir as restricoes depois que os cadastros basicos estiverem estaveis.
    permission_classes = [permissions.IsAuthenticated]

    def get_company(self):
        return get_current_company(self.request.user)

    def get_queryset(self):
        company = self.get_company()
        if not company:
            return self.queryset.none()
        return self.queryset.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())

    def handle_exception(self, exc):
        """
        Evita retornar HTML de erro 500 para o frontend (que nao ajuda no debug/UX).
        Converte alguns erros comuns de banco para JSON amigavel.
        """
        if isinstance(exc, (ProgrammingError, OperationalError)):
            return Response(
                {
                    "detail": "Erro de banco ao acessar o ERP. Verifique se as migracoes foram aplicadas e se a base esta acessivel."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if isinstance(exc, IntegrityError):
            return Response(
                {"detail": "Erro de integridade ao salvar. Verifique os campos e tente novamente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().handle_exception(exc)


class CulturaViewSet(CompanyScopedViewSet):
    queryset = models.Cultura.objects.select_related("company")
    serializer_class = serializers.CulturaSerializer


class SafraViewSet(CompanyScopedViewSet):
    queryset = models.Safra.objects.select_related("company", "cultura")
    serializer_class = serializers.SafraSerializer


class GrupoCompraViewSet(CompanyScopedViewSet):
    queryset = models.GrupoCompra.objects.select_related("company")
    serializer_class = serializers.GrupoCompraSerializer


class GrupoProdutorViewSet(CompanyScopedViewSet):
    queryset = models.GrupoProdutor.objects.select_related("company")
    serializer_class = serializers.GrupoProdutorSerializer


class ProdutorViewSet(CompanyScopedViewSet):
    queryset = models.Produtor.objects.select_related("company", "grupo")
    serializer_class = serializers.ProdutorSerializer


class ClienteViewSet(CompanyScopedViewSet):
    queryset = models.Cliente.objects.select_related("company")
    serializer_class = serializers.ClienteSerializer


class FornecedorViewSet(CompanyScopedViewSet):
    queryset = models.Fornecedor.objects.select_related("company")
    serializer_class = serializers.FornecedorSerializer


class TransportadorViewSet(CompanyScopedViewSet):
    queryset = models.Transportador.objects.select_related("company")
    serializer_class = serializers.TransportadorSerializer


class CentroCustoViewSet(CompanyScopedViewSet):
    queryset = models.CentroCusto.objects.select_related("company")
    serializer_class = serializers.CentroCustoSerializer


class OperacaoViewSet(CompanyScopedViewSet):
    queryset = models.Operacao.objects.select_related("company")
    serializer_class = serializers.OperacaoSerializer


class BancoViewSet(CompanyScopedViewSet):
    queryset = models.Banco.objects.select_related("company")
    serializer_class = serializers.BancoSerializer


class ContaViewSet(CompanyScopedViewSet):
    queryset = models.Conta.objects.select_related("company", "banco", "produtor")
    serializer_class = serializers.ContaSerializer


class MoedaViewSet(CompanyScopedViewSet):
    queryset = models.Moeda.objects.select_related("company")
    serializer_class = serializers.MoedaSerializer


class CaixaViewSet(CompanyScopedViewSet):
    queryset = models.Caixa.objects.select_related("company")
    serializer_class = serializers.CaixaSerializer


class CondicaoFinanceiraViewSet(CompanyScopedViewSet):
    queryset = models.CondicaoFinanceira.objects.select_related("company")
    serializer_class = serializers.CondicaoFinanceiraSerializer


class PedidoCompraViewSet(CompanyScopedViewSet):
    queryset = (
        models.PedidoCompra.objects.select_related(
            "company", "grupo", "produtor", "fornecedor", "safra", "operacao"
        ).prefetch_related("items", "items__produto")
    )
    serializer_class = serializers.PedidoCompraSerializer


class CategoriaViewSet(CompanyScopedViewSet):
    queryset = models.Categoria.objects.select_related("company")
    serializer_class = serializers.CategoriaSerializer


class InsumoViewSet(CompanyScopedViewSet):
    queryset = models.Insumo.objects.select_related(
        "company", "categoria", "cultura", "fabricante", "centro_custo"
    )
    serializer_class = serializers.InsumoSerializer


class ProdutoViewSet(CompanyScopedViewSet):
    queryset = models.Produto.objects.select_related("company", "categoria", "cultura", "centro_custo")
    serializer_class = serializers.ProdutoSerializer


class PecaViewSet(CompanyScopedViewSet):
    queryset = models.Peca.objects.select_related("company", "categoria", "cultura", "fabricante", "centro_custo")
    serializer_class = serializers.PecaSerializer


class CombustivelViewSet(CompanyScopedViewSet):
    queryset = models.Combustivel.objects.select_related("company")
    serializer_class = serializers.CombustivelSerializer


class CultivarViewSet(CompanyScopedViewSet):
    queryset = models.Cultivar.objects.select_related("company")
    serializer_class = serializers.CultivarSerializer


class DiversoViewSet(CompanyScopedViewSet):
    queryset = models.Diverso.objects.select_related("company")
    serializer_class = serializers.DiversoSerializer


class FabricanteViewSet(CompanyScopedViewSet):
    queryset = models.Fabricante.objects.select_related("company")
    serializer_class = serializers.FabricanteSerializer


class PropriedadeViewSet(CompanyScopedViewSet):
    queryset = models.Propriedade.objects.select_related("company", "produtor")
    serializer_class = serializers.PropriedadeSerializer


class TalhaoViewSet(CompanyScopedViewSet):
    queryset = models.Talhao.objects.select_related("company", "propriedade", "propriedade__produtor")
    serializer_class = serializers.TalhaoSerializer


class MaquinaViewSet(CompanyScopedViewSet):
    queryset = models.Maquina.objects.select_related("company")
    serializer_class = serializers.MaquinaSerializer


class BenfeitoriaViewSet(CompanyScopedViewSet):
    queryset = models.Benfeitoria.objects.select_related("company")
    serializer_class = serializers.BenfeitoriaSerializer


class BombaCombustivelViewSet(CompanyScopedViewSet):
    queryset = models.BombaCombustivel.objects.select_related("company")
    serializer_class = serializers.BombaCombustivelSerializer


class DepositoViewSet(CompanyScopedViewSet):
    queryset = models.Deposito.objects.select_related("company")
    serializer_class = serializers.DepositoSerializer
