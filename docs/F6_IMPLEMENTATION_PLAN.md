# F6 — plano de implementação (histórico e pendências)

Estado atual em F6_ACCEPTANCE.md. Catálogo, atribuição, quotas, onboarding e painel foram integrados e validados incrementalmente no emulador. A sequência abaixo preserva o plano original; equipe/convites estão BLOCKED por sincronização do LAB04-PC23. Preços e limites vêm do MASTER: Essencial89/890,2/60/2; Pro149/1490,5/200/5; Premium219/2190,15/500/15. Anual aprovado mas lançamento deferred; setup100 com dispensa opcional, sem trial público ou billing automático. Override temporário Pro90 pertence ao tenant, não ao catálogo nem à tarifa85 do passageiro.

## Ordem proposta

1. PlanCatalog/EntitlementService/Limits/FeatureGating/SubscriptionStatus/TenantOverrides/ManualPlanAssignment puros, com testes. Recursos disponíveis por plano usam funcionalidades implementadas; os diferenciais aprovados são os limites. História continua sob RBAC mesmo quando crescimento comercial estiver bloqueado.
2. Atribuição manual por Platform Owner com motivo/ator/tempo e replay. Assinatura comercial privada separada de resumo público mínimo dos limites; não publicar condição promocional ou qualquer PII em entitlements. Sem plano=sem crescimento, jamais Premium implícito.
3. Contador de caravanas publicadas e usuários internos vinculado a mudanças reais, em transações/Rules. Novas reservas/imports limitam passageiros/caravana pelo mesmo contador reservado existente, além da capacidade física. Não permitir zerar usage do cliente ou criar baseline falso para organização existente.
4. Onboarding novo cria organização, owner/membership, plano/entitlements e usage inicial correto, atomicamente e auditado. Continuar UID existente/assistido, sem criar/sugerir senha compartilhada. Checagem administrativa de existência do UID é pré-condição até haver backend Auth confiável; não alegar verificação automática ausente.
5. Equipe: owner convida UID existente, roles owner/staff e revogação auditada; último owner protegido. Platform Owner pode criar o primeiro owner de uma organização nova; não recebe permissão genérica de inserir a si mesmo na organização real existente. Suporte consentido F2 permanece separado.
6. Migração de baseline/entitlements para legado: planner/dry-run e ensaio sintético, sem substituir IDs ou regravar inscrições. Counter baseline real exige procedimento administrativo especificamente autorizado, não escrita direta liberada nas Rules.
7. UI de limites/estado/downgrade preservando histórico, landing SaaS separada e demo sintética clara. Contato comercial solicitado ao usuário de forma assíncrona; não reaproveitar contato AnimeSFest. Não enviar mensagens externas neste GOAL.
8. Testes direcionados de concorrência/última vaga/plano/override/downgrade e gates integrais relevantes. F5 deve ter aceite local antes de concluir F6. Nenhuma alteração de produção está autorizada.

## Pontos que precisam ser decididos/documentados na implementação

“Caravana ativa” será publicada; rascunho/arquivo não contam como publicada, mas novo cadastro ainda exige plano apto. Passageiros por caravana usam inscrições reservadas não canceladas, inclusive importadas; histórico cancelado/financeiro não é apagado. Internos são memberships ativas. Limites menores após downgrade bloqueiam crescimento e não reduzem/expulsam dados existentes.

A integração transacional/Rules já tem evidências incrementais nos documentos dos módulos, mas equipe/convites e gate conjunto continuam pendentes: F6 fica IN_PROGRESS e não há declaração comercial. Modificações de Rules, migração real de baseline, provider Auth, DNS ou deploy continuam BLOCKED sem autorização específica.
