# F6 — landing SaaS separada

Rota nova `/saas`, sem substituir o catálogo `/`, links históricos ou páginas `/o/:tenantSlug`. Identidade neutra da Caravana 77, recursos existentes, comparação de planos e processo de ativação assistida. A ilustração do painel está identificada como exemplo com dados fictícios, sem alegar métricas de clientes reais.

Preços e quotas vêm diretamente do `PlanCatalog`; implantação usa `COMMERCIAL_POLICY`. Essencial R$89/mês, Pro R$149/mês, Premium R$219/mês; limites 2/60/2, 5/200/5 e 15/500/15. Anual continua deferred; sem checkout, cobrança automática, trial público, criação de conta global ou alteração do preço do passageiro. Pagamento dos passageiros fora da plataforma e histórico preservado em downgrade são explicados.

## Canal comercial

Contato oficial permanece BLOCKED até ser informado. Pergunta assíncrona enviada na sessão Cloud; não houve resposta até a implementação. A landing sem contato usa links funcionais para a seção de implantação assistida, sem publicar número/e-mail fictício ou contato do Anime Fest. Não há formulário que capture dados sem destino.

`VITE_COMMERCIAL_CONTACT_URL` é configuração pública opcional de build: URL HTTPS sem credenciais embutidas ou mailto simples. Se fornecida e válida, os links de plano direcionam ao atendimento e a seção de implantação mostra o CTA de contato. Não equivale a autenticação/validação de titularidade do canal. Nenhuma mensagem é enviada pela aplicação ou pelo agente.

No modo emulador, a landing também oferece a demo local preparada por `npm run demo`. Esse link não aparece no build sem emuladores; não promete uma demo hospedada em produção.

## Validação

PASS incremental: lint/typecheck e4 E2E compilados em320/375/768/1440, catálogo exato, anchors, FAQ, demo e login (48,0s). Inspeção visual direta das capturas1440/320 sem cortes; verificação geométrica dos cards/headings/botões não depende de ocultar overflow. Logs em docs/evidence/2026-10-19/cloud/f6-landing-*.log.

A landing foi extraída em chunk próprio carregado sob demanda; o build final gerou11,95KB JS e9,72KB CSS separados. Título da aba identifica a página comercial e é restaurado ao sair. Regressão integral do candidato com lazy loading concluída:148 E2E PASS nas quatro larguras, incluindo as4 jornadas da landing. CLOUD_REGRESSION.md registra o resultado final. Duas capturas reais retidas em docs/evidence/2026-10-19/cloud/screens/, com hashes no manifesto f6-candidate-summary.json. Gate F6 geral e publicação permanecem pendentes.
