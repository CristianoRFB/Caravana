# GOAL XIII — ativação privada sobre a cópia existente

Base3fc0bc3e17767cba4774c001c10fab0310517811; branch codex/caravana77-goal-xiii-activate-italo-cloud-20261026. Correção de imutabilidade do sdk-rehearsal.json preservada. Trabalho desta etapa não repete a cópia nem presume corte público.

Código novo: planner+validador reproduzível e executor Cloud Shell privado, PREVIEW/APPLY/VERIFY, alvo/número/copyPlanHash exatos,4companions no máximo e exists:false. Revalida24originais/29copiados na operação real; não escreve em nenhum deles, memberships, Auth, planos ou finanças. Transação única, fonte/versionamento rechecados, sem retry de commit incerto; readback obrigatório. PREVIEW cifrado em memória e arquivo privado, sem dados pessoais no relatório. Modos fora do Cloud Shell privado falham antes de ler arquivos/credenciais.

Companions candidatos:publicTenantSettings/italo,tenantSlugs/italo,organizationAvailability/italo e organizations/italo/tenantActivations/private-v1. Branding exige revisão explícita privada; sem contato, logo ou contrato inventado. Companions existentes diferentes bloqueiam, revogação não reativa, snapshots desatualizados bloqueiam sem recopy. Sem subscription/entitlements, acesso histórico permanece, crescimento continua bloqueado pelos contratos existentes.

App:aviso de histórico importado, seleção multitenant já existente exercitada. Financeiro passa a distinguir total null/ausente de zero; status/caixa/saldo/CSV explicitam incerteza, revisão do histórico permanece disponível; lançamento/correção não inicializa recebimento desconhecido. Rules candidatas vedam publicar/retirar importPending pelo cliente e mantêm o ledger de ativação imutável. Estas Rules ainda não foram publicadas nesta sessão.

Validação inicial:7casos nativos novos,8SDK novos +8finance existentes (um novo) PASS (16casos no harness); lint/typecheck PASS. SDKs reais dos emuladores demo, transação REST, login/UID, alias/resolver, A×B, revogação, unknowns, concorrência e ack perdido. Nenhum payload hospedado, write real, Auth/Rules/índices/deploy real. Regressão principal e responsividade seguirão nesta branch; não chamar CI antigo de aprovação nova.

Snapshot real:DATA_COPIED reportado/verificado pelo operador em26/10,29destinos/24originais/2Auth retidos conforme TENANT_COPY_RESULT.json. Esta sessão não revalidou hosted:runtime77 sem identidade GCP/segredos/variáveis gerenciadas. ACCESS_ACTIVE/PUBLIC_ACTIVE/MIGRATED não comprovados. Falta executar preview/readback em sessão privada oficial e validar/publicar Rules/frontend compatíveis com retorno preservado antes de afirmar acesso do Ítalo. Segunda custódia/restore reais seguem não provados; produção não alterada pelo Cloud.

## Checkpoint de isolamento da cópia e integração CI

A cópia importPending é somente leitura no backend, inclusive finanças/check-in/documentos e novos links bearer; o portal e operações legados continuam sob os contratos anteriores enquanto a origem não estiver importPending. A UI mantém histórico/revisão e desabilita edição financeira nesse contexto. Não ativar escrita dupla em duas versões da mesma inscrição.9SDK+8finance PASS,4E2E (320/375/768/1440) PASS,14nativos (7novos+7regressões) PASS,48Python PASS,lint/tipos/build sintético PASS.

CIe11fb9: workflow específico de ativação PASS; CI principal falhou antes das suítes do produto porque os guards ainda fixavam o hash das Rules anteriores. Candidata agora tem pin próprio. Reconciliador CRLF histórico continua fixado em8acafe75 e foi testado contra a fonte histórica pública congelada; ele recusa as Rules funcionais novas. Não alterar o seu pin para publicar estas Rules. Nova rodada integral justificada pela superfície Rules/financeiro.

Ainda falta leitura oficial mínima, comparação do cliente/regras publicados e preservação/retorno dos componentes afetados antes de produção. Em particular, não assumir que o formulário/contrato de reserva legado usa recibos/nonce/quotas comerciais novos. Não publicar Rules SaaS ou trocar o app canônico sem a prova correspondente; não criar assinatura/baseline presumidos para contornar. O comando de ativação NÃO publica Rules nem frontend.

## Compatibilidade de importação/relatórios consolidada

CI0516661 chegou à regressão do produto e expôs5falhas (301PASS): criação CSV sem baseline explícito de recebimentos e envelope dos relatórios Pro. Corrigido somente o novo registro CSV (zero explícito na criação, null recusado; nenhum preenchimento de registro histórico), preservado o envelope Pro anterior (diagnóstico desconhecido não é métrica persistida) e reduzidas avaliações redundantes da organização nas Rules sem retirar verificações.60regressões dirigidas PASS, incluindo payload máximo do owner legado;48Python PASS. Nova rodada integral deve ser avaliada pelo SHA próprio, sem tratar os runs falhos como aceites.

## Correção do fluxo público novo

CI2feb794 confirmou307backend/Rules,8Auth,6Storage,48Python e184E2E;4E2E falharam no mesmo fluxo público em quatro larguras. A causa era reserva NOVA sem baseline de recebimento, agora classificada corretamente como desconhecida pelo leitor financeiro. Corrigida exclusivamente a criação pública para paymentTotalCents=0, com Rules aceitando somente inteiro0 quando o campo é enviado; clientes anteriores que o omitem mantêm o contrato. Nenhum histórico null/ausente é preenchido.3negativas novas recusam -1,1,null atomicamente sem tomar vaga;63regressões dirigidas e48guards PASS. O resultado integral da revisão corrigida deve constar no ledger final; não promover o run anterior falho.

## Relatórios com desconhecidos sem quebrar o ensaio legado

O ensaio SDK legado adicional encontrou1falha real: o bloqueio genérico de relatório com unknown interrompia uma jornada preservada. Corrigido: relatório de coorte incompleta persiste unknownPaymentCount e received/receivable/recordedBalance=null, apresenta Não conciliado/incompleto e exporta UNKNOWN; coorte totalmente conhecida mantém o envelope anterior. Rules exigem contagem positiva para os3null e recusam mistura de null/total inventado; demais limites e auditoria permanecem. Valores inválidos conhecidos não são escondidos pela presença de unknown.69testes dirigidos PASS e6/6 do ensaio legado PASS, sem alterar teste nem sdk-rehearsal.json históricos. O CI dedicado passa a executar também esse ensaio. A interface da cópia importPending desabilita criação/edição de relatórios e roteiros, preservando leitura/exportação do histórico.
