# Estado verificável

| Gate | Estado | Evidência |
|---|---|---|
| F0 — recuperação | PASS | 69abd6f; seis assets idênticos à produção; Rules implantadas idênticas às recuperadas |
| F1 — hardening | PASS parcial local | 52 testes unit/Rules/integration;20 E2E compilados em quatro larguras, inclusive revogação/recusa/reenvio/Pix incompleto; staging real e CSV cross-batch pendentes |
| F2–F6 | TODO | Nenhuma migração multi-tenant ou implementação comercial concluída |
| F7 — qualidade/release | IN_PROGRESS parcial | Emuladores e Playwright locais; sem CI remoto atualizado nem homologação comercial |
| F8 — aceite | TODO | Release candidate report depende dos gates anteriores |
| Produção/migrations reais/merge/push | BLOCKED | Exigem autorização específica do proprietário |

52 PASS não cobre invariantes ainda não testadas. 20 E2E não equivale a isolamento multi-membership/Platform Owner, que ainda não existem. Nenhuma garantia de conciliação bancária real.
