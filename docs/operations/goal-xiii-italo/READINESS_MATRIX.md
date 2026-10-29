# GOAL XIII — estados por evidência (29/10/2026)

## Estado vigente —29/10/2026, corte real concluído

Evidência: [resultado de produção](HOSTED_OPERATIONAL_RESULT_2026-10-29.json) e [runbook](OPERATIONAL_RELEASE.md). Escopo: evento existente do Ítalo, conforme decisão do proprietário de continuar em operação.

| Requisito | Estado | Evidência e limite |
|---|---|---|
| ITALO_TENANT_DATA_COPIED | REVERIFIED_HOSTED |29copiados existentes;24originais com hashes/versões intactos;0recopy |
| ITALO_TENANT_AUTHENTICATED | OWNER_REPORTED_EXISTING_ACCOUNT_ACCESS |Confirmação anterior de entrada/dados/comprovante;2Auth/claims/memberships preservadas;nenhuma nova senha/sessão observada |
| ACCESS_ACTIVE | EXISTING_OWNER_SCOPE_PRESERVED |Grant mínimo de owner existente;sem Platform Owner ou assinatura atribuída |
| ITALO_TENANT_APP_ACTIVE | PROD_OPERATIONAL_SINGLE_WRITER |target_active/geração5;origem bloqueada,destino único escritor |
| ITALO_PUBLIC_CUTOVER_COMPLETE | YES_PROD_BROWSER_PASS |Links antigos/novos e alias no app convergem;catálogo único;app operacional real e login visíveis |
| ITALO_MIGRATED | YES_EXISTING_EVENT_SCOPE |Ativação26writes/readback e inventário completo84docs PASS |
| Fonte/CI | EXACT_SHA_BOTH_SUCCESS |e3a465f;40929890152/40929890169 SUCCESS |
| Rules/índices | PROD_PUBLISHED |8ceb5832/ruleset336fbe8b;5READY,0criados/removidos neste corte |
| Frontend/HTTP | PROD_PASS |ebce9d69,dirty=false,sem Functions;40arquivos/5rotas/hash/MIME/cache/CSP |
| Totais/comprovante | PRESERVED |8totais pagos conciliados,2UNKNOWN;1proof idêntico,anônimo403 |
| A×B/revogação/login dirigido | DEMO_ON_PUBLISHED_BYTES |Prova autenticada dirigida em emuladores;sem sessão B ou pagamento real fabricados |
| Retorno | PROD_BEFORE_TARGET_TRAFFIC_PASS |Pages ca4166eb e Rules392→336;controle1→2→3 antes do corte4→5 |
| Dados posteriores | FORWARD_REPAIR_PROTECTED |Marca cifrada33docs;retorno à origem recusado após mudança,testado em demo;sem restore de negócio |
| Custo | R$0_INCREMENTAL |Firebase billing=false/freeTier;Pages estático;fatura agregada CF UNKNOWN/Billing403 |
| Preservação | COMPONENT_RETURN_SINGLE_CUSTODY |Ciphertext/readback e versões imutáveis preservadas;sem alegar segunda custódia/restore completo independente |

**READY_FOR_ITALO_OPERATION=YES; ITALO_MIGRATED=YES no evento existente.** Novo crescimento comercial e rollout global não são aprovados por este resultado. Dois totais históricos seguem para revisão legítima do proprietário; nenhum valor foi inventado. Não resta bloqueio humano para este corte.

## Histórico — checkpoints anteriores ao corte de29/10

As seções seguintes registram estados anteriores, substituídos pelo estado vigente acima.

## Decisão posterior do proprietário — operação continua

Em 27/10, o proprietário confirmou: **“Ainda continua em operação”**. A data passada não autoriza encerrar reservas ou edições nem arquivar o evento. A origem permanece operacional até validar o corte com um único escritor e os links antigos. A publicação privada 4ecaa9e permanece vigente; nenhum congelamento ou corte operacional foi aplicado.

Candidata operacional implementada e testada em emulador: limite físico do evento existente, sem assinatura inventada; reserva idempotente e retomada da tentativa anterior; aliases nos dois sentidos; financeiro UNKNOWN, comprovante, check-in e edição auditada; consultas preservadas durante suspensão de gravações e revogação sem fallback legado. **15 testes operacionais, 25 testes do fence/contrato privado e 5 do modelo de transição PASS; lint/typecheck/build PASS.** Esses testes não comprovam corte hospedado. Faltam empacotamento/roteamento público, executor transacional protegido, ensaio de retorno com dados posteriores e validação do novo app. [Escopo e limites](OPERATIONAL_CANDIDATE.md).


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

## Inventário seguinte —18:51UTC, somente leitura

Nova fonte operacional ce9693759e322a4284d7c40915b1de8924fda709 acrescenta uma pré-checagem, sem alterar app/Rules publicados4ecaa9e. Seis casos novos nativos PASS (20com regressões), lint PASS; workflow dedicado40563424616 SUCCESS. CI principal40563424653 SUCCESS no mesmo SHA, incluindo regressão integral; [evidência oficial](evidence/ci-cutover-preflight-ce96937.json).

[Inventário completo privado](CUTOVER_INVENTORY_RESULT_2026-10-27.json):24originais/29copiados reconciliados,1caravana e10inscrições de origem,0docs novos inesperados em origem/destino,0referências ambíguas,2totais financeiros desconhecidos preservados. Data do único evento anterior a hoje; segue published na origem e draft/importPending no destino. Nenhuma write, recopy, PII ou ciphertext exportado. A primeira tentativa não iniciou porque a conexão Cloud Shell se perdeu; reconectada a mesma sessão, foram confirmados0processos/0recibos antes de executar uma única leitura.

Resposta posterior do proprietário: o evento continua em operação. A classificação temporal não autoriza encerrar o evento nem reabrir a cópia. O PREVIEW somente de inventário não contém writes e nunca é readyForApply. Nenhum novo corte ou deploy da pré-checagem foi executado.
