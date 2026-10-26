# Monitor e F7 — prova real parcial de 26/10

Fonte do aplicativo público observada: `67ce0328d7bf1b7395e71627cdc85c88667c77ec`. Sonda `caravana77-staging-monitor` apenas; nenhum deploy, teste de falha ou alteração de política/cron. Acesso pelo conector Cloudflare existente, com retorno sanitizado sem endereços destinatários ou corpo de e-mail.

| Verificação | Resultado | Prova |
|---|---|---|
| Seletor de sucesso JSON | PASS real | monitor-config.json: `attributes['event'] = 'STAGING_PROBE_PASS'`, conta/script exatos |
| Cron | PASS real | `*/15 * * * *`, última alteração 23/10 21:07:36Z |
| Políticas | PASS configuração | Ambas enabled, avaliação 15m, repetição 1h, 1 destinatário cada. Identidade do destinatário não reconfirmada nesta sessão; aprovação histórica preservada |
| Sinal de vida | PASS janela observada | 26/10 15:15–16:15 UTC (12:15–13:15 São Paulo): 4 sucessos/0 erros; janela maior que os 45m de avaliação |
| START/END da falha da sonda | PASS histórico | 23/10 17:10:48Z/17:25:49Z; apenas reconferidos no histórico, sem perturbação nova |
| END após correção do sinal de vida | PENDING/UNKNOWN | Histórico completo 9 registros/1 página, 7 das duas políticas, nenhum END de heartbeat; último START falso 23/10 21:02:32Z |
| Novos falsos disparos após correção | Nenhum observado no histórico retornado | Não demonstra por si só resolução/saúde do mecanismo de avaliação |
| Free/$0 atual | UNKNOWN administrativo | subscriptions 403 por limitação OAuth. Prova do painel em 23/10 preservada; nenhuma mudança de plano ou nova concessão |
| Frontend público | PASS limitado | GET login + release.json com headers/manifesto válidos; não é backend funcional/SDK |

A primeira filtragem de histórico por ID sem hífens retornou zero; o endpoint fornece policy_id com hífens. Consulta corrigida normalizou os IDs e reconferiu a página completa. Não interpretar esse zero inicial como ausência de alertas. Uma tentativa agregada `countIf(attributes...)` foi recusada 422 pela SQL API; consultas COUNT com predicados separados deram 200 e os resultados acima. Nenhum dado de negócio foi solicitado. Consultas SQL via POST foram leituras, não mutações de infraestrutura.

O tempo desde a correção já excede a janela; não há justificativa para declarar PASS por mero decurso de tempo. Critério exato restante: evidência sanitizada de END/resolved da política de heartbeat posterior à correção, ou estado/evaluations oficiais que comprovem a transição automática, correlacionada à política e a uma janela íntegra de sucessos. Se o provider reinicializou estado após editar o seletor, essa hipótese precisa de prova oficial; ausência de lembretes não basta. Não repetir START/END nem provocar indisponibilidade para fabricar evidência. Preservar PENDING até essa prova, sem poluir outro serviço ou ampliar escopos.

F7 preparação permanece **9/10**, F7 operacional integral aberto. Proteção de abuso/backend, App Check autorizado, advisories residuais, custódia e recuperação reais não fecham pelo uptime público. Evidências antigas de entrega START/END na conta aprovada não são revalidação de nova identidade/canal.

Arquivos: `monitor-config.json`, `monitor-history.json`, `monitor-window.json`, `public-probe.json`. Billing: nenhum recurso/upgrade/termo acionado, nenhuma permissão adicional solicitada. Não foi consultado Gmail nem outro conteúdo pessoal para esta verificação.
