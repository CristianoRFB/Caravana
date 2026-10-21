# Firebase somente leitura — Codex Cloud e Android

## Diagnóstico sanitizado do consumidor — atualização F7

A ferramenta agora registra somente serviços Google de lista fixa, permissões mínimas reconhecidas e classificação do consumidor STAGING_PROJECT/OTHER_PROJECT/UNRECOGNIZED. Não publica outro ID de projeto, activationUrl, mensagem bruta, token ou metadados arbitrários.23 guards offline PASS. Isso prepara o diagnóstico do403 sem habilitar API, alterar quota project, conceder IAM ou repetir OAuth. O relatório anterior não continha esses campos: sua causa exata continua desconhecida; não reinterpretá-lo como autenticação resolvida.

## Relatório real recebido — 2026-10-21

Relatório do operador executado no Cloud Shell em2026-10-20T23:57:26Z, scriptdb99675/SHA363c307d…, validado em auth-recovery/operator-staging-readonly.json e operator-report-validation.json. Identidade/projeto corretos, billing=false, Standard/freeTier;11/11 índices READY/hash compatível. Rules hash bruto41388c5f… difere, LF-normalizado8acafe75… igual à candidata: diferença compatível com quebras de linha, sem alteração ou bypass do guard estrito.

Auditoria parcial BLOCKED em Auth403/PERMISSION_DENIED/SERVICE_DISABLED. O relatório não inclui consumidor/serviço do ErrorInfo; não comprova API desativada no projeto-alvo nem falta de firebaseauth.configs.get. Não habilitar APIs, conceder IAM ou repetir login automaticamente. Próximo bloqueio externo: GET da configuração Auth, com firebaseauth.configs.get e serviço disponível no consumidor correto; diagnosticar consumidor antes de propor configuração. Sessão gerenciada, alvo fixo bdall-e3585, sem códigos/chaves compartilhados. Autorização vigente somente leitura.

CI integral db99675 PASS (run39513331460):20 guards,282 backend/Rules,8Auth,6Storage,184 E2E; lint/typechecks/build PASS. Run39511925824 anterior terminou cancelled, não PASS. Código da aplicação/Rules não mudou. Nenhum deploy, custo, leitura de documentos de negócio ou modificação de projeto. F6 mantém PASS local; F7/F8/produção BLOCKED. Matrizes5/14 e6/17 preservadas. Cloud Shell não autentica o Codex; duas consultas atuais ao runtime retornaram configuration changed, sem readiness GCP comprovada.

Restrição vigente: identidade indicada `crisf.bueno10@gmail.com`, exclusivamente leitura do staging **bdall-e3585** (número146882624278). Produção **caravana-af306** fica fora dos destinos. Não conceder IAM, criar projetos/chaves, habilitar APIs/billing, alterar Auth/Rules/índices ou executar jornadas SDK com escritas nesta fase. Esta restrição prevalece sobre permissões históricas de administração de staging.

## Resultado recebido pelo Android e ajuste da consulta

A captura enviada pelo operador mostra identidade e projeto verificados, billing desativado, Standard/freeTier confirmado e leitura do ruleset concluída. Portanto, a autenticação no **Cloud Shell** funcionou; o Codex continua sem identidade GCP própria. Evidência parcial do operador, não auditoria integral: execução antiga interrompida com **indexes_http_400**, Rules candidateMatch=false e Auth ainda não consultado. Não é evidência de falta de IAM, nem motivo para pedir Owner ou fazer novo login.

A consulta de índices foi alinhada ao Firebase CLI15.34.0, removendo o parâmetro opcional pageSize. A API discovery pública documenta esse parâmetro; sua presença não comprova a causa do400. A causa exata permanece pendente da nova execução. O relatório agora inclui somente status/razões/campos de erro de listas fixas; nunca inclui mensagens brutas, tokens ou metadados arbitrários. A impressão digital LF-normalizada das Rules ajuda a distinguir quebra de linha, mas **não substitui candidateMatch nem libera o gate**. Nenhuma correção remota é automática.

## Diagnóstico do login anterior

A orientação anterior pressupunha um terminal do Cloud acessível ao usuário; essa disponibilidade não foi comprovada. O PTY das ferramentas do agente não é uma interface de entrada do usuário Android. Não pedir autorização/códigos pelo chat, nem substituir o prompt por `firebase login '<código>'`.

Firebase CLI15.34.0 é também a versão atual consultada no registro; Node24.19.0 atende aos engines. O código oficial do CLI detecta agentes de IA e define nonInteractive mesmo quando stdin é TTY. A opção oficial `--interactive` prevalece sobre essa detecção. Não houve necessidade de atualizar pacotes, remover variáveis de rede ou modificar o CLI instalado.

O estado PKCE temporário anterior foi descartado pela API local configstore.delete(tempLoginState), sem ler/excluir credenciais existentes. Não havia conta autenticada. Nova sessão executada com `firebase login --no-localhost --interactive --reauth`: prompt `Enter authorization code:` alcançado; origem oficial e os parâmetros code_challenge/session/attest presentes, únicos e com formato válido. A URL exata recebeu HTTP302 para accounts.google.com na verificação feita a partir do Cloud. Os valores não foram publicados nem incluídos na evidência. A sessão foi cancelada sem código. Não reutilizar a URL anterior.

Isso comprova um fluxo novo válido no servidor, não um teste do navegador Android. A causa específica do invalid_request anterior **não foi estabelecida**; não atribuir a truncamento, expiração ou incompatibilidade Android sem evidência. Houve uma falha independente de procedimento: sugerir entrada em um terminal do qual o usuário não dispõe.

Se um terminal interativo realmente acessível ao usuário existir, o código só deve ser inserido no prompt **Enter authorization code:** da mesma sessão ainda aberta, nesse terminal privado. Nesta interface não há mecanismo confirmado para o usuário digitar no PTY do agente. Portanto, não abrir outras sessões OAuth esperando código pelo chat.

## Caminho operacional pelo Android: Google Cloud Shell

Este caminho executa a leitura no Google Cloud Shell e entrega ao Codex somente evidências sanitizadas. Não autentica magicamente o runtime Codex nem transfere seu cache de credenciais. Usa a sessão Google gerenciada do próprio usuário, sem chave de service account, Firebase CLI ou computador da faculdade.

1. No Chrome Android, entrar como crisf.bueno10@gmail.com em **https://shell.cloud.google.com/?project=bdall-e3585**. Se o terminal não aparecer, ativar **Site para computador** no menu do Chrome. Abrir o terminal do Cloud Shell, não o editor. Se a conta não tiver Cloud Shell disponível, registrar a limitação; não habilitar billing nem criar projeto para contorná-la.
2. Concluir a autorização **Authorize Cloud Shell**, apresentada pelo Google para permitir o uso da sessão existente. Não enviar códigos/tokens ao chat. Essa autorização não concede novas permissões IAM ao usuário. Selecionar o projeto existente bdall-e3585; não criar projetos ou recursos. Cloud Shell é gratuito segundo a documentação oficial, sujeito às quotas/condições do serviço.
3. Executar o script versionado `scripts/staging-readonly-audit.py` em uma revisão fixa da branch autorizada. Revisão com23 testes locais PASS. O download abaixo fixa o commit a7b5785 da branch autorizada e exige o SHA256 exato desta ferramenta antes da execução; se o arquivo mudar, a verificação falha e Python não roda:

```bash
umask 077
curl -fsS 'https://raw.githubusercontent.com/CristianoRFB/Caravana/a7b5785e8ab3b67c45f8f5b1916d68580ae61298/scripts/staging-readonly-audit.py' -o /tmp/caravana-staging-readonly.py &&
printf '%s  %s\n' '7139bd458f893bc1bb6abc4bebc53794614b50ee4e68712fd1f31fcdd2b7df10' '/tmp/caravana-staging-readonly.py' | sha256sum -c - &&
python3 /tmp/caravana-staging-readonly.py --output /tmp/caravana-staging-readonly.json
```

Se o download falhar, não executar arquivo antigo de outra sessão: conferir o curl antes de executar Python. O script contém os hashes de Rules/índices esperados da candidata e registra seu próprio SHA256. Não possui flag para escolher outro projeto. Não executar com debug ou substituir seu conteúdo por comandos de deploy.

4. O resultado deverá ser PASS_STAGING_READONLY_CONFIGURATION ou BLOCKED com motivo sanitizado. Só após execução real pode-se considerar esse aceite remoto. Para baixar **apenas o relatório sanitizado**, usar no próprio Cloud Shell:

```bash
cp /tmp/caravana-staging-readonly.json ~/caravana-staging-readonly.json
cloudshell download ~/caravana-staging-readonly.json
```

Cloud Shell exige que o arquivo baixado esteja na pasta pessoal; a cópia acima contém somente o relatório sanitizado. Esse JSON pode ser apresentado ao Codex como evidência do operador. Não enviar caches gcloud/ADC/Firebase, tokens, senhas, URLs OAuth ou chaves. Sem relatório real, a auditoria remota continua BLOCKED; testes locais do script não são homologação do Firebase.

## O que a auditoria pode fazer

Antes de ler qualquer projeto, verifica a conta ativa do gcloud e a identidade com email verificado no endpoint oficial Google. Tokens de curta duração são obtidos internamente da sessão gerenciada, em memória/pipe privado; nunca são exibidos, aceitos como argumento, gravados em relatório ou enviados pelo chat. No caminho Cloud Shell, permanecem nesse ambiente.

O cliente só faz GET para uma allowlist fixa: identidade do operador, Firebase project, billingInfo, banco(default), release/ruleset Firestore atual, índices compostos (resposta limitada a2MB; paginação bloqueia aceite parcial) e configuração Auth. Rejeita redirects e nomes de ruleset/índice externos ao projeto. Confere número/estado do projeto, billing=false/sem conta vinculada, Standard/freeTier, hashes de Rules e índices READY, Email/Password, enumeração, política de senha e domínio de staging. Paginação incompleta, divergência,403 ou identidade errada bloqueiam o aceite; não há tentativa automática de corrigir a configuração remota.

Não lê passageiros/documentos de negócio, usuários Auth, hashes de senha, comprovantes, objetos Storage, finanças ou produção. Não possui POST/PATCH/PUT/DELETE para Firebase. A renovação normal de credenciais pelo provedor OAuth é autenticação, não alteração de projeto. O relatório não certifica isolamento/backup/compatibilidade de produção e não fecha os17 gates do GOAL.

### Permissões mínimas já existentes

| Leitura | Permissão necessária |
|---|---|
| Projeto Firebase | firebase.projects.get |
| Estado de billing do projeto | resourcemanager.projects.get |
| Banco | datastore.databases.get |
| Release/ruleset conhecidos | firebaserules.releases.get e firebaserules.rulesets.get |
| Índices compostos | datastore.indexes.list |
| Configuração Auth | firebaseauth.configs.get |

Não solicitar Owner/Editor/RulesAdmin/AuthAdmin, leitura de documentos reais, criação de chaves ou permissão na produção. O agente não criará papéis nem alterará IAM neste fluxo. Se faltar alguma permissão existente, registrar BLOCKED com o recurso que retornou403; não habilitar serviços ou conceder privilégios automaticamente. O script restringe as operações mesmo se a conta Google tiver outros acessos.

## Execução não interativa diretamente no Codex

O modo `--auth-source managed-adc` usa Application Default Credentials, recomendado oficialmente para CI/headless. Requer uma **conexão GCP gerenciada já autorizada** configurada pelo fluxo seguro do ambiente, sem JSON de chave, FIREBASE_TOKEN ou tokens colados em variáveis/chat. A configuração deve representar a identidade indicada e somente os direitos necessários ao staging. Não criar pool WIF, service account ou vínculo IAM neste fluxo de leitura.

O plugin runtime informa que mudanças de configuração passam pelo workflow de ambiente e revisão do usuário; isso é um controle da plataforma, não nova autorização para administrar Firebase. Se essa interface não oferecer conexão GCP, manter este caminho BLOCKED e usar Cloud Shell. Não inventar uma conexão a partir do email.

Após o setup, o agente deve conferir environment_status: observações atuais e estado ready da identidade selecionada. O runtime fornece o manifesto não secreto OIC_MANIFEST_PATH e alias da conexão. Selecionar o alias real por CARAVANA_GCP_IDENTITY_ALIAS; não inventá-lo nem escolher outro default. O script exige manifesto v1, conexão GCP única e seletores completos, usa os paths como seletores SDK sem ler/imprimir seu conteúdo, e recusa credenciais service_account com chave privada antes de renovar o token.

Dependências opcionais em venv privado ignorado:

```bash
umask 077
python3 -m venv .firebase/readonly-audit-venv
.firebase/readonly-audit-venv/bin/python -m pip install -r scripts/staging-readonly-requirements.txt
.firebase/readonly-audit-venv/bin/python scripts/staging-readonly-audit.py --auth-source managed-adc
```

O nome do alias é configuração não secreta; o principal é confirmado pelo endpoint de identidade antes de qualquer Firebase GET. Não copiar credenciais do computador anterior. Atualmente não há binding/identidade GCP gerenciada neste runtime: o preflight retorna BLOCKED sem chamadas de projeto. Criar venv e testar guards não configura autenticação nem IAM.

## Validação independente concluída

20 testes offline (16 anteriores e4 novos para consulta sem parâmetros, diagnóstico sanitizado, corpos de erro inválidos/grandes e Rules CRLF sem bypass): identidade/projeto divergentes, produção e rotas não permitidas, redirect, ruleset adulterado, billing/banco, Rules/índices/paginação, Auth, ausência de setup, chave privada recusada, erros sanitizados, sessão gcloud e arquivo de relatório privado0600. Dependências ADC importadas no Linux; nenhum teste faz autenticação real ou consulta Firebase. CI ganhou essa suíte antes da regressão existente; a etapa dos16 guards concluiu PASS no run39511925824, fonte6ee1bb2. O workflow integral ainda estava em execução na observação registrada; não foi declarado PASS nem equivalente à autenticação Firebase real. Não reexecutar toda a regressão frontend local para uma ferramenta de leitura separada.

Evidências: evidence/2026-10-20/auth-recovery/. Preflights reais do Codex: gcloud indisponível e conexão GCP não configurada, ambos com lista de requisições vazia. A aplicação e Rules permanecem sem alteração.

Fontes oficiais consultadas em2026-10-20:

- https://firebase.google.com/docs/cli — ADC recomendado para CI/headless; FIREBASE_TOKEN legado.
- https://cloud.google.com/shell/docs/auth — autorização gerenciada de ferramentas no Cloud Shell.
- https://cloud.google.com/shell/docs/using-cloud-shell — terminal no navegador e modo efêmero.
- https://cloud.google.com/shell/pricing — Cloud Shell gratuito, sujeito às condições do serviço.
