# F5 — rotas por organizadora e contrato de domínios

Implementação candidata local; evidência final depende de gate. Nenhum registro DNS/TLS, domínio pago, configuração Cloudflare ou documento real foi alterado.

## Modelo e autoridade

`publicTenantSettings/{organizationId}` contém somente nome/descrição, endereço público, cor de catálogo, imagem, site/contatos públicos e mensagem operacional. Não contém UID de responsável, assinatura, permissão, configuração privada de suporte ou dados de passageiros. `tenantSlugs/{slug}` faz o vínculo público imutável com organizationId. Owner próprio salva configuração e evento privado `tenantBrandOperations/{operationId}` atomicamente; staff não altera, público não escreve, outro tenant não assume o endereço. Identidade não substitui memberships/Rules.

Nome/contatos/textos têm limites; React renderiza texto escapado. Não há HTML/CSS arbitrário. Cores são tokens predefinidos com texto branco legível, não fragmentos CSS. Imagem admite PNG/JPEG inline pequeno ou HTTPS PNG/JPG/WebP sem credenciais/host local; SVG/javascript não são aceitos. Upload no painel confere MIME/tamanho, decodificação nativa e dimensão até2048×2048, com teto60000bytes. Rules conferem assinatura declarada/base64/teto e whitelist de campos; não são um antivírus nem decoder de bitmap. Imagem externa quebrada/indisponível usa ícone local. Não há upload de logo ao Storage real. Favicon usa somente imagem inline quando disponível; título/favicon anterior é restaurado ao sair do escopo.

## Rotas e legado

- `/o/:tenantSlug`: catálogo publicado filtrado por organização.
- `/o/:tenantSlug/caravana/:slug` e `/inscricao`: busca por organizationId resolvido+slug; duas empresas podem ter o mesmo slug de viagem.
- `/o/:tenantSlug/minha-inscricao/:id`: mantém marca e rejeita exibição em namespace de outra organização; bearer link continua segredo de acesso ao próprio cadastro.
- `/admin/identidade`: configuração pública; painel usa a marca da membership ativa, desmontando contexto na alternância.
- `/caravana/:slug`, `/inscricao` e `/minha-inscricao/:id` continuam disponíveis. Sem alias explícito, busca histórica exige resultado único; ambiguidade nunca escolhe o primeiro documento.

`legacyTripAliases/{slug}` aponta IDs originais da viagem/organização para preservar links anteriores quando novos tenants reutilizarem o slug. Leitura pública por chave; escrita/listagem pelo cliente negadas. Seu preenchimento exige planner/dry-run e migração administrativa especificamente autorizada, inicialmente em ambiente sintético. Fixtures comprovam o contrato; **aliases reais ainda não foram criados**. Antes de release com colisões, inventariar links públicos existentes e reservar aliases sem substituir IDs. Nenhum dado do Ítalo deve ser regravado para introduzir namespaces.

Configuração é observada em tempo real, sem rebuild por tenant. Path/slug conhecido nunca autoriza leitura privada. Host, query `organizationId`, localStorage e CSS não selecionam permissões. A versão atual usa path; não executa roteamento real por host/subdomínio.

## Subdomínios e custom domain — contrato preparado, execução externa BLOCKED

1. Solicitação por owner com domínio normalizado e motivo; não aceitar domínio com caminho, usuário/senha, IP, loopback ou nome reservado.
2. Emitir desafio de posse único, expiração e organização solicitante; verificar por DNS TXT ou HTTP controlado, usando backend confiável. Provar posse não equivale a ativar TLS.
3. Criar binding explícito e auditado de hostname verificado→organizationId, em estado pending/verified/provisioning/active/failed/revoked. Um host ativo tem um único tenant. Hostname do pedido deve corresponder ao desafio, sem busca por sufixo permissiva.
4. Infraestrutura Cloudflare deve reconhecer o hostname, resolver certificado e encaminhar somente bindings active; app recebe contexto confiável assinado/servido pela infraestrutura. Nunca confiar apenas em Host/X-Forwarded-Host enviado pelo cliente. A autoridade privada continua membership.
5. Cache de resposta deve incluir host/path+tenant e versão de configuração. Conteúdo privado exige cache privado/no-store; nunca servir bootstrap de tenant anterior. Não há cache multi-tenant novo na implementação atual.
6. Falha/expiração preserva endereço `/o/slug`; revogação retira binding/TLS/cache e registra auditoria, sem apagar dados. Reassign exige nova posse e janela de segurança, sem reaproveitar desafio antigo.
7. Custos/limites/DNS/TLS/Cloudflare for SaaS precisam ser avaliados com docs oficiais antes da implantação autorizada. Nenhum wildcard DNS, projeto ou domínio foi criado neste GOAL.

## Corte futuro

Frontend e Rules candidatas precisam de release coordenado: frontend novo lê coleções ausentes das Rules antigas; clientes antigos não escrevem eventos exigidos pelo novo ledger. Preparar compatibilidade de leitura, memberships/aliases e controle de versão antes do corte final; não publicar cegamente fonte ou Rules. F2/F3/F4 continuam aceites sintéticos, não homologação de produção.

## Evidência incremental
50 testes direcionados PASS (incluindo planner sem write e SDK com auditoria completa forjada).6 E2E PASS/29,7s desktop/mobile320: caminhos com mesmo slug, query não muda organização, logo indisponível com fallback, upload PNG nativo, favicon, alteração de marca, reserva/reload, rejeição de namespace trocado e financeiro B preservado. Primeira rodada:1 PASS/5 FAIL; seletor inexistente no teste de reserva e Java encerrou com3221225786, deixando hub indisponível; causa do encerramento não confirmada. Segunda:4 PASS/2 FAIL por esperar texto diferente de Inscrição indisponível; comportamento de recusa estava correto. Rodada final passou. Gate completo segue pendente.
