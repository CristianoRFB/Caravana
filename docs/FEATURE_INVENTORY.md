# Inventário de funcionalidades

Fonte avançada SOURCE_PRESENT: Financeiro Geral /admin/financeiro, filtro Tudo/caravana, financeiro por viagem, payments active/voided, expenses, CSV histórico, documentos/menores, paymentMethod/paymentDeadline/paymentInstructions, comprovante em Firestore 600 KiB.

Esses recursos também estão BUNDLE_PRESENT na produção e snapshots. RUNTIME_CONFIRMED e TESTED serão atribuídos individualmente conforme evidências. Fonte main oficial não inclui esses módulos avançados.

Ausentes na fonte recuperada em F0: memberships multi-organização, alternância de tenant, Platform Owner, white-label completo, catálogo/limites comerciais confiáveis.

Implementados posteriormente em branch de trabalho, somente locais: memberships/roles, resolver/alternância com espera por writes, contas fixas de emulador, migração sintética reversível, Rules Storage candidatas, Platform Owner mínimo (lista/status/onboarding UID/audit) e suporte com consentimento, prazo e auditoria (configuração de caravanas, somente leitura). Evidências individuais em CODEX_PROGRESS.md e TEST_EVIDENCE.md. White-label completo e catálogo/limites comerciais continuam pendentes; nenhuma destas alterações está em produção.

Proprietário de todos os dados privados operacionais: organização identificada por organizationId. Payments pertencem à inscrição e caravana; expenses à caravana. Plataforma global não implica leitura irrestrita de passageiros.

F3 primeiro módulo local: reserva com identidade persistida na aba e replay, hash da solicitação, confirmação do servidor após erro, conflito sem duplicar vaga, identidade imutável e remoção de exclusão direta de inscrições. Cancelamento preserva o histórico. UI de erro mantém formulário e permite consultar operação já concluída. RESERVATION_RETRIES.md documenta evidência e limite de dedupe por mesma tentativa; CSV entre lotes/check-in auditado ainda pendentes.

F4 PASS no corpus local/sintético; remoto/produção BLOCKED. Financeiro Geral original preservado com Tudo/caravana, ledger vinculado a eventos imutáveis, replay/ID persistido, anulações/correções de despesa sem sobrescrever original, ajuste de tarifa prevista com motivo, diagnóstico somente leitura e exportação sem PII. FINANCIAL_LEDGER.md/F4_ACCEPTANCE.md registram schema/limites. Gate157 unit/Rules/integration e100 E2E nas quatro larguras PASS; após correção delimitada de precisão monetária,12 casos financeiros puros+3 iniciais F5 e14 E2E financeiros PASS;lint/typecheck/build PASS. Não foram repetidos Auth/Storage inalterados. Próxima tarefa F5 branding/mapping/rotas; validador puro inicial tem3 testes PASS e ainda não é recurso integrado. F6–F8 TODO. Nenhuma escrita em Firebase real, deploy, Rules/índices implantados, migração, merge ou operação financeira real. F2 continua apenas aceite local.
