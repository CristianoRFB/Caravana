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
