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

## Próxima implementação local

1. Rules autorizando membership ativa e impedindo autoelevação, alteração de org/UID e bypass por registro legado revogado.
2. Resolver/watch de memberships, contexto de tenant por sessão, troca com remount/limpeza, revogação durante sessão e testes A×B.
3. Compatibilidade de admins legados explícita e temporária: ainda é o caminho atual em runtime. Não remover nem estabelecer corte automático sobre o cliente antes do dry-run real aprovado, backup real e acesso do administrador comprovado. A data de corte será configurada na migração autorizada, com janela proposta de até 30 dias após aplicação; sua ativação real está BLOCKED. Não existe fallback que deva reativar membership explicitamente revogada.
4. Platform Owner mínimo, onboarding com auditoria e suporte de privilégio mínimo; Storage legado protegido/testado separadamente. Backend confiável necessário para operações privilegiadas; não simular autoridade com dropdown/localStorage.

## Gates e bloqueios

F2-MIGRATION PASS apenas para fixture sintética e planner/restore local. F2 completo IN_PROGRESS: runtime ainda usa admins, Rules ainda não fazem RBAC por membership e não há Platform Owner. Migração de produção, backup/restore real, publicação de Rules, deploy, merge e push continuam BLOCKED sem autorização específica. IDs e documentos reais do Ítalo permanecem intactos, e não se presume conhecer todo o schema real.
