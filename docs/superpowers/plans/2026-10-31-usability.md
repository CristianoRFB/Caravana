# Clareza de uso — Implementation Plan

> **For agentic workers:** executar com superpowers:executing-plans, nesta sessão. O usuário já escolheu execução direta e envio à main; não criar uma rodada de aprovação rotineira.

**Goal:** tornar os fluxos existentes mais reconhecíveis e fáceis de corrigir para passageiros, equipes e administrador global.

**Architecture:** componentes React pequenos para navegação/ajuda e validação nativa. Estado de interface local, sem novas dependências ou consultas Firebase.

**Tech Stack:** React, TypeScript, CSS, Playwright, Firebase Emulator Suite já existentes.

**Spec:** docs/superpowers/specs/2026-10-31-usability-design.md.

## Global Constraints

- Base main ddf1341; atualizar main diretamente somente após verificações.
- Sem deploy, escrita real, dados pessoais, Rules/índices ou contratos de plano alterados.
- Preservar subpaths publicados e autorizações do Ítalo.

## Review Focus

- Menu fechado não deve deixar links fora da tela alcançáveis por Tab no celular.
- Escape/fundo devem fechar o menu sem perder o foco ou alterar a rota.
- Correção de formulário não deve apagar valores nem enfraquecer validações existentes.
- Busca global sem resultado e termos acentuados devem ter retorno legível e recuperável.
- Navegação em subpaths deve preservar basename e isolamento; histórico/UNKNOWN continuam disponíveis.

### Task 1: Navegação e orientação

**Files:** src/AdminNavigation.tsx (novo), src/App.tsx, src/styles.css, e2e/usability.spec.ts (novo).

**Interfaces:** AdminNavigation recebe modo restrito e função de fechamento; NavLink determina item atual. Ajuda contextual depende apenas da rota. Atalhos não gravam dados.

- [x] Criar testes de item ativo, menu/teclado, orientação e ausência de overflow; observar falha na UI atual.
- [x] Implementar grupos, contexto, ajuda e controle de menu móvel.
- [x] Executar casos dirigidos nas quatro larguras e registrar resultado.

### Task 2: Formulários claros e recuperáveis

**Files:** src/FormFeedback.tsx (novo), src/App.tsx, src/styles.css, e2e/usability.spec.ts.

**Interfaces:** FormFeedback preserva as props e onSubmit de form; somente apresenta falhas da validação nativa, com links para os controles. Login mantém autenticação existente.

- [x] Testar resumo focado, correção sem perda de dados, jornada real e mostrar/ocultar senha; observar falhas antes da implementação.
- [x] Implementar mensagens, acessibilidade e autocomplete, sem novos requisitos ou efeitos de backend.
- [x] Executar testes novos e jornada pública de reserva existente.

### Task 3: Gestão global e fechamento

**Files:** src/Platform.tsx, e2e/platform.spec.ts, e2e/usability.spec.ts, documentação de resultados.

**Interfaces:** filtro somente sobre tenants já autorizados; cadastro recolhível conserva todos os campos e confirmações.

- [x] Testar busca por nome/identificador, sem resultados/limpar e abertura de cadastro; observar falha na versão atual.
- [x] Implementar descoberta progressiva e filtro; adaptar o teste existente apenas para abrir o cadastro.
- [x] Rodar lint, tipos, build, testes gerais, Auth/Storage e E2E geral/operacional/privado.
- [ ] Revisar o diff, conferir remoto, enviar checkpoint diretamente à main e acompanhar o CI do SHA enviado.

## Execution ledger

- 31/10: pesquisa concluída; main remota recuperada, checkout limpo em ddf1341. Runtime78, rede liberada, nenhuma identidade GCP/segredo configurado. Execução neste checkout por pedido explícito de main; não substituir com a branch GOAL XIII antiga.
- Pre-flight: Tasks1/2 compartilham App/CSS, executadas sequencialmente; Task3 consome FormFeedback. Nenhuma mudança de interfaces de dados ou Rules.

- 01/11: retomada no runtime79, arquivos preservados e main remota ainda ddf1341. Lint/tipos/build PASS. 24E2E iniciais PASS; nova cobertura de marca revelou uma expectativa com caixa incorreta no teste, corrigida para o nome real da fixture. Não se alterou o nome do produto para satisfazer o teste.
- Revisão independente somente leitura: 0Critical,2Important (campos condicionais e explicação de limites). Ambos reproduzidos em3testes FAIL antes da correção. Coleta após atualização do DOM e mensagens min/max/step implementadas;36E2E PASS nas quatro larguras, incluindo os3casos novos. Também foram verificados Tab com menu fechado, URL inalterada e resize (lacuna de teste apontada na revisão).
- Decisão de verificação: regressão local dos fluxos afetados e subpaths; suíte E2E integral no CI da main após o envio explicitamente autorizado. Evita duplicar toda a suíte, preservando verificação geral do SHA final no GitHub.
- Trabalho segue neste checkout main por solicitação explícita do usuário; nenhuma mudança em Rules, índices, Auth, dados financeiros ou dependências. O relatório histórico de cutover sintético tem timestamp reescrito pelo teste preexistente; preservar seus bytes originais, sem apresentar a execução nova como evidência antiga.

- Fechamento local01/11:374gerais,8Auth,6Storage,36UX,44regressões dirigidas,4privado e8operacional PASS. Há sobreposição entre36UX e44dirigidos, não somar como testes distintos. Lint/tipos/build PASS; audit runtime0. A regressão inicial teve41PASS/3FAIL por seletor de status ambíguo e menu usado antes da prontidão; confirmadas10compatibilidades e44dirigidos após corrigir os testes, sem enfraquecer os asserts de negócio.

- Main atualizada diretamente em201f798. Encontrado mais um seletor global de status no editor de planos:2FAIL/4PASS na reprodução; escopo delimitado à seção do editor e6PASS no replay. Follow-up não altera src/ ou comportamento da aplicação. CI41311266508 é substituído pela revisão do teste; não considerar a execução parcial como aprovação integral.

- Fechamento de portabilidade do comando focal: aspas duplas no grep com pipe, conforme os comandos existentes, porque FirebaseCLI usa shell:true e cmd.exe não agrupa com aspas simples.3casos PASS em Linux; Windows não foi executado. Aplicação src/ continua idêntica a201f798. A revisão final do runner será o alvo do CI integral.
