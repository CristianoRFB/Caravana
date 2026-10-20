# F6 — matriz de aceite incremental

Ambiente exclusivamente sintético `demo-caravana77-test`, branch `codex/caravana77-commercial-v1-20261016`. Esta matriz consolida os módulos existentes e a retomada Cloud; não substitui o GOAL original ausente neste checkout. F6 geral **IN_PROGRESS**, gate completo **BLOCKED** pela sincronização de equipe/convites. Homologação real não executada.

| Critério | Estado | Evidência disponível | Pendência |
|---|---|---|---|
| Catálogo, valores, limites, entitlements e override com prazo | PASS incremental local | COMMERCIAL_ASSIGNMENT.md, 28 testes+6 E2E, logs versionados | Regressão integral atual e gate F6 |
| Quotas de caravanas/equipe e proteção do último owner | PASS da base transacional | QUOTA_OPERATIONS.md, 26 testes com concorrência | Não prova convite/aceite/UI |
| Quotas de reservas/CSV/downgrade | PASS incremental local | PASSENGER_QUOTAS.md, 75 testes+1 downgrade, E2E documentados | Escala400+replay novamente PASS na regressão216; E2E conjunto pendente |
| Namespace histórico e onboarding comercial da primeira organizadora | PASS incremental local | NAMESPACE_PROTECTION.md e COMMERCIAL_ONBOARDING.md, 15 testes+4 E2E no módulo de onboarding | Bootstrap/inventário e conferência Auth reais BLOCKED |
| Suspensão e contrato/uso no painel | PASS incremental local | COMMERCIAL_GROWTH_UI.md, 45 testes+2 E2E finais | Gate conjunto |
| Equipe/convites do LAB04-PC23 | BLOCKED sincronização | HEAD remoto recuperado65f8fac sem commits posteriores ou serviço/UI/testes de convites | Enviar checkpoint local; não reimplementar concorrente |
| UID/role/emissor/aceite/geração/expiração/revogação/reenvio/idempotência/última vaga/isolamento/escalada/suspensão/auditoria/UI de convites | TODO validação | Sem execução concluída disponível na branch recuperada | Recuperar código e rodar casos; não presumir PASS |
| Demonstração integrada com marcas, owners e planos distintos | PASS incremental local | F6_DEMO.md;8 Auth/Rules+10 E2E1440/320; remoto54a7587 | Equipes completas/convites após sync; demo hospedada não criada |
| Vagas públicas respeitam teto comercial | PASS incremental local | PUBLIC_COMMERCIAL_AVAILABILITY.md;45 testes+26 E2E1440/320; remoto0d76e34 | Gate F6 em quatro larguras |
| Landing SaaS e onboarding comercial explicados | PASS incremental / BLOCKED contato | COMMERCIAL_LANDING.md;4 E2E320/375/768/1440, visual1440/320 | Regressão final com lazy loading e contato oficial |
| Regressão integral SDK/Rules/Auth/Storage/E2E e responsividade | IN_PROGRESS |216 SDK/Rules+13 roteamento+8 Auth+6 Storage PASS; CLOUD_REGRESSION.md |148 E2E em execução; resultado não aprova convites ausentes |
| Produção/Ítalo, F7 staging/release e F8 homologação | BLOCKED externo | CLIENT_PRESERVATION_ITALO_2026-10-16.md e RELEASE_AND_ROLLBACK.md | Backup real/restore, staging, autorizações e homologação; nenhum deploy autorizado |

## Retomada e checkpoints

Recuperação: branch correta, origin oficial HTTPS, checkout limpo e HEAD65f8facd4a8bf93c351666567668bbaa8b9ccaf9, sem commits novos desde65f8fac. Nenhum dado real foi consultado ou alterado. Os backups de código citados no histórico não são prova de backup dos dados do cliente.

O push HTTPS usa identidade Nevez06 sem permissão (403). Checkpoints foram publicados pelo conector CristianoRFB com tree SHA idêntico ao commit local, parent remoto exato, update_ref com expected_sha e force=false. Commits locais originais preservados em branches checkpoint/cloud-*. Nenhum merge, force push ou troca por main.
