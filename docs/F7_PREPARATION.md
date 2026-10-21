# F7 — auditoria e preparação de release

## Convergência vigente — staging público e candidata preparada

Fonte recuperada cb321f5; checkpoint remoto253067b. Auth público real200 no projeto correto, domínio staging autorizado, senha ENFORCE/min12. Build staging253067b e oito verificações UI offline PASS;10 testes direcionados/lint PASS. Nenhum deploy, escrita Firebase ou acesso de produção. SERVICE_DISABLED administrativo continua sem causa comprovada: falta identidade gerenciada e ErrorInfo do consumidor. Staging publicado permanece8c1340d. Matrizes mantidas: F7 preparação9/10, F8 publicação5/14, GOAL6/17; técnico85% não significa produção pronta.

Continuidade e evidências: [STAGING_CONVERGENCE_2026-10-21.md](STAGING_CONVERGENCE_2026-10-21.md). Pareceres distintos: [COMMERCIAL_GO_NO_GO_2026-10-21.md](COMMERCIAL_GO_NO_GO_2026-10-21.md). Novos clientes não dependem automaticamente da migração do Ítalo; ainda faltam homologação/controles operacionais próprios. Não repetir CI integral do aplicativo inalterado nem declarar configuração administrativa validada por Auth público200.

## Continuidade consolidada — código a7b5785, runtime49

Override isolado do UUID do CLI e diagnóstico sanitizado de consumidor Auth implementados/testados; audit de ferramentas7→5, runtime0. Compatibilidade HTTP3 testes, guards Python23,Auth8,Storage6 e recuperação conjunta locais PASS. CI39540369156 da própria revisão PASS:290 backend/Rules,8Auth,6Storage,23 guards Python,recuperação conjunta,184 E2E e lint/typechecks/build; preservar a evidência anterior apenas para seu código. Aplicação/Rules/índices e staging não alterados. Desenvolvimento técnico estimado85% (17/20 grupos existentes), GOAL final35% (6/17 gates), F7 preparação9/10 e F8 gates5/14; metodologia e limites no parecer abaixo.

Parecer e checklist mínimo: [COMMERCIAL_READINESS_2026-10-21.md](COMMERCIAL_READINESS_2026-10-21.md). Comercialização geral e migração do Ítalo BLOCKED. Runtime sem identidade GCP/conta CLI; preflight novo sem requisições reais. Sem novos trabalhos de produto a inventar: próxima ação é leitura legítima de configuração staging, diagnosticar serviço/consumidor e viabilizar homologação/provas privadas reais, sem chaves/códigos/PII no chat. Estimativa2–4 ciclos após acessos/provas externas disponíveis, condicionada a descobertas reais.

## Retomada validada com rede atualizada — 2026-10-21

Fontee4939db: downloads novos Firestore1.22/Storage1.1.3 PASS, hashes/tamanhos conferidos.282 backend/Rules+8Auth+6Storage,18 guards direcionados (5 novos) e48 E2E em320/375/768/1440 PASS; lint/typechecks/build/audit runtime0. Nova exportação/restauração conjunta LOCAL_TESTED:3 logins/UIDs,10 documentos e2 PDFs; A×B, passageiro, list/delete e revogação após restore PASS. CI39537954805 PASS:287 backend/Rules+8Auth+6Storage+20 guards Python+recuperação conjunta+184 E2E e lint/typechecks/build. Relatório e evidências em CLOUD_RECOVERY_2026-10-21.md e evidence/2026-10-21/cloud-recovery/.

Runtime42 atual sem identidade GCP: preflight BLOCKED com requests=[]. Auth remoto403/SERVICE_DISABLED ainda sem consumidor identificado. Proteção contra abuso/alertas e7 advisories de tooling conhecidos pendentes. F0–F6 mantêm100% dos aceites locais; F7 preparação isolada9/10, F8 gates5/14, GOAL FINAL6/17. Nenhuma produção alterada, Blaze, migração ou deploy. Ensaio emulado não fecha staging/backup/compatibilidade/restore/rollback reais.

## Relatório real recebido — 2026-10-21

Relatório do operador executado no Cloud Shell em2026-10-20T23:57:26Z, scriptdb99675/SHA363c307d…, validado em auth-recovery/operator-staging-readonly.json e operator-report-validation.json. Identidade/projeto corretos, billing=false, Standard/freeTier;11/11 índices READY/hash compatível. Rules hash bruto41388c5f… difere, LF-normalizado8acafe75… igual à candidata: diferença compatível com quebras de linha, sem alteração ou bypass do guard estrito.

Auditoria parcial BLOCKED em Auth403/PERMISSION_DENIED/SERVICE_DISABLED. O relatório não inclui consumidor/serviço do ErrorInfo; não comprova API desativada no projeto-alvo nem falta de firebaseauth.configs.get. Não habilitar APIs, conceder IAM ou repetir login automaticamente. Próximo bloqueio externo: GET da configuração Auth, com firebaseauth.configs.get e serviço disponível no consumidor correto; diagnosticar consumidor antes de propor configuração. Sessão gerenciada, alvo fixo bdall-e3585, sem códigos/chaves compartilhados. Autorização vigente somente leitura.

CI integral db99675 PASS (run39513331460):20 guards,282 backend/Rules,8Auth,6Storage,184 E2E; lint/typechecks/build PASS. Run39511925824 anterior terminou cancelled, não PASS. Código da aplicação/Rules não mudou. Nenhum deploy, custo, leitura de documentos de negócio ou modificação de projeto. F6 mantém PASS local; F7/F8/produção BLOCKED. Matrizes5/14 e6/17 preservadas. Cloud Shell não autentica o Codex; duas consultas atuais ao runtime retornaram configuration changed, sem readiness GCP comprovada.

## Autenticação — restrição atual de somente leitura

Conta indicada: crisf.bueno10@gmail.com. O fluxo anterior foi encerrado. CLI15.34 detectava agente e escolhia nonInteractive mesmo com PTY; nova sessão oficial --no-localhost --interactive alcançou o prompt, parâmetros completos e HTTP302 Google, depois foi cancelada sem código. Não há terminal do Codex exposto ao usuário Android e não será pedido código/token/senha no chat. Causa específica do invalid_request antigo não comprovada; não atribuir ao Android.

Novo caminho em FIREBASE_READONLY_ANDROID.md: sessão Google gerenciada no Cloud Shell pelo celular, auditoria Python GET-only de bdall-e3585 e relatório sanitizado; ou conexão GCP/ADC gerenciada do runtime quando realmente configurada.16 guards offline PASS, dependências ADC importadas. Preflights atuais BLOCKED com zero requisições: gcloud ausente e nenhuma conexão GCP gerenciada. Nenhuma autenticação, IAM ou auditoria remota simulada. A autorização atual é **somente leitura do staging**: não usar stagingAdmin, test:staging, bootstrap/reset de fixtures, deploy ou scripts de escrita. Nenhum projeto Firebase alterado. F7/F8 e17 gates permanecem bloqueados no escopo real.

## Retomada Linux Cloud — evidência atual

Checkout ab4aff1 íntegro, na branch obrigatória, sem WIP local perdido. CI do checkpoint recuperado PASS e CI da candidata51cf4f5 também PASS (run39504978890), substituindo o bloqueio histórico de CI abaixo. Staging público 8c1340d reconferido: 12 assets e cabeçalhos exatos; isso não executa jornadas autenticadas. CLI deste Cloud sem contas autorizadas; não copiar a sessão do laboratório. Observabilidade parcial e política Auth estão documentadas; abuso remoto, advisories de tooling e compatibilidade/recuperação reais mantêm F7 IN_PROGRESS / BLOCKED. Parecer atual e plano de corte em MIGRATION_READINESS_FINAL.md; resultados Linux e acesso mínimo em CLOUD_TRANSFER_2026-10-20.md. Nenhum serviço pago/Blaze ou alteração de produção.

## Preparação isolada — atualização da candidata Cloud

Os critérios1–8 da matriz de staging abaixo conservam evidência válida **das versões que foram efetivamente testadas**, incluindo os incrementos funcionais de8c1340d e Auth do checkpointab4aff1. Health/Pages atuais confirmam8c1340d; nenhum deploy51cf4f5 é alegado. Critério9: CI integral51cf4f5 PASS, run39504978890:282 backend/Rules,8Auth,6Storage e184 E2E. Critério10 segue BLOCKED por proteção de abuso/alertas e advisories conhecidos. Nove dos10 critérios de preparação isolada comprovados (90%), com o critério10 BLOCKED; não é um percentual de preparação integral da produção. O novo compilador altera hashes e exige seu próprio aceite, sem invalidar testes de Rules/contratos cujo código não mudou.

## Histórico — aceite incremental do staging19c6564

Checkpoint publicado `19c6564`, deployment `9244cf5a-f7c8-41cb-a3b8-da4f5d5e5d85`, https://caravana77-staging.pages.dev. Os11 assets de navegador são idênticos ao runtime8b0dad3 usado no aceite funcional e no ensaio de retorno. Produção continua protegida e sem autorização de alteração.

| Critério de preparação isolada | Estado | Evidência |
|---|---|---|
| 1. Destino e custo | PASS | bdall-e3585, Spark/freeTier, billing desativado; sem Blaze/Storage/Functions |
| 2. Guard de configuração | PASS | Build/runtime recusam ambiente misto; manifesto release.json com projeto e SHA |
| 3. Firestore | PASS staging | Rules SHA d3ff2108… e 11 índices READY; namespace v2 |
| 4. Auth e bootstrap | PASS staging | Cinco contas fictícias; A/B, primeiro owner, planos/contadores; replay cria zero e preserva alterações |
| 5. Frontend e headers | PASS staging | CSP/noindex/DENY; login B e consultas remotas funcionam; zero erros/warnings recentes na inspeção |
| 6. Jornadas de clientes | PASS staging | 11 SDK reais; financeiro A×B e filtros Tudo/caravana na UI; 320/1440 inspecionados |
| 7. Backup/restauração | PASS sintético | 153 documentos restaurados no emulador; todos os campos/relações/contadores/totais/ACL conferidos |
| 8. Retorno de frontend | PASS staging | Retorno e avanço entre e383b20 e 8b0dad3; 153 documentos canônicos iguais antes/depois |
| 9. CI remoto | BLOCKED credencial | Workflow preparado, sem deploy; gh sem autenticação de API. Autenticação de push via GCM não comprova acesso Actions |
| 10. Observabilidade e proteção contra abuso | BLOCKED release | Auditoria e logs locais disponíveis; alertas/tráfego público pendentes; 7 advisories de ferramentas ainda abertos após correções compatíveis |

**8/10 critérios de preparação isolada comprovados (80%).** Não é prontidão de produção. O inventário protegido de produção continua 5/10 categorias identificadas (50%); staging não substitui IAM, inventário legado, backup real ou retorno coordenado de Rules/Auth/dados. Cloud Storage permanece somente testado no emulador; PDF remoto usa o fluxo privado existente do Firestore.

Comparação do retorno ordena recursivamente chaves de mapas antes do hash: a primeira comparação de JSON bruto recusou a ordem variável da API; a comparação canônica confirmou zero campos alterados. Evidência em staging-frontend-rollback.json. Não foi realizado rollback de Rules, Auth, índices ou dados.

### Operação segura de staging

Antes de qualquer comando administrativo, conferir o destino e billing pelo helper staging-admin.mjs. Parar se houver usuário fora de @caravana77.invalid ou passageiro fora da fixture. Logs/evidências públicos não devem conter senhas, tokens, links de passageiro ou PDFs. Credenciais e backups brutos ficam ignorados localmente. Acompanhamento manual: erros de login/permissão, respostas de quota indisponível e totais financeiros por tenant; isso não equivale a alerta automatizado ativo. Limites Spark protegem o orçamento, sem garantia de disponibilidade sob abuso.

Revogar membro não revoga um link opaco de passageiro conhecido. No desligamento, avaliar revogação explícita dos links compartilhados; PDFs/financeiro/listagens exigem ACL atual. A leitura de comprovante foi alterada para servidor e testada após revogação.

## Registro histórico anterior à homologação de staging

## Atualização vigente — staging autorizado em2026-10-20

Somente `bdall-e3585` foi autorizado para configurações e dados fictícios, com orçamento R$0. Produção `caravana-af306`/`caravana-77` continua sem autorização de modificação, deploy, migração ou merge neste fluxo. Não aplicar a autorização condicional histórica abaixo como permissão para produção.

STAGING_BDALL.md registra pull663bdca, preservação do WIP, projeto/Standard/freeTier/billing desativado conferidos, snapshot inicial vazio, Rules e11 índices READY implantados e comparados por hash, Auth/domínio e bootstrap fictício.48 testes direcionados+56 de segurança+20 puros PASS; há sobreposição entre suítes. Homologação funcional e frontend ainda IN_PROGRESS. Storage real e backup/restore/compatibilidade do cliente continuam BLOCKED.

IN_PROGRESS para preparação; publicação no ambiente existente BLOCKED. A instrução de 2026-10-20 autoriza publicação sem confirmação adicional **somente** com todos os 14 gates comprovados. Não autoriza migração real do Ítalo, custos novos nem dados presumidos. Não há autorização rotineira pendente: faltam acesso efetivo e evidências.

## Auditoria real em leitura — 2026-10-20

| Item solicitado | Resultado atual | Evidência/limite |
|---|---|---|
| Aplicação publicada | VERIFIED em leitura | Cloudflare GET: produção `4d069e0a-344a-415a-ae41-aa314df10ace`, sucesso, criada2026-09-29; trigger ad_hoc, commit10f30a0c, dirty=true. Git não prova versão publicada. |
| Projeto Firebase | VERIFIED no bundle público | `caravana-af306`; manifesto production-public-readonly.json. Não é prova de acesso administrativo ou integridade dos dados. |
| Firestore/Storage Rules implantadas | BLOCKED atualização | Manifesto histórico Firestore2026-10-16 fe594614… disponível; arquivo bruto não recuperado no checkout e sem GET administrativo atual. Storage/IAM/tokens antigos não auditados. |
| Auth real | BLOCKED | Firebase CLI: nenhuma conta autorizada; gcloud ausente; runtime sem credenciais/identidades administrativas. Sem inventário de UIDs, provedores ou domínios Auth atuais. |
| Índices reais | BLOCKED | Candidatos versionados, incluindo novo índice de auditoria da equipe; implantação/paridade não verificadas. |
| Cloudflare | VERIFIED metadados do projeto | `caravana-77`, direct upload, source=null, production_branch=main, sem nomes de env vars em preview/production; nenhum PATCH/deploy. Outros projetos não alterados. |
| Domínios e URLs | VERIFIED Pages | https://caravana-77.pages.dev e deployment imutável; único domínio listado. Preview anterior0141fb45, alias caravanasitalo; não homologado como staging desta versão. |
| Dependências históricas | BLOCKED comprovação real | Contratos e fixtures legadas disponíveis; memberships/baselines/namespaces reais não inferidos nem criados. A candidata Storage exige memberships e permanece bloqueada para legado não conferido. |
| Versões/hashes | VERIFIED assets públicos | JS principal90677dd6…; HTML525591aa…; outros hashes no manifesto. Coincidem com auditoria anterior. Sem leitura de documentos, links privados ou comprovantes. |
| Backup/restore/rollback | BLOCKED real | Não há export protegido/completude/integridade/restore isolado comprovados. Código/assets não são backup Firestore/Auth/Storage. Procedimentos em RELEASE_AND_ROLLBACK.md; disponibilidade de deployment antigo não prova rollback coordenado testado. |

A auditoria cobre fatos observáveis, não é homologação de produção. Cinco categorias integralmente identificadas (aplicação, projeto no bundle, Pages, URLs e assets), cinco com bloqueadores (Rules, Auth, índices, legado e backup/rollback): **5/10, 50% da identificação**, não 50% de prontidão de release.

## Staging e gate aplicável

Staging backend independente BLOCKED: nenhum projeto Firebase isolado administrativo conectado para implantar Auth/Rules/Storage/índices, nenhuma restauração real comprovada. Os emuladores usam exclusivamente `demo-caravana77-test`; não se publicam emuladores nem configuração demo em domínio remoto. A demonstração local funciona com dados fictícios e marcas/planos A×B. Prévia visual isolada publicada e verificada em https://caravana77-commercial-preview.pages.dev/saas, sem backend; não conta como STAGING_VERIFIED do SaaS. PUBLIC_PREVIEW.md registra deployment, hashes e smoke.

Frontend, Firestore Rules, Storage Rules e índices precisam ser validados juntos em destino separado. O cliente não cria inventários comerciais de tenants existentes. Não aplicar a candidata sobre o legado enquanto UIDs, admins, memberships, links, comprovantes e baselines não estiverem comprovados. Não relaxar segurança para contornar o bloqueio.

## Verificação reproduzível e CI

Node24/Java21. `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:demo`, `npm run test:storage`, `npm run test:e2e`. Executar emuladores em sequência. O tratamento de proxy Storage limita a exceção ao GET exato de Firestore demo local e mantém proxies externos/Rules.

CI ampliado para Auth, Storage e Chromium/E2E das quatro larguras, retenção de artefatos sintéticos7 dias e workflow_dispatch. Gatilhos antigos main/PR preservados; nenhum job/deploy remoto é presumido ou disparado nesta retomada. Nenhum segredo de produção deve entrar no job sintético.

## Backup e retorno obrigatórios antes do release

1. Export administrativo autorizado e protegido de Firestore, identidades/configuração Auth e objetos relevantes do Storage, incluindo metadados de links/tokens conforme risco, com escopo e instante identificados. Não versionar PII nem logs com conteúdo privado.
2. Conferir manifestos, quantidade/completude, hashes e permissões do destino; restauração em projeto separado, sem sobrescrever produção. Registrar evidência de leitura e funcionamento no destino isolado.
3. Conservar frontend anterior por deployment ID/hash; capturar Rules atuais e índices/Auth separadamente. Testar retorno coordenado em staging. Rollback de frontend não desfaz Rules, índices, Auth nem dados.
4. Dados reais não serão migrados neste fluxo. Regressão exige parar rollout e retornar somente artefatos/configurações previamente testados; nenhuma reversão improvisada de dados.

Os 14 gates e o estado F8 serão consolidados no fechamento. Até lá, nenhuma publicação no projeto existente nem afirmação de preservação real baseada apenas em testes sintéticos.

Prévia estática separada publicada pelo fluxo oficial com token temporário de upload;403 inicial resolvido sem alterar permissões/billing. Projeto original, deployment4d069e0a e hash JS conferidos novamente e inalterados. RULES_COMPATIBILITY_REVIEW.md documenta riscos concretos de release e ausência de diff atual verificável. CI ampliado está preparado em fonte; execução remota não alegada.
