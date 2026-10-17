# F5 — aceite local e contrato de domínios

2026-10-16. Nenhum deploy, migração real, DNS/TLS, alteração de Rules implantadas ou merge. F2 continua exclusivamente local/sintético.

| Critério MASTER | Estado | Evidência/limite |
|---|---|---|
| Configuração de marca pública | PASS local | Nome, descrição, cor, imagem, contatos e mensagem; owner próprio, audit imutável; conteúdo/links/cores validados; PNG nativo, assinatura/tamanho e fallback; favicon inline quando possível |
| Identidade pública e no painel | PASS local | A/B com marcas distintas, atualização sem rebuild, contexto administrativo isolado; Financeiro Geral preservado |
| Namespace e legado | PASS local / BLOCKED aliases reais | /o/slug catálogo/viagem/inscrição/portal; mesmo slug de viagem em A/B; alias histórico explícito preserva IDs. Sem alias e ambiguidade, nunca escolhe primeiro. Planner aditivo sem SDK/writes; migração real de aliases não executada |
| Mapping confiável e cache | PASS corpus local | Slug vinculado por owner e Rules; slug/query/Host não concedem autoridade privada; contexto desmontado ao trocar tenant, ausência de cache CDN novo |
| Subdomínios | Contrato preparado / BLOCKED externo | TENANT_ROUTES_AND_DOMAINS.md; runtime usa path, não há DNS/TLS ou roteamento real por host |
| Custom domain | Deferred externo conforme MASTER | Desafio de posse, lifecycle, binding/TLS/cache/revogação descritos; nenhuma implementação externa alegada |
|320/375/768/1440, erros e atualização | PASS corpus local |112 E2E integrais;12 direcionados após contraste/benefícios;4 após ajuste final da data; imagens reais e manifesto com SHA256 |

## Gate e inspeção

`f5-acceptance-unit.log`:169 PASS/27 arquivos/47,78s. `f5-acceptance-e2e.log`:112 PASS/4min nas quatro larguras. Lint/typecheck/build sintético PASS. Auth4/Storage6 da F3 continuam evidência dos módulos inalterados; não foram repetidos nesta fase.

Inspeção visual real detectou cor escura sobre hero escuro e resumo de benefícios fixo que não refletia o cadastro. Variante clara derivada de token para o hero, cor principal em botões/fundo claro, benefícios reais do cadastro. Teste matemático valida contraste≥4,5 das cores nesses dois contextos. `f5-contrast-and-foundation-tests.log`:6 casos puros F5 PASS e5 fundações F6 PASS. `f5-contrast-e2e.log`:12 PASS/44s nas quatro larguras sobre build atualizado.

Inspeção móvel também levou a acomodar a data no próprio resumo: filho flex com min-width0 e texto com quebra, sem invadir destino. `f5-facts-final-e2e.log`:4 PASS/27,6s, limites do elemento/texto conferidos em todas as larguras. `f5-facts-visual-e2e.log` conserva rodada anterior de4 PASS. Não foi repetida regressão integral após esses ajustes delimitados. `SCREENS_F5.md` lista8 capturas reais, dimensões e hashes. Não se declara auditoria especializada completa de leitor de tela.

Rodadas incrementais e falhas de infraestrutura/expectativas estão conservadas em TEST_EVIDENCE.md/TENANT_ROUTES_AND_DOMAINS.md. Não contam como aprovação de produção. Coleções/índices são candidatos. Release precisa de compatibilidade de cliente/Rules, memberships e aliases aprovados; a produção antiga permanece intacta.

Próximo trabalho F6: catálogo e planner comercial puro já preparados com5 testes; integração de atribuição/limites concorrentes, equipe e onboarding ainda IN_PROGRESS. commercial-data.ts é preparação não ligada ao runtime e ainda sem teste SDK/Rules próprio. F7/F8 pendentes; prontidão comercial não declarada.
