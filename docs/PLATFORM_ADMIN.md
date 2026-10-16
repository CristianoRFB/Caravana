# Platform Owner — mínimo local implementado

Rotas: `/platform/login` e `/platform`. Permissão deriva exclusivamente de `platformOwners/{uid}.status == active`, documento sem criação/alteração pelo cliente. Claim ou campo de perfil `platform_owner` não concede autoridade. Memberships continuam apenas tenant_owner/staff.

## Operações disponíveis

1. Listar organizadoras e sua situação, sem consulta automática a passageiros, comprovantes ou financeiro.
2. Cadastro assistido de organizadora com nome, novo identificador e UID de responsável previamente existente/conferido no Auth. O identificador é o ID da nova organização; organizações legadas nunca são renomeadas.
3. Criar atomicamente organização, membership do owner, disponibilidade pública mínima e evento imutável. Operação tem ID estável e replay idempotente; duplicação/conflito preserva o registro existente.
4. Suspender/reativar novas reservas com evento contendo ator, horário de servidor, situação anterior e nova. Não apaga inscrições, pagamentos ou comprovantes e não remove acesso do owner ao histórico. A suspensão é aplicada pelas Rules mesmo com projeção pública desatualizada.
5. Exibir até50 eventos recentes. Eventos não podem ser alterados ou apagados por clientes, inclusive Platform Owner.

O formulário não cria nem consulta contas Auth pelo Admin SDK: pressupõe UID existente conferido no processo assistido. A UI informa esse contrato. Onboarding por convite/e-mail/verificação automática pertence à evolução comercial F6; nenhuma conta real foi criada, resetada ou alterada neste módulo. Planos não podem ser inseridos silenciosamente nestas operações; alteração futura terá ação/schema/auditoria próprios.

## Autorização e consistência

Firestore Rules são a autoridade de servidor destas operações; não existe segredo administrativo no navegador nem bypass por flag de UI. Cada escrita exige evento novo e referência cruzada por getAfter; o evento, por sua vez, exige organização e disponibilidade consistentes e, no cadastro, membership nova/ativa com UID/org/papel/timestamp corretos. Cadastro parcial ou aproveitamento de membership órfã adulterada é negado atomicamente.

`organizationAvailability/{orgId}` permite somente get público de organizationId, status, updatedAt e ID opaco da operação. Não contém nome de passageiro, UID de usuário, dinheiro ou comprovante. Listagem e escrita pública são negadas. Organizações legadas sem esse documento conservam o comportamento anterior; suspensão criada pela plataforma grava a projeção e a regra consulta também a organização autoritativa.

Auth e papel global são observados ao vivo. Revogação esconde e limpa a interface e encerra os observers de dados. O owner global sem membership não entra no painel financeiro do tenant, não lê inscrições/proofs e não ganha permissões de Storage. Operações privilegiadas usam o rastreamento de writes já existente.

## Evidência e próximos gates

- `f2-platform-final-tests.log`:48 testes relacionados PASS, incluindo serviço real + Rules, replay, conflito, audit obrigatório/imutável, dados legados intactos, suspensão/reativação, bypass com projeção stale, negação a tenant owner/não vinculado, cadastro parcial/membership órfã e revogação global.
- `f2-platform-e2e.log`:4 PASS em desktop1440/mobile320, com login real Auth Emulator, onboarding de conta efetivamente existente, suspensão auditada, revogação ao vivo, negação ao tenant owner e financeiro negado ao global. Nenhum erro JS/tentativa Firebase remoto; sem screenshots repetidos.
- Identidade global adicional `platform.safety@example.test` existe só na fixture da suite de segurança, nunca no seed `npm run demo` nem nas contas fixas normais.
- Lint/typecheck e build compilado E2E passaram. Gate F2 completo ainda IN_PROGRESS: concluir modo suporte explícito com consentimento/escopo/expiração/auditoria, revisar matriz e executar regressões de aceite. Até lá não alegar suporte privado pronto ou prontidão comercial.

Produção/Rules implantadas/dados reais permanecem intactos. Nenhum serviço pago, deploy, mensagem ou operação financeira foi executado. Corte/migração reais, validação de tokens/IAM legados e backup/restore reais continuam BLOCKED conforme política do cliente.
