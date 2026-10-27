# GOAL XIII — estados atuais por evidência (27/10/2026)

Produção direta por instrução do proprietário; nenhum novo teste hospedado em bdall. Este quadro substitui os checkpoints anteriores. Evidência principal: [release real](HOSTED_RELEASE_2026-10-27.json), [companions](HOSTED_PRIVATE_RESULT_2026-10-27.json), [CI exato](evidence/ci-pc27-4ecaa9e.json).

| Requisito | Estado atual | Evidência e limite |
|---|---|---|
| ITALO_TENANT_DATA_COPIED | REVERIFIED_HOSTED |24 originais/29 copiados reconciliados; quatro companions aditivos, sem recopy |
| ITALO_TENANT_AUTHENTICATED | OWNER_REPORTED_EXISTING_ACCOUNT_ACCESS |Proprietário confirmou entrada/dados/comprovante; dois UIDs preservados/ativos. Nenhum novo lastLoginAt corroborado após baseline/publicação; sessão existente é possível |
| ITALO_TENANT_APP_ACTIVE | PUBLISHED_PRIVATE_HISTORY_OWNER_REPORTED_PASS |Pages6e76a7cd, Rules392e61a3, manifestos/hash/HTTP e confirmação do proprietário; somente leitura histórica |
| ITALO_PUBLIC_CUTOVER_COMPLETE | NO |Cópia draft/importPending; origem continua único escritor público. Nenhum redirecionamento de reserva/inscrição legado para cópia |
| ITALO_MIGRATED | NO |Acesso privado não conclui transferência operacional nem sincronização posterior |
| Fonte e CI | SUCCESS_EXACT_SHA |4ecaa9e, runs40557950406/40557950411; código, scripts e pipelines próprios aprovados |
| Testes privados distintos | PASS_DEMO |12 SDK/Rules, três seleção/rotas, dois limites de pacote; uma jornada em quatro larguras; um CSP de navegador. Não somar sobreposições com regressão integral |
| A×B/revogação | DEMO_ON_PUBLISHED_BYTES |Casos SDK demo; produção verificou seis negativas anônimas, não uma sessão B/revogação real |
| Rules e índices | PUBLISHED_PRODUCTION |SHA77307820, rollback/forward reais; três índices acrescentados, cinco READY, zero removidos |
| Frontend e retorno | PUBLISHED_AND_RETURN_PROVED |Raiz legada preservada;20assets/três rotas HTTP. Retorno6d131a85 com prefixo privado explícito passou por API e URLs aquecidas; retorno puro antigo falhou por cache e não é aceito como prova suficiente |
| UNKNOWN/comprovante | PRESERVED |Dados não reescritos; um inline proof comparado em memória privada; proprietário confirmou leitura. Nenhum UNKNOWN preenchido |
| Custo incremental | R$0 |Firebase billing=false/freeTier; Pages estático sem Functions/novo serviço. Fatura agregada Cloudflare UNKNOWN por escopo de Billing indisponível, sem alteração de plano |
| Preservação/backup | COMPONENT_RETURN_PROVED_SINGLE_CUSTODY |Configuração anterior cifrada/readback em Cloud Shell e versões imutáveis de Rules/Pages; não há segunda custódia nem restore independente de backup completo |

**READY_FOR_ITALO_MIGRATION=NO; ITALO_MIGRATED=NO; COMMERCIAL_READY_NEW_TENANTS=NO.** Indicadores históricos17/20, F7 9/10, F8 6/14, GOAL7/17 não são reavaliados como conclusão. Monitoramento crítico desta janela foi exercitado por detecção HTTP, resposta e retorno/avanço reais; nenhum heartbeat END foi inventado.

Próxima fase técnica: inventário de divergência temporal, contrato de único escritor, compatibilidade de links existentes e PREVIEW/corte transacional protegido, incluindo preservação de writes posteriores no retorno. Não falta permissão genérica nem conta de staging; não pedir tokens/senhas/OTP. O objetivo permanece ativo.
