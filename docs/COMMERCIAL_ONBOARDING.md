# F6 — Onboarding comercial assistido

## Contrato implementado

Nova organizadora: uma transação cria namespace, organização, primeiro owner/membership, diretório de equipe, contadores (0 publicadas/1 integrante/1 owner), assinatura privada, entitlements públicos, identidade pública, slug e disponibilidade. O evento imutável `platformAudit` contém o hash da solicitação e os snapshots iniciais de assinatura/branding. Atribuições e edições posteriores continuam nos respectivos históricos comerciais e de identidade.

Plano inicial explicitamente escolhido no catálogo aprovado, setup padrão R$100 com dispensa opcional, status ativo. Nenhuma cobrança é executada. Contatos públicos começam vazios; a marca não herda contato de cliente existente. UID de conta Auth existente exige conferência humana explícita; o frontend não faz verificação administrativa do provedor. Não criar senha compartilhada.

Operação persistida na aba por ator, namespace e hash; replay exato não cria organização/contrato/owner duplicado. Reutilização com dados diferentes é negada. Recuperação de erro exige evento exato confirmado pelo servidor. Namespace existente, protegido ou sem inventário confiável é bloqueado conforme NAMESPACE_PROTECTION.md. Nenhum baseline legado é criado/resetado por esse fluxo.

Rules candidatas exigem os documentos companheiros, schemas e snapshots coerentes na mesma transação. O primeiro diretório/contador usa `lastPlatformOperationId`; alterações posteriores usam eventos de quota. O acesso global não concede leitura de passageiros/financeiro nem permite criar owners em organizações existentes.

## Evidência incremental — 2026-10-19

- PASS: typecheck e lint.
- PASS: 15 testes puros/SDK/Rules em `f6-onboarding-green.log`: cadastro, replay, limites, privacidade, falta de inventário, namespace órfão, revogação, tenant × plataforma e omissão individual dos dez documentos obrigatórios. Controle raw completo aprovado antes das omissões.
- FAIL corrigidos: as duas primeiras rodadas usavam nomes de campos diferentes do schema aprovado nas expectativas comerciais; o runtime passou. Logs `f6-onboarding-first.log` e `f6-onboarding-completeness.log` preservados.
- PASS: 4 E2E desktop1440/mobile320 e build E2E em `f6-onboarding-e2e-green.log`. Cadastro com Pro/marca própria, alteração auditada de situação, revogação global, owner com múltiplas organizações e separação do financeiro. Sem erro JS ou chamada remota Firebase. Rodada anterior:2 PASS/2 FAIL por seletor `getByLabel` exato do select; corrigido para combobox com nome acessível.

## Gates externos

BLOCKED: inventário/bootstrap real, Auth administrativo confiável, implantação de Rules/índices/frontend e homologação real. Não foi efetuada escrita no Firebase real, migração, deploy ou merge. F6 permanece IN_PROGRESS até equipe/convites, UI comercial/demo/landing e gate de aceite. Aceite F2 continua somente local/sintético.

Compatibilidade: eventos antigos de cadastro sem `details.requestHash` não são considerados replay de um novo comando. Não são regravados. A versão comercial candidata requer frontend e Rules compatíveis no futuro release autorizado.
