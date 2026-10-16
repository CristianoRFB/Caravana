# Estado verificável

| Gate | Estado | Evidência |
|---|---|---|
| F0 — recuperação | PASS | 69abd6f; seis assets idênticos à produção; Rules implantadas idênticas às recuperadas |
| F1 — hardening | IN_PROGRESS | 43 testes unit/Rules/integration; 12 E2E em quatro larguras; faltam ciclo do link privado, recusa/reenvio e cobertura Pix incompleto |
| F2–F6 | TODO | Nenhuma migração multi-tenant ou implementação comercial concluída |
| F7 — qualidade/release | IN_PROGRESS parcial | Emuladores e Playwright locais; sem CI remoto atualizado nem homologação comercial |
| F8 — aceite | TODO | Release candidate report depende dos gates anteriores |
| Produção/migrations reais/merge/push | BLOCKED | Exigem autorização específica do proprietário |

43 PASS não cobre invariantes ainda não testadas. 12 E2E não equivale a isolamento multi-membership/Platform Owner, que ainda não existem. Nenhuma garantia de conciliação bancária real.
