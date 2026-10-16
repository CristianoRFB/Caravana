# Estado verificável

| Gate | Estado | Evidência |
|---|---|---|
| F0 — recuperação | PASS | 69abd6f; seis assets idênticos à produção; Rules implantadas idênticas às recuperadas |
| F1 — hardening | PASS parcial local | 52 testes unit/Rules/integration;20 E2E compilados em quatro larguras, inclusive revogação/recusa/reenvio/Pix incompleto; staging real e CSV cross-batch pendentes |
| F2 | PASS corpus sintético / BLOCKED homologação real | Suporte explícito concluído;101 unit/Rules/integration,4 Auth,6 Storage,56 E2E PASS; F2_ACCEPTANCE.md; tokens/IAM/backup/corte reais dependem de autorização |
| F3–F6 | TODO | Implementação comercial segue a ordem de dependências |
| F7 — qualidade/release | IN_PROGRESS parcial | Emuladores e Playwright locais; sem CI remoto atualizado nem homologação comercial |
| F8 — aceite | TODO | Release candidate report depende dos gates anteriores |
| Produção/migrations reais/merge | BLOCKED | Exigem autorização específica do proprietário; push na branch de trabalho autorizado separadamente |

Os números do baseline F1 não substituem as suites F2 posteriores; consulte TEST_EVIDENCE.md. Platform Owner mínimo e isolamento possuem testes próprios, mas F2 completo ainda não é declarado. Nenhuma garantia de conciliação bancária real.
