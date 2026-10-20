
# CARAVANA 77 — GOAL MASTER FINAL DE COMERCIALIZAÇÃO E MIGRAÇÃO SEGURA

## MISSÃO: ENTREGAR UMA CANDIDATA REALMENTE PRONTA PARA O CLIENTE ÍTALO

Continue integralmente o desenvolvimento da Caravana 77, com autonomia para executar as tarefas técnicas autorizadas.

**Repositório:** `CristianoRFB/Caravana`

**Branch:** `codex/caravana77-commercial-v1-20261016`

**Último checkpoint confirmado:** `865b803`

**Objetivo final:** concluir o produto SaaS multi-tenant e white-label, diferenciar verdadeiramente os três planos comerciais, fechar as pendências de F7/F8 e preparar uma migração segura e comprovável do cliente real Ítalo/Anime Fest.

O resultado esperado não é simplesmente atingir 99% em um relatório.

O resultado esperado é fornecer todas as evidências necessárias para que o responsável técnico possa concluir, com segurança:

**"O software está pronto, a migração foi ensaiada, o backup e a restauração estão comprovados e agora só falta executar o procedimento autorizado de migração do Ítalo."**

Essa conclusão somente poderá ser apresentada se for tecnicamente verdadeira.

Não execute a migração real neste GOAL.

---

# 1. RECUPERAÇÃO E ESTADO ATUAL

Antes de desenvolver:

1. Confirme repositório, branch, HEAD, alterações locais e remoto.
2. Preserve todos os arquivos modificados.
3. Recupere o checkpoint mais recente do GitHub.
4. Leia os documentos canônicos de execução, incluindo:
   - `docs/CURRENT.md`
   - `docs/CODEX_PROGRESS.md`
   - `docs/F6_ACCEPTANCE.md`
   - `docs/F7_PREPARATION.md`
   - `docs/F8_ACCEPTANCE.md`
   - `docs/STAGING_ACCEPTANCE_2026-10-20.md`
   - `docs/CLIENT_PRESERVATION_ITALO_2026-10-16.md`
   - `docs/MULTITENANT_MIGRATION.md`
   - `docs/RELEASE_AND_ROLLBACK.md`
   - `docs/COMMERCIAL_LANDING.md`
5. Consulte o catálogo real em `src/lib/plan-catalog.ts`.
6. Não refaça auditorias e funcionalidades já aprovadas, salvo quando mudanças afetarem sua validade.

Estado conhecido:

- F0–F6: PASS no escopo local/sintético.
- F7: 8/10 critérios de preparação isolada comprovados.
- F8: 7/14 gates de publicação comprovados.
- 253 testes de backend aprovados.
- 168 E2E aprovados.
- 11 jornadas funcionais no Firebase real de staging.
- Staging operacional em `bdall-e3585`.
- Backup e restauração de 153 documentos fictícios comprovados.
- Produção atual do Ítalo preservada.

Não confunda este estado com homologação de produção.

---

# 2. PRIORIDADE COMERCIAL — REFORMULAR OS TRÊS PLANOS

## PROBLEMA IDENTIFICADO

Atualmente os três planos comerciais oferecem praticamente as mesmas funcionalidades, variando apenas os limites quantitativos.

Isso provoca uma apresentação comercial pouco convincente.

O objetivo é que a evolução dos planos represente **mais capacidade e mais valor operacional real**, e não somente números maiores.

Precisamos de diferenciação progressiva, cumulativa e facilmente compreensível.

## PLANOS E VALORES APROVADOS

Preservar inicialmente os valores e limites já existentes no catálogo:

| Recurso | Essencial | Pro | Premium |
|---|---|---|---|
| Mensalidade | R$ 89 | R$ 149 | R$ 219 |
| Caravanas ativas | 2 | 5 | 15 |
| Passageiros por caravana | 60 | 200 | 500 |
| Integrantes internos | 2 | 5 | 15 |

Não substituir os limites por exemplos ilustrativos.

Não inventar descontos, condições de assinatura anual ou trials públicos.

Manter Pro como plano recomendado, conforme o padrão comercial do ecossistema 77.

## NOVO PRINCÍPIO DE DIFERENCIAÇÃO

### ESSENCIAL — Começar a operar

Deve atender uma organizadora pequena e permitir a operação principal com qualidade.

O plano deve oferecer uma experiência completa no que é fundamental para sua finalidade.

Inclui, conforme os contratos efetivamente existentes:

- Cadastro e administração das caravanas permitidas.
- Inscrições e passageiros.
- Gestão básica da operação.
- Controle de vagas.
- Comprovantes e registros necessários.
- Check-in.
- Identidade visual básica.
- Gestão dos acessos necessários.
- Segurança, privacidade e integridade.

Não retirar funcionalidades essenciais para obrigar a contratação do Pro.

### PRO — Crescer e administrar melhor

**Tudo do Essencial, mais benefícios concretos para operações em crescimento.**

Investigue oportunidades reais de diferenciação, preferencialmente aproveitando recursos já implementados e testados.

Candidatos a diferenciais, sujeitos à auditoria:

- Importações CSV avançadas.
- Relatórios operacionais e financeiros mais completos.
- Exportações administrativas.
- Ferramentas adicionais de produtividade.
- Visões consolidadas entre caravanas.
- Recursos de gestão que realmente economizem trabalho.

Não anunciar recursos que não existam.

Não retirar funcionalidades previamente prometidas a clientes existentes sem avaliar compatibilidade e obrigações comerciais.

### PREMIUM — Operação profissional de maior escala

**Tudo do Pro, mais benefícios concretos para organizadoras com operações maiores.**

Investigue diferenciais como:

- Relatórios gerenciais avançados.
- Ferramentas adicionais de análise e acompanhamento.
- Recursos avançados de personalização realmente implementados.
- Opções adicionais de organização operacional.
- Exportações e controles administrativos especializados.
- Funcionalidades avançadas que agreguem valor mensurável.

Esses são candidatos, não funcionalidades declaradas como existentes.

Não vender integrações, automações, domínios próprios ou recursos futuros sem implementação e validação.

## REGRA FUNDAMENTAL

Primeiro audite todas as funcionalidades já implementadas.

Classifique cada recurso como:

`CORE`, `GROWTH`, `PREMIUM_CANDIDATE`, `DEFERRED`, `NOT_IMPLEMENTED`.

Depois produza a matriz:

| Funcionalidade | Implementada? | Essencial | Pro | Premium | Valor entregue | Evidência |
|---|---|---|---|---|---|---|

A diferenciação deve ser verdadeira.

Se houver recursos existentes suficientes para criar diferenças legítimas, reutilize-os.

Se não houver, implemente somente diferenciais adicionais de escopo pequeno, alto valor e baixo risco, suficientes para justificar progressivamente os planos.

Evite transformar esta etapa em outro GOAL MASTER interminável.

Não implementar módulos gigantes apenas para preencher os cartões de preço.

## ENTITLEMENTS E ENFORCEMENT

Qualquer diferenciação funcional deve ser aplicada:

- Na apresentação comercial.
- No painel administrativo.
- Na resolução centralizada de entitlements.
- Nas operações protegidas.
- Nas regras ou no backend quando aplicável.
- Nos testes de autorização.

Não basta esconder botões.

Não permitir acesso a uma funcionalidade contratualmente restrita apenas alterando a URL, manipulando payloads ou chamando diretamente o SDK.

Não bloquear recursos de segurança, autenticação, privacidade, integridade, isolamento, controles essenciais de acesso ou auditoria obrigatória.

Preservar contratos legados e condições previamente concedidas. Se uma mudança reduzir direitos existentes, documente e preserve o acesso aplicável até que exista decisão comercial adequada.

Testar upgrades, downgrades, limites, overrides, histórico e revogações.

---

# 3. REFAZER A EXPERIÊNCIA VISUAL DOS PLANOS

Quero uma landing com três cartões comerciais claramente diferentes.

Não quero três caixas praticamente iguais em que só mudam preço e limites.

## HIERARQUIA VISUAL

### Essencial

Comunicação:

"Para organizar suas primeiras caravanas com praticidade."

Exibir:

- Preço.
- Público ideal.
- Principais capacidades.
- Benefícios essenciais.
- Limites.
- Chamada para contratação assistida.

### Pro — Recomendado

Comunicação:

"Para quem está crescendo e precisa de mais controle."

Exibir:

- Tudo do Essencial.
- Benefícios adicionais reais.
- Maior capacidade.
- Diferenciais operacionais.
- Destaque visual moderado de melhor equilíbrio.
- Chamada comercial clara.

O Pro deve parecer uma evolução significativa.

### Premium

Comunicação:

"Para organizadoras com operações maiores e necessidades avançadas."

Exibir:

- Tudo do Pro.
- Benefícios adicionais reais.
- Recursos avançados comprovados.
- Maior escala.
- Chamada comercial adequada.

O Premium deve transmitir maior capacidade e abrangência sem prometer funcionalidades inexistentes.

## REQUISITOS DE UX/UI

- Três cartões visualmente coerentes.
- Progressão perceptível de funcionalidades.
- Lista cumulativa de benefícios.
- Recursos exclusivos destacados sem duplicação enganosa.
- Textos orientados ao benefício do cliente.
- Sem marketing fictício, escassez falsa ou métricas inventadas.
- Layout responsivo em 320, 375, 768 e 1440 px.
- Boa legibilidade e acessibilidade.
- Preços e limites carregados do catálogo canônico.
- FAQ atualizado.
- Comparação detalhada verdadeira.
- CTAs funcionais, sem inventar endereço comercial.
- Sem prometer checkout automático, trial público ou assinatura anual quando indisponíveis.

**Os cartões devem vender uma progressão de valor, não apenas uma progressão de números.**

Valide screenshots reais, legibilidade, alinhamento, scroll, contraste, truncamento e comportamento mobile.

Produza testes para impedir que a landing anuncie benefícios inexistentes ou divergentes do catálogo.

---

# 4. ENCERRAR O DESENVOLVIMENTO FUNCIONAL

Após a refatoração comercial:

1. Execute testes direcionados.
2. Valide entitlement e feature gating.
3. Valide tenants de planos diferentes.
4. Valide downgrade e suspensão.
5. Valide dados históricos preservados.
6. Execute regressões necessárias.
7. Confirme que todas as funcionalidades essenciais continuam operacionais.
8. Atualize a matriz de funcionalidades.
9. Faça commit e push.
10. Publique as mudanças somente no staging autorizado.

O estágio funcional deve estar concluído sem TODOs críticos, regressões abertas ou funcionalidades anunciadas sem implementação.

Não declare 100% enquanto houver falhas bloqueantes.

---

# 5. FINALIZAR F7 — INFRAESTRUTURA E SEGURANÇA

Ambiente autorizado:

Firebase staging: `bdall-e3585`.

Cloudflare staging: `caravana77-staging`.

Orçamento máximo: **R$ 0**.

Não ativar Blaze, criar serviços pagos ou vincular faturamento.

Concluir:

- CI remoto ou registrar bloqueio exato comprovado.
- Segurança operacional.
- Revisão dos advisories remanescentes.
- Observabilidade compatível com os recursos gratuitos.
- Monitoramento de erros e proteção contra abuso.
- Segurança de Authentication.
- Firestore Rules e índices.
- Configuração dos ambientes.
- Validação de backup e restauração sintéticos.
- Documentação de release.
- Procedimentos de rollback.
- Paridade dos artefatos implantados.
- Gestão de credenciais e sessões administrativas.

Distinguir vulnerabilidades no runtime das vulnerabilidades nas ferramentas de desenvolvimento.

Não forçar atualizações de versões maiores sem compatibilidade comprovada.

Revogar sessões antigas do Firebase CLI quando necessário, sem expor credenciais e sem comprometer outras aplicações do proprietário.

Não criar novos projetos Firebase ou Cloudflare sem necessidade.

---

# 6. FINALIZAR F8 — AUDITORIA DEFINITIVA PARA MIGRAÇÃO

Esta é a etapa mais importante.

Quero evidências suficientes para determinar se o Ítalo pode tornar-se o primeiro tenant da arquitetura white-label.

## 6.1 — INVENTÁRIO REAL EM SOMENTE LEITURA

Utilizando exclusivamente acesso legítimo e disponível, faça inventário do ambiente:

Firebase produção: `caravana-af306`.

Cloudflare produção: `caravana-77`.

Confirme:

- Projeto e deployment exatos.
- Schema real.
- Quantidade de organizações.
- Organização do Ítalo.
- Identificadores de documentos.
- Administradores e UIDs.
- Estrutura e provedores Auth.
- Caravanas.
- Inscrições e passageiros.
- Recebimentos.
- Despesas.
- Financeiro Geral.
- Comprovantes e anexos.
- Links privados.
- Storage legado.
- Índices e Rules implantadas.
- Dados órfãos.
- Referências cruzadas.
- Compatibilidade com o modelo multi-tenant.
- Dependências do frontend atualmente publicado.

Não apresentar dados pessoais, comprovantes ou valores individuais em relatórios públicos.

Não presumir que as fixtures representam todo o legado.

Não alterar o Firebase real durante a auditoria.

Se o acesso necessário estiver indisponível, registrar BLOCKED.

## 6.2 — ESCOLHER A ESTRATÉGIA DEFINITIVA

Compare tecnicamente:

A. Evolução aditiva do Firebase atual do Ítalo para multi-tenancy.

B. Migração para um ambiente definitivo diferente.

C. Outra estratégia tecnicamente superior e segura.

Avalie:

- Preservação dos IDs.
- Preservação dos usuários Auth.
- Preservação dos links existentes.
- Compatibilidade com Financeiro Geral.
- Risco de indisponibilidade.
- Capacidade de rollback.
- Custo.
- LGPD e proteção de dados.
- Esforço de manutenção.
- Entrada futura de outros clientes.

**`bdall-e3585` permanece exclusivamente staging e não é destino autorizado para migração de dados pessoais reais.**

Escolha a solução mais segura e sustentável, não simplesmente a mais rápida.

## 6.3 — BACKUP RECUPERÁVEL DO ÍTALO

Prepare e, somente em ambiente privado autorizado e adequado, valide um procedimento de backup completo e protegido.

Considerar:

- Firestore.
- Authentication.
- Dados e metadados relevantes.
- Arquivos e comprovantes existentes.
- Links privados e tokens.
- Configurações.
- Rules e índices.
- Manifestos.
- Integridade.
- Restauração.

Respeitar o orçamento R$ 0.

Não tratar exportação de documentos como backup completo de Authentication ou de arquivos.

Não presumir que senhas Auth podem ser restauradas por simples importação de documentos.

Backups contendo informações reais não devem ser colocados no GitHub, em logs públicos, em repositórios ou no staging comum.

Não armazenar dados privados em computador compartilhado sem ambiente protegido adequado.

O sucesso somente poderá ser declarado quando a completude e um procedimento de recuperação efetivo estiverem comprovados.

Se não for possível realizar ou comprovar isso de forma segura, marcar BLOCKED.

## 6.4 — MIGRAÇÃO SIMULADA

Prepare um ensaio fiel da migração, utilizando dados sintéticos representativos e inventário estrutural real.

Requisitos:

1. Preservar todos os IDs.
2. Preservar documentos antigos.
3. Preservar relacionamentos.
4. Não criar duplicações.
5. Adicionar memberships sem sobrescrever permissões legítimas.
6. Preservar administradores.
7. Manter o Financeiro Geral íntegro.
8. Preservar comprovantes.
9. Manter links e reservas compatíveis.
10. Proteger namespaces.
11. Aplicar regras seguras entre tenants.
12. Simular uma segunda organizadora.
13. Testar A × B.
14. Testar operações antigas e novas.
15. Testar concorrência.
16. Testar replay idempotente.
17. Simular uma migração interrompida.
18. Testar retomada.
19. Testar rollback.
20. Comprovar inexistência de perda, duplicação ou alteração indevida de dados.

Não habilitar migração mutável na produção durante esta tarefa.

## 6.5 — PLANO DE CORTE

Preparar um procedimento operacional sequencial, reproduzível e com critérios de interrupção.

O procedimento deverá especificar:

- Pré-condições.
- Momento do backup.
- Janela de manutenção, se necessária.
- Responsáveis e acessos.
- Congelamento ou controle de novas escritas.
- Manifesto de origem.
- Execução aditiva.
- Verificação de contagens e integridade.
- Verificação de Auth e permissões.
- Implantação coordenada de frontend/Rules/índices.
- Verificação dos links legados.
- Testes de reserva e check-in.
- Testes do Financeiro Geral.
- Smoke tests sem pagamentos reais.
- Monitoramento pós-corte.
- Condições objetivas de rollback.
- Plano de recuperação caso seja preciso desfazer o frontend ou a configuração.
- Critério de encerramento da migração.

Não executar esse plano sobre o Ítalo neste GOAL.

---

# 7. PORTÃO FORMAL — READY FOR MIGRATION

Crie o arquivo:

`docs/MIGRATION_READINESS_FINAL.md`

Ele deve conter uma tabela com resultados verificáveis:

| Gate | Resultado | Evidência | Bloqueador |
|---|---|---|---|
| Funcionalidades concluídas | PASS/FAIL/BLOCKED | ... | ... |
| Planos comerciais verdadeiramente diferenciados | PASS/FAIL/BLOCKED | ... | ... |
| Entitlements e testes dos planos | PASS/FAIL/BLOCKED | ... | ... |
| Staging integral validado | PASS/FAIL/BLOCKED | ... | ... |
| Inventário real do Ítalo | PASS/FAIL/BLOCKED | ... | ... |
| Compatibilidade do schema | PASS/FAIL/BLOCKED | ... | ... |
| Compatibilidade de Auth | PASS/FAIL/BLOCKED | ... | ... |
| Comprovantes e Storage legado | PASS/FAIL/BLOCKED | ... | ... |
| Backup real recuperável | PASS/FAIL/BLOCKED | ... | ... |
| Restauração comprovada | PASS/FAIL/BLOCKED | ... | ... |
| Simulação de migração | PASS/FAIL/BLOCKED | ... | ... |
| Preservação financeira | PASS/FAIL/BLOCKED | ... | ... |
| Isolamento multi-tenant | PASS/FAIL/BLOCKED | ... | ... |
| Rollback coordenado | PASS/FAIL/BLOCKED | ... | ... |
| Infraestrutura sem novos custos | PASS/FAIL/BLOCKED | ... | ... |
| Segurança operacional | PASS/FAIL/BLOCKED | ... | ... |
| Procedimento final documentado | PASS/FAIL/BLOCKED | ... | ... |

Além dessa tabela, mantenha a matriz original dos 14 gates F8 e não oculte critérios anteriores.

## DECLARAÇÃO OBRIGATÓRIA

Ao final, emita um dos dois resultados:

### RESULTADO A — READY_FOR_MIGRATION

Somente se todos os requisitos críticos estiverem comprovados:

"O sistema está tecnicamente pronto para a migração controlada do Ítalo. Os backups, a restauração, a compatibilidade e o procedimento de retorno foram validados. Resta executar a migração real mediante autorização final específica."

### RESULTADO B — NOT_READY_FOR_MIGRATION

Se existir qualquer condição crítica pendente:

"O sistema ainda não está tecnicamente pronto para receber os dados reais do Ítalo. Os bloqueadores restantes são: ..."

Não transforme BLOCKED em PASS para alcançar 99%.

Não use percentual estimado como prova de segurança.

---

# 8. PUBLICAÇÃO E PROTEÇÃO DA PRODUÇÃO

Você está autorizado a:

- Desenvolver.
- Corrigir.
- Testar.
- Refatorar planos.
- Configurar staging.
- Publicar no staging.
- Executar auditoria de leitura autorizada.
- Preparar backups de maneira privada e protegida.
- Simular migração.
- Preparar scripts e procedimentos.
- Criar commits.
- Enviar pushes seguros à branch.

Você NÃO está autorizado nesta tarefa a:

- Migrar o Ítalo efetivamente.
- Reestruturar documentos reais.
- Alterar Rules ou Auth de produção.
- Executar importação de dados reais.
- Substituir a aplicação publicada.
- Alterar comprovantes, pagamentos ou despesas reais.
- Executar operações financeiras bancárias.
- Fazer merge na main.
- Ativar Blaze ou serviços pagos.
- Copiar dados privados para o staging comum.
- Apagar o sistema anterior ou seus backups.

Não interprete autorizações antigas e condicionais como permissão para contornar estas restrições mais recentes.

Preserve o deployment atual `4d069e0a` e confirme o estado real antes de qualquer ação.

---

# 9. EFICIÊNCIA E AUTONOMIA

O responsável já autorizou o desenvolvimento e os testes seguros.

Não interrompa para solicitar confirmação sobre tarefas técnicas normais.

Trabalhe continuamente até atingir todos os critérios executáveis.

Use:

- Testes direcionados durante implementação.
- Regressões completas nos gates relevantes.
- Checkpoints seguros.
- Commits e pushes incrementais.
- Relatórios de progresso objetivos.
- Documentação versionada.
- Evidências reais de navegador e backend.
- Reutilização de testes válidos.

Não repetir F0–F6 sem motivo.

Não ampliar indefinidamente o escopo.

Quando houver um bloqueio externo, registre e continue tarefas independentes.

Se o checkout estiver em computador compartilhado, proteja dados e encerre sessões administrativas após a execução.

---

# 10. ENTREGA FINAL OBRIGATÓRIA

A última resposta deverá conter:

1. Branch e SHA enviados.
2. Estado F0–F8.
3. Percentual técnico fundamentado.
4. Evidências dos testes finais.
5. Comparação comercial final de Essencial, Pro e Premium.
6. Lista de funcionalidades exclusivas e cumulativas reais de cada plano.
7. Preços e limites preservados.
8. URL e evidências de staging.
9. Confirmação de produção existente preservada.
10. Inventário real obtido em leitura e limitações.
11. Estratégia definitiva recomendada para o Ítalo.
12. Backup e restauração: o que foi comprovado e o que não foi.
13. Migração simulada e resultados.
14. Rollback e procedimentos.
15. Matriz completa de gates.
16. Lista exata de bloqueadores.
17. Evidência de orçamento R$ 0.
18. Parecer final READY_FOR_MIGRATION ou NOT_READY_FOR_MIGRATION.

Não declarar "pronto" sem todas as provas críticas.

Não dizer que a migração é segura apenas porque os testes locais e de staging passaram.

Não migrar dados reais antes da autorização final.

## INSTRUÇÃO FINAL

**Finalize todas as atividades técnicas possíveis, transforme os planos em ofertas progressivas e comercialmente convincentes, com diferenças reais, e prepare a plataforma para que a migração do Ítalo possa ser a próxima e última operação relevante antes do lançamento.**

Trabalhe autonomamente, preserve a produção existente, registre todas as evidências e entregue um parecer verificável.

A missão termina com o sistema comprovadamente preparado para o corte — ou com os bloqueadores exatos que ainda impedem esse resultado.