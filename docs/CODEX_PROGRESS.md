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
| F1 | P0 | TODO | Regressão e fix das duas referências de ID | Emuladores e fixtures sintéticas | Após rastreabilidade F0 |
| F2 | P0 | TODO | Core multi-tenant e migração sintética | A×B, RBAC, restore | Nunca migrar produção |
| F3 | P0/P1 | TODO | Estados, reservas, CSV, check-in | Jornadas sintéticas | F2 dependente |
| F4 | P0 | TODO | Financeiro preservado e consolidado | Invariantes, ledger, isolamento | Não movimentar dinheiro real |
| F5 | P1 | TODO | White-label e rotas | A×B e links legados | Sem DNS/domínio novo |
| F6 | P1 | TODO | Planos e onboarding assistido | Limites servidor e overrides | Sem billing/gateway |
| F7 | P1 | TODO | CI, observabilidade e release local | E2E/docs/runbook | Publicação bloqueada por autorização |
| F8 | P1 | TODO | Relatório de aceite | Gates e checkpoint | Sem merge/push/PR remoto ainda |

Gate F0 PASS de fonte recuperada/reconciliável: financeiro e recursos avançados preservados objetivamente. F1–F8 continuam TODO. Cada checkpoint registra o commit por git log (evitar SHA autorreferente no próprio commit), comandos, logs, resultado e próximo passo exato.
