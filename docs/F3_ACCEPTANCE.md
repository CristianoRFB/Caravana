# F3 — aceite operacional local/sintético

Data: 2026-10-16. Branch `codex/caravana77-commercial-v1-20261016`. Base dos módulos: `4485ead` e `cc7df69`; documentos e gate registrados no commit deste arquivo.

| Critério MASTER | Estado | Evidência/limite |
|---|---|---|
| Configuração, capacidade, embarques e escopo | PASS local | Regressões de serviços/Rules e E2E A×B; ponto selecionado conferido contra snapshot persistido da viagem, inclusive edição administrativa |
| Estados e capacidade sob concorrência | PASS local | REGISTRATION_STATES.md; cancelamento terminal libera uma vaga; revisão não inventa recebimento; contador não pode ser editado livremente |
| Reserva retry-safe | PASS local | RESERVATION_RETRIES.md; tentativa persistida, última vaga, reload, replay e link revogado |
| Documentos/consentimento/acesso/retenção | PASS local | DOCUMENTS_RETENTION.md; PDF privado, conferência manual, retenção por arquivo, exclusão auditada após prazo do servidor; legado sem prazo conservado |
| Check-in reversível/idempotente | PASS local | Operação imutável com ator/tempo, repetição sem duplicar, reversão e offline sem confirmação fictícia; idade calculada na data da viagem |
| CSV histórico e lote | PASS local | CSV_IMPORT_ROLLBACK.md; dedupe entre lotes/concorrência, relatório, rollback condicionado; escala400 e replay executados no gate |
| Mobile/estados operacionais | PASS corpus local |88 E2E em320/375/768/1440: Auth real emulado, refresh, isolamento, erros/consentimento; sem auditoria especializada completa de leitor de tela |
| Homologação em staging remoto/produção | BLOCKED | Não autorizados deploy, migração real ou publicação Rules/índices; nenhum dado do Ítalo foi alterado |

## Gate reproduzido

`f3-acceptance-unit-final.log`:142 PASS/21 arquivos/40,98s; inclui400 importados+replay. `f3-acceptance-auth.log`:4 PASS. `f3-acceptance-storage.log`:6 PASS (warning/NPE Java conhecido apenas no shutdown após sucesso). `f3-acceptance-e2e-final.log`:88 PASS/3min. Lint/typecheck PASS; E2E compila o build sintético. Todos em `docs/evidence/2026-10-16/`.

Primeira regressão E2E:87 PASS/1 FAIL por overflow768 no toolbar de passageiros da importação. Flex-wrap e limites de largura corrigiram; mesma jornada passou no gate final. Falhas incrementais de Rules estão preservadas, com causas nos documentos dos módulos. Não confundir rodadas intermediárias FAIL com o resultado final.

Novos documentos e índices são candidatos locais. A nova criação de reserva exige snapshot válido do embarque: release futuro deve coordenar cliente/Rules e atualização de clientes antigos; nenhuma inscrição existente foi regravada. Exclusão de caravana/inscrição permanece negada; arquivamento/cancelamento preservam histórico.

Financeiro Geral original, filtros Tudo/caravana e totais sintéticos foram preservados nas regressões; hardening monetário é trabalho F4. F2 permanece aceite exclusivamente local. Próxima tarefa: F4 schema/invariantes, lançamentos e correções auditados; F5–F8 continuam TODO. Não declarar prontidão comercial.
