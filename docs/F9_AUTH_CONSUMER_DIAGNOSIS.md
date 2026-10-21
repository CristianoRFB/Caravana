# Auth — diagnóstico específico do consumidor, relatório real04:20:03Z

Relatório do operador validado: scriptSHA7139bd45…, identidade/projeto corretos; auth403/PERMISSION_DENIED, reasonSERVICE_DISABLED, serviceidentitytoolkit.googleapis.com, consumerOTHER_PROJECT. Evidência f9/operator-readonly-consumer.json. Não é falha de download/emulador nem prova de falta de firebaseauth.configs.get. Não habilitar API ou conceder IAM.

## Por que alvo e consumidor divergem

O script fixa o recurso bdall-e3585 na URL. Obtém token por gcloud auth print-access-token --project=bdall-e3585, porém sua chamada REST envia somente Authorization, sem x-goog-user-project. A seleção do recurso/flagproject não instrui o cliente urllib a atribuir quota ao mesmo projeto. O backend está escolhendo outro consumidor; associação ao projeto do cliente OAuth é uma hipótese compatível com esse fluxo, não identificação comprovada do ID externo. O relatório deliberadamente não publica esse ID.

Configurações gcloud billing/quota_project ou GOOGLE_CLOUD_QUOTA_PROJECT não são transportadas automaticamente pelo Reader manual. Mudar gcloud config project ou fazer novo login não é correção comprovada. Não é necessário mudar a configuração persistente ou criar ADC/chave.

## Menor teste corretivo proposto, não executado pelo Codex

Uma única leitura Auth com cabeçalho explícito x-goog-user-project:bdall-e3585. Isso seleciona **outro consumidor para essa requisição**, portanto é uma proposta para execução manual consciente, não mudança aplicada automaticamente. Não ativa serviços, não vincula billing nem altera IAM. Exige permissões já existentes firebaseauth.configs.get e, conforme validação de quota, serviceusage.services.use no staging. Se faltar, parar; não conceder automaticamente.

Reutilizar o script fixado/hash validado em FIREBASE_READONLY_ANDROID.md. Bloco específico abaixo usa seu Reader/allowlist, valida identidade e número do projeto, e consulta somente Auth; não repete a auditoria Firestore. Somente GET, sem produção ou tokens em argumentos/relatório. Preparado/revisado, não homologado por execução real. Se o usuário não autorizar essa seleção pontual de consumidor, limitar-se ao diagnóstico existente e manter BLOCKED.

```bash
(
  set -eu
  umask 077
  curl -fsS 'https://raw.githubusercontent.com/CristianoRFB/Caravana/a7b5785e8ab3b67c45f8f5b1916d68580ae61298/scripts/staging-readonly-audit.py' -o /tmp/caravana-staging-readonly.py
  printf '%s  %s\n' '7139bd458f893bc1bb6abc4bebc53794614b50ee4e68712fd1f31fcdd2b7df10' '/tmp/caravana-staging-readonly.py' | sha256sum -c -
  python3 - <<'PYTHON'
import importlib.util, urllib.request, json
spec = importlib.util.spec_from_file_location('caravana_audit', '/tmp/caravana-staging-readonly.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
base = urllib.request.build_opener(m.NoRedirect)
class StagingQuotaOpener:
    def open(self, request, timeout):
        if request.full_url == m.ROUTES['auth']:
            request.add_header('x-goog-user-project', m.PROJECT)
        return base.open(request, timeout=timeout)
report = {'kind': 'TARGETED_AUTH_QUOTA_PROBE', 'projectId': m.PROJECT,
          'requestedAuthConsumer': 'STAGING_PROJECT', 'status': 'BLOCKED',
          'projectWrites': 0, 'productionAccess': False}
reader = None
try:
    reader = m.Reader(m.managed_token('gcloud'), opener=StagingQuotaOpener())
    identity = reader.read('identity', m.IDENTITY_URL)
    if identity.get('email') != m.PRINCIPAL or identity.get('email_verified') is not True:
        raise m.Blocked('verified_google_identity_mismatch')
    project = reader.read('project', m.ROUTES['project'])
    if (project.get('projectId'), str(project.get('projectNumber')), project.get('state')) != (m.PROJECT, m.PROJECT_NUMBER, 'ACTIVE'):
        raise m.Blocked('staging_project_identity_mismatch')
    reader.read('auth', m.ROUTES['auth'])
    report['status'] = 'PASS_AUTH_ADMIN_READ_ONLY'
except m.Blocked as error:
    report['reason'] = str(error)
except Exception:
    report['reason'] = 'local_failure_details_suppressed'
report['requests'] = reader.calls if reader else []
report['httpDiagnostics'] = reader.diagnostics if reader else []
m.write_report('/tmp/caravana-auth-quota-probe.json', report)
print(json.dumps(report, indent=2))
PYTHON
)
```

Se a tentativa foi executada nesta rodada e gerou o relatório, baixar separadamente:

```bash
cp /tmp/caravana-auth-quota-probe.json "$HOME/caravana-auth-quota-probe.json" &&
chmod 600 "$HOME/caravana-auth-quota-probe.json" &&
cloudshell download "$HOME/caravana-auth-quota-probe.json"
```

- HTTP200: leitura administrativa resolvida nesse contexto; não aprova políticas Auth ou auditoria geral. Cabeçalho foi pedido explicitamente, sem ErrorInfo em200 não se identifica consumidor efetivo pela resposta.
- SERVICE_DISABLED + STAGING_PROJECT: serviço indisponível no contexto staging dessa requisição; registrar, não habilitar automaticamente.
- USER_PROJECT_DENIED/permissão serviceusage.services.use: seleção de quota não autorizada; não atribuir papel/IAM nem habilitar billing.
- OTHER_PROJECT persistente ou outro erro: preservar diagnóstico; não repetir login ou assumir solução. Não executar consulta administrativa no outro projeto.

## Rules — bloqueio independente

Hash bruto41388c5f… diferente; normalização exclusiva de CRLF/CR para LF produz8acafe75… exatamente igual à candidata. O relatório comprova igualdade do texto após essa transformação, consistente com diferenças de finais de linha. Não identifica sua origem, distribuição ou contagem; não comprova identidade byte a byte.

Índices11/11READY e fingerprint coincidente são PASS do seu escopo. Guard estrito das Rules continua candidateMatch=false: nenhuma flag, hash esperado, Rule ou política de aceite foi alterada. Após Auth200, a auditoria integral ainda poderá bloquear por deployed_rules_or_indexes_require_comparison. Reconciliação futura exige fonte deployed preservada com integridade e comparação restrita de bytes/line endings; sem reimplantar Rules nem relaxar o gate nesta etapa.

Nenhuma regressão local repetida. Nenhuma operação remota ou alteração de consumidor executada pelo Codex. F7/F8/GOAL mantêm seus denominadores e bloqueios; produção não acessada.
