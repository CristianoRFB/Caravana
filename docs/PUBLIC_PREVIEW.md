# Prévia comercial isolada

IMPLEMENTED / LOCAL_TESTED. **Publicação BLOCKED** pelo acesso efetivo ao upload de assets no conector; nenhuma URL nova criada. Não é STAGING_VERIFIED do SaaS.

`npm run build:public-preview` produz `dist-public-preview`, com entry separado de App/Firebase. Reutiliza a landing e o catálogo aprovados. Não inclui configuração/SDK Firebase, Auth, dados de tenants, reservas ou formulários; rotas de painel mostram uma explicação de prévia. Fontes externas removidas, headers CSP com connect-src none, sem Functions/bindings/analytics/domínio pago. Contato neutro configurável preservado.

`node scripts/verify-public-preview.mjs` confere uma instância local em127.0.0.1:4180 (servida com vite preview --outDir dist-public-preview --host127.0.0.1 --port4180), larguras1440/320, catálogo, aviso, navegação ao fallback de acesso, ausência de overflow/erros JS/chamadas Firebase. Evidências JSON/PNG/log em docs/evidence/2026-10-20/public-preview-*.

Cloudflare Pages documenta assets estáticos gratuitos/ilimitados e limite100 projetos; conta conectada tem3 projetos, nenhum novo criado. A API GET de projetos está disponível, mas POST /pages/assets/check-missing retornou403 code8000013 Authorization failed. A API exige credencial de upload; não se expôs token nem se contornou o controle do conector. Não foi aplicado upgrade ou serviço pago. Publicação independente deve usar credencial de upload Pages efetiva e o artefato verificado, sempre separado de caravana-77.

Referências conferidas: https://developers.cloudflare.com/pages/functions/pricing/ e https://developers.cloudflare.com/pages/platform/limits/ . A existência deste artefato não elimina os bloqueadores de staging Firebase, backup/restore ou preservação real.

Inspeção visual encontrou CSS inválido após remoção inicial de @import com ponto e vírgula dentro da URL da fonte. O build foi corrigido para remover a diretiva inteira e a verificação passou a exigir navegação com CSS aplicado. Artefatos/capturas finais foram regenerados e validados; o primeiro PASS limitado a conteúdo/overflow não representava aceite visual.
