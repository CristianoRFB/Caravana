# FASE 2 — modelo e ensaio sintético de memberships

Pré-requisito conferido: CLIENT_PRESERVATION_ITALO_2026-10-16.md, checkpoint e81ba0b, manifestos com 54 arquivos originais/zero divergências e backups intactos. Nenhuma escrita real nesta execução. Este documento não autoriza migração de produção.

## Estado implementado

Membership proposta em `memberships/{uid}/organizations/{organizationId}`. A chave composta por caminhos separados mantém UID e organizationId originais, sem concatenações ambíguas nem renomeação. Campos: uid, organizationId, role (tenant_owner/staff), status (active/revoked), createdAt, updatedAt e legacySourcePath opcional. `platform_owner` não é um papel de membership de tenant: será global, separado e não dará acesso implícito aos passageiros.

O planner TypeScript é puro, sem SDK, credenciais ou I/O. Lê um snapshot, produz operações apenas create com before:null e after explícito. Não altera admins, organizations, caravanas, inscrições, pagamentos, comprovantes ou histórico. Admin legado com role admin/owner e organização existente propõe tenant_owner; papel desconhecido/orfandade/conflito exige revisão. Membership revogada, staff ou com UID divergente nunca é sobrescrita ou elevada. Qualquer conflito bloqueia aplicação da simulação inteira. Replay resulta em zero creates.

## Comandos exclusivamente locais

- `npm run migration:dry-run`: fixture fixa SYNTHETIC_ONLY, sem inicializar Firebase. Gera manifesto before/plan/after com SHA256.
- `npm run migration:rehearse`: runner inicia Firestore local dedicado, projeto exato demo-caravana77-test. Aplica apenas criações em transaction após verificar ausência dos alvos. Confere hash de todos os documentos originais, replay e restore do backup sintético.
- O ensaio exige banco demo vazio; guard é executado antes de importar Firebase. Não aceita flags de projeto real, credenciais, endpoint remoto ou snapshot arbitrário. As coleções criadas são fictícias. O clearFirestore do restore existe apenas neste ensaio do emulador recém-iniciado e não pode atingir produção.

Evidências em evidence/2026-10-16/f2-membership-*.json e f2-migration-*.log. O restore reproduziu SHA256 baabe2f6ab83ba2a70a9ad1cf59efcb478e75a733db44a6a326811c8e0f96a46, idêntico ao before. O ensaio não é backup do banco real nem script aprovado para a produção.

## Runtime local implementado após o ensaio

Rules usam memberships ativas com uid/org/role verificados. Existência de membership revogada ou inválida impede fallback legado. `staff` opera passageiros/check-in e lê financeiro; criação/correção monetária e configuração de caravana exigem owner. IDs de org/caravana são imutáveis nas atualizações. Platform Owner tem somente leitura de metadados das organizações, sem acesso privado automático e sem self-grant. Memberships/perfis/Platform Owner não podem ser concedidos pelo cliente.

Resolver observa acesso e revogação, preserva fallback de admin legado somente quando não existe membership correspondente e a política permitir. A organização pode definir `legacyAdminAccessEnabled:false` e/ou `legacyAdminAccessUntil` Timestamp; nenhuma data/política real foi aplicada. Prazo de corte deve ser definido na migração autorizada (janela proposta até30 dias), após comprovar acesso do administrador. Login não dispara mais limpeza automática de campos legados.

Troca de tenant/papel remonta a UI e encerra os observers; filtros, rascunhos e listas antigos não permanecem. Operações já enviadas ao servidor ainda precisam de controle explícito antes do gate F2. Dropdown é apenas seleção entre memberships observadas, nunca fonte de autoridade. Contas demonstrativas reais no Auth Emulator são descritas em TEST_ACCOUNTS.txt, sem Platform Owner ou admins legados.

## Próxima implementação local

1. Rules autorizando membership ativa e impedindo autoelevação, alteração de org/UID e bypass por registro legado revogado.
2. Resolver/watch de memberships, contexto de tenant por sessão, troca com remount/limpeza, revogação durante sessão e testes A×B.
3. Compatibilidade de admins legados explícita e temporária: ainda é o caminho atual em runtime. Não remover nem estabelecer corte automático sobre o cliente antes do dry-run real aprovado, backup real e acesso do administrador comprovado. A data de corte será configurada na migração autorizada, com janela proposta de até 30 dias após aplicação; sua ativação real está BLOCKED. Não existe fallback que deva reativar membership explicitamente revogada.
4. Platform Owner mínimo, onboarding com auditoria e suporte de privilégio mínimo; Storage legado protegido/testado separadamente. Backend confiável necessário para operações privilegiadas; não simular autoridade com dropdown/localStorage.

## Gates e bloqueios

F2-MIGRATION PASS apenas para fixture sintética e planner/restore local. F2 completo IN_PROGRESS: Storage, operações pendentes, backend/onboarding e UI Platform Owner ainda não concluídos. Migração de produção, backup/restore real, publicação de Rules, deploy e merge continuam BLOCKED sem autorização específica. Push de checkpoint na branch de trabalho foi autorizado pela instrução complementar. IDs e documentos reais do Ítalo permanecem intactos, e não se presume conhecer todo o schema real.
