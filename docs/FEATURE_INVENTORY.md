# Inventário de funcionalidades

Fonte avançada SOURCE_PRESENT: Financeiro Geral /admin/financeiro, filtro Tudo/caravana, financeiro por viagem, payments active/voided, expenses, CSV histórico, documentos/menores, paymentMethod/paymentDeadline/paymentInstructions, comprovante em Firestore 600 KiB.

Esses recursos também estão BUNDLE_PRESENT na produção e snapshots. RUNTIME_CONFIRMED e TESTED serão atribuídos individualmente conforme evidências. Fonte main oficial não inclui esses módulos avançados.

Ausentes na fonte recuperada em F0: memberships multi-organização, alternância de tenant, Platform Owner, white-label completo, catálogo/limites comerciais confiáveis.

Implementados posteriormente em branch de trabalho, somente locais: memberships/roles, resolver/alternância com espera por writes, contas fixas de emulador, migração sintética reversível, Rules Storage candidatas e Platform Owner mínimo (lista/status/onboarding UID/audit). Evidências individuais em CODEX_PROGRESS.md e TEST_EVIDENCE.md. Suporte explícito, white-label completo e catálogo/limites comerciais continuam pendentes; nenhuma destas alterações está em produção.

Proprietário de todos os dados privados operacionais: organização identificada por organizationId. Payments pertencem à inscrição e caravana; expenses à caravana. Plataforma global não implica leitura irrestrita de passageiros.
