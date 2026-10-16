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
