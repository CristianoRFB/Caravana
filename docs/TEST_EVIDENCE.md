# Evidência de testes

Baseline recuperada, 2026-10-16:

| Comando | Resultado | Evidência |
|---|---|---|
| npm ci --no-audit --no-fund | PASS, 904 pacotes | lockfile preservado; Node 24.18.0, npm 11.7.0 |
| npm run lint | PASS, exit 0 | execução antes do checkpoint F0 |
| npm run typecheck | PASS, exit 0 | execução antes do checkpoint F0 |
| npm test | PASS, quatro arquivos / 26 testes | Firebase Firestore Emulator, fixture caravana-rules-test, nenhum acesso a dados de produção |
| npm run build | PASS, exit 0 | evidence/2026-10-16/f0-build.log |
| Comparação SHA256 dos seis assets | PASS, todos idênticos à Production | evidence/2026-10-16/f0-build-parity.json |
| git bundle verify | PASS, histórico completo | backup externo local-preserved/repository.bundle |

A CI oficial de fa4d138 é histórica e cobre fonte anterior. Não confundir build/HTTP 200 ou paridade de bundle com teste de persistência/isolamento do sistema inteiro.

Logs da recuperação: docs/evidence/2026-10-16/. Artefatos externos e manifestos: C:/xampp/77/Caravana-audit-20261016/.

## F1-ID — função real de reserva e regressões

Novo tests/data.integration.test.ts importa src/lib/data.ts com binding Firebase exclusivamente do Rules Test Environment, protegido por FIRESTORE_EMULATOR_HOST loopback. Não importa credenciais do app. Vitest serializa arquivos para impedir colisão entre clearFirestore das suítes.

- RED: f1-before-id-fix-isolated.log, 30 PASS/4 FAIL. Reproduz undefined caravanId, id persistido incorreto, leitura com id legado e reserva da última vaga falhando por esse bug.
- Infraestrutura: f1-before-id-fix.log e f1-after-id-fix.log registram portas ocupadas; f1-after-id-fix-isolated.log registra 34 testes verdes mas runner FAIL por execução de .ps1 restrita. Nenhuma política de segurança do host foi alterada; o runner passou a listar processos via comando PowerShell e encerrar em Node somente Java criado por este teste, nesse workspace e projeto demo.
- GREEN: f1-id-final-tests.log, cinco arquivos, 34 PASS, comando npm test exit 0 e cleanup confirmado. Inclui funções reais para concorrência, cancelamento duplo, revisão/check-in sem inventar valor, parcial/total/overpayment/void repetido e comprovante privado válido/inválido.
- Lint PASS: f1-id-final-lint.log. Typecheck PASS: f1-typecheck.log. Build PASS: f1-id-build.log. Fonte Finance.tsx, lib/finance.ts e importador preservados neste fix.

Fixture demo-caravana77-test, config firebase.test.json, Firestore 127.0.0.1:18080. Uso de projeto demo segue https://firebase.google.com/docs/emulator-suite/connect_firestore. F1 completo continua IN_PROGRESS; estes testes não cobrem ainda todos os gates ou dados legados reais.
