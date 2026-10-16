# F4 — aceite exclusivamente local/sintético

2026-10-16. Financeiro Geral original consolidado, sem operação bancária ou alteração de produção. F2 permanece aceite local.

| Critério MASTER | Estado | Evidência |
|---|---|---|
| Schema e legado | PASS local | FINANCIAL_LEDGER.md; IDs/autores/datas originais mantidos; total sem ledger não gera recibo fictício |
| Tudo/caravana e fórmulas | PASS local | E2E4 larguras e datasets A/B; cards/filtros originais preservados; despesas anuladas fora da soma, histórico visível |
| Autoridade, valores e retry | PASS local | Owner próprio, staff leitura, guest/B/global sem autoridade monetária; centavos/limite seguro, calendário, request.time, ID/hash/replay e excesso de saldo testados |
| História e reversão | PASS local | Payments void auditado; despesa original anulada+substituta vinculada; motivo/ator/tempo e efeito atômico; repetição sem duplicar |
| Incerteza e totais | PASS local | Recebimento manual separado de proof/revisão/Pix informado; cancelamento mantém recebimentos; diagnóstico sem write |
| Concorrência e isolamento | PASS local | Mesmo ID concorrente, operações concorrentes no último saldo, mesmo nome/slug A×B, refresh, imports/rollback e regressões |
| Legado/zero/export/ajuste | PASS local | Tarifa prevista corrigida com audit sem mudar recebido; fixtures sem ledger; resumo exportado sem IDs/PII/texto de usuário |
| CI e diagnóstico | PASS local | npm test existente no CI inclui novas suites; npm run finance:diagnose -- tests/fixtures/finance-diagnostic.synthetic.json executado offline, sem SDK/rede/writes |
| Staging remoto e produção | BLOCKED | Dependem de autorização e preparação; Rules/índices não implantados, nenhum dado do Ítalo alterado |

## Evidências de gate e última correção

`f4-acceptance-unit.log`:157 PASS/24 arquivos/44,88s. `f4-acceptance-e2e.log`:100 PASS/3,5min,320/375/768/1440. Auth4/Storage6 da F3 permanecem evidências dos módulos inalterados; não foram repetidos neste gate. Lint/typecheck/build sintético PASS. Nenhum leitor de tela especializado ou ambiente remoto foi homologado.

Após o gate, revisão de limites encontrou arredondamento binário na conversão e exibição de quantias extremas e overflow de agregados. `f4-money-precision-red.log`:2 FAIL reproduzidos/8 PASS (inclui3 casos iniciais F5). Conversão agora usa decimal inteiro/BigInt, exibição mantém cada centavo e agregado inseguro apresenta “Valor inválido”, sem fabricar saldo. `f4-money-precision-green.log`:12 casos financeiros puros PASS e3 da preparação F5 PASS. `f4-money-e2e.log`:14 E2E financeiros afetados PASS/44,1s, desktop/mobile320, incluindo build atualizado; lint/typecheck novamente PASS. A regressão integral anterior não foi repetida após essa correção delimitada.

Rodadas intermediárias FAIL/infrastrutura, incluindo colisão de portas e uma rodada invalidada por fonte em alteração, estão conservadas. Não contam como homologação; FINANCIAL_LEDGER.md descreve causas. Checkpoint contém somente código/evidência local, sem publicação/merge. Próxima tarefa executável F5: branding, mapping público confiável, rotas por organizadora e preservação de aliases. F6–F8 continuam TODO; prontidão comercial não declarada.
