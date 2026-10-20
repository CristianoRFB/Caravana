# F7 — auditoria e preparação de release

IN_PROGRESS para preparação; publicação no ambiente existente BLOCKED. A instrução de 2026-10-20 autoriza publicação sem confirmação adicional **somente** com todos os 14 gates comprovados. Não autoriza migração real do Ítalo, custos novos nem dados presumidos. Não há autorização rotineira pendente: faltam acesso efetivo e evidências.

## Auditoria real em leitura — 2026-10-20

| Item solicitado | Resultado atual | Evidência/limite |
|---|---|---|
| Aplicação publicada | VERIFIED em leitura | Cloudflare GET: produção `4d069e0a-344a-415a-ae41-aa314df10ace`, sucesso, criada2026-09-29; trigger ad_hoc, commit10f30a0c, dirty=true. Git não prova versão publicada. |
| Projeto Firebase | VERIFIED no bundle público | `caravana-af306`; manifesto production-public-readonly.json. Não é prova de acesso administrativo ou integridade dos dados. |
| Firestore/Storage Rules implantadas | BLOCKED atualização | Captura histórica Firestore2026-10-16 fe594614… disponível; não houve GET administrativo atual. Storage/IAM/tokens antigos não auditados. |
| Auth real | BLOCKED | Firebase CLI: nenhuma conta autorizada; gcloud ausente; runtime sem credenciais/identidades administrativas. Sem inventário de UIDs, provedores ou domínios Auth atuais. |
| Índices reais | BLOCKED | Candidatos versionados, incluindo novo índice de auditoria da equipe; implantação/paridade não verificadas. |
| Cloudflare | VERIFIED metadados do projeto | `caravana-77`, direct upload, source=null, production_branch=main, sem nomes de env vars em preview/production; nenhum PATCH/deploy. Outros projetos não alterados. |
| Domínios e URLs | VERIFIED Pages | https://caravana-77.pages.dev e deployment imutável; único domínio listado. Preview anterior0141fb45, alias caravanasitalo; não homologado como staging desta versão. |
| Dependências históricas | BLOCKED comprovação real | Contratos e fixtures legadas disponíveis; memberships/baselines/namespaces reais não inferidos nem criados. A candidata Storage exige memberships e permanece bloqueada para legado não conferido. |
| Versões/hashes | VERIFIED assets públicos | JS principal90677dd6…; HTML525591aa…; outros hashes no manifesto. Coincidem com auditoria anterior. Sem leitura de documentos, links privados ou comprovantes. |
| Backup/restore/rollback | BLOCKED real | Não há export protegido/completude/integridade/restore isolado comprovados. Código/assets não são backup Firestore/Auth/Storage. Procedimentos em RELEASE_AND_ROLLBACK.md; disponibilidade de deployment antigo não prova rollback coordenado testado. |

A auditoria cobre fatos observáveis, não é homologação de produção. Cinco categorias integralmente identificadas (aplicação, projeto no bundle, Pages, URLs e assets), cinco com bloqueadores (Rules, Auth, índices, legado e backup/rollback): **5/10, 50% da identificação**, não 50% de prontidão de release.

## Staging e gate aplicável

Staging backend independente BLOCKED: nenhum projeto Firebase isolado administrativo conectado para implantar Auth/Rules/Storage/índices, nenhuma restauração real comprovada. Os emuladores usam exclusivamente `demo-caravana77-test`; não se publicam emuladores nem configuração demo em domínio remoto. A demonstração local funciona com dados fictícios e marcas/planos A×B. Uma prévia pública estática isolada, se publicada, será identificada separadamente e não contará como STAGING_VERIFIED do SaaS.

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
