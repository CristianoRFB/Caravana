# F8 — homologação e barreiras de publicação

IN_PROGRESS para evidências locais; **BLOCKED para homologação remota e produção**. A autorização condicional do usuário de2026-10-20 é suficiente quando todos os14 gates estiverem comprovados; não há solicitação de confirmação rotineira pendente. Não converter UNKNOWN em PASS.

## Níveis de evidência

| Nível | Estado da candidata |
|---|---|
| IMPLEMENTED | F0–F6 implementados; contratos e UI de equipe incluídos |
| LOCAL_TESTED | F0–F6 PASS local;244 testes+8Auth+6Storage+164 E2E únicos consolidados, sem falhas pendentes |
| STAGING_VERIFIED | BLOCKED; emuladores e prévia estática não equivalem a staging backend |
| PRODUCTION_DEPLOYED | Nenhuma publicação desta candidata; deployment anterior4d069e0a identificado em leitura |
| PRODUCTION_VERIFIED | BLOCKED para candidata e homologação integral; somente metadados/assets públicos antigos conferidos |
| BLOCKED | Firebase administrativo, staging, backup/restore, configuração real/legado e retorno coordenado |

## Os14 gates definidos pelo usuário

| # | Gate | Estado | Evidência/condição faltante |
|---|---|---|---|
| 1 | F6 PASS | PASS local | F6_ACCEPTANCE.md;12/12 critérios e regressão consolidada |
| 2 | F7 aplicável concluída | BLOCKED |5/10 categorias de auditoria identificadas; configuração privada/backup/legado desconhecidos |
| 3 | Testes essenciais sem falhas ignoradas | PASS local |244+8Auth+6Storage;164 E2E consolidados após12 financeiros PASS;2 falhas do harness resolvidas, sem retry |
| 4 | Staging isolado aprovado | BLOCKED | Sem Firebase isolado administrativo; prévia estática não valida backend |
| 5 | Backup real e restauração isolada verificados | BLOCKED | Nenhum export protegido/completo/recuperável e restore real comprovados |
| 6 | Compatibilidade frontend/Rules/índices/Auth | BLOCKED | Configuração implantada atual e ensaio coordenado ausentes |
| 7 | Fluxos legados do Ítalo preservados | BLOCKED para release | Nenhuma escrita real nesta execução; corpus sintético não prova compatibilidade dos dados reais |
| 8 | Nenhuma migração destrutiva necessária | BLOCKED comprovação real | Nenhuma migração executada/proposta; dependências de baselines/memberships/namespaces reais ainda não verificadas |
| 9 | Nenhuma modificação/operação financeira real | PASS do escopo executado | Testes sintéticos, GET do ambiente existente e prévia estática independente; nenhum documento/Auth/Rule/objeto Firebase do cliente modificado |
| 10 | Rollback testado e aplicável | BLOCKED | Deployment antigo identificado; retorno coordenado e restore real não ensaiados |
| 11 | Credenciais/configuração de produção corretas | BLOCKED | CLI Firebase sem contas, gcloud ausente; conector Pages funciona e prévia estática publicada; sem credenciais Firebase administrativas |
| 12 | Nenhum custo novo não autorizado | BLOCKED para release completo | Nenhum custo/upgrade criado; custo/limites de staging/backup Firebase ainda não identificados |
| 13 | Ausência de falhas críticas de segurança | BLOCKED no ambiente real | Cobertura sintética ampliada; Rules atuais, IAM/tokens Storage e Auth reais não auditados agora |
| 14 | Evidências e SHA registrados | PASS checkpoint local |Candidata9c0c45d, manifesto de fonte, consolidação E2E e checkpoints com árvore conferida; WIP9dabaa1 não é release |

**4/14 gates comprovados (itens1,3,9,14), ou29% deste denominador.** Os demais10 permanecem BLOCKED, inclusive staging, backup/restore e legado. Não é percentual de prontidão comercial/produção; qualquer desconhecido mantém publicação bloqueada. A prévia visual separada foi efetivamente publicada e smoke verificado, com zero backend; não altera a contagem dos gates do SaaS.

## Jornadas e operação

A matriz F6 e suites baseline/reservation/operations/import/documents/finance-ledger/branding/commercial/platform/demo/team cobrem jornadas públicas/administrativas, A×B, planos/marcas/equipes, relatórios/Financeiro Geral, revogação, isolamento, privacidade e responsividade nas larguras320/375/768/1440. Resultados finais:244 testes,8Auth,6Storage e164 E2E únicos consolidados PASS. Ver F6_ACCEPTANCE.md para diferença entre rodada integral162/2 e financeira12/12; nenhuma falha foi omitida.

Contratos/limitações em TEAM_INVITATIONS.md, QUOTA_OPERATIONS.md, PASSENGER_QUOTAS.md, COMMERCIAL_ASSIGNMENT.md, COMMERCIAL_ONBOARDING.md, STORAGE_PRIVACY.md e RELEASE_AND_ROLLBACK.md. Convites são por UID de conta existente, sem entrega por e-mail; aceite explícito, até7 dias, sem reserva de vaga. Não há cobrança automática/anual novo/trial público inventado. Contato comercial neutro é configurável. Domínios/aliases reais dependem de validação do ambiente. Histórico não é apagado em downgrade.

## Continuidade estritamente necessária

Disponibilizar acesso administrativo efetivo e destino Firebase isolado dentro dos custos autorizados; capturar Rules/Auth/índices/IAM atuais em leitura, conferir inventário e dependências legadas sem inventar registros; produzir backup protegido com completude/integridade e restore isolado; homologar candidato coordenado e rollback. Só então atualizar os14 gates e publicar automaticamente se todos forem PASS. Nenhuma migração real do Ítalo será executada neste fluxo. Prévia comercial visual isolada entregue em https://caravana77-commercial-preview.pages.dev/saas, com token temporário oficial, hashes e smoke; não usar essa entrega como prova do backend ou da preservação real.

## Percentuais fundamentados F0–F8

| Fase | Percentual de evidência | Escopo/denominador e estado |
|---|---|---|
| F0 |100% local | Gate de recuperação/paridade aprovado historicamente; produção não homologada |
| F1 |100% local | Correções operacionais aceitas, preservadas pela regressão atual |
| F2 |100% sintético | Aceite core/segurança local preservado; aplicação real bloqueada |
| F3 |100% local | Gate operacional aprovado, incluindo escala400+replay, preservado |
| F4 |100% local | Aceite financeiro preservado;12 E2E financeiros finais nas quatro larguras PASS |
| F5 |100% local | Aceite branding/rotas/white-label preservado |
| F6 |100% local |12/12 critérios de F6_ACCEPTANCE.md PASS |
| F7 |50% da identificação |5/10 categorias do inventário de infraestrutura identificadas; release/staging BLOCKED |
| F8 |29% dos gates |4/14 barreiras de publicação comprovadas; homologação real BLOCKED |

As métricas têm denominadores declarados e não estimam prazo, esforço restante ou prontidão de produção. Histórico F0–F5 em CURRENT.md e respectivos aceites; não houve reinício dessas fases. O GOAL original externo permanece ausente; este fechamento usa requisitos atuais e contratos verificáveis.
