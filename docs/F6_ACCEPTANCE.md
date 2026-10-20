# F6 — matriz de aceite comercial

**PASS — LOCAL_TESTED, 12/12 critérios (100% neste escopo).** Candidata de runtime `9c0c45d3c6a2bd6e0edbb435cb0be24ebaad23e7`, branch oficial preservada.244 unit/integration/Firestore Rules (inclui15 casos de convites e13 do runner),8Auth e6Storage PASS; lint/typecheck/build PASS. E2E: gate inicial162 PASS/2 FAIL, corrigido somente o sincronismo dos diálogos no teste financeiro;12/12 financeiros nas quatro larguras PASS. Consolidado164/164 casos únicos PASS,0 falhas pendentes, sem retry. Não foi uma execução única164 PASS: ver f6-e2e-consolidated.json, gate-e2e.log e finance-final-report.json.

WIP do LAB04-PC23 não foi recuperado/testado; implementação Cloud autorizada pela instrução atual. Nenhuma escrita real/deploy do SaaS/migração. Prévia visual separada publicada e verificada, sem backend. Este aceite não é homologação de staging/produção.

O denominador desta matriz é **12 critérios obrigatórios agrupados das instruções atuais**, cada qual exige comportamento implementado e evidência concluída. Não representa conferência do GOAL original externo ausente nem produção pronta.

| # | Critério | Estado incremental | Evidência/contrato |
|---|---|---|---|
| 1 | Catálogo aprovado, atribuição manual Platform Owner, planos/limites/entitlements backend | PASS local | COMMERCIAL_ASSIGNMENT.md, commercial/platform suites |
| 2 | Quotas caravanas/reservas/CSV, concorrência, histórico em downgrade | PASS local | QUOTA_OPERATIONS.md, PASSENGER_QUOTAS.md, escala400+replay |
| 3 | Convite UID/papel/emissor autorizados; aceite pelo destinatário e consistência membership/diretório | PASS local | TEAM_INVITATIONS.md; SDK completo válido e forjado,13 casos iniciais+resolver |
| 4 | Pendente/aceito/revogado/expirado, validade, reenvio/geração, idempotência e auditoria imutável | PASS local | team-invitations.integration; team.spec reenvio/expiração/replay |
| 5 | Quota de equipe, disputa última vaga, pendentes no limite, suspensão/downgrade, último owner | PASS local | 34 testes direcionados;8 E2E desktop1440/mobile320 |
| 6 | Isolamento A×B, global/staff sem escalada, revogação imediata e autorrevogação | PASS local | SDK/Rules e E2E com contas Auth emuladas distintas; confirmação direta de membership após autoalteração |
| 7 | Demonstração integrada A×B, marcas e planos/equipes distintos | PASS local | F6_DEMO.md; demo Auth/E2E e disputa A com owner de B |
| 8 | Onboarding assistido da primeira organizadora, namespace protegido, identidade e operação comercial global | PASS local | COMMERCIAL_ONBOARDING.md, NAMESPACE_PROTECTION.md, platform/commercial/branding |
| 9 | Disponibilidade pública consistente com limites e preservação de retries | PASS local | PUBLIC_COMMERCIAL_AVAILABILITY.md, public-availability/reservation |
| 10 | Landing /saas, condições aprovadas e contato neutro configurável | PASS local | COMMERCIAL_LANDING.md; sem contato do cliente, sem preços novos |
| 11 | UI equipe/painel e jornadas públicas em desktop/mobile | PASS local |16 E2E de equipe no gate nas quatro larguras PASS;164 casos únicos consolidados PASS |
| 12 | Regressão completa unit/integration/Rules/Auth/Storage/E2E; lint/typecheck/build e operação documentada | PASS local |244+8Auth+6Storage;164 E2E consolidados; logs gate-* e relatório consolidado |

O gate F6 está fechado no escopo local. Falhas iniciais de guards/expressões, seletores/fixtures e autorrevogação estão preservadas nos logs e explicadas em TEAM_INVITATIONS.md; nenhuma foi contada como teste aprovado. A nova regra de equipe substitui concessão direta por convite e aceite, sem alterar membros ou contadores reais.

## Limites de implantação

Nenhuma Rule/índice/Config Auth implantada, nenhuma organização real modificada. Staging Firebase independente, backup protegido/restauração real e compatibilidade legada seguem BLOCKED em F7_PREPARATION.md. A prévia estática é artefato separado publicado e smoke verificado em https://caravana77-commercial-preview.pages.dev/saas; o403 inicial foi resolvido pelo fluxo oficial de token temporário de upload. Não é staging SaaS. Contato oficial ainda pode ser configurado futuramente sem inventar destino. GOAL original externo não foi localizado; a matriz usa requisitos atuais verificáveis.

## Evidência e interpretação do gate

O trace financeiro mostrou o segundo prompt sem handler de aceite: seu listener era registrado apenas após await do primeiro accept. Handler único registrado antes da ação corrigiu o teste, mantendo assertions de recebimentos, auditoria, motivo e reload; Financeiro Geral não foi alterado. O log completo preserva as duas falhas, resolvidas pela suíte financeira12/12. A rodada financeira substituiu o JSON temporário do Playwright; a consolidação usa explicitamente o log integral164 e o JSON financeiro final, sem recriar um relatório bruto inexistente. São152 casos inalterados reutilizados mais12 financeiros revalidados, total164 únicos.

A fonte de runtime/Rules não mudou desde9c0c45d. Após o gate houve somente correção do harness financeiro, comando direcionado e suporte de proxy no verificador da prévia; candidate-source-manifest.json registra hashes e diferenças. Capturas de equipe são incrementais da rodada8 E2E, anteriores ao ajuste de padding; responsividade final foi exercitada pelo gate nas quatro larguras. Capturas hosted da prévia correspondem ao deployment verificado. F7/F8 reais continuam BLOCKED.
