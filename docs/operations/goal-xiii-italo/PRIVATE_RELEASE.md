# Release privado atual e contingência —27/10/2026

## Inventário seguinte —18:51UTC, somente leitura

Nova fonte operacional ce9693759e322a4284d7c40915b1de8924fda709 acrescenta uma pré-checagem, sem alterar app/Rules publicados4ecaa9e. Seis casos novos nativos PASS (20com regressões), lint PASS; workflow dedicado40563424616 SUCCESS. CI principal40563424653 SUCCESS no mesmo SHA, incluindo regressão integral; [evidência oficial](evidence/ci-cutover-preflight-ce96937.json).

[Inventário completo privado](CUTOVER_INVENTORY_RESULT_2026-10-27.json):24originais/29copiados reconciliados,1caravana e10inscrições de origem,0docs novos inesperados em origem/destino,0referências ambíguas,2totais financeiros desconhecidos preservados. Data do único evento anterior a hoje; segue published na origem e draft/importPending no destino. Nenhuma write, recopy, PII ou ciphertext exportado. A primeira tentativa não iniciou porque a conexão Cloud Shell se perdeu; reconectada a mesma sessão, foram confirmados0processos/0recibos antes de executar uma única leitura.

Pendente a resposta do proprietário: evento apenas histórico (encerrar reservas/edições) ou ainda em operação. A classificação temporal não autoriza encerrar o evento nem reabrir a cópia. O PREVIEW somente de inventário não contém writes e nunca é readyForApply. Nenhum novo corte ou deploy da pré-checagem foi executado.


A produção foi operada diretamente, conforme instrução do proprietário de não testar em bdall. Não repetir COPY, APPLY de companions ou conceder plano. A fonte publicada é4ecaa9e3bef58c9b6f154a2b19d08c167ebed5a2; os commits seguintes de evidência não são nova fonte de produto nem novo CI de runtime.

## Estado efetivo

[Resultado completo sanitizado](HOSTED_RELEASE_2026-10-27.json). App [privado](https://caravana-77.pages.dev/tenant-italo/admin/login), Pages6e76a7cd-32f1-4d40-9a4c-f470cbe4445c, Rules projects/caravana-af306/rulesets/392e61a3-ec9c-4b08-9f47-7250c5e7e14f (SHA77307820aa8878c3d5349b7c15d3ef4b232e9199d56ff59f657bc29bb3fc7c8f). Cinco índices READY: os dois antigos preservados e três históricos novos. Publicação estática, sem Functions. A raiz e seus cinco assets adicionais mantêm hashes exatos do legado.

O proprietário confirmou entrada, dados e comprovante. É prova reportada de uso da conta existente; não foi filmada/observada no computador compartilhado. Metadados oficiais confirmam dois UIDs ativos preservados, sem novo lastLoginAt após publicação/baseline; não usar isso para alegar que uma nova autenticação por senha foi observada. Nenhuma senha, token, chave, snapshot, ciphertext ou conteúdo pessoal saiu do Cloud Shell privado.

## Código e validação

Rules derivadas dos bytes legados fe594614, por substituições literais verificadas, preservam contratos de reservas/recibos/financeiro antigos. Owners legítimos de italo recebem leitura histórica condicionada a membership ativa/UID/org/role e ledger da cópia exata. Conflitos/revogação não voltam pelo fallback legado. Cópia importPending não recebe writes, enumeração/bearer público nem crescimento comercial inventado.

Frontend privado usa BrowserRouter basename, só seleciona italo, esconde/desabilita mutações e acesso público de reservas e preserva null/UNKNOWN. O viewer usa blob local com CSP script-src self; não exporta comprovante. Builds e empacotador exigem alvo, manifesto e checkout limpos; recusam symlinks/traversal/worker/secrets/arquivos extras e validam os bytes legados por HTTP antes de preparar a saída nova.

A verificação do runtime Pages encontrou duas falhas antes do deploy: canonicalização de index.html entregava raiz antiga em refresh privado; rewrite abrangente entregava HTML como JS/CSS. Corrigido para diretório /tenant-italo/, com passes explícitos de assets/manifesto antes do catch-all. O pacote final passou em20assets/três rotas por HTTP/hash/MIME/cabeçalhos. A regra legada /* /index.html 200 é preservada; Wrangler a ignora por ciclo e utiliza o fallback SPA padrão, observado no teste. Não esconder esse aviso nem contabilizar tentativas falhas como PASS.

CI exato [principal40557950406](https://github.com/CristianoRFB/Caravana/actions/runs/40557950406) e [dedicado40557950411](https://github.com/CristianoRFB/Caravana/actions/runs/40557950411) SUCCESS. Regressão integral incluindo188E2E e extensão privada em quatro larguras. Casos privados distintos:12SDK/Rules +3escopo/rotas +2limites do pacote; uma jornada em320/375/768/1440 e um CSP real com conteúdo sintético. Não somar sobreposições como cobertura distinta. A×B/revogação autenticados são demo sobre os bytes publicados; em produção houve seis negativas anônimas, dois links legados idênticos e três companions públicos.

## Retorno comprovado, limitado a esta fase histórica

Preservação cifrada da configuração anterior teve readback em custódia única. Versões anteriores permanecem imutáveis no provedor. Isso não prova backup completo restaurável nem custódia independente. O retorno não apaga companions/cópia, restaura dados de negócio ou mexe em Auth/memberships/planos.

O rollback puro de Pages a4d069e0a e uma republicação pura dos seis assets antigos devolveram a configuração antiga, mas URLs privadas aquecidas ainda serviram HTML da candidata por cache. Uma consulta com cache-buster já entregava a raiz legada; isso sozinho NÃO foi aceito como retorno completo.

A contingência efetiva é **6d131a85-950a-482f-b74a-4de3b291932c**: mesmos seis assets legados e _redirects com prefixo explícito abaixo. A regra força a consulta à raiz preservada, evitando a seleção do caminho privado em cache. Publicação e rollback por API dessa contingência passaram nas URLs reais sem cache-buster. O avanço à6e76a7cd passou novamente em todos20assets/três rotas.

    /tenant-italo/* / 200
    /* /index.html 200

[Manifesto da contingência](evidence/production-return-fenced-4ecaa9e.json), [manifesto candidato](evidence/production-combined-4ecaa9e.json). Estes arquivos contêm apenas paths/hashes de código público. Para reconstruir a contingência, copiar somente os seis arquivos fixados, verificar cada hash, acrescentar as duas linhas acima e publicar no mesmo Pages caravana-77; não copiar diretório de dados, .env, _worker.js ou Functions.

Antes de qualquer troca, ler projeto/conta/produção e confirmar deployment atual esperado; parar em mudança concorrente. A API não documenta CAS para estas trocas: conferir imediatamente antes, registrar intenção e readback, sem retry cego se a resposta for incerta. Endpoint Pages:

    POST /accounts/80a4c951d716d79fa10fffcf648d3288/pages/projects/caravana-77/deployments/6d131a85-950a-482f-b74a-4de3b291932c/rollback

Para voltar à candidata após a janela controlada, usar o mesmo endpoint com6e76a7cd-32f1-4d40-9a4c-f470cbe4445c. Verificar canonical_deployment, environment=production, status=success, uses_functions=false e HTTP, incluindo URL privada já aquecida. Não confiar apenas na metadata nem purgar uma zona de terceiros para contornar cache.

Rules antigas preservadas: projects/caravana-af306/rulesets/585cb14f-bdfe-4f58-a7fd-f760d222c4af, SHAfe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b. Nesta janela foram ativadas Rules392e61a3, restauradas585cb14f e avançadas392e61a3, cada vez com leitura de retorno e smoke HTTP real. PATCH oficial:

    PATCH https://firebaserules.googleapis.com/v1/projects/caravana-af306/releases/cloud.firestore
    {"release":{"name":"projects/caravana-af306/releases/cloud.firestore","rulesetName":"RULESET_EXATO_REVISADO"},"updateMask":"rulesetName"}

Para um incidente desta fase, retornar Pages à contingência antes de retirar o acesso privado por Rules, conferir os dois links legados e as restrições esperadas. Não reaplicar uma operação com ledger PATCH_PENDING; primeiro ler o estado efetivo. Não remover os três índices adicionados como parte de rollback. Estes alvos antigos NÃO são autorização de retorno após um corte futuro que receba novas reservas; esse corte precisa de preservação e retorno próprios que mantenham um escritor único e os dados posteriores.

## Custo e próximos requisitos

Firebase caravana-af306, número742921744156, billing=false/Standard/freeTier. Nenhuma API, billing, conta, IAM, plano, serviço pago ou contrato novo foi ativado. Pages somente estático; [requisições estáticas são gratuitas](https://developers.cloudflare.com/pages/functions/pricing/). Custo incremental desta operação R$0; fatura agregada da conta Cloudflare UNKNOWN porque o conector não tem Billing scope, sem solicitar nova credencial. Não apresentar UNKNOWN como zero agregado.

O acesso privado foi entregue, mas **PUBLIC_CUTOVER=false e MIGRATED=false**. Origem continua o único escritor público, cópia permanece histórica/importPending. Próxima fase: conferir eventos/registros novos após a cópia sem recopy, implementar contrato de único escritor e aliases/URLs legadas, ensaiar freeze/reconciliação/rollback com writes posteriores fictícios e só então executar PREVIEW/APPLY protegido. Não publicar simplesmente a caravana copiada, não transferir contrato comercial presumido, não substituir as Rules pela candidata SaaS integral no escuro. O objetivo integral continua ativo.

Referências de semântica: [Pages serving/cache](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [Rules release PATCH](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/patch).
