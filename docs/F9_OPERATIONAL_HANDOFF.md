# F9 — desbloqueio operacional e homologação real

## Leitura Auth recuperada — evidência do operador

PASS_AUTH_ADMIN_READ_ONLY recebido e validado; seleção explícita resolveu o GET nessa sessão, sem comprovar causa raiz histórica ou políticas Auth. Ferramenta39c2b95 integra cabeçalho apenas à URL Auth staging e diagnóstico de line endings,26 guards PASS. [AUTH_READ_RECOVERED_2026-10-21.md](AUTH_READ_RECOVERED_2026-10-21.md) contém o único procedimento Android atualizado e o escopo futuro de homologação com escritas, ainda não autorizado. Guard bruto Rules mantido; sem gate integral novo (F7 9/10,F8 5/14,GOAL6/17). Produção intocada.

## Recuperação e conclusão desta execução

Remoto recuperado b15011c, branch codex/caravana77-commercial-v1-20261016; posterior a cb321f5. Nenhuma implementação funcional nova necessária identificada. Runtime61 current/running/connected, rede unrestricted/enforced, sem identities/secrets/runtime variables; OIC_MANIFEST_PATH e seletores ADC/GCP ausentes, gcloud indisponível. Nenhum fluxo OAuth, cache antigo ou credencial de produção utilizado. Esse é o bloqueio de acesso atual, distinto do403 histórico do Cloud Shell.

Mudança desta revisão: procedimento Android fixado em commit imutável a7b5785, conservando script existente e SHA2567139bd458f893bc1bb6abc4bebc53794614b50ee4e68712fd1f31fcdd2b7df10. Download remoto real e hash PASS. Nenhuma mudança em aplicativo, Rules, índices, dependências ou ferramentas da auditoria. Sem testes novos de aplicação/CI nesta revisão documental, sem repetição da regressão184 E2E. CI39540369156 permanece evidência dos arquivos inalterados de a7b5785; novas ferramentas de253067b/b15011c têm evidências próprias em convergence. Não atribuir o CI antigo à documentação nova.

Audit executado novamente: runtime0; tooling5 entradas (3high/2moderate): braces, chokidar, firebase-tools, @opentelemetry/core e @google-cloud/pubsub. São cadeias transitivas, não cinco falhas independentes. Sugestão automática firebase-tools14.23.0 é downgrade major, não correção aprovada; contratos braces/core já analisados em DEPENDENCY_SECURITY. Nenhum patch compatível novo comprovado, nenhum override major adicional. CLI somente em ambiente privado, emuladores loopback/fixtures conhecidas; isso mitiga exposição e não elimina advisories.

## Diagnóstico do403: o que se sabe e o que falta

| Pergunta | Resposta comprovada |
|---|---|
| Operação bloqueada | GET https://identitytoolkit.googleapis.com/admin/v2/projects/bdall-e3585/config |
| Projeto-alvo | bdall-e3585 / número146882624278; alvo não prova consumidor OAuth/quota |
| Consumidor da falha antiga | Desconhecido: relatório anterior omitiu ErrorInfo.metadata.consumer |
| Serviço que gerou SERVICE_DISABLED | Não identificado no relatório antigo; hostname é identitytoolkit.googleapis.com, sem inferir metadata.service |
| Permissão/API/quota/identidade | Causa raiz ainda não determinada. SERVICE_DISABLED não basta para concluir falta de firebaseauth.configs.get nem API desativada no alvo |
| Rede/Auth público | Última execução pública real: HTTP200 no projeto correto, domínio autorizado e senha ENFORCE/min12; não repetida aqui |
| Intervenção mínima | Rodar a auditoria atual no Cloud Shell já autenticado e devolver somente JSON sanitizado |

O script já captura serviço permitido, consumidor STAGING_PROJECT/OTHER_PROJECT/UNRECOGNIZED e permissões conhecidas. Se consumidor=OTHER_PROJECT, não trocar quota project nem habilitar API automaticamente: responsável verifica o consumidor real privadamente. Se serviço/campos continuarem ausentes, causa permanece desconhecida. Se API responder200 mas a política divergir, é configuração a revisar, não falha de rede. Se erro indicar IAM, confirmar a permissão específica antes de propor grant; nenhuma concessão autorizada agora.

## Android — executar agora, somente leitura

1. No Chrome abrir https://shell.cloud.google.com/?project=bdall-e3585 com a conta indicada anteriormente. Usar Site para computador se necessário, abrir **terminal**, aceitar Authorize Cloud Shell do próprio Google. Não usar editor como terminal. Não ativar API/billing nem criar projeto. Se indisponível, parar e comunicar apenas a limitação.
2. Colar este bloco completo. Ele baixa a revisão fixa, confere integridade e executa a auditoria existente. A identidade é validada internamente antes de qualquer leitura Firebase; identidade errada bloqueia. Tokens permanecem em memória no Cloud Shell, não são argumentos nem relatório.

```bash
(
  set -eu
  umask 077
  curl -fsS 'https://raw.githubusercontent.com/CristianoRFB/Caravana/a7b5785e8ab3b67c45f8f5b1916d68580ae61298/scripts/staging-readonly-audit.py' -o /tmp/caravana-staging-readonly.py
  printf '%s  %s\n' '7139bd458f893bc1bb6abc4bebc53794614b50ee4e68712fd1f31fcdd2b7df10' '/tmp/caravana-staging-readonly.py' | sha256sum -c -
  python3 /tmp/caravana-staging-readonly.py --auth-source gcloud --output /tmp/caravana-staging-readonly.json
)
```

Resultado BLOCKED faz Python sair com código1 e ainda grava relatório; isso não significa que o download falhou. Se curl/hash falharam, não baixar um relatório antigo. Conferir checkedAt/scriptSha256 impressos na rodada atual. Não repetir indefinidamente nem executar comandos sugeridos para habilitar serviços.

3. Após confirmar que o JSON foi produzido nesta rodada, colar separadamente:

```bash
if [ -f /tmp/caravana-staging-readonly.json ]; then
  cp /tmp/caravana-staging-readonly.json "$HOME/caravana-staging-readonly.json" &&
  chmod 600 "$HOME/caravana-staging-readonly.json" &&
  cloudshell download "$HOME/caravana-staging-readonly.json"
fi
```

Anexar somente caravana-staging-readonly.json. Não anexar arquivos de conta, caches, chaves ou credenciais. Uma execução basta; a próxima ação será orientada pelos campos sanitizados, sem pedir códigos/token. Se download do script retornar403/404, não executar cache antigo: a revisão/hash foram acessíveis nesta sessão, mas a disponibilidade futura não é garantida.

Permissão mínima para Auth: firebaseauth.configs.get. Leituras auxiliares: firebase.projects.get, resourcemanager.projects.get, datastore.databases.get, datastore.indexes.list, firebaserules.releases.get e firebaserules.rulesets.get. Não solicitar Owner/Editor. O script tem allowlist de GET e alvo fixo, não lê documentos de negócio/usuários/comprovantes e não permite produção. Detalhes: FIREBASE_READONLY_ANDROID.md. Autenticação Cloud Shell não autentica o runtime Codex.

## Homologação preparada — não executada / sem autorização de escrita

Candidata local previamente compilada253067b, publicado8c1340d. Comparação real anterior:13/15 arquivos de manifesto iguais, incluindo12 assets e headers; HTML/redirects distintos. Não houve mudança de src/Rules/índices/lock desde a comparação, portanto não foi repetida. Nenhum deploy novo. Guardar source, SHA256 de artefatos/configuração e relatório somente leitura da rodada antes de concluir paridade.

| Etapa futura | Procedimento existente / prova necessária | Limite atual |
|---|---|---|
| Identidade/configuração | Auditoria fixa: principal, número, billing=false, Standard/freeTier, Auth/política/domínio, hashes Rules e índices11/READY | Leitura autorizada; execução real depende Cloud Shell/identidade |
| Preparação da candidata | build:staging; assertStagingBuild; manifesto e comparação exata; headers/CSP/noindex | Já preparado; não implica publicação |
| Planos/diferenciais | staging-tests/functional-tools.test.ts: Essencial sem privilégio Pro, relatórios Pro e roteiros/modelos Premium; preservar CORE e downgrade/histórico | Testes têm escritas: NÃO executar agora |
| Operação/isolamento | staging-tests/functional.test.ts: A×B, reservas/replay/concorrência, check-in, ledger fictício, quotas/equipe/revogação | Exige autorização específica e identidades fictícias legítimas gerenciadas; não bootstrap/reset |
| Documentos/links | PDF/comprovante inline Firestore <=600KiB, download autorizado e negativas B/global/revogado; revogação explícita do link opaco do portal | Não expor links reais; fluxo Storage legado continua separado |
| UI real/mobile | Depois da candidata coordenada: desktop e320/375/768/1440, login/planos/financeiro/PDF/erros sem PII | Oito checks offline existentes não são homologação real |
| Retorno staging | Identificar deploy anterior exato, Rules/Auth/índices e fixture antes/depois; manifestos/backups privados, restauração isolada e ensaio coordenado | Rollback frontend não reverte dados/Rules/Auth/índices. Não executar rollback/deploy agora |

Não rodar `npm run test:staging` nesta etapa: inclui jornadas com escritas. Mesmo readonly.test.ts faz login SDK e requer credenciais de fixture; não executar sob interpretação ampla de leitura administrativa. Testes preparados não são testes aprovados. Nenhuma senha inventada/resetada e nenhum grant/membership criado. Não publicar somente frontend se dependências coordenadas não estiverem comprovadas.

## Operação gratuita preparada, ainda não homologada

Procedimentos existentes FINAL_OBSERVABILITY e health público são reutilizados, não substituídos. Operador designado pode executar health fixo manualmente antes/depois de uma alteração futura e em incidentes; conferir SHA/status/cabeçalhos, registrar apenas horário/código/resultado. Diagnósticos do aplicativo são locais/temporários/sanitizados, não alertas remotos. Falha de health: suspender lançamento, investigar read-only e acionar responsável por canal já autorizado, sem anexar PII ou disparar mensagens automaticamente.

No console existente, verificar uso/quotas/erros Auth/Firestore e estado de serviços em leitura; nenhuma configuração de billing/log export/retention/sink ou monitor pago. Registrar responsável, frequência e canal reais antes do aceite operacional. Esse roteiro manual não fecha o requisito de alertas proativos. Proteção de abuso backend Spark continua pendente: analisar provedor/compatibilidade App Check e quotas da configuração real antes de rollout; não configurar chaves, CAPTCHA, enforcement ou API agora. Throttle frontend/contato neutro/noindex não são proteção backend. Nunca ativar enforcement sem prova de compatibilidade e retorno.

## Estado dos20 grupos existentes

| Grupos | Estado e evidência |
|---|---|
| 1 Recuperação;2 tenant/RBAC;3 equipe/convites;4 quotas/concorrência;5 reservas/check-in | IMPLEMENTED/LOCAL_TESTED; F0–F6/CI da aplicação inalterada |
| 6 Documentos;7 CSV;8 financeiro/ledger;9 white-label | IMPLEMENTED/LOCAL_TESTED; contratos preservados |
| 10 Onboarding/planos;11 relatórios Pro;12 roteiros Premium;13 landing/demo;14 mobile/erros/downgrade | IMPLEMENTED/LOCAL_TESTED; homologação real atual pendente |
| 15 CI/emuladores;16 diagnósticos/health;17 ferramentas de recuperação sintética | IMPLEMENTED/LOCAL_TESTED no escopo documentado |
| 18 Alertas proativos ativos | BLOCKED operação/responsável/canal/configuração real |
| 19 Proteção efetiva de abuso backend | BLOCKED configuração/rollout Spark real |
| 20 Advisories tooling | BLOCKED correção compatível upstream/reteste |

Técnico17/20=85%; F7 preparação isolada9/10; F8 publicação5/14; GOAL6/17≈35%. Nenhum gate integral novo fechado. Esses denominadores não medem prontidão comercial diretamente.

## Três pareceres independentes

| Cenário | Estado | Evidência para aceite |
|---|---|---|
| A — Funcional para novos tenants | **GO funcional local/sintético**, com limites | Contratos dos três planos, RBAC/quotas/financeiro/UX no CI; não significa onboarding comercial real autorizado/homologado |
| B — Lançamento SaaS multi-tenant | **NO-GO operacional** | Auditoria/configuração real atual, jornadas coordenadas fictícias da candidata, abuso/alertas, recuperação/retorno e destino comercial independente autorizado. Não aceitar dados pessoais de clientes no staging fictício |
| C — Migração do Ítalo | **NO-GO / NOT_READY_FOR_MIGRATION** | Inventário privado real de identidades/schema/objetos/links/IAM, backup/restauração isolada, compatibilidade e retorno coordenado reais. Migração real não autorizada |

A não depende conceitualmente de C. B tem seus próprios requisitos mesmo que não exista migração. C não pode ser aprovado por testes sintéticos ou pelo funcionamento do staging. Matriz detalhada complementar COMMERCIAL_GO_NO_GO_2026-10-21.md.

## Ponto de parada

Nenhuma escrita remota, deploy, mudança IAM/API/Rules/Auth/índice/billing, migração ou produção acessada. Única próxima intervenção imediata: executar o bloco Android e fornecer somente o relatório sanitizado atual. Não criar novas tarefas nem repetir diagnósticos sem nova identidade/evidência. Depois do relatório, decidir a correção mínima real; escritas/homologação ficam condicionadas a autorização específica futura. Estimativa2–4 ciclos após insumos externos completos, não promessa de encerramento com mais ciclos sem acesso.
