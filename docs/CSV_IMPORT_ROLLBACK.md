# CSV entre lotes e rollback — F3 local

O parser/preview original foi preservado, inclusive arquivo UTF-8, texto colado, até400 linhas, documentos históricos, Pix declarado sem conciliação, embarques, capacidade e validação. A execução agora lê a base atual do servidor e verifica duplicados novamente. Importação/rollback exigem owner da organização; staff mantém operação de passageiros/check-in, sem esses controles.

## Persistência privada e invariantes

- `importRegistries/{caravanId}`: conjunto cumulativo privado de identidades normalizadas (CPF/documentos e nome+telefone/e-mail). Os valores são somente true; não publica IDs privados ou arquivos. Claims não podem ser alterados/removidos por clientes. Registros cancelados continuam identificados para impedir reimportação silenciosa.
- `importOperations/{operationId}`: manifesto imutável com org/caravana/lote/tentativa/ator/horário de servidor, hash de solicitação, IDs novos, snapshot dos cadastros criados, novas identidades, resultado por linha e contagem de vagas antes/depois. PII fica restrita ao owner; global/visitante/outra organização não leem esses documentos.
- Cada etapa cria no máximo2 inscrições; linhas com muitos identificadores usam etapa individual. Rules derivam identidades dos próprios campos e comparam conjuntos nativos. Manifesto deve apontar somente inscrições novas reais; claims são exatamente a união de identidades e não podem se sobrepor a identidades anteriores ou à outra linha da etapa. Nenhuma checagem de autorização foi removida para atender ao limite do avaliador.
- Contador da caravana só aumenta por reserva pública com recibo novo ou manifesto de importação correspondente aos novos registros. Atualização direta de reservedSeats por owner não é mais permitida. Não diminui abaixo de zero; cancelamento auditado libera exatamente uma vaga. Capacidade menor que o já reservado é negada.
- Importação nova não inventa recebimento: paymentTotalCents ausente/zero; estados pending ou reported. Registros financeiros históricos existentes permanecem intactos. F4 tratará conciliação/ajustes/ledger; Financeiro Geral não foi refeito.

IDs de linhas continuam derivados de batchId+linha. IDs de etapas derivam de lote+tentativa+posição; replay do mesmo ID exige hash/contexto/ator coincidentes. Mudança de payload não substitui registros. Nova tentativa explícita conserva IDs de inscrição do lote e pula linhas já confirmadas. O rastreamento de writes cobre o envio/rollback inteiro, inclusive intervalos entre etapas; seleção de tenant/caravana aguarda conclusão.

## Concorrência e relatório

Prévia acima da capacidade conhecida é recusada antes da primeira escrita. Se capacidade ou identidades mudarem durante o envio, cada etapa é transacional: zero ou todas as suas linhas novas são confirmadas. As etapas anteriores permanecem preservadas e o relatório distingue importadas, já cadastradas e não confirmadas. A UI oferece retry das linhas não confirmadas, mantendo o lote e identidades duráveis. Falha de rede sem confirmação não é apresentada como certeza de rejeição ou sucesso.

A leitura de registros legados é somente consulta, sem backfill ou alteração automática. A revisão de nonce da caravana detecta nova reserva pública entre consulta e transação; nesse caso é exigida nova conferência. O registro de identidades nas Rules garante dedupe entre importações novas concorrentes. A conferência com registros legados/públicos também usa a base consultada; não é uma afirmação de dedupe universal entre todos os dispositivos ou de identidade civil verdadeira. A auditoria/migração real da base permanece bloqueada até autorização.

Normalização em TypeScript e Rules usa minúsculas, pontuação removida e acentos portugueses equivalentes. Não infere o tipo de um documento nem completa números recebidos. A API String lower/replace foi conferida na [referência oficial Firebase](https://firebase.google.com/docs/reference/rules/rules.String); a equivalência efetiva é exercitada contra o emulador.

## Rollback controlado

O histórico mostra lotes das20 etapas recentes e consulta **todas** as etapas do lote para desfazê-lo. Não apaga documentos ou manifestos: cancela somente inscrições ainda idênticas ao snapshot original, sem valor recebido, comprovante ou embarque posterior. Alteração, revisão ou movimentação bloqueia a linha para tratamento específico. Cada cancelamento tem evento `import_rolled_back`, motivo/ator/horário e liberação de uma vaga; replay não libera novamente. Resultado por inscrição é exibido. Cadastro cancelado, identidade e histórico são preservados.

As Rules também comparam o cadastro com o snapshot original: um SDK adulterado não pode contornar essa verificação apenas criando evento e atualizando contador. Arquivos/lotes anteriores sem manifesto não recebem rollback automático. Não se efetuou rollback de nenhuma inscrição real.

## Evidência incremental

`f3-csv-first.log`:54 PASS/1 FAIL por teste antigo que importava sem manifesto; atualizado para exigir negação, com positivo histórico coberto pelo serviço real. Typecheck inicial detectou cast de identidade excessivo; substituído por tipo estrutural apropriado.

`f3-csv-tests.log` e `f3-csv-final-tests.log`:65 PASS. Casos adicionais direcionados de bypass/snapshot/retry passaram, mas a linha com seis identidades atingiu limite1000; reduzir etapa e otimizar strings isoladamente não bastou. A verificação foi simplificada para conjuntos de identidades e valores booleanos, preservando união exata, ausência anterior e disjunção entre linhas. `f3-csv-security-sets.log`:4 PASS/8 filtrados por nome (não omitidos do gate).

Rodada final: `f3-csv-accepted-tests.log`69 PASS em6 arquivos; `f3-csv-accepted-e2e.log`4 PASS/26,3s desktop1440/mobile320: histórico Pix sem contato, reload, rollback, duplicado após cancelamento sem nova vaga, mesmo documento permitido independentemente no tenant B, staff sem controles e zero erros JS/Firebase remoto. Lint/typecheck/build E2E PASS. Mensagens novas de falha técnica são traduzidas para instruções ao operador.

Teste de escala400+replay adicionado para o gate F3, ainda TODO até execução em import-scale.integration.test.ts. Não repetir todos os testes durante pequenas mudanças. F3 ainda depende de documentos/retenção e gate operacional completo. Nenhum deploy/Rules/índice/migração/dado real foi alterado.
