# F8 — homologação e barreiras de publicação

IN_PROGRESS para evidências locais; **BLOCKED para homologação remota e produção**. A autorização condicional do usuário de2026-10-20 é suficiente quando todos os14 gates estiverem comprovados; não há solicitação de confirmação rotineira pendente. Não converter UNKNOWN em PASS.

## Níveis de evidência

| Nível | Estado da candidata |
|---|---|
| IMPLEMENTED | F0–F6 implementados; contratos e UI de equipe incluídos |
| LOCAL_TESTED | F0–F5 preservados; equipe34 testes+8E2E; gate integral F6 em execução |
| STAGING_VERIFIED | BLOCKED; emuladores e prévia estática não equivalem a staging backend |
| PRODUCTION_DEPLOYED | Nenhuma publicação desta candidata; deployment anterior4d069e0a identificado em leitura |
| PRODUCTION_VERIFIED | BLOCKED para candidata e homologação integral; somente metadados/assets públicos antigos conferidos |
| BLOCKED | Firebase administrativo, staging, backup/restore, configuração real/legado e retorno coordenado |

## Os14 gates definidos pelo usuário

| # | Gate | Estado | Evidência/condição faltante |
|---|---|---|---|
| 1 | F6 PASS | IN_PROGRESS | F6_ACCEPTANCE.md; fechar regressão ampliada |
| 2 | F7 aplicável concluída | BLOCKED |5/10 categorias de auditoria identificadas; configuração privada/backup/legado desconhecidos |
| 3 | Testes essenciais sem falhas ignoradas | IN_PROGRESS | gate-execution.json;8E2E direcionados e34 testes PASS, regressão completa pendente |
| 4 | Staging isolado aprovado | BLOCKED | Sem Firebase isolado administrativo; prévia estática não valida backend |
| 5 | Backup real e restauração isolada verificados | BLOCKED | Nenhum export protegido/completo/recuperável e restore real comprovados |
| 6 | Compatibilidade frontend/Rules/índices/Auth | BLOCKED | Configuração implantada atual e ensaio coordenado ausentes |
| 7 | Fluxos legados do Ítalo preservados | BLOCKED para release | Nenhuma escrita real nesta execução; corpus sintético não prova compatibilidade dos dados reais |
| 8 | Nenhuma migração destrutiva necessária | BLOCKED comprovação real | Nenhuma migração executada/proposta; dependências de baselines/memberships/namespaces reais ainda não verificadas |
| 9 | Nenhuma modificação/operação financeira real | PASS do escopo executado | Somente testes sintéticos e GET público/Cloudflare; nenhum documento/Auth/Rule/objeto real modificado |
| 10 | Rollback testado e aplicável | BLOCKED | Deployment antigo identificado; retorno coordenado e restore real não ensaiados |
| 11 | Credenciais/configuração de produção corretas | BLOCKED | CLI Firebase sem contas, gcloud ausente; conector Pages GET funciona, upload assets403 |
| 12 | Nenhum custo novo não autorizado | BLOCKED para release completo | Nenhum custo/upgrade criado; custo/limites de staging/backup Firebase ainda não identificados |
| 13 | Ausência de falhas críticas de segurança | BLOCKED no ambiente real | Cobertura sintética ampliada; Rules atuais, IAM/tokens Storage e Auth reais não auditados agora |
| 14 | Evidências e SHA registrados | PASS checkpoint local |9dabaa1 e branches de preservação; relatório final e manifesto registrarão candidato final |

Até fechar a regressão,2/14 gates integralmente comprovados (itens9 e14), ou14% deste denominador. Não é percentual de prontidão comercial/produção; desconhecidos mantêm publicação bloqueada. Atualizar contagem após resultados finais.

## Jornadas e operação

A matriz F6 e suites baseline/reservation/operations/import/documents/finance-ledger/branding/commercial/platform/demo/team cobrem jornadas públicas/administrativas, A×B, planos/marcas/equipes, relatórios/Financeiro Geral, revogação, isolamento, privacidade e responsividade nas larguras320/375/768/1440. A regressão desta candidata está em execução e só contará após resultado final.

Contratos/limitações em TEAM_INVITATIONS.md, QUOTA_OPERATIONS.md, PASSENGER_QUOTAS.md, COMMERCIAL_ASSIGNMENT.md, COMMERCIAL_ONBOARDING.md, STORAGE_PRIVACY.md e RELEASE_AND_ROLLBACK.md. Convites são por UID de conta existente, sem entrega por e-mail; aceite explícito, até7 dias, sem reserva de vaga. Não há cobrança automática/annual novo/trial público inventado. Contato comercial neutro é configurável. Domínios/aliases reais dependem de validação do ambiente. Histórico não é apagado em downgrade.

## Continuidade estritamente necessária

Disponibilizar acesso administrativo efetivo e destino Firebase isolado dentro dos custos autorizados; capturar Rules/Auth/índices/IAM atuais em leitura, conferir inventário e dependências legadas sem inventar registros; produzir backup protegido com completude/integridade e restore isolado; homologar candidato coordenado e rollback. Só então atualizar os14 gates e publicar automaticamente se todos forem PASS. Nenhuma migração real do Ítalo será executada neste fluxo. Para a prévia comercial isolada, falta credencial efetiva de upload Pages; não usar produção como atalho.
