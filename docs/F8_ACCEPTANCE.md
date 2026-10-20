# F8 — homologação e barreiras de publicação

## Matriz vigente — staging funcional em 2026-10-20

F6 permanece PASS local. Staging funcional `bdall-e3585` + https://caravana77-staging.pages.dev, runtime `8b0dad3`, aceito no escopo sintético descrito em STAGING_BDALL.md. Produção permanece explicitamente protegida, independentemente de percentuais. A matriz abaixo substitui os estados históricos preservados adiante.

| # | Gate | Estado vigente | Evidência/limite |
|---|---|---|---|
| 1 | F6 PASS | PASS local | 12/12 critérios anteriores preservados |
| 2 | F7 aplicável concluída | BLOCKED release | Preparação isolada 8/10; CI remoto e observabilidade pendentes; inventário protegido 5/10 |
| 3 | Testes essenciais | PASS local | Aceites anteriores + regressões incrementais; rodada final registrada separadamente |
| 4 | Staging isolado | PASS sintético | 11 jornadas reais SDK sem bypass; UI A×B/financeiro/filtros/móvel e login com CSP |
| 5 | Backup real/restauração | BLOCKED produção | 153 documentos fictícios restaurados com fidelidade no emulador; nenhum backup de dados reais autorizado/comprovado |
| 6 | Frontend/Rules/índices/Auth | PASS staging | Artefatos coerentes no projeto isolado, índices READY e login/consultas reais; não é paridade de produção |
| 7 | Legado Ítalo | BLOCKED release | Nenhuma alteração real; integridade operacional dos registros reais não foi auditada |
| 8 | Migração não destrutiva comprovada | BLOCKED real | Planner/dry-run sintético preservados; namespaces/baselines reais não verificados nem criados |
| 9 | Sem operação financeira/modificação real | PASS escopo executado | Somente dados fictícios em bdall; nenhuma operação bancária nem escrita em caravana-af306 |
| 10 | Rollback aplicável | BLOCKED coordenado | Frontend staging voltou/avançou com documentos iguais; Rules/Auth/índices/dados reais não ensaiados |
| 11 | Credenciais/configuração de produção | BLOCKED | Login de staging não autoriza nem comprova configuração/IAM de produção |
| 12 | Sem custo novo não autorizado | PASS escopo executado | Spark, billing=false, sem conta vinculada; Pages estático separado; nenhum recurso pago ativado |
| 13 | Segurança completa para release | BLOCKED | Negativas A×B/global/staff e PDFs PASS; abuso/alertas/IAM/tokens legados pendentes; audit runtime zero, ferramentas 7 advisories abertos |
| 14 | Evidências/SHA | PASS checkpoint | e383b20 e 8b0dad3 enviados na branch; logs, manifestos e capturas reais preservados |

**7/14 gates têm evidência no escopo declarado (50%); sete gates de release continuam BLOCKED.** Não é 50% de prontidão comercial: três PASS dependem explicitamente do escopo staging/sintético e a publicação de produção segue proibida. Nenhum teste do emulador comprova integridade dos dados reais.

### Aceite remoto dirigido

11/11 SDK PASS: autenticação/planos/marcas/contadores; reserva idempotente; privacidade/negação A×B/global/visitante; onboarding completo; concorrência de quota e arquivamento; PDF privado com limites; ledger fictício/check-in/reversão; CSV entre lotes/rollback; convite/revogação/último owner; suspensão/reload; autorização de menor/consentimento/embarque. Falhas iniciais do harness registradas em staging-sdk-summary.json, sem alteração permissiva para obter PASS.

Inspeção real do frontend: Financeiro A (3 passageiros fictícios, R$75 registrados), filtro Tudo/caravana; B zero e sem histórico A; Pro/limites próprios; catálogo/viagem B. Correção móvel confirmada em 320 px: largura útil 305, corpo/scrollWidth 305. PDFs ficam no Firestore existente; Storage remoto não habilitado. Capturas staging-finance-320-final.png / staging-finance-1440-final.png / staging-finance-b-final.png.

Próximos gates externos: credencial Actions para execução remota; canal comercial oficial aprovado; proteção contra abuso/monitoramento; inventário, backup real e compatibilidade legada em procedimento especificamente autorizado. Nenhuma alteração de produção será inferida de um aceite de staging.

## Histórico anterior ao staging funcional

Atualização vigente2026-10-20: configuração/homologação autorizadas exclusivamente no staging `bdall-e3585`, com R$0. Produção permanece protegida mesmo se os testes sintéticos passarem. Configuração isolada já verificada, mas gate funcional de staging ainda IN_PROGRESS; não modificar os14 gates antes das respectivas evidências. Ver STAGING_BDALL.md. A autorização condicional histórica abaixo não substitui a restrição atual de produção.

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
