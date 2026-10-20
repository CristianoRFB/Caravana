# Transferência para Linux Cloud — 2026-10-20

## Recuperação comprovada

Repositório oficial `CristianoRFB/Caravana`, remote HTTPS oficial e branch obrigatória `codex/caravana77-commercial-v1-20261016`. Fetch e avanço fast-forward de663bdca para `ab4aff115685f468d99050d248a047b070297cab`, sem merge de main, reset ou perda de WIP. Checkout originalmente limpo; fsck de conectividade PASS, três blobs pendentes sem exclusão. Oito commits novos: e383b20,8b0dad3,19c6564,865b803,13fe987,40de512,8c1340d,ab4aff1. Trabalho inacessível do laboratório não foi declarado recuperado.

GOAL vigente: GOAL_FINAL_2026-10-20.md, FINAL_GOAL_EXECUTION.md e checkpoint incompleto. Sua restrição de produção substitui a autorização condicional histórica: somente staging autorizado. Equipe/convites e F6 já estavam no remoto; diferenciação funcional Pro/Premium também. Nenhum módulo aprovado foi reimplementado.

CI do próprio ab4aff1 PASS:281 backend/Rules,8Auth,6Storage e184 E2E em rodada completa, run39476952320; números conferidos no log do job118815270222. Wrapper do conector GitHub filtra runs de pull requests e retornou lista vazia; consulta pública REST confirmou o run de push. Evidência sanitizada em `evidence/2026-10-20/cloud-transfer/recovered-ci.json`.

## Ambiente e validação

Node24.19.0, Java21.0.12.1, Firebase CLI15.34.0 e Playwright1.64.1. `npm ci` PASS,890 pacotes; re2 compilado nativamente. Firestore1.22.0, Storage Rules runtime1.1.3 e Chromium1248 já disponíveis; instalação Chromium conferida. Nenhum bloqueio de download de emuladores.

Proxy mantido conforme política do runtime; health via Node24 exigiu `NODE_USE_ENV_PROXY=1`. A primeira chamada sem essa opção falhou no transporte, sem provar defeito do staging. Não houve bypass de proxy/restrições.

- Baseline recuperada: lint, typecheck, typecheck dos harnesses staging/restore, build e281 unit/integration/Firestore Rules PASS. Logs locais em cloud-transfer.
- Vite6.4.3 tinha novos advisories launch-editor; atualização compatível para6.4.4, sem force/major. Auditoria após patch: runtime0; tooling7 (3high/4moderate), todos na cadeia Firebase CLI registrada. Não executar downgrade major sugerido nem declarar auditoria total limpa.
- Build6.4.4 gera hashes diferentes: `build-patch-parity.json` registra explicitamente identical=false. Não reutilizar os testes do build antigo como aprovação automática do build novo.
- Runner direto por Node falhou com vitest:notfound (127), pois npm não havia preparado PATH. Correção usa executáveis locais fixados pelo lockfile em todas as invocações, mantendo alvo demo/loopback. Primeiro FAIL preservado em cutover-initial-path.log e validation-initial-path.json.
- Ensaio WIP agora rejeita relação entre caravana e organização divergentes, organização de comprovante/despesa divergente do ancestral e caravana contraditória no histórico privado. Não exige campos novos nos filhos legados que os omitem. Teste negativo específico e corpus anterior preservados;18 casos direcionados PASS.
- Validação incremental final:18 testes de cutover/planners,8Auth,6Storage,16 E2E comerciais nas quatro larguras e16 E2E de Financeiro/equipe/gutter em1440/320 PASS. Não somar suites sobrepostas como casos únicos. Lint/typechecks/build PASS. Resultados finais e E2E são registrados em `validation-results.json` / `static-checks.json`; só exitCode0 representa PASS. Relatórios interrompidos ou ainda incompletos não contam como aceites.

## Gate integral da candidata Cloud

Checkpoint fonte51cf4f5 enviado por conector CristianoRFB com árvore idêntica à local, parent remoto exato, expected_sha e force=false; HTTPS local continua associado a Nevez06 sem permissão. Commit local35c4145 preservado em checkpoint/cloud-transfer-local-35c4145, checkout alinhado ao remoto sem reset/force/merge.

CI [39504978890](https://github.com/CristianoRFB/Caravana/actions/runs/39504978890) PASS:282 backend/Rules,8Auth,6Storage e184 E2E numa rodada completa, além de audit runtime/lint/typechecks/build. Números confirmados no log do job118911523591; retries configurados0. JSON sanitizado em cloud-transfer/final-ci.json. Fonte src/Rules/índices permanece igual a8c1340d; o novo compilador tem hashes diferentes e a nova candidata não foi implantada no staging.

O checkpoint final posterior é somente documental, com referência explícita à fonte testada51cf4f5 e [skip ci] para não repetir184 E2E sem alteração executável. Verificar git diff dos commits antes de reutilizar essa evidência para uma mudança futura.

## Staging efetivamente publicado

URL: https://caravana77-staging.pages.dev. Fonte8c1340da2d7e110194bf64aecd6955313d5a79e9, deployment175b982d-91c1-4c73-8b8c-a46af5db1ade. Health público:12 assets/hash/tamanho e cabeçalhos PASS. Cloudflare GET confirmou projeto exato, domínio único, upload direto, sem variáveis ou bindings KV/D1/R2/services nas duas configurações. `environment:production` no deployment refere-se ao ambiente primário do projeto **separado de staging**.

Frontend funcional com Firebase staging conforme evidências anteriores; a conferência pública atual não equivale a repetir login/jornadas SDK. A nova correção de tooling não foi publicada neste staging. Nenhuma operação administrativa Cloudflare de escrita foi executada nesta transferência.

## Acesso externo estritamente necessário

**BLOCKED real, não pedido de autorização rotineira:** CLI local informa “No authorized accounts”; runtime não tem credenciais configuradas; nenhum MCP Firebase chamável disponível. `.env.staging.local` e `.firebase/staging-accounts.json` não foram transferidos. Não copiar credenciais da máquina anterior.

| Operação necessária | Por que precisa do Firebase real | Permissão mínima / limite |
|---|---|---|
| Revalidar identidade do projeto, billing desativado e banco gratuito | Esses estados são remotos e mutáveis | Leitura do projeto (`firebase.projects.get`, `resourcemanager.projects.get`) e banco (`datastore.databases.get`), somente bdall-e3585 |
| Comparar Rules implantadas,11 índices, Auth e Web app existentes | Emulador/Git não provam configuração implantada | Leitura de releases/rulesets, índices (`datastore.indexes.list`), `firebaseauth.configs.get` e `firebase.clients.get`; sem permissão de deploy |
| Renovar jornadas dos três planos e isolamento com contas fictícias existentes | Login real/ACLs/índices não são reproduzidos integralmente pelo emulador | Credenciais novas exclusivamente das contas @caravana77.invalid e direitos já existentes via Rules; SDK de usuário, sem privilégios administrativos |
| Recuperar acesso às contas fictícias se as senhas estiverem inacessíveis | O seeder recusa reset automático de banco existente sem o arquivo original | Operador autorizado pode conferir cinco emails/UIDs sintéticos e atualizar apenas suas senhas, preservando UID/claims/memberships; `firebaseauth.users.get/update` somente no staging. Sem apagar/recriar contas nem conceder Platform Owner |

Não solicitar Owner/Editor, criação de projeto, billing, RulesAdmin ou privilégios em produção para este bloco. As permissões de leitura devem ser atendidas por um papel existente apropriado ou conjunto mínimo revisado; não criar administradores por conveniência. Atualizar senhas de fixtures requer conferir o controle `stagingControl/bootstrap` e correspondência dos cinco UIDs antes da ação, com segredos novos armazenados apenas em arquivo ignorado privado0600, nunca no chat/log/commit. Não executar `seed-staging.mjs` para substituir um staging já populado.

Configuração segura: definir `umask 077` antes de autenticar/gerar arquivos privados; não transferir caches ou segredos anteriores. Usar conta autorizada somente ao staging em sessão privada temporária do Cloud, sem acesso ao projeto de produção. Autenticação interativa oficial com a versão já fixada: `npx --no-install firebase login --no-localhost`, concluída pelo titular no fluxo seguro; não enviar refresh/access tokens ou chaves JSON ao agente. Verificar usuário com `npx --no-install firebase login:list` **sem --json e sem --debug**. Selecionar essa identidade por `STAGING_FIREBASE_ACCOUNT`; não mudar o projeto padrão para produção. Se o ambiente não oferecer isolamento/retenção seguros para a sessão, usar executor privado apropriado e trazer somente resultados sanitizados.

Antes de administrar, `stagingAdmin()` verifica conta selecionada, projeto bdall-e3585/número146882624278/ACTIVE, billing=false/sem conta vinculada, banco(default)STANDARD/freeTier=true. Recusa endpoints emulados, FIREBASE_TOKEN, chave permanente GOOGLE_APPLICATION_CREDENTIALS e caminhos fora do projeto exato. Configuração Web recuperada legitimamente deve passar assertStagingBuild e permanecer ignorada; ela não substitui autenticação administrativa.

Começar somente por auditoria GET (`scripts/audit-staging.mjs`, `scripts/audit-staging-auth.mjs`) e comparar os artefatos antes de decidir qualquer alteração. Nenhuma mudança de Rules/índices/Auth é necessária por causa do patch Vite/runner desta retomada. Depois de credenciais fictícias válidas, renovar a suíte opt-in `STAGING_CONFIRM_PROJECT=bdall-e3585 npm run test:staging`. Nunca usar contas ou dados do Ítalo; manter `caravana-af306` e `caravana-77` fora dos destinos. Revogar/encerrar a sessão temporária ao terminar, sem apagar dados do staging.

## Limites finais

Inventário real, schema, backup/restore de Firestore+Auth+objetos e rollback coordenado continuam BLOCKED. O restore fictício não comprova recuperação de dados do Ítalo. Não migrar/publicar em produção; não provisionar Storage pago nem ativar Blaze. Parecer e17 gates: MIGRATION_READINESS_FINAL.md. A etapa externa é acesso/configuração segura e prova operacional, não uma nova decisão de produto.
