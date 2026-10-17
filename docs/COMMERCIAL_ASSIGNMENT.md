# F6 — atribuição comercial manual (módulo local)

F6 ainda IN_PROGRESS: este módulo não conclui limites transacionais, equipe, onboarding completo ou landing/demo. Nenhuma cobrança, deploy, migração real, alteração do cliente Ítalo ou de Rules implantadas foi realizada.

## Coleções candidatas

- `subscriptions/{org}`: contrato privado, plano/status, catálogo mensal, setup dispensado ou10000centavos, override com valor/motivo/expiração, revisão e auditoria. Apenas Platform Owner altera; owner próprio lê, staff/guest/B não leem condições de outro tenant.
- `tenantEntitlements/{org}`: resumo público mínimo de limites e disponibilidade de crescimento. Não expõe plano/status financeiro, preços, descontos, UID ou dados do responsável. O prazo de concessão assistida permite decisão no relógio do servidor.
- `commercialOperations/{operationId}`: evento imutável com ator/tempo do servidor, hash da intenção, condição anterior e nova. Owner próprio/global leem; efeito e evento são validados nos dois sentidos.
- `tenantUsage/{org}`: baseline confiável obrigatório. Neste checkpoint cliente algum, inclusive Platform Owner, cria/reseta/altera contadores; alterações futuras só por operações vinculadas e onboarding novo validado. Baseline legado exige dry-run e procedimento administrativo autorizado.

Catálogo e limites estáticos são conferidos nas Rules. Promoção Pro90 não muda Pro149 de catálogo nem o valor8500centavos de passageiro. Expiração volta ao catálogo sem criar recibo/cobrança. Anual continua deferred. Trial existe como contrato de concessão assistida com prazo, sem signup/trial público; demo exige projeto sintético nas Rules. Downgrade preserva registros e contadores acima do novo limite, para bloquear apenas crescimento quando a integração de quotas estiver pronta.

Operação tem ID/hash, replay e recuperação por evento exato no servidor. Revisão esperada evita que dois editores manuais substituam silenciosamente condições diferentes. Painel `/platform` contém Plano e limites por organizadora; campos e audit somem ao revogar autoridade global. Leituras de condição/auditoria aceitam somente confirmação de servidor. A condição é administrativa, sem gateway, fatura ou dinheiro transferido.

## Evidência incremental

`f6-assignment-first-tests.log`:27 PASS. Revisão otimista adicionada, `f6-assignment-final-tests.log`:28 PASS,5 arquivos,10,9s. Cobertos concorrência/replay, alteração do payload, condição anterior preservada, preço/override/setup adulterados com audit completo, baseline ausente, reset de contador negado, downgrade/status, owner/staff/B/guest, ausência de autoridade global sobre inscrição privada e tarifa8500/recebido2500 inalterados.

Primeiro E2E4 PASS/2 FAIL: teste procurava select por label exato que incluía o texto de options, e apontava container incorreto para os limites. Snapshot comprovou formulário acessível; seletor usa role/nome e seção correta. `f6-assignment-final-e2e.log`:6 PASS/29,1s desktop/mobile320, Auth real emulado: promoção Pro90, catálogo149, downgrade, B sem herdar condição A, revogação global e regressões de onboarding F2. Lint/typecheck PASS no módulo. Novos serviços quota-operations.ts estão apenas preparados, sem ligação/Rules/testes próprios neste checkpoint.

## Próximas tarefas obrigatórias

1. Vínculo transacional de caravanas publicadas/equipe com contadores e auditoria; participantes por caravana no servidor, inclusive CSV/corridas.
2. Namespace legado confiável antes de onboarding: uma organização sem documento raiz, mas com referências históricas, nunca pode ser apropriada por cadastrar o mesmo identificador. Preparar inventário de namespaces/marker administrativo em dry-run; nenhum preenchimento real autorizado.
3. Onboarding atômico com plano/baseline/marca/primeiro owner, gerenciamento de equipe pelo owner e proteção de último owner. Global não pode inserir a si mesmo como membro de tenant existente para contornar suporte.
4. UI de limite/estado e fixtures explícitas, landing SaaS/demo, contato comercial pendente de resposta do usuário. Gates F6–F8 continuam pendentes.
