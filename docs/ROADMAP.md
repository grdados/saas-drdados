# Roadmap de Desenvolvimento - GRDados

## Fase 1: Foundation (Semana 1)

1. Estrutura monorepo (`apps/backend`, `apps/frontend`)
2. Docker Compose (db + api + web)
3. CI básico (build backend/frontend)
4. Padrão de branch e convenção de commit

## Fase 2: Backend CRM Core (Semanas 2-3)

1. Módulo de autenticação (JWT)
2. Multi-tenant simples (Company + UserCompany)
3. CRUD de Leads e Contatos
4. CRUD de Tarefas
5. Swagger/OpenAPI
6. Testes de API (pytest ou unittest)

## Fase 3: Frontend CRM (Semanas 3-4)

1. Login + sessão
2. Dashboard inicial
3. Funil de leads
4. Lista de tarefas
5. Formulários com validação
6. Feedback de erro/sucesso

## Fase 4: Billing e Licença (Semana 5)

1. Cadastro de cliente no Asaas
2. Criação de assinatura recorrente
3. Persistência de status de cobrança
4. Webhook de pagamento
5. Regras de bloqueio/desbloqueio de licença

## Fase 5: Landing + Go Live (Semana 6)

1. Landing page pública
2. Formulário de captação de leads
3. Deploy (frontend + backend + db)
4. Configuração de domínio e SSL
5. Observabilidade mínima (logs e erros)
