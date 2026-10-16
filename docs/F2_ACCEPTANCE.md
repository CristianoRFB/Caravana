# Matriz de aceite F2 — segurança multi-tenant

Escopo: branch de trabalho, emuladores locais `demo-caravana77-test`, dados sintéticos. Nenhum teste usa Firebase real. Gate de produção não está aprovado. Esta matriz não substitui o GOAL MASTER nem reduz as fases seguintes.

| Requisito do MASTER | Estado local | Evidência / limite |
|---|---|---|
| F2.1 Entidade organizations e IDs preservados; memberships com papéis e timestamps | PASS | memberships/{uid}/organizations/{orgId}; planner aditivo, testes de conflito e onboarding; global segregado em platformOwners |
| F2.2 Autoridade de servidor por membership ativa | PASS | membership-rules, tenant-access, data.integration; revogado/inválido não recorre ao legado; claim/rota/dropdown não concedem acesso |
| F2.3 Migração admins, manifesto, backup, dry-run, compatibilidade temporária | PASS sintético / BLOCKED real | before/plan/after e restore por hash; janela de corte proposta até30 dias, a definir na migração autorizada; senha e admins não alterados |
| F2.4 Resolver e troca de contexto | PASS | remount por UID/org/papel; observadores encerrados; filtros/listas/rascunhos limpos; seletor aguarda ack/erro de writes; teste com Write retido |
| F2.5 Rules em coleções privadas e novos recursos | PASS para isolamento local | registrations/proofs/payments, caravans/expenses, imports, organizations, memberships, profiles, platformAudit, supportGrants/operators/audit e supportSessions; refinamento de invariantes operacionais/financeiras segue F3/F4 |
| F2.6 Platform Owner e suporte explícito | PASS local | lista/status/onboarding por UID existente e audit atômico; suporte somente leitura de configuração, consentimento do owner, início explícito, prazo máximo1h, revogação e logs; SUPPORT_ACCESS.md |
| F2.7 Storage privado por tenant/vínculo | PASS SDK local / BLOCKED tokens e IAM reais | seis testes Auth/Firestore/Storage; sem cliente write/list; upload ativo é Firestore com assinatura/600KiB; Rules não revogam bearer tokens antigos válidos; STORAGE_PRIVACY.md |
| F2.8 Cliente existente in-place e tenant B | PASS simulação / BLOCKED aplicação real | planner não renomeia/apaga históricos; onboarding/suspensão conservam IDs/dados; fixture B e usuários próprios; nenhum comando de migração de produção disponível |
| F2.9 A×B/roles/revogação/bypass/troca | PASS no corpus local | Rules/SDK/serviços e E2E reais contra emuladores; globais não leem passageiros/financeiro nem recebem Storage implicitamente |
| F2.10 Idempotência, backup/restore e rollback | PASS staging local sintético / BLOCKED real | rehearsal aplica2 memberships, preserva8 docs, replay0 creates, restore com mesmo SHA256; não é backup real de Firestore/Auth/Storage |

## Regressão de aceite

PASS:101 unit/Rules/integration em15 arquivos,4 Auth real emulado,6 Storage e56 E2E compilados em320/375/768/1440 (1,8min), lint/typecheck e build e2e. Logs `f2-acceptance-*` em `docs/evidence/2026-10-16`. Os dez testes de suporte estão incluídos nos101. Zero pageerrors/tentativas de Firebase remoto; sem skip/retry. Capturas do gate ficaram somente em test-results ignorado, sem substituir o manifesto visual aprovado.

Storage repete o warning/NPE conhecido do runtime Java no encerramento, depois de seis testes PASS e script exit0; limitação registrada anteriormente, sem modificar política do sistema.

Primeira execução:100 PASS/1 FAIL. O teste estático antigo de proof-policy ainda exigia upload Storage, removido deliberadamente no módulo de privacidade; atualizado para limite ativo do Firestore e negação de mutações Storage. Não foi reaberta a permissão de upload para satisfazer o teste. Testes SDK Storage continuam obrigatórios.

## Próxima fase autorizada

Aceite sintético F2 PASS para o corpus descrito; homologação/corte real continuam BLOCKED. Continuar F3 com reservas retry-safe, estados/capacidade, check-in auditado e CSV entre lotes. Produção, migração real, publicação Rules, deploy e merge seguem BLOCKED até autorização específica. Backup de código preservado não equivale a backup dos dados reais. Não declarar prontidão comercial ou todos os gates F0–F7 PASS.
