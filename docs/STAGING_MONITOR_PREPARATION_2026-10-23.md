# Sonda de disponibilidade — implementação testada, ainda não ativa

Preparada em `operations/staging-monitor/`: Worker dedicado `caravana77-staging-monitor`, exclusivamente para GET de `/admin/login` e `/release.json` em `https://caravana77-staging.pages.dev`. Não usa credenciais, Firebase, dados do Ítalo, armazenamento, e-mail pago ou URLs configuráveis. HTTP retorna404 sem iniciar sonda. `workers_dev=false`, previews desligados, nenhuma rota e **crons vazios**: não foi publicado nem agendado.

Verifica HTTP200, MIME, cabeçalhos de segurança, shell React e identidade exata do manifesto `bdall-e3585`/`caravana77-staging`. Cada corpo é limitado durante o streaming a65536bytes; timeout10s por GET; não segue redirects. Logs contêm somente evento fixo e SHA público em caso de sucesso. Falha emite evento fixo e rejeita a execução com mensagem constante, sem registrar payload ou erro arbitrário. Logs/traces configurados explicitamente; sem bindings ou segredos.

## Provas locais

-4 testes de contrato/negativas PASS: dois destinos fixos, opções sem credenciais, HTTP503/redirect302, MIME/headers/shell/projeto incorretos, limite com Content-Length mentiroso/cancelamento, transporte e recusa HTTP.
-1 teste integrado workerd PASS, com duas execuções scheduled: origem sintética saudável→ok; origem sintética503→exception. Outbound desviado para serviço local; eventual rede desse serviço é recusada. Nenhum teste usa credenciais ou tráfego real Firebase.
-Wrangler instalado4.151.3, `deploy --dry-run --config operations/staging-monitor/wrangler.jsonc` PASS, sem bindings e sem upload. Lint PASS.
-Invocação manual de `probeStaging()` no Node fez somente os dois GET públicos reais: PASS para fonte publicada `bc5dd40e3e885ecea6a668203b7a6407db5a7b46`. Não é execução remota agendada nem prova de entrega de alerta.

O teste real em workerd revelou que `redirect:error` não é suportado no edge. Corrigido para `manual`, com recusa de todo status diferente de200; regressão302 incluída. Miniflare instalado5 usa configuração nova: teste usa seu adaptador exportado `convertV4MiniflareOptions`, sem upgrade de dependência.

Log: [staging-monitor-tests.log](evidence/2026-10-23/desktop/staging-monitor-tests.log). O workflow passa a incluir esses testes nas próximas execuções. A implementação operacional tem verificação direcionada local; o [CI integral77e5f94](evidence/2026-10-23/desktop/appcheck-final-ci.json) pertence à revisão anterior do aplicativo e não deve ser atribuído a esta sonda.

## Ativação pendente e solução concreta

Proposta: um Cron dedicado a cada15minutos (96execuções e192GET/dia), sem endpoint público, e dois monitores Cloudflare limitados ao serviço: falha da sonda e ausência de sucesso por45minutos. Destinatário/responsável é o proprietário no e-mail já aprovado. Conferir filtros/contagens e alertas reais de falha, recuperação e sinal ausente antes de declarar monitoramento ativo. Não criar um monitor de erro global para outros projetos.

O plano Workers Free foi confirmado. A [documentação de limites](https://developers.cloudflare.com/workers/platform/limits/#daily-requests) informa recusa1027 após o limite diário, não compra automática de capacidade. Contudo, o consumo é compartilhado por conta: verificar capacidade disponível de Cron e limites antes de agendar. Não alterar outros Workers.

O painel Monitors oferece Workers Logs e formulário de threshold; consulta gerada `SELECT count() AS "value" FROM "logs"."workersLogs"`. Nenhuma consulta personalizada ou monitor foi salvo. A [documentação de Monitors](https://developers.cloudflare.com/notifications/monitors/) descreve seleção por dataset/plano e notificações, mas a leitura feita ainda não comprova garantia de custo zero para essa configuração. Confirmar elegibilidade/custo e semântica de consulta sem eventos antes da ativação; ausência de linhas não pode ser confundida com zero que dispararia alerta. Não contratar upgrade nem usar alerta de orçamento como teto de cobrança.

Esta sonda mede **disponibilidade pública do frontend**. Não testa bytes de todos os assets, autenticação de usuário, integridade financeira nem disponibilidade do backend. O health integral existente e os testes SDK continuam com escopos próprios. Mesmo após ativação futura, F7 integral dependerá dos demais controles. Estado atual: **PREPARED_LOCAL_TESTED / NOT_DEPLOYED / NOT_SCHEDULED / NO_DELIVERY_PROOF**; gates e percentuais mantidos.
