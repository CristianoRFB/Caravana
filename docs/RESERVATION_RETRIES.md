# Reservas idempotentes — primeiro módulo F3

A página de inscrição salva antes da escrita uma tentativa em `sessionStorage`, separada por ID canônico da caravana. Contém somente dois tokens aleatórios distintos de64 caracteres hexadecimais: ID privado da inscrição e nonce do recibo. Não guarda nome, CPF, telefone, comprovante ou dados do formulário. Falha de persistência impede a escrita; tentativa corrompida não é substituída silenciosamente. Conclusão confirmada limpa somente a mesma tentativa; falha da limpeza mantém um replay seguro.

`reserveSeat` recebe a tentativa explicitamente no fluxo público. A transação primeiro lê sua inscrição: mesmo ID/caravana/nonce/hash da solicitação retorna a inscrição existente, sem aumentar vagas e sem reabrir inscrição cancelada. Conflito exige consultar o registro original. Se ausente, a seleção de embarque, preço, capacidade, situação da caravana e disponibilidade da organização continuam sendo validados no estado persistido.

O hash SHA256 da solicitação tem ordem fixa, ignora o rótulo de embarque enviado pelo navegador, normaliza CPF e inclui o ID canônico da caravana. Fica somente no documento privado; não é uma técnica de anonimização de PII. Dados atuais da caravana continuam autoritativos para a primeira reserva. Mudança posterior de nome/preço/rótulo da viagem não transforma replay em nova reserva.

## Concorrência e falha de confirmação

Um teste reproduziu duas criações simultâneas da mesma operação: Rules podem rejeitar a segunda como update antes de o SDK repetir a transação. Em caso de erro, o serviço tenta uma leitura nova **do servidor** do ID privado. Só reconhece sucesso se caravana, nonce e hash corresponderem exatamente. Sem essa confirmação, devolve a falha e conserva a tentativa. Não inventa sucesso usando cache e não gera outro ID automaticamente.

O retry não depende da permanência de `reservationReceipts/{nonce}`: o recibo privado transitório anterior continua podendo ser eliminado na próxima reserva conforme fluxo legado. A identidade durável é a própria inscrição. Rules locais tornam nonce/hash imutáveis e negam exclusão de inscrições por clientes, inclusive owner; cancelamento continua sendo a reversão operacional, preservando histórico e identidade. Não houve exclusão real ou mudança de Rules implantadas.

Get de inscrição ausente é permitido ao visitante apenas para ID com64 caracteres hexadecimais, sem documento ou PII retornados. Isso viabiliza a leitura transacional de ausência. IDs curtos continuam negados; listagem privada permanece negada; documento existente ainda exige link bearer ativo ou autoridade da organização. Revogação do link não é burlada pelo replay. Esquemas antigos sem hash continuam legíveis e não são migrados automaticamente.

## Interface e limites

Falha de envio/validação aparece junto ao formulário, mantendo os campos editáveis; antes o erro retirava o formulário. Ao recarregar com tentativa pendente e caravana lotada, o botão permite **Verificar minha reserva**. Conflito oferece **Consultar inscrição existente**, sem criar outra vaga. Tokens não são preservados entre dispositivos e a limpeza deliberada do armazenamento perde a identidade da tentativa. Deduplicação de CPF/passageiro entre tentativas novas e importações diferentes é outro requisito F3, ainda pendente; não se promete dedupe universal.

## Evidência

- `f3-reservation-tests.log`:54 PASS/2 FAIL iniciais — corrida reproduzida e expectativa anterior de get ausente incompatível com o novo contrato.
- `f3-reservation-tests-second.log`:55 PASS/1 FAIL — recuperação da corrida corrigida; a contagem do teste fazia listagem sem filtro de organização, corretamente negada. Fixture corrigida para query org-a, sem ampliar Rules de listagem.
- `f3-reservation-tests-final.log`:56 PASS em cinco arquivos, incluindo quatro novos testes puros de persistência/hash e quatro novos casos de integração; regressões de Rules/membership/plataforma/reserva/import/financeiro relacionados.
- `f3-reservation-e2e.log`:4 FAIL no helper de inspeção, que retornava o resultado de withSecurityRulesDisabled (API retorna void). Jornada já chegava à mesma inscrição; corrigida a captura do resultado na fixture, sem mudar permissões do app.
- `f3-reservation-e2e-final.log`:4 PASS/25s desktop1440/mobile320: tentativa retida após commit real (interrupção sintética da limpeza local), reload, última vaga, replay, conflito e validação corrigível. Contagens confirmam uma única inscrição adicional e apenas uma vaga consumida. Zero pageerrors/Firebase remoto, sem retries/screenshot regenerado. Não é uma alegação de teste real de perda de ACK na rede.
- `f3-reservation-typecheck.log` e `f3-reservation-lint.log`: PASS; compilação tsc/Vite no E2E também PASS.

Todo teste e inspeção de contagem são exclusivos dos emuladores locais `demo-caravana77-test`. F3 completa permanece IN_PROGRESS: estados/invariantes de servidor, check-in auditado, CSV entre lotes/rollback e documentos/retention ainda exigem implementação e gate próprios. Nenhuma operação real, deploy ou migração é autorizada por este documento.
