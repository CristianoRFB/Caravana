# Etapa privada — continuidade do GOAL XIII no PC

## Direção do proprietário — produção direta

Em27/10, após o diagnóstico 403 de staging, o proprietário instruiu: **“não teste por bdall, faça a transferencia direta”**. Não haverá novas chamadas nem testes hospedados em bdall-e3585. Seguir diretamente no Firebase existente caravana-af306/caravana-77, sem recopy, com CI/sintéticos, preservação atual, diff, smoke e retorno coordenado. Os passos abaixo que previam staging são históricos e estão substituídos por essa instrução; não pedir novamente a conta de staging. O 403 não foi contornado com outra credencial e nenhuma mutação de staging ocorreu.

Continuação técnica: `package-italo-private.mjs` valida build limpo/target/SHA, cada arquivo do manifesto e os assets legados por HTTP/hash/MIME antes de criar diretório novo. Não lê credenciais/dados; não sobrescreve saída existente; preserva todos os assets legados, acrescentando o aplicativo no subpath e regras de roteamento/cabeçalho. O CSP privado mantém scripts self e aceita frames blob locais para comprovantes; herança/detach foram conferidos no runtime local Pages4.151.3, sem mudar o CSP da raiz. Teste real de navegador com conteúdo fictício em memória PASS. Referência de semântica: [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

A extensão de validação local tem17casos dirigidos (12SDK/Rules,3seleção/rotas,2limites do pacote),4E2E com comprovante blob nas quatro larguras e1teste CSP independente. O CI aeffda8 principal40550558727 e dedicado40550559000 passaram antes dessas extensões finais; não aprova automaticamente o novo SHA.

Índices de produção reconferidos: caravans(slug ASC,status ASC) e registrations(organizationId ASC,caravanId ASC), ambos READY. `firestore.italo-private.indexes.json` preserva esses dois e acrescenta somente registrationOperations(org,caravan,at DESC) e financialOperations(org,at DESC)/(org,caravan,at DESC), necessários às consultas de histórico permitidas nesta fase: **delta planejado3, zero remoções**, ainda não aplicado. Importação/configuração comercial ficam indisponíveis nesta fase e não justificam os outros índices SaaS. O ledger de ativação real tem createTime2026-10-27T16:10:02.108883Z.

## Estado real

`HOSTED_PRIVATE_RESULT_2026-10-27.json` registra PREVIEW/APPLY/VERIFY oficiais, sem dados pessoais. Os quatro companions já existem; não repetir COPY nem criar novos owners. Código operacional executado: d7d4ded. A cópia e os originais foram revalidados, mas isso não é login do cliente nem aplicação publicada.

As Rules publicadas são exatamente o arquivo recuperado `tests/fixtures/production-20260929.rules`, SHA256 fe5946141707e594e66911564163719474c77f7445e668aada5afaad42b22c1b. O checkout original sujo foi apenas lido e continua preservado. Seus bytes CRLF estão protegidos com `-text`. A candidata SaaS depende de entitlement/quotas inexistentes na origem e não pode substituir essas Rules sem compatibilidade comprovada. Não atribuir plano para contornar esse problema.

## Código da etapa privada, ainda não publicado

- `scripts/recovery/italo-private-rules.mjs` exige os bytes exatos da base publicada e gera `firestore.italo-private.rules`. Sem hash correto, STOP. Acrescenta leituras do tenant italo apenas por membership de owner ativa, com UID/org coerentes, importPending e ledger do copy-plan real. Revogação/conflito não recorrem ao admin legado. Não concede Platform Owner nem operações comerciais.
- A base mantém o contrato de payload/nonce/recibo e de pagamentos/despesas do escritor legado fora de italo. Guardas adicionais vedam writes em italo e mudança de organizationId. Bearers antigos continuam válidos na origem; novos bearers da cópia não recebem leitura pública. Provas não podem ser substituídas por essa via. Nenhum writer novo é habilitado.
- `src/lib/private-history-release.ts` exige italo e base `/tenant-italo/`. O modo normal permanece multitenant. No pacote privado, apenas a membership de owner do italo é selecionável; rotas públicas, platform/convites/plano/equipe/configuração são excluídas. O backend continua sendo a autoridade.
- `HistoricalImportContext` bloqueia alteração na UI: caravanas, importação, dados de passageiros, links, aprovação, cancelamento, autorizações e check-in. Financeiro mantém consulta/histórico/UNKNOWN. O modo privado força o bloqueio desde a primeira renderização, independentemente da chegada do snapshot de importPending.
- `scripts/build-italo-private.mjs` exige configuração Web explícita do projeto existente, sem emuladores, valida projeto/número/domínio Auth e escreve manifest source/dirty/hashes. `--staging` fixa bdall-e3585. Não publica e ainda não monta o pacote combinado. Um artefato `dirty=true` não é uma aprovação de release.

## Validação efetuada

`npm run test:italo-private`: 14 casos PASS (11 SDK/Rules + 3 de configuração/seleção/rotas). Compila a candidata no emulador; verifica leitura histórica, UNKNOWN, anexos, ausência de plano, A×B, enumeração, bearer antigo/novo, revogação, conflito de UID/org/role, self-grant, writes/copied proof, publicação, mudança de organização, reserva legada real sem assinatura, replay, contador órfão e pagamento legado de total conhecido. Não prova segurança geral de todo o contrato legado herdado, nem é autenticação hospedada.

`npm run test:italo-private:e2e`: uma jornada distinta executada em 320/375/768/1440, quatro PASS. Login/refresh com Auth demo, somente italo selecionado, null preservado, consulta financeira, edição/link/check-in desabilitados, rota de inscrição redirecionada e revogação observada. Rede de Firebase real bloqueada por fixture. A primeira execução revelou base incorreta no servidor preview e foi corrigida; não é contada como aprovação. Uma tentativa inicial de compile detectou expansão indevida de `$'` no gerador; substituição literal corrigida e todas as Rules recompiladas.

Lint/typecheck/build local PASS na implementação. O lint concorrente com limpeza do diretório Playwright encontrou ENOENT; diretórios gerados agora são ignorados. CI integral do novo SHA deve ser consultado separadamente; CI d7d4ded não cobre estas adições.

## Gates seguintes, sem nova permissão genérica

1. Enviar a branch PC e conferir os dois workflows no SHA novo. Pipeline principal inclui o teste privado além da regressão normal; relatórios têm diretórios distintos.
2. Montar pacote combinado: manter cada asset legado byte a byte, colocar o novo aplicativo somente em `/tenant-italo/`, acrescentar roteamento SPA restrito ao subpath e registrar manifest completo. Conferir os hashes por HTTP no deployment atual antes de empacotar. Não publicar o diretório privado sozinho como raiz.
3. Calcular delta de índices efetivamente necessário contra os **2** índices atuais de produção; os **11** históricos de staging não são produção. Não remover nenhum existente.
4. Ensaiar Rules/pacote e rollback em bdall-e3585/caravana77-staging com fixtures, preservando configuração anterior e todos os dados. A candidata privada difere das Rules SaaS de staging; voltar à versão preservada depois da janela de ensaio. Nenhuma PII do Ítalo no staging.
5. Só depois publicar o conjunto compatível em caravana-af306/caravana-77 e conferir domínio/SHA/hashes. Login do responsável existente deve ser feito legitimamente, sem recriar senha/UID nem fabricar sessão impersonada. Confirmar leitura dos dados/anexos e revogação; preservar provas privadas, publicar apenas contagens/booleans.
6. Esta é uma fase de acesso privado. Ainda é necessário o corte público com reconciliação de eventos posteriores e único escritor por reserva. Não retirar importPending, publicar a cópia ou substituir links por esta ferramenta. Nunca declarar MIGRATED por acesso histórico.

## Retorno

Snapshot cifrado de Rules/Auth/índices/metadados Storage atual foi lido de volta e validado em uma única custódia; a segunda custódia/restore não foi comprovada. Retorno deve restaurar apenas Rules e deployment compatíveis preservados, mantendo os quatro companions, originais, cópia e dados posteriores intactos. Não há delete de dados como rollback. Não restaurar uma release que revogue acesso já ativado sem tratar a janela e a comunicação com o responsável. Nenhuma Rules nova foi publicada nesta etapa.
