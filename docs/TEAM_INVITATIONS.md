# Equipe e convites — contrato Cloud

IMPLEMENTED em 2026-10-20, a partir de bc2c3d1. O WIP do LAB04-PC23 não chegou ao GitHub e não foi recuperado nem testado. A instrução atual autoriza concluir o módulo no Cloud; eventual código do laboratório deve ser comparado manualmente com este contrato, preservando ambos os históricos, sem merge automático.

## Operação

O responsável abre `/admin/equipe`, confere o UID de uma conta já existente (o destinatário encontra seu identificador em `/conta/convites`), escolhe Equipe operacional ou Responsável, validade de até sete dias e motivo. Não há envio de e-mail, consulta administrativa ao Auth nem criação automática de contas. O convite não concede acesso e não reserva vaga. Mesmo com equipe cheia, pode permanecer pendente; o aceite exige vaga, plano vigente, inventário validado e organização ativa. O UID informado precisa coincidir com a conta autenticada que aceita.

O destinatário aceita em `/conta/convites`. Uma transação atualiza convite canônico, caixa privada, membership, diretório, contadores e recibo imutável. Duas pessoas disputando a última vaga não podem ultrapassar o limite. O perdedor conserva o convite pendente para tentar após liberação de vaga. A geração e o papel exibidos precisam coincidir com o convite atual; reenvio invalida a geração anterior.

Revogar convite pendente não remove um membro que já aceitou. Para retirar acesso ativo, o responsável revoga o integrante com motivo. As Rules bloqueiam imediatamente novas operações; o painel observa a membership. Não é permitido remover/rebaixar o último responsável. Novo acesso ou reativação exige novo convite e aceite; a antiga operação aceita continua sendo um recibo histórico e nunca reativa uma membership revogada.

Suspensão/downgrade bloqueiam crescimento e aceite sem apagar histórico ou integrantes existentes. Revogação continua permitida; mudança de papel de integrante ativo conserva a política anterior de administração sem aumentar o número de pessoas, protegendo o último owner. Platform Owner não recebe autoridade privada para convidar nem aceitar em nome de outra pessoa.

## Persistência e segurança

- Canônico: `tenantInvitations/{org}/users/{uid}`; geração monotônica, emissor, papel e timestamps de servidor. Status pending/accepted/revoked/expired. Um pending vencido é exibido como expirado imediatamente; não depende de agendador para negar aceite.
- Descoberta: `invitationInboxes/{uid}/organizations/{org}`, projeção privada exatamente igual ao canônico. Somente o destinatário lista sua caixa.
- Emissão/reenvio/revogação/encerramento por expiração: `tenantInvitations/{org}/events/{operationId}` imutável, antes/depois/motivo/ator/hora. Encerramento explícito após expiração pode ser feito pelo destinatário ou responsável; a expiração automática de leitura não gera um evento fictício.
- Aceite/alterações de integrante: `tenantQuotaOperations/{operationId}` imutável, com antes/depois dos contadores; aceite inclui geração. Diretório e membership precisam corresponder exatamente. A UI mostra até 20 eventos recentes combinados (não é exportação integral de auditoria).
- O novo recibo de aceite é obrigatório na mesma transação. Sua criação valida as invariantes completas uma vez; os demais documentos verificam o vínculo ao recibo novo, evitando ultrapassar o orçamento de expressões das Rules. Recibo existente não autoriza novas escritas. SDK cru completo válido e adulterações de vínculo/papel/UID/geração são exercitados nos testes.
- Repetição com o mesmo ID/hash recupera somente operação confirmada no servidor. Aceite histórico por mesma geração é idempotente sem renovar autoridade. Sem conectividade detectada, não se agenda escrita. Nenhum dado/contador legado é criado automaticamente.

## Evidências incrementais

`docs/evidence/2026-10-20/team-expanded.log`: 32 PASS (13 novos casos de convites, mais quotas e memberships). Cobertura de SDK cru, autoridade do emissor, papéis, isolamento A×B/global/staff, geração, UID errado, validade, idempotência, suspensão autoritativa, downgrade, disputa da última vaga, reativação e último owner. Oito E2E com Auth real emulado, desktop1440/mobile320, PASS em team-e2e-fifth.log. A suite ampliada anterior teve33 PASS com um caso adicional do resolver. Gate integral em execução; resultado será registrado em F6_ACCEPTANCE.md após conclusão.

RED inicial: guard de offline tratava `navigator.onLine` indefinido do Node24 como offline; corrigido para `=== false`. Depois, aceite válido excedia orçamento de expressões; corrigido com recibo obrigatório centralizado. Primeira execução E2E interrompida após seletor incorreto; segunda teve quatro falhas de fixture/espera. Nenhuma dessas execuções é evidência de PASS. Logs conservados.

Índice candidato de auditoria: `tenantQuotaOperations(organizationId ASC, at DESC)`. Não foi implantado. Novas Rules e frontend não foram publicados. Testes locais não comprovam compatibilidade com o cliente real.

Autorrevogação no navegador revelou contexto obsoleto da coleção observada após o commit, embora operações privadas já fossem negadas. A mutação do próprio integrante agora confirma diretamente seu documento de membership no servidor e atualiza o resolver aberto; não altera autoridade das Rules. Nova execução8/8 E2E PASS, incluindo retirada imediata do próprio painel e proteção do novo último owner. A execução anterior com atualização pela coleção ainda falhou e permanece registrada; não foi contada como PASS.

## Revisão adicional do vínculo canônico

O WIP9dabaa1 não é candidato de release. Uma transação de expiração legítima de guest conseguia anexar um canônico de outro UID sem evento correspondente. O novo teste reproduziu1 FAIL/33 PASS (`team-binding-red.log`). A candidata agora exige UID e organização iguais ao caminho, UID do evento igual ao destinatário e snapshot after exatamente igual ao documento alterado, além da validação integral do evento. `team-binding-green.log`:34 PASS, incluindo ataque negado atomicamente e expiração legítima funcionando. Não houve implantação dessa regra vulnerável; o gate de164 E2E foi interrompido para a correção e será reiniciado. Corpus anterior243/8Auth/6Storage é evidência da versão anterior, não aprovação da correção nova.
