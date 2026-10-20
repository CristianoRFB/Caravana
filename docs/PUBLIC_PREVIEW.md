# Prévia comercial visual isolada

**PUBLICADA e smoke verificado**, exclusivamente visual: https://caravana77-commercial-preview.pages.dev/saas . Não é SaaS funcional, demonstração de backend ou STAGING_VERIFIED da plataforma.

Projeto separado `caravana77-commercial-preview`, deployment `4b868473-c7c6-4dbe-9ca6-367da9d795ae`, sucesso, artefato associado a9c0c45d. Cloudflare chama o ambiente deste novo projeto de production; isso não representa publicação na produção Caravana/Ítalo. Projeto original `caravana-77` continua no deployment4d069e0a, com JS90677dd6… inalterado após esta publicação.

`npm run build:public-preview` produz `dist-public-preview`, entry separado de App/Firebase, reutilizando a landing e o catálogo aprovados. Sem SDK/configuração Firebase, Auth, reservas, dados privados, formulários de acesso, Functions, bindings ou analytics. Rotas de painel mostram a explicação de prévia. Headers com CSP connect-src none, noindex/nofollow e proteção de framing. Contato neutro configurável, sem reutilizar o contato do cliente.

`node scripts/verify-public-preview.mjs https://caravana77-commercial-preview.pages.dev` passou1440/320: conteúdo/catálogo, CSS aplicado, aviso de prévia, ausência de overflow/erros JS/chamadas Firebase e fallback sem inputs nas rotas de acesso. Três assets servidos conferidos por SHA256 contra o build; index.html usa URL canônica /. JSON, PNG e logs em docs/evidence/2026-10-20/public-preview-hosted*, public-preview-deployed-integrity.json e cloudflare-preview-verified.json.

O403 inicial usava a credencial geral no endpoint de assets. O fluxo oficial foi concluído com token temporário emitido pelo Pages para o novo projeto. Token usado somente em memória/stdin sem echo; não persistido, exposto em logs ou commit. Assets enviados à API oficial; deployment criado pelo conector. Nenhum upgrade, recurso pago, Function, domínio comprado ou backend criado. Assets estáticos são gratuitos/ilimitados nos planos Pages; conta tinha3 projetos, agora4, dentro do limite100. Referências: https://developers.cloudflare.com/pages/functions/pricing/ e https://developers.cloudflare.com/pages/platform/limits/ .

Inspeção local encontrou CSS inválido na primeira remoção de fontes externas; build corrigido para remover a diretiva inteira e verificação passou a exigir CSS aplicado. Capturas finais locais/hosted regeneradas. Esse ajuste não alterou o frontend SaaS.

Staging Firebase independente, Rules/Auth/índices/IAM reais, backup/restore e rollback coordenado continuam BLOCKED. Esta publicação não elimina qualquer gate real nem comprova preservação dos dados do cliente.
