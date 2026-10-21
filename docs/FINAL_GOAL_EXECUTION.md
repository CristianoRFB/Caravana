# GOAL FINAL — execução vigente

Fonte original preservada em GOAL_FINAL_2026-10-20.md. Branch obrigatória codex/caravana77-commercial-v1-20261016. Parecer operacional atual: [COMMERCIAL_READINESS_2026-10-21.md](COMMERCIAL_READINESS_2026-10-21.md). Segurança/compatibilidade do Ítalo prevalecem; nenhuma alteração de produção, migração real, Blaze, serviço pago, merge main ou force push autorizados neste fluxo.

## Estado reconciliado

| Item existente do GOAL | Estado atual | Evidência / próxima condição |
|---|---|---|
| Inventário funcional e catálogo comercial | IMPLEMENTED/LOCAL_TESTED | COMMERCIAL_FEATURE_MATRIX.md; preservar preços/limites e CORE concedido |
| Diferenciais reais Pro/Premium | IMPLEMENTED/LOCAL_TESTED, staging histórico | Relatórios operacionais e roteiros/modelos; não reimplementar |
| Cartões/FAQ/landing/painel/mobile | IMPLEMENTED/LOCAL_TESTED | Quatro larguras; E2E do checkpoint próprio |
| CI remoto | PASS nova revisão | a7b5785/run39540369156 PASS:290+8Auth+6Storage+23 guards Python+recuperação conjunta+184 E2E; lint/typechecks/build PASS |
| Observabilidade/abuso/Auth/advisories | IN_PROGRESS/BLOCKED real | Diagnósticos/health implementados; audit tooling7→5; Auth403/SERVICE_DISABLED sem consumidor real identificado |
| Inventário e recuperação reais do Ítalo | BLOCKED | Sem prova legítima/completa em ambiente privado adequado; não copiar PII para Git/chat/staging |
| Ensaio de recuperação/retorno sintético | LOCAL_TESTED | Auth/Firestore/Storage, UIDs/bytes/ACL e interrupção/retomada; não substitui legado real |
| Parecer17 gates e matriz F8 | DOCUMENTED/BLOCKED | MIGRATION_READINESS_FINAL.md6/17, F8_ACCEPTANCE.md5/14; NOT_READY_FOR_MIGRATION |

## Próxima execução exata

1. Fetch/HEAD/working tree da branch; preservar WIP e checkpoints remotos. Não trocar por main.
2. Ler COMMERCIAL_READINESS_2026-10-21.md, F7_CLOSURE_2026-10-21.md e evidência final do CI antes de testar novamente. Reusar somente aceites do mesmo código; testes de e4939db não aprovam o override novo de a7b5785.
3. Conferir ambiente/identidade gerenciada atual. Runtime49 observado sem GCP; não pedir segredos pelo chat nem repetir um login sem entrada segura.
4. Com leitura legítima de bdall-e3585 e identidade/projeto/billing conferidos, executar auditoria fixa somente leitura; diagnosticar serviço/consumidor do403. Sem acesso, registrar BLOCKED e usar o checklist externo existente.
5. Somente com autorização/configuração/permissões efetivas, homologar candidata e jornadas fictícias no staging. Não criar papéis amplos, habilitar APIs por suposição, usar produção como laboratório ou ativar Blaze.
6. Rever provas privadas de inventário/backup/restore/compatibilidade/retorno reais antes de alterar qualquer gate do Ítalo. Não executar migração real neste GOAL.

Funcionalidades essenciais e emuladores já aprovados não são uma fila de trabalho nova. Não repetir regressões extensas para o mesmo código nem criar funcionalidades para substituir dependências externas. Implementação técnica estimada85% (17/20 grupos existentes); GOAL final35% (6/17 gates), com métodos e limites explícitos no parecer. Nenhum percentual é autorização de publicação.
