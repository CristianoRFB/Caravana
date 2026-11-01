# Clareza de uso — passageiros, equipes e administração global

Pedido: melhorar UX/UI com pesquisa atual, verificar o código e enviar diretamente à main. Base remota: ddf13412e7503892cc223e30e790d0dd4d081d63. A autorização atual de main substitui a restrição histórica de desenvolver somente na branch comercial; não é autorização para deploy ou mutação de produção.

## Abordagem escolhida nesta execução

Decisão do implementador: melhorar os fluxos existentes, preservando marca, rotas, modelos de dados e permissões. Um redesenho completo acrescentaria risco aos aplicativos operacional/privado já publicados; somente documentação não resolveria as dificuldades visíveis. A execução autônoma já solicitada pelo usuário orienta as escolhas rotineiras, sem novos gates de aprovação de cada componente.

## Pesquisa e aplicação

Pesquisa documental em 31/10/2026, sem entrevistas: não alegar teste com clientes reais nem certificação de acessibilidade.

- [W3C — instruções de formulários](https://www.w3.org/WAI/tutorials/forms/instructions/): explicar etapas e obrigatoriedade antes da entrada; manter rótulos visíveis.
- [W3C — tamanho mínimo de alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): controles móveis confortáveis; meta própria de 44px nos controles principais, sem afirmar que a norma exige 44px para todos os links.
- [NN/g — heurísticas de usabilidade](https://www.nngroup.com/articles/ten-usability-heuristics/): destacar localização atual, usar linguagem reconhecível e oferecer ajuda contextual.
- [GOV.UK — resumo de erros](https://design-system.service.gov.uk/components/error-summary/): apresentar um resumo acessível com links para os campos; conservar validação do navegador e backend.

## Mudanças delimitadas

1. Painel das equipes: navegação agrupada e item ativo, indicação do contexto e ajuda por página; menu móvel fechável com Escape e fundo clicável; foco restaurado ao botão; atalhos para tarefas existentes, sem novas permissões.
2. Passageiros e formulários administrativos: jornada honesta de dados/embarque → pagamento → conferência; resumo de validação nativa em português com foco e links, sem limpar dados preenchidos; opção explícita de mostrar/ocultar senha e autocomplete apropriado nas três entradas (passageiro/equipe/plataforma).
3. Administração global: cadastro assistido recolhível para priorizar a gestão, filtro local por nome/identificador, contagem e estado vazio; manter UID confirmado, planos/preços, confirmação de suspensão e auditoria existentes.

## Aceite e limites

- Desktop e mobile: 320, 375, 768 e 1440px; teclado, foco, menu, formulário inválido/correção e busca sem resultados.
- Nenhuma alteração de Rules, índices, autenticação, entitlements, APIs, migração ou dados financeiros.
- Não remover salvaguardas de UNKNOWN, importPending, acesso privado ou escritor único do Ítalo.
- Testes só em emuladores demo, com rede Firebase real bloqueada. Não acessar contas/senhas/payloads reais.
- Verificar lint, tipos, builds, regressões gerais e dos subpaths operacional/privado antes do envio; conferir CI do código enviado à main. Push normal com conferência do HEAD remoto, sem force.
