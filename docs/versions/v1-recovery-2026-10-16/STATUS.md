# Estado verificável

| Gate | Estado | Evidência |
|---|---|---|
| F0 — recuperação | PASS | 69abd6f; seis assets idênticos à produção; Rules implantadas idênticas às recuperadas |
| F1 — hardening | PASS parcial local | 52 testes unit/Rules/integration;20 E2E compilados em quatro larguras, inclusive revogação/recusa/reenvio/Pix incompleto; staging real e CSV cross-batch pendentes |
| F2 | IN_PROGRESS | Migração sintética/restore, RBAC Firestore e contexto multi-org locais; contas demo idempotentes; faltam Storage, writes pendentes e Platform Owner completo |
| F3–F6 | TODO | Implementação comercial segue a ordem de dependências |
| F7 — qualidade/release | IN_PROGRESS parcial | Emuladores e Playwright locais; sem CI remoto atualizado nem homologação comercial |
| F8 — aceite | TODO | Release candidate report depende dos gates anteriores |
| Produção/migrations reais/merge | BLOCKED | Exigem autorização específica do proprietário; push na branch de trabalho autorizado separadamente |

52 PASS não cobre invariantes ainda não testadas. 20 E2E não equivale a isolamento multi-membership/Platform Owner, que ainda não existem. Nenhuma garantia de conciliação bancária real.
