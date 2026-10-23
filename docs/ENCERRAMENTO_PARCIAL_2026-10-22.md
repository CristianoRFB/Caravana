# Checkpoint de encerramento da rodada — 22/10/2026

**Checkpoint consolidado em23/10/2026; GOAL integral incompleto.** O proprietário solicitou commit e continuidade após este checkpoint. Staging homologado, sem cutover e sem escrita de dados/configuração na produção do Ítalo. **DEMO_READY; COMMERCIAL_READY_NEW_TENANTS: NO-GO operacional; READY_FOR_ITALO_MIGRATION: NOT_READY; ITALO_NOT_MIGRATED.**

## Repositório e checkpoints

Checkout de trabalho: `C:/Users/Aluno/.codex/worktrees/caravana77-commercial-v1-20261016/Caravana`. Repositório [CristianoRFB/Caravana](https://github.com/CristianoRFB/Caravana), branch `codex/caravana77-commercial-v1-20261016`. Checkout original `C:/xampp/77/Caravana`, main `10f30a0`, preservado com seu WIP; não houve stash/reset/force/merge na main. Worktree recuperado de `ab4aff1` e atualizado por fast-forward até `2ceea1b` antes das alterações.

| Commit enviado | Entrega |
|---|---|
| [7b99a47](https://github.com/CristianoRFB/Caravana/commit/7b99a47) | Bytes canônicos LF e reconciliação/rollback restritos das Rules de staging |
| [bc5dd40](https://github.com/CristianoRFB/Caravana/commit/bc5dd40) | Patches de ferramentas, testes isolados e compensação das jornadas fictícias; fonte do frontend homologado |
| [a176c2a](https://github.com/CristianoRFB/Caravana/commit/a176c2a) | Inventário de produção limitado e sanitizado em sessão privada |
| [d4f68f8](https://github.com/CristianoRFB/Caravana/commit/d4f68f8) | Consumidor Auth exato, metadados UID e reconciliação financeira sem valores divulgados |
| [ee3f5b5](https://github.com/CristianoRFB/Caravana/commit/ee3f5b5) | Snapshot consistente de inventário e listagem direta de buckets GCS |
| [0460cb2](https://github.com/CristianoRFB/Caravana/commit/0460cb2) | Ensaio sintético de criptografia age, sem arquivos de chave/dados brutos |

O commit documental que contém este relatório é o checkpoint final desta rodada. HEAD técnico verificado pelo CI: `ee3f5b5bb28b640b2569fe65dbadc59f7a2fbbed`. Alterações posteriores são evidências/documentação e o ensaio Go independente; não atribuir a elas outro SHA de execução do aplicativo.

## Staging realmente homologado

Firebase `bdall-e3585`, número `146882624278`; Pages `caravana77-staging`, [URL canônica](https://caravana77-staging.pages.dev), deployment `6e1a652a-dc4e-412e-9177-909ab35f598f`, fonte `bc5dd40e3e885ecea6a668203b7a6407db5a7b46`. Publicação em22/10 às19:32UTC. Os12 assets, manifesto, HTML e cabeçalhos públicos foram conferidos contra o pacote local; pacote15 arquivos, sem configuração de produção no bundle. Build/UI offline8 verificações PASS.

Auth administrativo PASS: Email/Password ativo, anônimo desabilitado, proteção contra enumeração ativa, senha ENFORCE/mínimo12 e domínio staging autorizado. Índices11/11 READY, hash `63d6eb0d3ccae2def9399f9a4fbe91b1e051ce4bc7373b39e3940f7efc835238`.

Rules: diferença exclusivamente CRLF→LF resolvida; SHA bruto canônico `8acafe757210277ea96c3700813c064537622d44f0cfd7f6a141de059ed58c0f`,126808bytes. Release final `projects/bdall-e3585/rulesets/a1f3db69-af56-41d4-8010-89b7c1e40c21`; auditoria estrita PASS às19:21:09UTC. Guard não foi relaxado. Rollback real à release anterior `3ef0e36d-c0cb-4646-9cac-bf6c593f0107` e novo avanço foram executados. Um503 Auth ocorreu **depois** do segundo avanço; a leitura posterior confirmou o estado sem repetir mutação incerta.

SDK remoto:17/17 jornadas funcionais PASS e1 readonly PASS, sem bypass administrativo. Abrange os três planos, isolamento A×B, reservas/retry/quotas, convites/revogação, documentos/menor, financeiro, CSV/rollback, suspensão/reload, relatórios Pro e roteiros Premium. A compensação cancelou reservas da rodada, anulou o pagamento fictício por evento e revogou os links; histórico não apagado. Baseline A retornou a3 vagas e7500centavos fictícios; B0/0; nove eventos financeiros anteriores mantiveram seus hashes, com13 após lançamentos/compensações.

Navegador real:12 verificações de layout em320/375/768/1440, isolamento Financeiro B, relatórios Pro/CSV sem campos pessoais, restrições de plano e histórico; tarefas/arquivamento Premium revertidos e persistência conferida. Sem erro de console observado nessa homologação. Capturas iniciais mostraram frames antigos do navegador e foram descartadas; capturas válidas estão identificadas em `master/` e na [galeria de telas](../README_TELAS.md). Catálogo documental cobre os32 padrões de rota.

Rollback frontend real: canônico voltou de `6e1a652a…` para `175b982d-91c1-4c73-8b8c-a46af5db1ade`/fonte `8c1340d`;12 assets antigos PASS. Retornou a `6e1a652a…`/`bc5dd40`;12 assets PASS e baseline SDK novamente preservado. Isso comprova retorno de artefatos de staging; não restaura dados/Auth legados.

## Testes locais e CI

| Verificação | Resultado / alcance |
|---|---|
| Segurança local |56/56 PASS |
| Guards Python finais |47/47 PASS; snapshot/readTime, allowlists e ausência de saída bruta |
| Regressão local após patches |296PASS/2FAIL em298; falhas de ambiente herdado no teste de configuração; histórico preservado |
| Correção direcionada dessa falha |9/9 PASS, ambiente isolado no teste e negativa explícita de conflito com produção |
| Build staging, lint e tipos |PASS, incluindo tipos dos harnesses |
| Runtime npm audit |0 vulnerabilidades |
| Tooling npm audit |8→5 entradas após Vitest5.0.3/ip-address10.7.4;3high/2moderate restantes |
| CI7b99a47 |[39838561087](https://github.com/CristianoRFB/Caravana/actions/runs/39838561087) integral PASS, limitado a seu SHA |
| CIee3f5b5 |[39845244031](https://github.com/CristianoRFB/Caravana/actions/runs/39845244031); PASS integral:299 backend/Rules,8Auth,6Storage,47Python e184E2E; etapas e SHA em `evidence/2026-10-22/master/final-ci.json` |
| CIs intermediários |bc5dd40/a176/d4 substituídos por novos pushes; cancelamento não conta como PASS |
| Criptografia sintética privada |age1.3.2,8/8 verificações PASS, incluindo SHA idêntico, chave errada, adulteração, truncamento e bytes extras |
| Produção pós-cutover |NOT_RUN: não houve cutover |

O workflow completo foi deixado concluir para a revisão técnica final. Checkpoints puramente documentais usam `[skip ci]` para não repetir/cancelar a suíte sem mudança correspondente do aplicativo.

## Inventário real e segurança do backup

Leituras legítimas em Cloud Shell da identidade exata de produção, sem credenciais copiadas ao PC da faculdade. Alvo `caravana-af306`, número `742921744156`, billing=false, nenhuma conta vinculada, Firestore STANDARD/freeTier. Rules legadas preservadas: SHA `fe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b`,25756bytes;2/2 índices READY.

Snapshot consistente Firestore em `2026-10-22T20:02:04.649774Z`:24 documentos,39 requisições de inventário,125278bytes de payload estimado. Coleções:1 organização,1 caravana,10 inscrições,8 pagamentos,2 admins,1 comprovante e1 recibo de reserva. Nenhuma referência ausente/cruzada de organização/caravana e nenhum campo monetário inválido identificado pelos guards implementados. Dois usuários Auth, ambos password; dois admins correspondem aos dois UIDs existentes. A API Auth respondeu após selecionar o consumidor exato no GET específico; não houve IAM, API ou configuração global alterados. Configuração de hash de senha está legível, mas hashes/chaves não foram exportados nem expostos.

Reconciliação:8 totais armazenados concordam com pagamentos,0 divergências,2 inscrições sem total armazenado verificável,0 pagamentos órfãos/não verificáveis. Não equivale a conciliação bancária nem prova de preservação após migração. Listagem GCS completa:0 buckets; nenhum bucket padrão configurado. Firebase Storage API retorna403 SERVICE_DISABLED no próprio projeto; permanece desativada. Inventário não encontrou referências externas Storage nem PDF inline pelos padrões verificados; o conteúdo do documento de comprovante não foi publicado. Todo o payload permaneceu na RAM do processo privado, com swap ausente e core dump desabilitado; arquivos brutos criados:0.

Drive: pasta privada vazia criada na conta Google aprovada, proprietário conferido, painel “Só você tem acesso”,387,13GB livres de400GB. Conta distinta do conector Drive foi descartada para gravações. ID privado da pasta não está neste repositório. **Nenhum backup real existe ainda e nenhum arquivo real foi enviado.**

Limitação específica: a chave privada de recuperação ainda não existe sob custódia exclusiva comprovada do proprietário. Uma chave criada/digitada no computador compartilhado não atende ao requisito definido. O ensaio age é sintético e não fecha esse gate. A segurança do processo remoto foi verificada no escopo indicado; não certifica a integridade física/administrativa do computador compartilhado.

### Proposta única para destravar o backup

No dispositivo pessoal confiável do proprietário, usar o [age oficial](https://github.com/FiloSottile/age) para gerar a identidade privada e manter uma cópia de recuperação sob sua custódia. Fornecer à operação **somente o destinatário público `age1…`**; nunca a identidade `AGE-SECRET-KEY…`, senha ou código. O exportador deverá cifrar em streaming no Cloud Shell privado, sem arquivo bruto; somente `.age` e manifesto não sensível poderão transitar pelo PC para a pasta Drive já aprovada. Antes de considerar o backup válido, baixar novamente o ciphertext, comparar SHA e demonstrar restauração isolada real no ambiente privado autorizado, com a chave usada pelo proprietário em seu dispositivo confiável.

Exportador completo, abrangência dos dados/Auth/artefatos, destino de restauração e procedimento de conferência ainda precisam ser concluídos e validados; este relatório não afirma que a exportação já foi implementada. Não há pedido de segredo pelo chat nem de novo login. Nenhuma alternativa improvisada receberá dados reais.

## Gates vigentes e o que falta

| Escopo | Estado | Por que não está completo / próxima condição |
|---|---|---|
| F0–F6 |Aceites locais/sintéticos preservados |Não transformados em homologação do legado |
| F7 preparação |9/10 |Abuso no backend, alertas ativos e risco residual de tooling ainda não fechados |
| F8 publicação |6/14 |Gate4 staging passou; backup/restore, legado, migração não destrutiva, retorno coordenado e segurança operacional pendentes |
| GOAL final |7/17 |Gate4 staging passou; inventário é estrutural e parcial para a migração, demais provas reais abaixo pendentes |
| Desenvolvimento técnico |17/20 grupos,85% no método histórico |Sem média com gates de produção |
| Novos tenants |NO-GO operacional |Falta fechamento F7 operacional e recuperação efetivamente operável; não depende automaticamente do cutover do Ítalo |
| Ítalo |NOT_READY / ITALO_NOT_MIGRATED |Backup, restore, compatibilidade, financeiro completo, migração fiel e rollback real não comprovados |

Pendências ordenadas: (1) custódia da chave pública/privada fora do laboratório; (2) implementar/validar backup completo e restauração privada incluindo Auth; (3) explicar/tratar sem perda as duas inscrições sem total verificável, comprovar bytes/comprovantes/links e mapear schema/backfill; (4) ensaiar compatibilidade e rollback conjunto frontend/Rules/índices/Auth/dados; (5) fechar proteção contra abuso, alertas/canal/responsável e advisories; (6) acordar janela de manutenção e prevenção de escritas concorrentes; (7) só então emitir READY e executar cutover/pós-corte autorizado. Nenhum índice, API, billing ou produção foi alterado para contornar esses gates.

Decisão humana mínima: estabelecer a chave em dispositivo próprio; posteriormente, definir a janela e eventual comunicação ao cliente. A autorização geral do GOAL e da pasta Drive já foi dada e não precisa ser repetida. O próximo passo único do backup é receber apenas o destinatário público gerado no dispositivo confiável, após o proprietário aceitar esta proposta concreta.

R$0 em ações executadas: sem Blaze, novo projeto pago ou billing. Proteções restantes e cinco entradas de audit de ferramentas são riscos abertos, não um aceite comercial. Produção Pages continua no deployment histórico `4d069e0a-344a-415a-ae41-aa314df10ace`; nenhum deploy de produção nesta rodada.

## Evidências

Pasta [evidence/2026-10-22/master](evidence/2026-10-22/master), incluindo Rules antes/depois/rollback,47 guards,17 jornadas SDK,baseline antes/depois,health dos dois retornos frontend,aceite do navegador,inventário transcrito sanitizado,ensaio criptográfico e CI final. [README_TELAS.md](../README_TELAS.md) contém as32 rotas e a galeria. Os relatórios de terminal foram transcritos explicitamente como observações; não são dumps de dados de produção.
