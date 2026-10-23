# App Check — integração preparada, desativada por padrão

## Escopo implementado

Cliente Firebase inicializa `ReCaptchaEnterpriseProvider` e `initializeAppCheck` sincronamente antes de criar Auth/Firestore, somente com opt-in explícito e configuração válida. Sem nova dependência npm: usa o SDK Firebase já presente. Não aceita provider custom/debug nem fallback silencioso para tráfego não atestado quando configurado incorretamente.

Ativação exige simultaneamente `VITE_APP_ENV=staging`, projeto `bdall-e3585`, hostname exato `caravana77-staging.pages.dev`, execução fora de dev/emuladores, ausência de bypass debug, flag `VITE_STAGING_APPCHECK_ENABLED=true` e site key pública válida em `VITE_STAGING_APPCHECK_SITE_KEY`. Flags malformadas e chave preenchida sem ativação explícita são recusadas. Produção, preview de outro hostname e localhost não são destinos dessa preparação. Nenhuma chave foi fornecida ou gerada nesta etapa.

O build de staging valida o mesmo contrato e acrescenta fontes CSP do reCAPTCHA/App Check apenas no opt-in. Não adiciona unsafe-eval, origens wildcard ou fontes extras no modo desativado. Arquivo `.env.staging.example` documenta as duas variáveis; `VITE_*` é público, portanto nunca deve conter secret key, debug token ou credencial. A flag não foi inserida no arquivo privado existente nem habilitada no projeto remoto.

## Validação executada

-4 testes nativos da configuração/CSP PASS: modo padrão, destino exato, negativas de ambiente/chave/debug e fontes permitidas.
-3 testes de bootstrap PASS com SDKs mockados: ordem app→provider→AppCheck→Auth→Firestore, modo desativado sem provider e recusa de hostname de produção antes de serviços.
-4 testes de transporte do health novamente incluídos no comando nativo:8PASS no total.
-Tipos e lint PASS.
-Build opt-in com chave **sintética** PASS; arquivos CSP conferidos. Em seguida build desativado restaurado e conferido, sem origens adicionais. Artefato final local está **DISABLED**, não publicado.

Provas: [appcheck-build-preparation.json](evidence/2026-10-23/desktop/appcheck-build-preparation.json), [build desativado](evidence/2026-10-23/desktop/appcheck-disabled-build.log), [tipos](evidence/2026-10-23/desktop/appcheck-typecheck.log) e [lint](evidence/2026-10-23/desktop/appcheck-lint.log). A revisão inicial desses testes/builds ocorreu na working tree; não atribuir a ela um deployment ou CI anterior.

Esta mudança toca a inicialização do cliente; o CI integral será executado no commit técnico correspondente. A aprovação integral anterior deee3f5b5 continua limitada ao código anterior. O frontend publicamente homologado continua `bc5dd40`/deployment `6e1a652a…`, com seu aceite próprio; a candidata App Check nova ainda não está homologada remotamente.

## O que falta antes da ativação real

1. Registrar o provedor no app web correto de `bdall-e3585`, conferindo domínio, propriedade, cotas e custo zero sem vínculo de billing não autorizado. Site key pública não é secret key. O formulário observado exige sujeição aos Termos do Google Cloud no registro; nenhum termo foi aceito nem provider salvo pelo agente.
2. Conferir o TTL e o limite gratuito efetivo no projeto. O SDK foi preparado com refresh automático, que gera assessments no uso real; uma quota gratuita não é teto de custo por si só. Não habilitar a flag enquanto essa condição estiver indefinida.
3. Com provedor/cotas prontos, inserir somente site key pública no ambiente seguro de staging, compilar o commit exato e homologar login, visitante/reservas, documentos privados, financeiro fictício e A×B. SDK tests remotos e ferramentas que acessam staging também precisam de estratégia de attestation legítima; não substituir por debug bypass silencioso. Os17SDK antigos não são prova desse rollout.
4. Observar métricas de solicitações válidas/inválidas antes de enforcement. Demonstrar negativas sem token e preservação das jornadas legítimas, sem produção ou dados do Ítalo.
5. Ativar enforcement somente após esses resultados, com janela/retorno adequados. Se tráfego legítimo falhar, interromper o avanço e executar retorno previamente definido. Este código não habilita enforcement e não contém API administrativa para fazê-lo.

Fontes: [inicialização e rollout oficiais Firebase](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [orientações CSP reCAPTCHA](https://developers.google.com/recaptcha/docs/faq#im-using-content-security-policy-csp-on-my-website-how-can-i-configure-it-to-work-with-recaptcha).

App Check é um componente de defesa contra clientes não atestados; não é garantia contra todo abuso, rate limit universal por IP ou substituto das Rules/quotas. F7 permanece aberto; não aumentar os percentuais pelo código preparado. Chave age/backup real seguem pendentes exclusivamente no fluxo separado do proprietário.
