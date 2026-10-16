# Caravana 77 — primeira matriz de fontes e divergências

Data: 2026-10-16, America/Sao_Paulo. Estado: F0 PASS para recuperação da fonte, após primeira matriz IN_PROGRESS. Somente leitura remota; nenhuma publicação, migration, pagamento, merge ou push.

## Fontes verificadas

| ID | Fonte | Evidência atual | Divergência e decisão | Estado |
|---|---|---|---|---|
| S1 | GitHub oficial CristianoRFB/Caravana | HEAD main fa4d1381274a56104406fc7b5895971b76044e62; uma branch; sem tags e PRs; CI 37991097705 success | Main corrige uma referência de ID, mas não tem Financeiro Geral, CSV e schema avançado. Base Git oficial a preservar e combinar com S2. | PASS inventário remoto |
| S2 | Checkout local C:/xampp/77/Caravana | main 10f30a0; 21 arquivos modificados, uma exclusão, seis arquivos novos; Finance.tsx e lib/finance.ts editáveis recuperados | Fonte avançada localizada, anterior ao fix remoto. Duas escritas caravanId: current.id continuam no fluxo avançado. Não editar este checkout sujo. | SOURCE_PRESENT; reconciliação IN_PROGRESS |
| S3 | Dist local preservado | index-BXYRgZFm.js; SHA256 90677dd6e290cb4ba3ef54d6abfcdfc72aaf3b56ae85a0472012b195fee19f16 | JS corresponde exatamente a S4/S6. É artefato, ainda não prova que novo build reproduz todos os arquivos. | PASS hash; build TODO |
| S4 | Cloudflare Production atual | 4d069e0a-344a-415a-ae41-aa314df10ace, branch main, metadado Source 10f30a0; domínio caravana-77.pages.dev | JS idêntico a S3/S6; contém Financeiro Geral e bug antigo de ID. Metadado de commit não representa alterações locais usadas no upload. | PASS captura estática; runtime autenticado UNKNOWN |
| S5 | Cloudflare Preview correcao-inscricao | a2c5e89c-2eb0-483a-867e-9074d7373849; JS index-29c5869f860a.js; SHA256 29c5869f860a6d89acf8f9a4ad01fc5cc68d1f370f984df09eca26565c666b8b | JS corresponde a S7, diverge de Production. Não foi promovido automaticamente. | PASS captura estática |
| S6 | ZIP publicado 20261009-182053 | Seis assets, JS e CSS idênticos aos de Production atual | Evidência de recuperação; não usar minificado como src. | PASS manifesto |
| S7 | ZIP produção-corrigida 20261009 | Seis assets, JS idêntico ao Preview correcao-inscricao | Preservar a correção como referência comportamental e reconciliar na fonte TS. | PASS manifesto |
| S8 | Preview caravanasitalo | 0141fb45-4f60-4e3c-b753-d2303d10dfd6, descoberto na listagem atual | Preview adicional não descrito como fonte do baseline. Preservação e comparação pendentes. | IN_PROGRESS |
| S9 | Rules/schema Firebase efetivamente implantados | Não capturados nesta primeira matriz | Rules locais avançadas incluem pagamentos/despesas; main não inclui. Não inferir qual versão está implantada nem ler PII. | UNKNOWN; pendência de acesso autorizado |

Atualização após a primeira entrega: S8 foi capturado e seus seis assets são idênticos a S5/S7. S9: Rules Firestore implantadas foram obtidas com credenciais existentes, somente leitura de releases/rulesets; são byte a byte idênticas à fonte local recuperada, hash fe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b. Não há release Storage listado; isso não prova ausência de objetos/buckets. Schema de documentos reais não foi consultado. S3: novo build em worktree isolada reproduziu os seis arquivos de S4, inclusive HTML/CSS/vendors, comprovando rastreabilidade da fonte avançada. Cloudflare API confirma trigger ad_hoc, commit_dirty=true, sem repositório conectado e sem Functions.

## Equivalência de funcionalidades

| Funcionalidade | GitHub main S1 | Fonte local S2 | Production e ZIP S4/S6 | Preview corrigido e ZIP S5/S7 | Próxima evidência |
|---|---|---|---|---|---|
| Financeiro Geral /admin/financeiro, Tudo/caravana | Ausente | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Build reproduzível e testes sintéticos |
| Financeiro por viagem | Ausente | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Testes de persistência e isolamento |
| Pagamentos parciais, reported, voided | Ausente | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Rules reais e testes locais |
| Despesas e somatórios | Ausente | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Agregação Tudo = soma por viagem |
| CSV histórico e documentos/menores | Ausente ou parcial | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Testes de validação, replay e lotação |
| Forma, instruções e prazo | Ausente ou parcial | SOURCE_PRESENT | BUNDLE_PRESENT | BUNDLE_PRESENT | Configuração e regressão sintéticas |
| Comprovantes | Storage 8 MiB | Firestore embutido 600 KiB | Bundle 600 KiB | Bundle 600 KiB | Política/backend efetivo UNKNOWN |
| ID confiável da caravana | caravanRef.id em uma escrita | current.id em duas escritas | Referências antigas | Duas referências corrigidas | Portar fix para ambas as escritas TS e testar |
| Memberships, white-label completo, planos | Ausente | Ausente | Não comprovado | Não comprovado | Fases posteriores, após gate F0 |

SOURCE_PRESENT e BUNDLE_PRESENT são evidências estáticas. Não significam RUNTIME_CONFIRMED nem TESTED. HTTP 200 de rota SPA não homologa tela, autorização ou persistência.

## Preservação e trilha

Antes de fetch ou edição foi salvo o diretório local-preserved, contendo repository.bundle, source-and-dist.zip, manifest.json com hashes por arquivo, patches index/working tree, status, branches, reflog e stashes. Não há stash ou outra worktree local encontrada. O checkout original permanece com seus arquivos intactos.

- source-and-dist.zip SHA256: 6c93d9af95b0f31e26847656605a96da5e0b98cf66fcc25cfeffb48f50159e82.
- repository.bundle SHA256: 2471fbe4de6f3b68c2437ec33ae29973e149108b8a9610b5e7e8b1d2420b9364.
- Consultas e manifestos: github-api.json, cloudflare-production.json, cloudflare-preview.json, public-bundles.json, all-bundle-manifests.json.
- GOAL e ZIPs recebidos preservados em handoff/; assets extraídos em snapshots/; capturas públicas em public/.

## Próximo passo autorizado

Worktree criada em C:/Users/Aluno/.codex/worktrees/caravana77-commercial-v1-20261016/Caravana, branch codex/caravana77-commercial-v1-20261016, base fa4d138. Fonte avançada incorporada e build antigo reproduzido. Lint, typecheck, 26 testes unit/Rules e build PASS. Próximo passo: portar o fix para as duas escritas TS e testar a função real de reserva. Fonte disponível: BLOCKED-SOURCE não se aplica.

Configuração do executor GPT-6.1 Sol/Medium/sem 1.5x: solicitada, mas não verificável ou alterável pelas ferramentas da sessão. Não alegar confirmação. Produção e dados reais permanecem protegidos pela autorização atual.
