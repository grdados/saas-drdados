from rest_framework import permissions, viewsets

from accounts.permissions import get_current_company
from billing.permissions import HasModuleAccess

from . import models, serializers


class CompanyScopedViewSet(viewsets.ModelViewSet):
    """
    CRUD simples para cadastros base do ERP.
    Tudo sempre filtrado por company_id (multi-tenant).
    """

    permission_classes = [permissions.IsAuthenticated, HasModuleAccess("erp")]

    def get_company(self):
        return get_current_company(self.request.user)

    def get_queryset(self):
        company = self.get_company()
        if not company:
            return self.queryset.none()
        return self.queryset.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class CulturaViewSet(CompanyScopedViewSet):
    queryset = models.Cultura.objects.select_related("company")
    serializer_class = serializers.CulturaSerializer


class SafraViewSet(CompanyScopedViewSet):
    queryset = models.Safra.objects.select_related("company")
    serializer_class = serializers.SafraSerializer


class GrupoCompraViewSet(CompanyScopedViewSet):
    queryset = models.GrupoCompra.objects.select_related("company")
    serializer_class = serializers.GrupoCompraSerializer


class ProdutorViewSet(CompanyScopedViewSet):
    queryset = models.Produtor.objects.select_related("company")
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
    queryset = models.Conta.objects.select_related("company")
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


class InsumoViewSet(CompanyScopedViewSet):
    queryset = models.Insumo.objects.select_related("company")
    serializer_class = serializers.InsumoSerializer


class ProdutoViewSet(CompanyScopedViewSet):
    queryset = models.Produto.objects.select_related("company")
    serializer_class = serializers.ProdutoSerializer


class PecaViewSet(CompanyScopedViewSet):
    queryset = models.Peca.objects.select_related("company")
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
    queryset = models.Propriedade.objects.select_related("company")
    serializer_class = serializers.PropriedadeSerializer


class TalhaoViewSet(CompanyScopedViewSet):
    queryset = models.Talhao.objects.select_related("company")
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

