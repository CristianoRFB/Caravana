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
| F2 | P0 | TODO | Core multi-tenant e migração sintética | A×B, RBAC, restore | Nunca migrar produção |
| F3 | P0/P1 | TODO | Estados, reservas, CSV, check-in | Jornadas sintéticas | F2 dependente |
| F4 | P0 | TODO | Financeiro preservado e consolidado | Invariantes, ledger, isolamento | Não movimentar dinheiro real |
| F5 | P1 | TODO | White-label e rotas | A×B e links legados | Sem DNS/domínio novo |
| F6 | P1 | TODO | Planos e onboarding assistido | Limites servidor e overrides | Sem billing/gateway |
| F7 | P1 | TODO | CI, observabilidade e release local | E2E/docs/runbook | Publicação bloqueada por autorização |
| F8 | P1 | TODO | Relatório de aceite | Gates e checkpoint | Sem merge/push/PR remoto ainda |

Gate F0 PASS de fonte recuperada/reconciliável: financeiro e recursos avançados preservados objetivamente. F1–F8 continuam TODO. Cada checkpoint registra o commit por git log (evitar SHA autorreferente no próprio commit), comandos, logs, resultado e próximo passo exato.
