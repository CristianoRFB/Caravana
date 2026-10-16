# Estados e operações auditadas — F3 local

| Inscrição | Pagamento informativo | Vaga | Embarque |
|---|---|---|---|
| awaiting_payment | pending | Ocupada | Negado |
| awaiting_review | awaiting_review | Ocupada | Negado |
| rejected | rejected | Ocupada até cancelamento explícito | Negado |
| confirmed | approved ou reported (legado declarado) | Ocupada | Permitido; menor exige autorização aprovada |
| cancelled | Preserva o estado anterior e os valores | Liberada uma única vez | Removido atomicamente no cancelamento |

Revisão de comprovante/declaração e pagamento bancário não são o mesmo evento. Confirmar/recusar/check-in/cancelar nunca cria pagamento nem muda paymentTotalCents. Saldo e lançamentos permanecem preservados. Conciliação/estorno monetário pertence ao F4; o Financeiro Geral recuperado não foi refeito.

## Transições e autoridade

`registration-operations.ts` substitui as escritas isoladas anteriores e mantém os exports de data.ts. Usa transações reais do SDK rastreado, lê a inscrição persistida e confere contexto de organização/caravana. Cada mudança exige `registrationOperations/{operationId}` novo e imutável, com ator, timestamp do servidor, motivo, estados antes/depois, embarque antes/depois e variação de vaga. A inscrição aponta para lastOperationalId; o evento exige alteração correspondente da inscrição. Eventos órfãos, estados alterados sem evento e exclusão direta são negados nas Rules.

- Revisão aprovada: estados ativos → confirmed/approved, com approvedBy/approvedAt do servidor. Mesmo destino já atingido é no-op.
- Revisão recusada: estados ativos sem embarque → rejected/rejected, motivo3–300, rejeição auditada. Desfazer o embarque é obrigatório antes de recusar passageiro embarcado.
- Check-in: confirmed → embarcado, checkedInAt/checkedInBy do servidor. Menor exige authorizationStatus approved. Repetir o mesmo estado não altera o horário; reversão exige evento próprio e mantém histórico. Replay do ID de um embarque antigo não desfaz uma reversão posterior.
- Cancelamento: estado ativo → cancelled, timestamp/ator de servidor; remove embarque na mesma transação e decrementa exatamente uma vaga na caravana correta. Contagem anterior inválida/zero exige revisão; não é mascarada com Math.max. Inscrição cancelada é terminal neste fluxo: revisão e check-in não a reabrem.
- Estado legado desconhecido não é convertido automaticamente. A migração/correção real requer revisão/autorização.

Owners e staff ativos da própria organização executam essas operações; global sem membership não recebe autoridade operacional. Revogação continua sem fallback legado. Identidade da reserva e IDs de tenant/caravana continuam imutáveis. Caravana deve ser arquivada, sem exclusão do cliente, para preservar vínculos/histórico. Ponteiro lastSeatOperationId na caravana é opaco e não publica o ID privado do passageiro.

O nonce de reserva pública precisa de recibo novo: reutilizar recibo existente para aumentar vagas sem nova inscrição é negado. A vinculação completa das entradas de vaga de importação é parte do módulo CSV seguinte; F3 e suas invariantes completas ainda não estão aprovados.

## Rede, retomada e histórico

Sem conexão detectada, a operação é recusada antes de iniciar a transação: não se agenda embarque fictício para enviar depois. Falha no meio da requisição só é reconhecida como sucesso após consulta nova ao evento exato no servidor; sem prova, a UI informa operação não confirmada. Não há sucesso baseado em cache. Retry da mesma operação conflituosa é rejeitado se ação/ator/contexto/motivo mudarem.

O check-in exibe as30 operações mais recentes confirmadas do servidor por org+caravana, com horário, ator e motivo. Novo índice composto está em firestore.indexes.json, somente local/não implantado. O histórico não contém conteúdo de comprovante e não pode ser editado/excluído por clientes.

A seleção de organização passa a ser uma preferência da aba, separada por UID, para retomada após reload. É validada contra a lista atual de acessos; preferência adulterada/revogada não concede autoridade. Troca continua aguardando writes pendentes, remontando UI e limpando observers/rascunhos. Nenhuma lista de passageiros é persistida por essa preferência.

## Verificação incremental

Logs `f3-operations-*`, exclusivamente emuladores. Primeira rodada detectou expectativas antigas de bypass de estado/check-in em dois testes; alteradas para negação. Erro posterior de ordem lexicográfica no teste do histórico foi corrigido.52 testes relacionados passaram.

O E2E encontrou limite de1000 expressões no cancelamento com admin legado. Helpers RBAC foram simplificados mantendo guards externos e negação de fallback com membership revogada;52 regressões passaram,4 E2E legados desktop/mobile320 passaram após o fix. Os casos novos de histórico A×B encontraram perda de seleção no reload; corrigida com preferência validada por membership. Rodada final:55 testes de operações/RBAC/resolver/preferência PASS (`f3-operations-context-final.log`),4 E2E adicionais de histórico/reversão/reload/A×B/staff offline PASS (`f3-operations-audit-e2e-final.log`,22,7s). Lint/typecheck/build E2E PASS. Sem erros JS/Firebase remoto nos navegadores.

FASE 2 permanece aceite somente local/sintético. Nenhuma conta, dado, Rules ou índice real foi alterado. CSV, documentos/retenção e aceite operacional completo F3 continuam pendentes. Publicação/migração/merge não autorizados.
