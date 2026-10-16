# Estado verificável

| Gate | Estado | Evidência |
|---|---|---|
| F0 — recuperação | PASS | 69abd6f; seis assets idênticos à produção; Rules implantadas idênticas às recuperadas |
| F1 — hardening | PASS parcial local | 52 testes unit/Rules/integration;20 E2E compilados em quatro larguras, inclusive revogação/recusa/reenvio/Pix incompleto; staging real e CSV cross-batch pendentes |
| F2 | PASS corpus sintético / BLOCKED homologação real | Suporte explícito concluído;101 unit/Rules/integration,4 Auth,6 Storage,56 E2E PASS; F2_ACCEPTANCE.md; tokens/IAM/backup/corte reais dependem de autorização |
| F3 | IN_PROGRESS | Reserva retry-safe implementada;56 testes relacionados/4 E2E PASS; estados/check-in/CSV/documentos pendentes |
| F4–F6 | TODO | Implementação comercial segue a ordem de dependências |
| F7 — qualidade/release | IN_PROGRESS parcial | Emuladores e Playwright locais; sem CI remoto atualizado nem homologação comercial |
| F8 — aceite | TODO | Release candidate report depende dos gates anteriores |
| Produção/migrations reais/merge | BLOCKED | Exigem autorização específica do proprietário; push na branch de trabalho autorizado separadamente |

Os números do baseline F1 não substituem as suites F2 posteriores; consulte TEST_EVIDENCE.md. Platform Owner mínimo e isolamento possuem testes próprios, mas F2 completo ainda não é declarado. Nenhuma garantia de conciliação bancária real.

F3-documentos/gate: PASS no corpus local/sintético, homologação remota BLOCKED. DOCUMENTS_RETENTION.md e F3_ACCEPTANCE.md registram PDF privado/consentimento, revisão manual, retenção individual auditada, idade na data da viagem e snapshot válido do embarque.142 testes unit/Rules/integration (incluindo escala400+replay),4 Auth,6 Storage e88 E2E nas quatro larguras PASS;lint/typecheck/build E2E PASS. Primeira rodada E2E87 PASS/1 FAIL encontrou overflow768 corrigido com toolbar flexível; final88 PASS. Nenhuma escrita real, migração, deploy, Rules/índices implantados, merge ou operação financeira real. F2 continua somente local. Próxima tarefa executável F4: preservar Financeiro Geral e tornar lançamentos/correções idempotentes e auditados; depois F5–F8.
