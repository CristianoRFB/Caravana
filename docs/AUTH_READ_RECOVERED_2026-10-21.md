# Leitura Auth recuperada — continuidade de homologação

## Evidência real e diagnóstico atualizado

Relatório do operador recebido: TARGETED_AUTH_QUOTA_PROBE / PASS_AUTH_ADMIN_READ_ONLY, projeto bdall-e3585, consumidor solicitado STAGING_PROJECT, identity/project/auth consultados, httpDiagnostics vazio, zero writes e produção=false. Estrutura conferida contra o procedimento imutável proposto; evidência em evidence/2026-10-21/auth-unblocked/operator-auth-quota-probe.json. É evidência da execução do operador, não autenticação transferida ao runtime. O JSON não tem timestamp/hash do executor nem resposta Auth: não comprova a política, consumidor efetivo retornado pelo servidor ou auditoria integral.

O cabeçalho explícito resolveu a leitura administrativa nessa sessão, depois de falha anterior SERVICE_DISABLED com consumidor OTHER_PROJECT. A diferença entre os caminhos é compatível com seleção implícita de consumidor pelo contexto OAuth; não identifica definitivamente o projeto externo nem a causa raiz histórica. Não chamar isso de API ativada ou grant IAM. Nenhuma alteração de API/IAM/billing foi necessária ou executada pelo Codex.

## Correção implementada e limites

Fonte39c2b95dc1a4c0c99655e86e6891b8b1214aadfc: Reader envia x-goog-user-project:bdall-e3585 exclusivamente quando a URL é exatamente ROUTES.auth; método sempre GET. Não muda gcloud/ADC/quota persistente, não aceita outro projeto/endpoint, não segue redirects e não lê env para substituir consumidor. Identidade/número/billing/freeTier continuam pré-condições da auditoria integral. Relatório registra consumidor **solicitado**, sem alegar que a resposta200 identifica consumidor efetivo.

Rules: relatório passou a incluir tamanho UTF8 e contagens CRLF/loneCR/loneLF, além dos hashes bruto e LF-normalizado existentes. Não publica o conteúdo das Rules nem altera RULES_SHA256. Normalização continua apenas diagnóstico; hash bruto divergente bloqueia PASS mesmo com Auth200. Os índices coincidentes11/11READY têm aceite próprio, sem aprovar a política Auth.

26 guards direcionados PASS, incluindo exclusividade do cabeçalho em todas as rotas permitidas, ambiente com outro quota project sem override, recusa de produção/queries/rotas adicionais antes da rede, manutenção do GET/Authorization/redirect guard, Rules com CRLF/CR mistos continuando BLOCKED e metadados sem conteúdo. Primeira execução falhou por Mock sem context manager e Python sem google-auth; corrigido o mock e usado o venv privado já previsto,26PASS. Logs inicial/final preservados. Nenhum defeito de app atribuído a esse setup. App/Rules/índices/lock inalterados: sem184 E2E repetidos; skip ci intencional da ferramenta isolada, sem atribuir CI antigo ao helper novo. CIa7b5785/39540369156 permanece aplicável somente ao aplicativo/configuração inalterados.

## Único procedimento Android agora — auditoria integral atualizada, somente leitura

No terminal de https://shell.cloud.google.com/?project=bdall-e3585 com a conta autorizada, aceitar a autorização do Google. O bloco abaixo fixa a revisão da ferramenta e seu SHA256. Confere identidade/projeto/custo/banco/Rules/índices, aplica a seleção aprovada somente ao GET Auth e publica somente flags de política e diagnósticos sanitizados. Não exibe tokens, listas de usuários, domínios extras ou mensagens de erro brutas.

```bash
(
  set -eu
  umask 077
  curl -fsS 'https://raw.githubusercontent.com/CristianoRFB/Caravana/39c2b95dc1a4c0c99655e86e6891b8b1214aadfc/scripts/staging-readonly-audit.py' -o /tmp/caravana-staging-readonly.py
  printf '%s  %s\n' '6f7e8b48b4979083c870a75e088bc4bf42311fd81dca9b295c99fd11566dd8f4' '/tmp/caravana-staging-readonly.py' | sha256sum -c -
  python3 /tmp/caravana-staging-readonly.py --auth-source gcloud --output /tmp/caravana-staging-readonly-current.json
)
```

Se Python terminar BLOCKED, o relatório ainda é produzido; o motivo pode agora ser o guard bruto das Rules. Conferir checkedAt/scriptSha256 da rodada atual antes do download. Se curl/hash falhar, não usar relatório antigo. Após a execução produzir o JSON atual, colar separadamente:

```bash
cp /tmp/caravana-staging-readonly-current.json "$HOME/caravana-staging-readonly-current.json" &&
chmod 600 "$HOME/caravana-staging-readonly-current.json" &&
cloudshell download "$HOME/caravana-staging-readonly-current.json"
```

Anexar somente esse JSON. Não repetir login, teste isolado ou auditoria antiga. Não habilitar serviço, mudar IAM/billing, fazer deploy ou alterar Rules para obter PASS. Faltando permissão, preservar diagnóstico e parar.

## Caminho mínimo para homologação comercial de novos tenants

1. Obter relatório acima: política Auth (email/password, anonymous desabilitado, enumeração protegida, senha ENFORCE/min12 e domínio), identidade/custo, índices e bytes/line endings atuais.
2. Resolver a reconciliação de integridade das Rules por revisão de evidência; manter gate estrito. Nenhuma correção remota automática. Candidata frontend local253067b versus publicado8c1340d permanece como em STAGING_CONVERGENCE; não fingir deploy da candidata nova.
3. Revisar fixtures/contas fictícias e configuração coordenada da candidata; não adivinhar/resetar senhas nem criar memberships.
4. Antes de executar jornadas remotas com mudanças, apresentar e obter autorização específica para o escopo abaixo. Só então executar harnesses existentes no staging e registrar prova da revisão realmente publicada. Alertas/abuso/backend ainda exigem controles próprios reais. Migração do Ítalo não é requisito para tenant novo independente.

| Operação | Classe / limite |
|---|---|
| Auditoria fixa metadata/Rules/índices/Auth | GET, somente leitura autorizada |
| Manifesto/HTML/assets/health | GET público; não equivale a jornada funcional |
| Login SDK e readonly.test.ts com credenciais fictícias | Auth pode atualizar metadados de acesso; exigir confirmação do escopo/identidades antes de usar; não foi executado |
| Onboarding/primeiro owner/memberships/branding/plano | Escritas fictícias: autorização específica, fixtures conhecidas e baseline antes/depois |
| Reservas/replay/concorrência/check-in/financeiro/PDF | Escritas fictícias: valores/documentos exclusivamente sintéticos, ACL/A×B e histórico auditável |
| Convites/revogação/quotas/suspensão/relatóriosPro/roteirosPremium | Escritas fictícias e estados de plano/membership; validar negativas e preservar histórico |
| Frontend/Rules/índices/Auth/fixtures novas | Deploy/configuração/seed fora da autorização atual; não executar |

**Escopo a submeter futuramente:** executar functional.test.ts e functional-tools.test.ts somente nas organizações de fixture conhecidas, com contas em caravana77.invalid, sem produção, bootstrap/reset, recursos pagos ou dados pessoais reais. Registrar IDs/cenário/baseline em área privada, executar reservas/cancelamento/arquivamento, convites/revogação, operações financeiras fictícias auditadas, relatórios/roteiros e documentos de fixture. Retorno: cancelar/arquivar/revogar apenas recursos criados pela rodada conforme harness; preservar ledger/auditoria/histórico, sem apagar eventos nem restaurar banco sobre baseline. Mudanças em entidades pré-existentes precisam de lista e procedimento revisados antes da autorização; não prometer reversão financeira por apagar registros. Deploy coordenado e retorno de frontend/Rules/Auth/índices são solicitações separadas, com artefatos anteriores identificados e ensaio isolado, sem reversão improvisada de dados.

## Gates reais

Novo subresultado: **PASS leitura administrativa Auth na sessão do operador**. Não fecha gate integral. F7 preparação9/10; F8 publicação5/14; GOAL6/17; técnico17/20. Política Auth integral e Rules brutas ainda pendentes. Novos clientes: GO funcional local, NO-GO operacional/homologação comercial. Ítalo: NOT_READY_FOR_MIGRATION e produção intocável; inventário/backup/restore/compatibilidade/retorno reais permanecem separados.

Sem deploy ou escrita remota pelo Codex. Nenhuma permissão nova, Blaze ou migração. Próximo passo único é relatório atualizado de leitura; sem pedir credenciais ou código pelo chat.
