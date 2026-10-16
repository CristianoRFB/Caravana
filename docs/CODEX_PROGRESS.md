# Progresso — fonte única

Estados: TODO, IN_PROGRESS, PASS, FAIL, BLOCKED. SOURCE_PRESENT/BUNDLE_PRESENT não equivalem a TESTED/RUNTIME_CONFIRMED.

| ID | Prioridade | Estado | Base/alteração | Evidência/teste | Risco/dependência/próximo passo |
|---|---|---|---|---|---|
| F0-01 | P0 | PASS | Inventário Git oficial e local | github-api.json; ls-remote; bundle backup | Sem escrita remota |
| F0-02 | P0 | PASS | Captura Production, Previews e ZIPs | public-bundles.json; all-bundle-manifests.json | Evidência estática, não runtime |
| F0-03 | P0 | PASS | Fonte TS avançada encontrada e preservada | local-preserved/source-and-dist.zip + manifest | Checkout original intacto |
| F0-04 | P0 | PASS | Recuperação em worktree isolada baseada em fa4d138 | SOURCE_RECONCILIATION.md; fonte TS original, sem decompilação | Checkout original intacto |
| F0-05 | P0 | PASS para Rules; UNKNOWN para registros reais | Rules implantadas capturadas somente leitura e idênticas às recuperadas | live-rules-manifest.json; SHA256 fe594614... | Nenhuma PII consultada; não equivale a homologação |
| F0-09 | P0 | PASS | Build reproduzível com financeiro | f0-build-parity.json: seis arquivos idênticos; 26 testes; lint/typecheck/build | Não publicar dist; nenhuma garantia de operação bancária |
| F1 | P0 | IN_PROGRESS | Checkpoint F0 69abd6f; regressão pela função real de reserva | Fixtures sem id, id legado, concorrência, cancelamento, ledger e upload | Primeiro capturar falha do bug publicado, depois corrigir |
| F1-ID-RED | P0 | FAIL (baseline; corrigindo) | 4 de 8 novos testes reproduzem erro real da fonte publicada | f1-before-id-fix-isolated.log; 30 PASS/4 FAIL | Undefined, id legado errado e última vaga; corrigir ambas as escritas e leitura canônica |
| F1-TEST-ISOLATION | P0 | IN_PROGRESS | Porta 8080 ocupada; configuração de testes separada 18080, projeto demo-caravana77-test | f1-before-id-fix.log registra falha de infraestrutura; rerun isolado executou 34 testes | Nenhum processo de terceiro encerrado; serviços reais não recebem testes |
| F1-ID-GREEN | P0 | PASS | Ambas as escritas usam caravanRef.id; leituras priorizam snapshot.id | f1-id-final-tests.log: 34 PASS; lint/typecheck/build PASS | Fonte financeira e layout preservados; fix ainda local |
| F1-RUNNER | P0 | PASS | npm test usa projeto demo, loopback e runner com cleanup Windows restrito ao processo criado nesta execução | f1-id-final-tests.log, exit 0 e Java encerrado | Erro inicial de ExecutionPolicy corrigido sem mudar política do sistema |
| F1-PROOFS | P0 | PASS para cliente/Firestore; Storage estático | Unificar 600 KiB com tamanho base64 e assinatura | f1-policy-import-tests.log: 43 PASS; boundary614400 aceita,614401 bypass negado | Storage legado fora da configuração ativa; nenhum deploy Rules |
| F1-CSV | P0 | PASS parcial | Função real de importação sobre fixtures | Replay mesmo lote e capacity atômica, f1-policy-import-tests.log | Dedupe entre lotes/rollback permanecem TODO F3; nenhuma importação real |
| F1-E2E | P0 | PASS parcial do baseline | Ambiente totalmente sintético; quatro larguras; financeiro e fluxo legado | f1-e2e-mobile-header-final.log: 12 PASS; f1-e2e-regression-unit.log: 43 PASS; lint/typecheck/build PASS | Capturas reais sintéticas; F1 completo não homologado |
| CLIENT-PRESERVATION | P0 | PASS para auditoria atual; obrigação futura | Cinco confirmações registradas antes de F2 | CLIENT_PRESERVATION_ITALO_2026-10-16.md | Nenhuma escrita real autorizada; continuar localmente |
| F1-LOCAL-SAFETY | P0 | PASS | Guard antes do SDK, dev sintético por padrão e E2E sobre dist-e2e compilado | 8 casos de ambiente; f1-environment-unit.log 51 PASS; f1-compiled-e2e.log 12 PASS | Build real recusa loopback; nenhum bypass para produção |
| F1-PORTAL | P0 | PASS local | Revogação aditiva, limpeza do portal, no-referrer; recusa/reenvio/cancelamento e Pix incompleto | f1-portal-unit.log 52 PASS; f1-portal-e2e-green.log 20 PASS; lint/typecheck/build PASS | Primeiros E2E falharam por seleção de heading, commit assíncrono e texto esperado; corrigidos sem skip/retry |
| F2 | P0 | IN_PROGRESS | Modelo/migração sintética aditiva concluídos; runtime/RBAC ainda pendentes | MULTITENANT_MIGRATION.md | Nunca migrar produção |
| F2-MIGRATION | P0 | PASS sintético | Planner sem I/O, manifesto before/after, conflitos, idempotência e restore local | f2-migration-final-tests.log 64 PASS; f2-migration-rehearsal.log aplica 2 memberships, preserva 8 docs, restore SHA256 idêntico | Compatibilidade com admins preservada; nenhuma migração real |
| F2-RBAC | P0 | PASS parcial local | Membership/roles em Rules e org/caravan imutáveis; global separado; compatibilidade legada configurável | f2-context-unit.log 75 PASS, f2-context-e2e.log 28 PASS | Storage e backend/Platform Owner completo pendentes |
| F2-RESOLVER | P0 | PASS local | Revogação observada, remount ao trocar org/papel, rascunhos/filtros limpos e bloqueio de troca durante writes | E2E contexto28 PASS anterior; f2-pending-e2e.log4 PASS com Write retido | Não cancela commit já aceito; operações futuras devem usar SDK rastreado |
| F2-STORAGE | P0 | PASS para SDK/regras locais; BLOCKED corte real | Leitura membership+inscrição, A×B/staff/guest/associação/revogação, cliente sem Storage mutations | f2-storage-final.log6 PASS; STORAGE_PRIVACY.md | Exige migração aprovada antes de publicar; tokens/IAM reais desconhecidos; warning Java no shutdown registrado |
| F2-PENDING-WRITES | P0 | PASS local | Transações, batches e set/update rastreados até ack/erro; troca aguarda conclusão | f2-pending-operations-final.log30 PASS; f2-pending-e2e.log4 PASS;lint/typecheck | Primeiro comando direto node falhou por PATH; usar scripts npm documentados |
| F2-DEMO | P0 | PASS local | 3 contas reais no Auth Emulator; perfis/memberships e fixtures idempotentes; npm run demo | f2-demo-auth-final.log 4 PASS; f2-demo-security.log 47 PASS; f2-demo-e2e.log 4 PASS; startup/build/lint/typecheck PASS | Documentado TEST_ACCOUNTS.txt; sem Platform Owner; API do Auth real não configurada |
| F2-PLATFORM | P0 | PASS para mínimo local | Lista/status, onboarding de UID existente, membership e disponibilidade atômicas com audit imutável, replay e revogação global | f2-platform-final-tests.log48 PASS; f2-platform-e2e.log4 PASS;lint/typecheck/build e2e | PLATFORM_ADMIN.md; convite/verificação Auth automática F6; suporte explícito ainda TODO |
| F2-SUPPORT | P0 | PASS local | Consentimento do owner, escopo configuração somente leitura, início explícito, sessão única, prazo1h e audit imutável | f2-support-tests.log9 PASS inicial; f2-support-e2e.log4 PASS; casos adicionais no gate | SUPPORT_ACCESS.md; sem passageiros/proofs/financeiro e sem escrita real |
| F2-ACCEPTANCE | P0 | PASS sintético / BLOCKED homologação real | Matriz dos10 requisitos em F2_ACCEPTANCE.md; regressão do conjunto |101 unit/Rules/integration,4 Auth,6 Storage,56 E2E,lint/typecheck/build e2e PASS; teste estático anterior corrigido | Tokens/IAM/backup/migração reais BLOCKED; próxima fase local F3 |
| WORKFLOW-EFFICIENCY | P1 | PASS aplicado ao bloco demo | Suites específicas após mudanças; sem regenerar screenshots ou reiniciar auditoria; push na branch autorizado | Testes de risco auth/Rules incluídos; checkpoint funcional | Full gates na conclusão de fase |
| F3 | P0/P1 | TODO | Estados, reservas, CSV, check-in | Jornadas sintéticas | F2 dependente |
| F4 | P0 | TODO | Financeiro preservado e consolidado | Invariantes, ledger, isolamento | Não movimentar dinheiro real |
| F5 | P1 | TODO | White-label e rotas | A×B e links legados | Sem DNS/domínio novo |
| F6 | P1 | TODO | Planos e onboarding assistido | Limites servidor e overrides | Sem billing/gateway |
| F7 | P1 | TODO | CI, observabilidade e release local | E2E/docs/runbook | Publicação bloqueada por autorização |
| F8 | P1 | TODO | Relatório de aceite | Gates e checkpoint | Sem merge/deploy/PR; pushes de checkpoints autorizados na branch de trabalho |

Gate F0 PASS de fonte recuperada/reconciliável: financeiro e recursos avançados preservados objetivamente. F1 tem baseline local PASS parcial; staging/Storage reais não homologados, CSV cross-batch será F3. F2–F8 permanecem pendentes. Cada checkpoint registra o commit por git log (evitar SHA autorreferente no próprio commit), comandos, logs, resultado e próximo passo exato.
