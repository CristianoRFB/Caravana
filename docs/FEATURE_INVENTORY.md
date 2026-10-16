# Inventário de funcionalidades

Fonte avançada SOURCE_PRESENT: Financeiro Geral /admin/financeiro, filtro Tudo/caravana, financeiro por viagem, payments active/voided, expenses, CSV histórico, documentos/menores, paymentMethod/paymentDeadline/paymentInstructions, comprovante em Firestore 600 KiB.

Esses recursos também estão BUNDLE_PRESENT na produção e snapshots. RUNTIME_CONFIRMED e TESTED serão atribuídos individualmente conforme evidências. Fonte main oficial não inclui esses módulos avançados.

Ausentes na fonte recuperada em F0: memberships multi-organização, alternância de tenant, Platform Owner, white-label completo, catálogo/limites comerciais confiáveis.

Implementados posteriormente em branch de trabalho, somente locais: memberships/roles, resolver/alternância com espera por writes, contas fixas de emulador, migração sintética reversível, Rules Storage candidatas, Platform Owner mínimo (lista/status/onboarding UID/audit) e suporte com consentimento, prazo e auditoria (configuração de caravanas, somente leitura). Evidências individuais em CODEX_PROGRESS.md e TEST_EVIDENCE.md. White-label completo e catálogo/limites comerciais continuam pendentes; nenhuma destas alterações está em produção.

Proprietário de todos os dados privados operacionais: organização identificada por organizationId. Payments pertencem à inscrição e caravana; expenses à caravana. Plataforma global não implica leitura irrestrita de passageiros.

F3 primeiro módulo local: reserva com identidade persistida na aba e replay, hash da solicitação, confirmação do servidor após erro, conflito sem duplicar vaga, identidade imutável e remoção de exclusão direta de inscrições. Cancelamento preserva o histórico. UI de erro mantém formulário e permite consultar operação já concluída. RESERVATION_RETRIES.md documenta evidência e limite de dedupe por mesma tentativa; CSV entre lotes/check-in auditado ainda pendentes.
