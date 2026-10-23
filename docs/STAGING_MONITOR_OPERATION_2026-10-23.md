# Monitor público ativo — validação operacional ainda parcial

Worker `caravana77-staging-monitor` criado no plano Free em23/10. Nenhum binding, credencial, rota pública ou preview. Código original testado de67ce032 restaurado17:05:35Z, deployment `c811092d02994866858acdc3ad979723`; etag `01f270fea9dce8542003327ab1a4bb6f2477a6a2251018c20a414e2f26c7bb1d`, idêntico ao primeiro upload revisado. Sonda limitada aos dois GET públicos do staging; produção/Firebase/dados do Ítalo não acessados.

Cron normal `*/15 * * * *` e avaliação dos dois monitores a cada15minutos reconferidos21:07Z. Configuração Wrangler reconciliada com esse agendamento. Políticas habilitadas, um destinatário conferido contra a escolha expressa do proprietário, repetição1h:

| Política | ID | Critério |
|---|---|---|
| Sinal de vida ausente |12ff55a597184d7e9b5bb08dcbcc238b|Média de sucessos em45m <=0|
| Falha da sonda pública |90f8a607522e48cbaa33588d0b532c5f|Média de erros em15m >0|

Os seletores incluem conta exata e `scriptName='caravana77-staging-monitor'`. Sucesso usa `attributes['event']='STAGING_PROBE_PASS'`; erro usa `level='error'`. Nenhum monitor global de outros serviços. [Configuração final sanitizada](evidence/2026-10-23/desktop/native-monitor-final-config.json).

## Execução real e ocorrência corrigida

Teste controlado restrito à sonda: exceção/log fixo, sem derrubar frontend ou acessar Firebase, cron/avaliação temporários1m. Limite inicial do teste foi estendido até17:15Z porque a documentação admite propagação de Cron por até15minutos. Antes desse limite, código original já havia sido restaurado17:05Z; etag conferido posteriormente. Os intervalos temporários permaneceram até a retomada21:07Z e foram então restaurados para15m.

Erros do teste observados por consulta restrita. Histórico da plataforma comprova START enviado17:10:48Z, resultado0.3, e END enviado17:25:49Z, resultado0, pela política de falha. Recebimento desses dois e-mails ainda deve ser conferido na caixa autorizada; envio da plataforma não substitui entrega final.

A consulta inicial de sinal de vida procurava o evento em `message`. Logs reais revelaram coluna vazia: JSON é extraído para atributos. Ela gerou alerta inicial recebido e lembretes falsos18:01,19:01,20:02 e21:02Z, embora a sonda tivesse recuperado. Esse resultado **não valida o controle final de sinal de vida**. Corrigido para chave JSON conforme [SQL API](https://developers.cloudflare.com/analytics/sql-api/sql-reference/data-types/#json-fields). Consulta corrigida comprovou43sucessos nos45minutos anteriores a21:08Z e0 na janela16:56–17:05Z antes da recuperação. Falta comprovar resolução automática após a correção e ausência de novo falso disparo.

Provas separadas: [configuração inicial histórica](evidence/2026-10-23/desktop/native-monitor-configuration.json), [execuções/START/END/limites](evidence/2026-10-23/desktop/native-monitor-observed-execution.json). Nenhum erro de filtro foi apagado do histórico ou chamado de PASS.

## R$0 e limites do aceite

[Observability](https://developers.cloudflare.com/observability/pricing/) informa consultas/alertas sem cobrança adicional e interrupção da ingestão no limite Free. Conta tinha0/5Cron antes da criação. Sem upgrade, billing, serviço de e-mail pago, armazenamento externo ou destino de dados real.

Este monitor mede frontend público; não substitui jornadas autenticadas, integridade de assets integral, erros Firebase, quotas ou controle de abuso backend. Responsável/canal definidos, publicação/agendamento e testes parciais executados; **F7 integral continua aberto**. Manter F7 preparação9/10, F8 6/14, GOAL7/17 e técnico17/20 até os gates próprios passarem. Backup/restauração/migração reais seguem pendentes, sem solicitação repetida da chave nesta sessão.
