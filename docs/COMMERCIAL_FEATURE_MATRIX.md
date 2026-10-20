# Matriz funcional — GOAL FINAL

Auditoria inicial em13fe987, antes de anunciar diferenças novas. Fontes: src/lib/plan-catalog.ts, Finance.tsx, App.tsx, TenantCommercial.tsx, serviços/Rules e aceites F2–F6. O catálogo anterior concede os mesmos7 grupos de recursos a todos os planos. Todos permanecem CORE; nenhuma função existente será retirada de Essencial ou de clientes legados.

| Funcionalidade / classe | Implementada? | Essencial | Pro | Premium | Valor entregue | Evidência |
|---|---|---|---|---|---|---|
| Caravanas/vagas/reservas — CORE | Sim | Sim | Sim | Sim | Operação principal completa | F3/F6;253 backend e168 E2E |
| Passageiros/documentos/comprovantes/menores — CORE | Sim | Sim | Sim | Sim | Conferência manual e privacidade | F3;11 jornadas staging |
| Check-in reversível/auditoria — CORE | Sim | Sim | Sim | Sim | Embarque e histórico íntegros | REGISTRATION_STATES.md |
| CSV existente/deduplicação/rollback — CORE | Sim | Sim | Sim | Sim | Reservas antigas sem duplicar/perder histórico | CSV_IMPORT_ROLLBACK.md |
| Financeiro Geral Tudo/caravana/exportação atual — CORE | Sim | Sim | Sim | Sim | Recebimentos manuais/despesas/histórico | FINANCIAL_LEDGER.md;Finance.tsx |
| Nome/cores/imagem/links de organizadora — CORE | Sim | Sim | Sim | Sim | Identidade própria | F5_ACCEPTANCE.md |
| Equipe/convites/último owner/suporte consentido — CORE | Sim | Sim | Sim | Sim | Acessos necessários e seguros | TEAM_INVITATIONS.md |
| Auth/RBAC/isolation/quotas/auditoria obrigatória — CORE | Sim | Sim | Sim | Sim | Segurança e integridade; nunca vendidos como upgrade | F2/F6 |
| Relatórios operacionais salvos e compartilhados/exportáveis — GROWTH | Sim, PASS local e SDK staging | Não | Sim | Incluído do Pro | Fotografia por data da viagem, embarque e valores conhecidos, sem lista de passageiros, recuperável pela equipe |36 direcionados+16 E2E quatro larguras;6 SDK reais em bdall-e3585 |
| Roteiros de tarefas por caravana e modelos reutilizáveis — PREMIUM_CANDIDATE aprovado localmente | Sim, PASS local e SDK staging | Não | Não | Sim | Reutilizar preparação e acompanhar trabalho da equipe; não substitui check-in/documentos/controles de segurança | SDK/Rules/20 tarefas/legado/downgrade;16 E2E;6 SDK staging |
| Cobrança automática/integrações bancárias — NOT_IMPLEMENTED | Não | Não | Não | Não | Fora do escopo; não anunciar | Proibição vigente |
| Trial público/anual/domínio próprio/automação de mensagens — DEFERRED | Não disponíveis | Não | Não | Não | Não anunciar como entregue | COMMERCIAL_POLICY/F5 |

## Decisão de diferenciação pequena e cumulativa

Essencial continua com tudo que já funcionava. Pro adiciona a central de relatórios operacionais privados, persistidos e exportáveis. Premium inclui Pro e adiciona roteiros/modelos de tarefas compartilhados. São dois incrementos pequenos sobre dados e ACLs existentes, com valor operacional distinto; não apenas uma nova legenda para o Financeiro Geral.

Os incrementos foram implementados e passaram pelo gate local direcionado, seis jornadas SDK de staging e CI integral do checkpoint ab4aff1 (run39476952320). Frontend de staging 8c1340d e seus12 assets reconferidos no Cloud; homologação da migração real permanece BLOCKED. Não esconder a importação ou o Financeiro Geral anteriores atrás de um plano maior. Nada altera mensalidades89/149/219, caravanas2/5/15, passageiros60/200/500, integrantes2/5/15, implantação100 com dispensa assistida, anual deferred e ausência de trial/billing automático.

Enforcement implementado: catálogo/resolvedor central e projeção privada de capacidades por organização, vinculada ao contrato/auditoria; Rules verificam assinatura atual e feature na criação/alteração. Os novos documentos ficam sob organizations/{orgId}, exigem organização existente e ACL atual. SDK direto, payload forjado, URL, revogação, contrato vencido/suspenso, concorrência e replay devem ser testados. Relatórios e roteiros históricos continuam legíveis para a equipe autorizada após downgrade; criação/alteração comercial nova é bloqueada. Dados operacionais essenciais permanecem disponíveis conforme RBAC anterior. Overrides de preço não concedem features de outro plano.
