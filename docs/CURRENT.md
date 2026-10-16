# Estado atual — Caravana 77

GOAL MASTER de 2026-10-16 em execução. Branch codex/caravana77-commercial-v1-20261016, base oficial fa4d1381274a56104406fc7b5895971b76044e62.

FASE 0 PASS para recuperação de fonte: build reproduz byte a byte os seis assets de produção; 26 testes existentes passaram no emulador, lint/typecheck/build PASS. Rules Firestore implantadas capturadas somente por GET e são idênticas à fonte recuperada (SHA256 fe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b). Não houve consultas a documentos de passageiros. Isso não homologa operação, segurança multi-tenant ou prontidão comercial.

Fonte avançada recuperada do checkout original sujo; backup externo C:/xampp/77/Caravana-audit-20261016/local-preserved. Produção 4d069e0a preservada. Não publicar, alterar dados reais, fazer merge ou push sem autorização específica.

Checkpoint F0 69abd6f reproduz a produção antiga. F1-ID corrigiu as duas escritas de caravanId e assegurou IDs derivados do caminho nas leituras; 34 testes PASS, lint/typecheck/build PASS. Evidências RED antes do fix e GREEN depois em docs/evidence/2026-10-16. Runtime financeiro original e layout sem refatoração.

F1-policy: política única de comprovantes com 614400 bytes (600 KiB, rótulo legado 600 KB), 819200 caracteres base64, assinaturas PDF/JPEG/PNG; Rules locais alinham o limite e o portal diferencia comprovante aprovado de pagamento bancário. 43 testes PASS, lint/typecheck/build PASS. Importação real testada somente em fixtures (replay do mesmo lote e lotação); dedupe entre lotes diferentes e rollback ainda pendentes.

Próxima tarefa: F1, smoke E2E local com Auth/Firestore emulados, dados sintéticos e screenshots responsivas do Financeiro Geral. O build novo é candidato local, não foi publicado. F1 ainda IN_PROGRESS (faltam demais critérios, staging/E2E e estados).

Retomada: ler este arquivo, CODEX_PROGRESS.md, SOURCE_RECONCILIATION.md, ISSUES_AND_BLOCKERS.md e TEST_EVIDENCE.md; conferir git status e log. Continuar a primeira tarefa não PASS, sem reiniciar a auditoria.
