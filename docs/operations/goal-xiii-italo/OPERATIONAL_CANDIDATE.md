# Continuidade do evento existente — candidata ainda não publicada

O proprietário confirmou que a caravana continua em operação, apesar da data passada. A candidata não encerra o evento automaticamente. A produção continua com o aplicativo privado 4ecaa9e, Rules 392e61a3 e a origem como único escritor público. Nenhuma segunda cópia, alteração de Auth, pagamento real ou corte foi executado nesta etapa.

## Código e prova local

- `firestore.italo-cutover-fence.rules`: preserva o escritor legado enquanto não houver ledger; fases source_active, frozen e target_active impedem dois escritores. Outros tenants continuam com o contrato legado.
- `firestore.italo-operational.rules`: compõe o contrato publicado e operações modernas somente para o evento alvo. Membership ativa de owner, ledger imutável, copyPlanHash e limite físico são obrigatórios. Não cria assinatura, equipe ou novas caravanas.
- Dados/client: aliases simétricos, validação de contexto, slug antigo e novo, retomada de tentativa sem trocar ID/nonce; erro ou vínculo ausente interrompe nova reserva. IDs históricos sem entropia continuam exclusivos de owner. A revogação do tenant bloqueia o fallback administrativo legado depois do corte.
- Operações: reserva, financeiro auditado, check-in, comprovante e edição usam os SDKs reais em emulador. Null/UNKNOWN não vira zero. Edição auditada pode arquivar/republicar o evento por decisão expressa do owner, mantendo o contador de publicação e os membros. Slug e proveniência permanecem imutáveis; listas editadas têm validação e limite de 20 itens.
- Interface opt-in `/tenant-italo/`: diretório confirmado pelo servidor controla o modo de consulta; envios e operações ficam desabilitados durante congelamento/estado desconhecido. Sem o flag de build, o roteamento normal continua vigente.
- Build separado `npm run build:italo-operational`: 18 arquivos públicos na versão com bootstrap, configuração Web do projeto existente, sem credencial administrativa. Não sobrescreve o pacote privado preservado; manifest indica `readyForDeploy:false`.

Resultados locais: 15 casos operacionais/grant PASS (24 com regressões de disponibilidade e tentativa); 25 casos do fence e Rules privadas PASS; 5 casos nativos do modelo de transição PASS. Regressões de quotas/memberships/plataforma: 32 PASS; reserva/Rules/dados: 68 PASS (suítes com sobreposição, não somar como casos distintos). Lint sem avisos, typecheck e build PASS. Houve uma falha real de orçamento de expressões nas Rules; a validação completa do recibo foi mantida no create imutável e os documentos associados passaram a verificar seu vínculo na mesma transação, eliminando a repetição. O cenário voltou a passar. Não se trata de prova Auth ou produção.

## Gates restantes antes do corte hospedado

1. Empacotar bootstrap público, catálogo sem duplicata e preservação dos assets legados/privados; testar links e estados nos quatro tamanhos de tela.
2. Implementar executor Cloud Shell privado com PREVIEW, preconditions, congelamento/reinventário, transação de aliases/ativação e readback. O modelo atual não executa writes e sempre retorna `readyForApply:false`.
3. Reconciliar inventário completo atualizado, preservando os 24 originais, os 29 copiados e dois UNKNOWN. Não repetir COPY nem recriar IDs.
4. Comprovar retorno antes de tráfego e contingência após novas writes. Após alteração de negócio no alvo, manter os dados do alvo e reparar adiante; o rollback histórico que reabre a origem não é válido.
5. Validar o app operacional publicado com sessões existentes e registrar negativas reais aplicáveis. A entrada e o comprovante no app privado já foram confirmados pelo proprietário; não equivalem ao teste deste novo app.

## Bootstrap e pacote seguinte

Implementado bootstrap externo com integridade, diretório fresco, aliases validados e catálogo que omite somente a origem mapeada. Preserva os entrypoints JS do legado e do histórico privado, encaminha somente o evento do Ítalo e mantém consulta do alvo em congelamento. Resposta inesperada/indisponível entra em conferência, sem iniciar outra reserva. O retorno pré-tráfego usa aliases simétricos e evita redirecionar para a mesma URL.

Pacote estático calcula hashes, valida os seis arquivos públicos legados e o manifest privado exato 4ecaa9e, rejeita colisões/symlinks/arquivos não revisados e usa entradas HTML por SHA para tratar cache de caminhos aquecidos. Os manifests de compilação originais são preservados em URLs próprias; os marcadores atuais apontam para eles sem atribuir os hashes do HTML antigo ao bootstrap novo. Não contém Worker, Functions, credencial administrativa ou dados privados. Sua execução sobre build limpo e o smoke HTTP ainda precisam ser registrados.

Validação seguinte: 31 testes SDK/política/pacote/regressão PASS (incluem os 15 operacionais/grant anteriores); cinco verificações do navegador compilado PASS, sendo quatro subcenários de viewport. Todos os endpoints externos foram simulados ou bloqueados; entries dos três aplicativos eram marcadores sintéticos. Isso prova o bootstrap, não a jornada Auth/financeiro completa do aplicativo operacional. Lint e typecheck PASS.

**NOT_READY para corte público.** A pendência de finalidade do evento está resolvida. Os bloqueios restantes são implementação e validação técnica, não uma nova permissão genérica. R$ 0 de novos serviços; nenhum recurso hospedado foi criado nesta etapa. Protótipo de Rules sujeito à revisão e validação antes de publicação ampla.

## Continuação de 29/10 — executor e aplicativo

Novo inventário oficial às 17:54:34 UTC: 24 originais/29 copiados, 10 inscrições e dois UNKNOWN reconciliados; zero divergência, write ou recopy. Produção segue Pages 6e76a7cd/Rules 392e61a3 até publicar a candidata validada. O proprietário reiterou “continue até passsar os dados”.

Executor privado implementado em `scripts/recovery/cloudshell-operational-cutover.mjs`, com PREVIEW/APPLY/VERIFY, projeto/número/identidade exatos, R$0, Rules/manifesto/CI exatos, plano cifrado reproduzível, inventário completo fresco, preconditions e uma tentativa de commit. Fases: prepare (origem aberta), freeze (reinventário obrigatório), activate (26 writes previstos para dez aliases nos dois sentidos, três ajustes de metadados e controles/auditoria) e return-source. Não escreve em inscrições, pagamentos, comprovantes, contas, contratos ou nos 24 originais.

Retorno: antes da ativação, retoma somente o escritor de origem. Depois da ativação, exige o watermark privado completo de todos os 29 copiados e quatro companions; qualquer pagamento, despesa, cadastro ou revogação posterior exige preservar o destino e reparar adiante. Arquivos sem organizationId também integram esse watermark. Commit incerto nunca é repetido; VERIFY é obrigatório.

Resultados: oito testes nativos do executor PASS; três casos REST de transação/máscara/readback/ACK perdido PASS; suíte SDK/política/pacote/regressão com 34 casos PASS. Duas jornadas completas do app em quatro larguras (oito execuções) PASS, com Auth demo existente, financeiro, UNKNOWN, edição, comprovante, check-in, revogação, alias antigo, reserva e congelamento. A primeira tentativa de browser falhou por seletor incorreto e por ID fictício já ocupado; o produto bloqueou a reserva conflitante. O ensaio final corrigiu essas fixtures e passou integralmente.

Pacote eca5710: 41 arquivos, smoke local do Wrangler 4.151.3 com 40 recursos públicos e cinco rotas PASS em SHA/MIME/cache/CSP. Sem execução de Firebase real no PC. Código 4b5db70 e bootstrap eca5710 têm ambos CI principal/dedicado SUCCESS; a versão seguinte do executor/app precisa de seu próprio CI antes da publicação. Nada nesta seção afirma que o corte hospedado já ocorreu.

## Proteção final de links históricos

Os dez registros reais já usam links-capacidade de 64 caracteres na origem; nenhum ID foi exportado. A candidata também impede que um ID histórico restrito se torne público apenas porque a cópia determinística possui 64 caracteres. O alias e o portal continuam exclusivos de owner nesse caso, inclusive em congelamento; o bootstrap tenta a sessão existente da organização quando recebe negação de leitura pública. Nova regressão Rules/SDK e jornada autenticada no app demonstram essa preservação.

Resultado atualizado: 35 SDK/REST/política/pacote/regressões, oito execuções do app nas quatro larguras e cinco checks do bootstrap compilado PASS; lint/typecheck PASS. Rules candidatas 8ceb5832 ainda aguardam sua própria publicação. Backup cifrado dos componentes atuais tem readback e hash 0f14ea97; produção continua no release privado 4ecaa9e e cinco índices READY, billing=false. Nenhuma ativação de público nem write de negócio ocorreu no preflight.
