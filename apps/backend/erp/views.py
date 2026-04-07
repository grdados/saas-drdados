from django.db import transaction
from django.db.utils import IntegrityError, OperationalError, ProgrammingError
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
import logging

from accounts.permissions import get_current_company

from . import models, serializers

logger = logging.getLogger(__name__)


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
            logger.exception("ERP DB error in %s: %s", self.__class__.__name__, exc)
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


class CompanyScopedReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_company(self):
        return get_current_company(self.request.user)

    def get_queryset(self):
        company = self.get_company()
        if not company:
            return self.queryset.none()
        return self.queryset.filter(company=company)

    def handle_exception(self, exc):
        if isinstance(exc, (ProgrammingError, OperationalError)):
            logger.exception("ERP DB error in %s: %s", self.__class__.__name__, exc)
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
    queryset = models.Produtor.objects.select_related("company", "grupo").prefetch_related("propriedade_set", "propriedades")
    serializer_class = serializers.ProdutorSerializer


class ClienteViewSet(CompanyScopedViewSet):
    queryset = models.Cliente.objects.select_related("company")
    serializer_class = serializers.ClienteSerializer


class FornecedorViewSet(CompanyScopedViewSet):
    queryset = models.Fornecedor.objects.select_related("company")
    serializer_class = serializers.FornecedorSerializer


class TransportadorViewSet(CompanyScopedViewSet):
    queryset = models.Transportador.objects.select_related("company").prefetch_related("placas")
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

    def perform_destroy(self, instance):
        contas_pedido = models.ContaPagar.objects.filter(
            pedido=instance,
            faturamento__isnull=True,
            origem=models.ContaPagar.Origem.PEDIDO,
        )
        if contas_pedido.filter(paid_value__gt=0).exists():
            raise IntegrityError("Nao e permitido excluir pedido com pagamento registrado em Contas a Pagar.")
        contas_pedido.delete()
        super().perform_destroy(instance)


class FaturamentoCompraViewSet(CompanyScopedViewSet):
    queryset = (
        models.FaturamentoCompra.objects.select_related(
            "company", "grupo", "produtor", "pedido", "fornecedor", "deposito", "operacao"
        ).prefetch_related("items", "items__pedido_item", "items__produto")
    )
    serializer_class = serializers.FaturamentoCompraSerializer

    def perform_destroy(self, instance):
        with transaction.atomic():
            contas_nf = models.ContaPagar.objects.filter(
                faturamento=instance,
                origem=models.ContaPagar.Origem.NOTA_FISCAL,
            )
            if contas_nf.filter(paid_value__gt=0).exists():
                raise ValidationError(
                    {
                        "detail": (
                            "Nao e permitido excluir faturamento com pagamento registrado em Contas a Pagar. "
                            "Estorne o pagamento primeiro."
                        )
                    }
                )

            pedido = instance.pedido
            contas_nf.delete()
            super().perform_destroy(instance)

            if pedido:
                sync = serializers.FaturamentoCompraSerializer(context={"request": self.request})
                sync._recalc_pedido_status(pedido)
                sync._sync_contas_por_pedido(pedido)


class ContaPagarViewSet(CompanyScopedViewSet):
    queryset = models.ContaPagar.objects.select_related(
        "company", "grupo", "produtor", "fornecedor", "operacao", "pedido", "faturamento"
    )
    serializer_class = serializers.ContaPagarSerializer


class EmpreendimentoViewSet(CompanyScopedViewSet):
    queryset = (
        models.Empreendimento.objects.select_related(
            "company", "safra", "propriedade", "produto", "centro_custo"
        ).prefetch_related("items", "items__talhao", "items__produto", "items__cultivar")
    )
    serializer_class = serializers.EmpreendimentoSerializer


class ChuvaViewSet(CompanyScopedViewSet):
    queryset = models.Chuva.objects.select_related(
        "company",
        "empreendimento",
        "empreendimento__safra",
        "talhao",
    )
    serializer_class = serializers.ChuvaSerializer


class ContratoVendaViewSet(CompanyScopedViewSet):
    queryset = (
        models.ContratoVenda.objects.select_related(
            "company", "grupo", "produtor", "cliente", "safra", "operacao"
        ).prefetch_related("items", "items__produto")
    )
    serializer_class = serializers.ContratoVendaSerializer

    def perform_destroy(self, instance):
        contas = models.ContaReceber.objects.filter(
            contrato=instance,
            origem=models.ContaReceber.Origem.CONTRATO,
        )
        if contas.filter(received_value__gt=0).exists():
            raise IntegrityError("Nao e permitido excluir contrato com recebimento registrado em Contas a Receber.")
        contas.delete()
        super().perform_destroy(instance)


class ContaReceberViewSet(CompanyScopedViewSet):
    queryset = models.ContaReceber.objects.select_related(
        "company", "grupo", "produtor", "cliente", "operacao", "contrato"
    )
    serializer_class = serializers.ContaReceberSerializer


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
    queryset = models.Propriedade.objects.select_related("company", "produtor").prefetch_related("produtores")
    serializer_class = serializers.PropriedadeSerializer


class TalhaoViewSet(CompanyScopedViewSet):
    queryset = models.Talhao.objects.select_related("company", "propriedade", "propriedade__produtor").prefetch_related("propriedade__produtores")
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


class TransportadorPlacaViewSet(CompanyScopedViewSet):
    queryset = models.TransportadorPlaca.objects.select_related("company", "transportador")
    serializer_class = serializers.TransportadorPlacaSerializer


class RomaneioGraosViewSet(CompanyScopedViewSet):
    queryset = models.RomaneioGraos.objects.select_related(
        "company", "safra", "produtor", "cliente", "produto", "contrato", "deposito", "operacao"
    )
    serializer_class = serializers.RomaneioGraosSerializer

    def perform_destroy(self, instance):
        has_nota_entrada = models.NotaFiscalGraos.objects.filter(
            company=instance.company,
            romaneio=instance,
            tipo=models.NotaFiscalGraos.Tipo.ENTRADA,
        ).exclude(status=models.NotaFiscalGraos.Status.CANCELED).exists()
        if has_nota_entrada:
            raise ValidationError(
                {"detail": "Nao e permitido excluir romaneio com NF de entrada vinculada. Cancele/exclua a NF primeiro."}
            )
        super().perform_destroy(instance)


class NotaFiscalGraosViewSet(CompanyScopedViewSet):
    queryset = models.NotaFiscalGraos.objects.select_related(
        "company",
        "romaneio",
        "nota_entrada_ref",
        "safra",
        "produtor",
        "cliente",
        "produto",
        "deposito",
        "operacao",
    )
    serializer_class = serializers.NotaFiscalGraosSerializer

    def perform_destroy(self, instance):
        with transaction.atomic():
            company = instance.company
            contrato = getattr(instance.romaneio, "contrato", None)
            was_venda = (
                instance.tipo == models.NotaFiscalGraos.Tipo.SAIDA
                and instance.finalidade == models.NotaFiscalGraos.Finalidade.VENDA
            )
            venda_number = (instance.number or "").strip().upper()
            super().perform_destroy(instance)
            serializers.NotaFiscalGraosSerializer.rebuild_company_grain_state(company)
            if was_venda and venda_number:
                models.ContaReceber.objects.filter(
                    company=company,
                    origem__in=[models.ContaReceber.Origem.NOTA_FISCAL, models.ContaReceber.Origem.FIXACAO],
                    document_number=venda_number,
                ).delete()
            if contrato is not None:
                serializers._sync_conta_receber_contrato(contrato)


class EstoqueGraosSaldoViewSet(CompanyScopedReadOnlyViewSet):
    queryset = models.EstoqueGraosSaldo.objects.select_related(
        "company", "safra", "produtor", "cliente", "produto", "deposito"
    )
    serializer_class = serializers.EstoqueGraosSaldoSerializer
