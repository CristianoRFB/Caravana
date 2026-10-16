# Documentos, consentimento e retenção — F3 local

## Envio e conferência

O portal de inscrição de menor permite enviar autorização PDF até600 KiB, com assinatura PDF, tipo/tamanho e consentimento explícito. A versão de finalidade (`operational-documents-v1`), aceite e horário de envio são registrados no servidor. O envio fica pendente: não aprova automaticamente autorização, inscrição ou pagamento. Apresentação em papel continua possível mediante conferência manual auditada pela equipe.

`registrations/{id}/authorizations/current` guarda o PDF privado; somente membros ativos da organização leem/baixam. Visitante com link da própria inscrição pode enviar enquanto permitido, mas não lê conteúdo do arquivo pelo SDK. Outra organização/global sem membership não recebem acesso. Link revogado/cancelamento/arquivo já aprovado bloqueiam novo envio. Nenhuma URL pública de Storage ou token de download é criado.

Arquivos têm tipo PDF, nome limitado, conteúdo base64 até819200 caracteres, timestamps/consentimento do servidor, vínculos reg/org/caravana e prazo do envio. Client e Rules validam conteúdo/tipo/limite; assinatura não representa validação jurídica do documento. Provas de pagamento continuam no fluxo original JPG/PNG/PDF; não há integração ou execução bancária.

O download de autorização no painel usa Blob local após leitura autenticada, com URL temporária revogada. Alteração de nascimento/responsável/condição de menor exige nova conferência: o perfil é atualizado com evento e aprovação é resetada, conservando o PDF anterior. Passageiro embarcado deve ter o check-in desfeito antes dessa alteração. Marcar aprovado diretamente sem evento é negado. Conferência de PDF vencido é negada; apresentação física é registrada como paper, sem alegar assinatura ou verificação jurídica automática.

## Política e exclusão controlada

`documentPolicies/{orgId}` permite get público somente de prazos, versão, org e metadados mínimos. Sem nome/UID do operador ou arquivo. Owner configura1–3650 dias para novos comprovantes e autorizações; ausência de política usa90 dias operacionais demonstrativos, sem declarar prazo legal validado. Mudança exige evento privado imutável em `documentEvents/{operationId}` e timestamp do servidor.

Cada envio copia seu próprio prazo no arquivo e no cadastro. Alterar política não encurta documentos anteriores. O portal exige novo aceite se o prazo exibido mudou antes de concluir o envio. `documentEvents` também registra conferência e exclusão, com ator/contexto e horário; conteúdo binário não é copiado para a auditoria.

Em `/admin/documentos`, a conferência de vencimento consulta metadados dos cadastros, sem baixar todos os PDFs. A lista de elegíveis é apenas planejamento; nenhuma exclusão ocorre ao consultar. O owner pode excluir individualmente um arquivo com prazo registrado encerrado, por transação que remove conteúdo, atualiza metadados e cria evento. Rules usam request.time: relógio do navegador não autoriza exclusão antecipada. Perfil, inscrição, valores e ledger permanecem. Autorização de passageiro embarcado não é apagada por essa operação; requer desfazer o embarque antes.

Arquivos legados **sem prazo gravado não são selecionados nem apagados automaticamente**. Não foi executado backfill. Mudanças de Rules/índices aqui são candidatas locais, nenhuma rotina remota foi ativada. A configuração de retenção de arquivos não é um procedimento completo de anonimização/exclusão de conta, logs ou histórico financeiro. Procedimentos reais/obrigações legais continuam dependendo de revisão e autorização do proprietário.

## Embarque e idade

Quando a viagem exige autorização, o servidor calcula a maioridade na data persistida do evento. Nascimento/data inválidos ou idade desconhecida não liberam embarque. `isMinor:false` sozinho não burla a exigência. Exatamente18 anos na data da viagem é tratado como maior; menor exige conferência aprovada e, se há PDF ativo, arquivo disponível e dentro do prazo. Aprovação em papel legada continua possível após conferência humana. Isto é controle operacional, sem promessa de conformidade jurídica automática.

## Evidência incremental

`f3-documents-first.log` e `f3-documents-operations.log`:55 regressões de operações PASS. Primeira rodada dedicada encontrou custo excessivo na avaliação do upload quando realizado pelo owner; checagem de novo ID de evento passou a preceder o caminho de revisão, preservando os caminhos de upload/revisão e todas as autorizações. `f3-documents-final-tests.log`:61 PASS; após incluir bypass por idade/limite de aniversário/planner, `f3-documents-accepted-tests.log`:63 PASS.

Cobertos consentimento, PDF inválido, prazo exibido obsoleto, owner/staff/visitante/B/global, configuração sem PII pública, eventos imutáveis/replay, revisão PDF/papel, perfil alterado, check-in, vencimento com relógio forjado, encurtamento não retroativo, arquivo legado conservado, provas financeiras mantidas e SDK adulterado.

`f3-documents-e2e.log`:4 PASS/26s desktop1440/mobile320, Auth real emulado: consentimento → envio PDF → download privado → revisão → embarque; configuração de prazo → inspeção sem apagar → envelhecimento exclusivamente da fixture → exclusão auditada → cadastro e totais do Financeiro Geral preservados. Zero pageerrors/Firebase remoto; lint/typecheck/build E2E PASS. Gate F3 completo em andamento, com escala400 e regressão do conjunto; não é homologação de produção.

Gate final concluído:142 unit/Rules/integration,4 Auth,6 Storage e88 E2E PASS; ver F3_ACCEPTANCE.md. Homologação remota BLOCKED.
