# F6 — matriz de aceite comercial

**IN_PROGRESS — gate integral em execução.** Código IMPLEMENTED; aceite atual local/sintético, não homologação remota. Recuperado bc2c3d1 em2026-10-20, branch `codex/caravana77-commercial-v1-20261016`; WIP do LAB04-PC23 ausente e não testado. A instrução atual autorizou implementar equipe no Cloud e aceita contato neutro configurável. Checkpoint9dabaa1 preservado no remoto; não houve deploy/migração/escrita real.

O denominador desta matriz é **12 critérios obrigatórios agrupados das instruções atuais**, cada qual exige comportamento implementado e evidência concluída. Não representa conferência do GOAL original externo ausente nem produção pronta.

| # | Critério | Estado incremental | Evidência/contrato |
|---|---|---|---|
| 1 | Catálogo aprovado, atribuição manual Platform Owner, planos/limites/entitlements backend | PASS local anterior, regressão em execução | COMMERCIAL_ASSIGNMENT.md, commercial/platform suites |
| 2 | Quotas caravanas/reservas/CSV, concorrência, histórico em downgrade | PASS local anterior, regressão em execução | QUOTA_OPERATIONS.md, PASSENGER_QUOTAS.md, escala400+replay |
| 3 | Convite UID/papel/emissor autorizados; aceite pelo destinatário e consistência membership/diretório | PASS incremental local | TEAM_INVITATIONS.md; SDK completo válido e forjado,13 casos iniciais+resolver |
| 4 | Pendente/aceito/revogado/expirado, validade, reenvio/geração, idempotência e auditoria imutável | PASS incremental local | team-invitations.integration; team.spec reenvio/expiração/replay |
| 5 | Quota de equipe, disputa última vaga, pendentes no limite, suspensão/downgrade, último owner | PASS incremental local | 34 testes direcionados;8 E2E desktop1440/mobile320 |
| 6 | Isolamento A×B, global/staff sem escalada, revogação imediata e autorrevogação | PASS incremental local | SDK/Rules e E2E com contas Auth emuladas distintas; confirmação direta de membership após autoalteração |
| 7 | Demonstração integrada A×B, marcas e planos/equipes distintos | PASS local anterior, ampliada por convites | F6_DEMO.md; demo Auth/E2E e disputa A com owner de B |
| 8 | Onboarding assistido da primeira organizadora, namespace protegido, identidade e operação comercial global | PASS local anterior, regressão em execução | COMMERCIAL_ONBOARDING.md, NAMESPACE_PROTECTION.md, platform/commercial/branding |
| 9 | Disponibilidade pública consistente com limites e preservação de retries | PASS local anterior, regressão em execução | PUBLIC_COMMERCIAL_AVAILABILITY.md, public-availability/reservation |
| 10 | Landing /saas, condições aprovadas e contato neutro configurável | PASS local anterior | COMMERCIAL_LANDING.md; sem contato do cliente, sem preços novos |
| 11 | UI equipe/painel e jornadas públicas em desktop/mobile | IN_PROGRESS quatro larguras |8 E2E específicos1440/320 PASS; gate164 E2E320/375/768/1440 a executar |
| 12 | Regressão completa unit/integration/Rules/Auth/Storage/E2E; lint/typecheck/build e operação documentada | IN_PROGRESS | docs/evidence/2026-10-20/gate-*.log e gate-execution.json |

O gate F6 só será PASS após fechamento das execuções. Falhas iniciais de guards/expressões, seletores/fixtures e autorrevogação estão preservadas nos logs e explicadas em TEAM_INVITATIONS.md; nenhuma foi contada como teste aprovado. A nova regra de equipe substitui concessão direta por convite e aceite, sem alterar membros ou contadores reais.

## Limites de implantação

Nenhuma Rule/índice/Config Auth implantada, nenhuma organização real modificada. Staging Firebase independente, backup protegido/restauração real e compatibilidade legada seguem BLOCKED em F7_PREPARATION.md. A prévia estática é artefato separado, LOCAL_TESTED, publicação BLOCKED403; não é staging SaaS. Contato oficial ainda pode ser configurado futuramente sem inventar destino. GOAL original externo não foi localizado; a matriz usa requisitos atuais verificáveis.
