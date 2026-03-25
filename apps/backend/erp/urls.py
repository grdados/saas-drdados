from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()

router.register(r"culturas", views.CulturaViewSet, basename="culturas")
router.register(r"safras", views.SafraViewSet, basename="safras")
router.register(r"grupos-compra", views.GrupoCompraViewSet, basename="grupos_compra")
router.register(r"grupos-produtores", views.GrupoProdutorViewSet, basename="grupos_produtores")
router.register(r"produtores", views.ProdutorViewSet, basename="produtores")
router.register(r"clientes", views.ClienteViewSet, basename="clientes")
router.register(r"fornecedores", views.FornecedorViewSet, basename="fornecedores")
router.register(r"transportadores", views.TransportadorViewSet, basename="transportadores")
router.register(r"centros-custo", views.CentroCustoViewSet, basename="centros_custo")
router.register(r"operacoes", views.OperacaoViewSet, basename="operacoes")

router.register(r"financeiro/bancos", views.BancoViewSet, basename="bancos")
router.register(r"financeiro/contas", views.ContaViewSet, basename="contas")
router.register(r"financeiro/moedas", views.MoedaViewSet, basename="moedas")
router.register(r"financeiro/caixas", views.CaixaViewSet, basename="caixas")
router.register(r"financeiro/condicoes", views.CondicaoFinanceiraViewSet, basename="condicoes_financeiras")

router.register(r"compras/pedidos", views.PedidoCompraViewSet, basename="pedidos_compra")

router.register(r"estoque/categorias", views.CategoriaViewSet, basename="categorias")
router.register(r"estoque/insumos", views.InsumoViewSet, basename="insumos")
router.register(r"estoque/produtos", views.ProdutoViewSet, basename="produtos")
router.register(r"estoque/pecas", views.PecaViewSet, basename="pecas")
router.register(r"estoque/combustiveis", views.CombustivelViewSet, basename="combustiveis")
router.register(r"estoque/cultivares", views.CultivarViewSet, basename="cultivares")
router.register(r"estoque/diversos", views.DiversoViewSet, basename="diversos")
router.register(r"estoque/fabricantes", views.FabricanteViewSet, basename="fabricantes")

router.register(r"patrimonio/propriedades", views.PropriedadeViewSet, basename="propriedades")
router.register(r"patrimonio/talhoes", views.TalhaoViewSet, basename="talhoes")
router.register(r"patrimonio/maquinas", views.MaquinaViewSet, basename="maquinas")
router.register(r"patrimonio/benfeitorias", views.BenfeitoriaViewSet, basename="benfeitorias")
router.register(r"patrimonio/bombas-combustivel", views.BombaCombustivelViewSet, basename="bombas_combustivel")
router.register(r"patrimonio/depositos", views.DepositoViewSet, basename="depositos")

urlpatterns = [
    path("", include(router.urls)),
]
