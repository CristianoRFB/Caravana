# Restrição absoluta de orçamento — 23/10/2026

Verificações posteriores: [Cloudflare Observability](https://developers.cloudflare.com/observability/pricing/) declara consultas/dashboards/alertas sem cobrança adicional e interrupção da ingestão no limite Free, inclusive no modelo anunciado para01/12/2026. Workers Free tem limite de execução que interrompe requisições; conta conferida com0/5Crons antes da criação da sonda dedicada. [App Check preparado](STAGING_APPCHECK_PREPARATION_2026-10-23.md) agora tem caminho de custo documentado: Essentials sem billing retorna429 ao exceder quota mensal compartilhada. Essas provas reduzem a incerteza de custo; não comprovam disponibilidade ilimitada, alerta operacional integral ou ativação do provider. Permanecer Free/sem billing é pré-condição contínua.

O proprietário fixou **R$ 0 de orçamento máximo e total**. Essa instrução direta prevalece sobre qualquer proposta técnica anterior. Não autoriza upgrade, assinatura, teste convertido em cobrança, vínculo de faturamento, Blaze ou consumo com excedente faturável. Alertas de orçamento não substituem um teto que interrompa o serviço sem cobrança.

## Verificação realizada

O painel oficial da conta Cloudflare já conferida mostrou Workers **Free, $0, Current plan desabilitado**, em `/workers/plans`. O plano Paid aparece separadamente com botão Upgrade; nenhum upgrade foi acionado. A mesma página indica Email Sending indisponível no Free. Logo, não usar esse produto como solução gratuita de envio do monitor.

Essa leitura comprova o plano Workers exibido naquele momento; não é auditoria de todas as assinaturas da conta. Nenhuma assinatura, vínculo de billing ou novo recurso foi criado nesta verificação. O endpoint de subscriptions anteriormente recusou leitura por escopo insuficiente; não ampliar permissões para contornar isso.

As notificações Pages já configuradas estão incluídas em todos os planos e continuam com o teste de entrega comprovado no [relatório de alertas](F7_ALERTS_2026-10-23.md). Elas não representam monitor de uptime periódico. A preparação App Check continua desativada: assessments gratuitos com excedente cobrável não satisfazem por si sós este orçamento. Antes de ativação, comprovar ausência de cobrança e comportamento no limite; não habilitar billing para obter a funcionalidade.

## Critério para os próximos passos

- Usar somente recursos existentes ou gratuitos cuja configuração não permita faturamento adicional; comprovar limites e falha segura antes de ativar.
- Se uma dependência exigir plano pago ou não permitir garantir esse teto, manter somente essa dependência pendente e continuar as tarefas independentes.
- Não substituir proteção de dados por economia. Backup real continua dependente da chave pública e recuperação no Windows pessoal, conforme [guia preservado](BACKUP_KEY_WINDOWS_PERSONAL.md); sem exportação real, identidade improvisada ou cutover.

O CI público já iniciado permanece em execução; não disparar outro apenas para registrar esta restrição documental. F7 operacional, segurança contra abuso, backup/restauração reais e migração não estão concluídos. [Estado completo](CURRENT.md) e [catálogo das telas](../README_TELAS.md).
