# App Check — integração preparada, desativada por padrão

Pré-condição remota reconferida em23/10: console Google Cloud do projeto exato e identidade de staging mostram **nenhuma conta de faturamento vinculada**. Abertura de Fraud Defense redirecionou à página da API `recaptchaenterprise.googleapis.com`, com botão Ativar e sujeição expressa aos termos Google Cloud. Botão não clicado; confirmação específica do proprietário solicitada pelo mecanismo seguro de interação, pois a política de navegador exige confirmação no aceite contratual. Nenhum vínculo de billing, API habilitada, chave criada ou provider registrado. [Prova sanitizada](evidence/2026-10-23/desktop/staging-billing-and-provider-prerequisite.json). Não confundir a pendência de termos com a chave age pessoal: são condições independentes; o proprietário não deve reenviar senha/código/chave privada.

Verificação de custo posterior: a [documentação oficial de billing do Fraud Defense](https://docs.cloud.google.com/recaptcha/docs/billing-information) confirma Essentials gratuito sem billing vinculado; após10.000assessments/mês **por organização, somando contas/sites**, CreateAssessment retorna429. [Quotas e comportamento](https://docs.cloud.google.com/recaptcha/quotas) distinguem CreateAssessment fail-closed de SiteVerify fail-open acima da cota. Não adotar fallback SiteVerify como proteção equivalente. Portanto há caminho compatível com R$0, condicionado a reconferir ausência de billing no projeto exato e monitorar a cota compartilhada; não é autorização para ativar billing ou presumir10.000exclusivos para a Caravana. O SDK Enterprise preparado continua desativado. Ainda faltam registro/site key, termos quando apresentados, orçamento de uso/TTL, attestation real e jornadas legítimas antes de enforcement. Esgotamento pode impedir clientes legítimos; isso exige tratamento operacional testado, não compra automática de capacidade.

Publicação posterior: fonte67ce032/deployment4ed92f3b em23/10, mantendo App Check **desativado**. [Artefatos, bootstrap e rollback públicos verificados](STAGING_RELEASE_2026-10-23.md). Nenhum provider, assessment, enforcement ou jornada com attestation real; os trechos abaixo sobre candidata ainda não publicada são históricos da preparação inicial.

Atualização: CI integral do commit `77e5f940e19b6a87533ea474ff4facb722eae920`, [run39987163969](https://github.com/CristianoRFB/Caravana/actions/runs/39987163969), concluído success. Contagens dos logs:305backend/Rules,8Auth,6Storage,47Python,8nativos e184E2E; lint/tipos/build/recuperação PASS. [Evidência](evidence/2026-10-23/desktop/appcheck-final-ci.json). Isso substitui a pendência de CI abaixo, sem comprovar provider/enforcement ou homologação remota da candidata.

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
