# Staging publicado — revisão67ce032

Publicado exclusivamente `caravana77-staging`, projeto ID `a333a402-de3a-42f4-a6ff-7f16f5132a8d`, canonical `https://caravana77-staging.pages.dev`. Deployment `4ed92f3b-c19e-426d-ab49-eca76aa0f560`, success em23/10/2026 às16:59:11Z. Fonte do manifesto: `67ce0328d7bf1b7395e71627cdc85c88667c77ec`. O rótulo Production do Pages significa o domínio canônico **deste projeto de staging**. Produção `caravana-77`/`caravana-af306` não recebeu alteração.

## Procedência e verificações

`npm run build:staging` PASS:15arquivos inventariados, mais o próprio release.json. ZIP público316907bytes, SHA256 `ed7a26292408e87c1cbc3174dc6575d495e21aceb73479979456611986665368`; upload16/16 concluído no painel oficial. Pacote e manifesto são de67ce032; `git diff 77e5f94 HEAD -- src public index.html package.json package-lock.json firestore.rules firestore.indexes.json vite.config.ts` estava vazio antes do build. Portanto código do aplicativo/dependências corresponde à revisão77e5f94 aprovada pelo CI, sem atribuir esse CI ao Worker operacional adicionado depois.

App Check permanece **desativado** no build; nenhum registro de provider, assessment ou enforcement foi executado. Mantidas CSP sem fontes adicionais de reCAPTCHA/App Check. Não confundir publicar a integração desativada com proteção de abuso efetiva.

Verificações públicas PASS:12assets com bytes/SHA/MIME exatos, headers de segurança, manifesto completo idêntico ao local e SHA do HTML de `/admin/login` idêntico ao pacote. Bootstrap no navegador integrado exibiu banner de staging, login e botão Entrar, sem warnings/errors capturados; nenhuma credencial digitada, jornada autenticada ou documento Firebase solicitado por esse teste manual.

Provas: [pacote](evidence/2026-10-23/desktop/staging-67ce032-package.json), [build](evidence/2026-10-23/desktop/staging-67ce032-build.log), [health público](evidence/2026-10-23/desktop/staging-67ce032-public-health.json), [manifesto/HTML](evidence/2026-10-23/desktop/staging-67ce032-manifest-html.json), [CI77e5f94](evidence/2026-10-23/desktop/appcheck-final-ci.json).

## Rollback real do frontend

Depois da publicação, rollback pelo endpoint específico do projeto para `6e1a652a-dc4e-412e-9177-909ab35f598f`/bc5dd40 retornou200. A primeira leitura da borda ainda trouxe o manifesto novo e foi recusada pelo guard de identidade; não foi chamada de PASS nem repetido o POST. Após convergência do mesmo deployment, health12assets da fontebc5dd40 PASS.

Restaurado o deployment4ed92f3b por POST específico,200; health12assets da fonte67ce032 PASS. Provas separadas: [rollback](evidence/2026-10-23/desktop/staging-67ce032-rollback-health.json) e [retorno à candidata](evidence/2026-10-23/desktop/staging-67ce032-forward-health.json). Não houve mudança de Rules, índice, Auth ou dados; nenhum ledger foi apagado/compensado nesta etapa. Este exercício é frontend; não é rollback de migração real.

## Alerta de evento real

A política Pages `c1b9d45cd9e843258978d143f2520d20` registrou envio por e-mail em16:59:12.679255Z para o evento deste deployment. A pesquisa restrita na conta destinatária aprovada encontrou `[Alert] Pages deployment update for caravana77-staging`, recebido13:59local, com ID4ed92f3b e timestamp do evento. Diferentemente do teste padrão anterior, este resultado corresponde à publicação efetivamente realizada. Nenhuma outra mensagem foi aberta.

Capturas privadas fora do Git em `.firebase/master/staging-67ce032-deployed-20261023.jpg` e `staging-67ce032-login-20261023.jpg`. Evidência de envio/recebimento é descrita junto ao monitor operacional; nenhuma captura de caixa postal é publicada no repositório.

## Limites de aceite

CI local/emulado e bootstrap/artefatos/rollback públicos estão comprovados nesse escopo. Não foram repetidas as17jornadas SDK remotas; suas provas anteriores continuam limitadas à configuração e execução registradas. Proteção de abuso efetiva e observabilidade backend seguem pendentes. Não elevar F7/F8/GOAL ou declarar prontidão comercial/migração a partir deste deploy. Backup/restauração reais continuam dependentes do procedimento pessoal já preservado; nenhum dado do Ítalo foi exportado.
