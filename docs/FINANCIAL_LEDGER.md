# F4 — Financeiro Geral e ledger candidato

## Fonte preservada e escopo

Finance.tsx e calculateFinanceSummary são a fonte recuperada do Financeiro Geral publicado, preservada desde F0. Permanecem Tudo/caravana, histórico, saldo conhecido, esperado, informado sem conciliação, recebido registrado, despesas e resultado previsto. Não há integração bancária, cobrança ou transferência. Todas as operações executadas neste GOAL usam fixtures locais; nenhum valor do cliente real foi consultado ou alterado.

## Schema legado e novo

| Caminho | Legado preservado | Contrato novo local |
|---|---|---|
| registrations/{id} | amountCents, paymentTotalCents, paymentReportedUnreconciled e paymentReportedMethod | Total recebido só muda na mesma transação de um lançamento/anulação auditados; tarifa prevista só por ajuste com motivo; reported não é limpo automaticamente |
| registrations/{id}/payments/{id} | IDs e createdAt string, createdBy, amountCents/method/paymentDate/notes/status | Novos IDs=operationId32hex, postedAt=request.time, vínculo imutável; anulação preserva todos os campos originais e acrescenta voidReason/voidedAt/voidedBy/lastFinancialOperationId |
| caravans/{id}/expenses/{id} | IDs, campos, datas e autores existentes; status ausente significa ativo | Novo lançamento ativo; corrigir anula original e cria substituto ligado por replacementId/replacesId; anulação sem substituição também disponível |
| financialOperations/{operationId} | Coleção nova, sem backfill | Evento privado imutável: ação, org/caravana/inscrição, entityId/sourceId, antes/depois em centavos, actorUid, at servidor, motivo e hash da intenção |

Nenhum saldo inicial ou recibo é fabricado para reconciliar legado. Registrar pagamento parte do total atual e soma apenas o valor confirmado manualmente. Anular subtrai exatamente o lançamento ativo; repetição não subtrai novamente. Histórico sem lançamentos individuais é diagnóstico, não erro corrigido automaticamente.

## Invariantes e autoridade

Centavos inteiros positivos para pagamento/despesa, dentro do limite seguro de JavaScript. Total não negativo/seguro. Saldo conhecido impede excesso; tarifa ausente/zero significa desconhecida e admite lançamento manual positivo, mantendo aviso de saldo não calculável. Data de referência deve ser calendário válido; postedAt/at/voidedAt vêm do servidor, createdAt string novo é apenas compatibilidade. Leituras não excluem documentos legados sem campo de ordenação.

Owner próprio opera dinheiro; staff próprio lê, guest/B/global não recebem acesso privado. Rules validam evento e efeito nos dois sentidos: evento sozinho, total isolado, edição silenciosa, exclusão, source de outro tenant, reutilização de ID e múltiplos efeitos não vinculados são negados. Um ajuste do valor previsto altera apenas a tarifa, exige motivo e não pode baixar tarifa positiva abaixo do recebido. Zero mantém semântica de desconhecido, não gratuidade.

SDK usa IDs explícitos e hash canônico da intenção; replay confirmado retorna sem escrever. Reutilizar ID com outros dados falha. Recuperação de falha consulta exatamente o evento no servidor, sem aceitar cache de passageiro como confirmação. UI guarda somente ID opaco em sessionStorage por usuário/tenant/ação/entidade até sucesso, inclusive reload; corrupção/bloqueio falha sem iniciar outra identidade. Formulários não persistem dados pessoais/valores. Não se promete deduplicar dois lançamentos intencionais diferentes com IDs distintos. Rastreio cobre hash/transação/recovery e impede troca de tenant enquanto pendente.

## Fórmulas mantidas

- Passageiros/esperado/a receber: inscrições não canceladas. Valor esperado somente tarifa positiva conhecida.
- Recebido registrado: soma de paymentTotalCents de todas as inscrições, inclusive canceladas. Cancelar não devolve dinheiro automaticamente.
- Informado sem conciliação e total zero: não entra no saldo a receber calculável; contagem incerta separada.
- Despesa: soma de registros ativos, incluindo legado sem status; anulados continuam visíveis, fora do total.
- Saldo registrado=recebido−despesas. Previsto=esperado conhecido−despesas, sem promessa de caixa real.

Diagnóstico consulta metadados/ledger no servidor, com concorrência limitada, sem proofs ou writes. Aponta total sem lançamentos, ledger superior ao total, valores inválidos ou associação divergente. Consulta não é snapshot global atômico: repetir após movimentação concorrente antes de concluir divergência. Exportação contém apenas métricas fixas e números em centavos; sem nome, documento, contato, token/ID, texto de usuário ou fórmula CSV.

## Release e evidência

Rules/índices são candidatos **não implantados**. Cliente antigo tenta escrever sem evento e será recusado após eventual corte; coordenar atualização cliente/Rules em release autorizado, sem regravar dados históricos. Novos índices org+at e org+caravana+at da auditoria estão somente no repositório. Publicação, migração ou conciliação real dependem de autorização específica.

Primeiro runner chamado fora de npm não herdou PATH de vitest; registrado como falha de infraestrutura. Primeira suite59:55 PASS/4 FAIL antes do ajuste de fixture/Rules; fonte inicial não aplicara a trava do agregado devido à quebra CRLF, caso de bypass detectou e confirmou a correção. Queries da fixture receberam filtro de organização. Rodada seguinte61 PASS/1 FAIL era outra query sem escopo. Final inicial62 PASS; lint/typecheck PASS. Suites posteriores incluem tentativa persistida/ajuste previsto e E2E; consultar TEST_EVIDENCE.md para gate efetivamente concluído.

E2E intermediários: build recusou import não utilizado; fixture nova referenciava módulo inexistente; corrigidos antes de executar jornadas. Primeira jornada executada6 PASS/4 FAIL: retenção de endpoint mudou com transação, expectativa de ordem inadequada e botões móveis reorganizados em grupo separado. Rodada foi invalidada como gate por alteração de Rules durante execução; logs conservados. Uma invocação concorrente dos runners falhou por portas já ocupadas e não constitui teste de comportamento. Rodadas finais são sequenciais com fontes estáveis.

Gate e correção final de precisão concluídos no corpus local; ver F4_ACCEPTANCE.md. Diagnóstico offline executado com duas divergências legadas sintéticas, sem alteração de dados.
