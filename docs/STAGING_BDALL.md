# F7/F8 — staging isolado bdall-e3585

## Aceite funcional incremental — 2026-10-20

PASS: 11 jornadas SDK no Firebase real de staging, sem Admin SDK nem bypass de Rules: Auth, marcas/planos A×B, reserva/replay, negativas de acesso privado, onboarding, concorrência de quota/arquivamento, PDF, financeiro fictício/check-in reversível, CSV/deduplicação/rollback, convite/revogação/último owner, suspensão e autorização privada de menor. Evidência: `staging-sdk-pdf.log`; as falhas anteriores e correções do harness permanecem registradas. Nenhuma cobrança bancária foi executada.

Comprovantes e autorizações PDF usam o fluxo existente no Firestore, com limite de 600 KiB e revisão manual. O teste remoto confirma download pelo owner e negativas para B/global/visitante e staff revogado. Download de comprovante agora exige leitura do servidor para revalidar a permissão. 68 testes locais relacionados PASS. Cloud Storage não foi habilitado nem homologado remotamente.

O link opaco ativo da inscrição continua sendo uma credencial do passageiro: revogar um integrante não revoga automaticamente um link que ele conheça. Documentos privados, financeiro e listagens exigem ACL própria; o bloqueio do link usa revogação explícita do portal. O contrato legado foi preservado e testado, sem promessa de sigilo de um link compartilhado.

Backup sintético: exportação somente leitura de staging para arquivo ignorado, com manifesto/hash público; restauração exclusivamente no emulador `demo-caravana77-test`, sem sobrescrita, compara todos os campos, relações, contadores, totais e ACL A×B. Metadados Auth não incluem senhas e não representam restauração de credenciais. Isso não prova backup/restauração da produção.

Inspeção visual de staging encontrou scrollbar vertical reduzindo a largura útil de 320 para 305 px. Corrigido `body` para respeitar a largura disponível, com dois E2E direcionados PASS. Cabeçalhos CSP/noindex ficam restritos ao build de staging. A publicação e inspeção remota desta correção serão registradas separadamente.

Credenciais fictícias locais: `.firebase/staging-accounts.json` (ignorado). URL funcional: https://caravana77-staging.pages.dev. Não usar credenciais nem dados do Ítalo neste ambiente.

### Reexecução delimitada

`STAGING_CONFIRM_PROJECT=bdall-e3585 npm run test:staging` (adaptar variável ao PowerShell) executa apenas staging-tests, com config ignorada e identidades fictícias. Cada rodada adiciona histórico sintético e cancela/arquiva/revoga suas próprias operações; não limpa o banco. `STAGING_FIREBASE_ACCOUNT` seleciona explicitamente a conta autorizada nos helpers administrativos. Exportar com `node scripts/export-staging-backup.mjs`, preservar o snapshot anterior e conferir manifesto; a exportação falha se encontrar passageiro/conta fora da fixture ou mais de500 documentos. Não elevar esse limite nem fazer limpeza silenciosa.

Restaurar somente com `STAGING_RESTORE_CONFIRM=demo-caravana77-test` e `node scripts/run-local-tests.mjs staging-restore`; o runner usa emulador loopback e a restauração recusa sobrescrita. Não usar conta/chave de produção. CI padrão não executa testes SDK remotos nem precisa dos arquivos ignorados; valida os dois harnesses TypeScript em projetos separados para evitar mistura dos tipos modular/compat do SDK.

Publicação final isolada: runtime8b0dad3/deployment3304e9dd; CSP e login B verificados; móvel320 tem largura útil305 e scrollWidth305. Retorno ao deploymente5e60818 e avanço de volta PASS, sem alteração dos153 documentos comparados. Retorno de Rules/Auth/dados reais não foi ensaiado.

### Encerramento no computador compartilhado

Ao concluir o uso, sair do painel fictício e das contas Google/Firebase/Cloudflare no navegador. No terminal, `npx --no-install firebase logout` encerra as sessões locais do CLI (sintaxe conferida na versão instalada); `wrangler logout` encerra a sessão local Cloudflare. Não executar comandos de listagem de tokens. Na conta Google da sessão antiga exposta, revogar a autorização Firebase CLI em Segurança/conexões de terceiros e autenticar novamente apenas quando necessário. Isso não exclui usuários, projetos ou dados. Os arquivos ignorados de credenciais/backups devem ficar sob controle do responsável, fora de compartilhamento público. Não foi alegado que essas sessões já tenham sido encerradas.

## Autorização e limites

Instrução do usuário de2026-10-20 autoriza configuração, Rules/índices, Auth, dados fictícios e publicação em Pages separado, com orçamento máximo R$0. Produção `caravana-af306` e Pages `caravana-77` continuam protegidos. Não há autorização para migração real, alteração de dados/Rules/Auth/índices de produção ou merge.

Destino conferido pelo console e CLI/API: `bdall-e3585`, número146882624278, ACTIVE; Firestore Standard `(default)`, `southamerica-east1`, freeTier=true; billingEnabled=false e sem conta de faturamento. Antes da configuração: zero coleções, zero usuários Auth, E-mail/Senha habilitado, zero índices compostos e Rules restritivas. Snapshot inicial recuperável em `evidence/2026-10-20/staging-baseline/`. Não representa backup de produção.

## Recuperação

Pull fast-forward65f8fac→663bdca após preservar o WIP local em stash `b7fff04b49cab3f5312327696ca87b2ad7b68ee4` e Git bundle completo verificado em `C:/xampp/77/Caravana-audit-20261020/pre-pull-local/`. A implementação remota de equipe/convites usa contrato diferente e já validado; o WIP não foi aplicado sobre ela. O gap reaproveitável foi a cobertura das novas fontes no inventário: v2 inclui `tenantInvitations` e `invitationInboxes`, com teste de referências órfãs.

CI só possui push main/PR/workflow_dispatch e não faz deploy. Projetos Pages existentes conferidos em leitura; staging usa novo `caravana77-staging`, direct upload sem Git ou Functions. Publicar na branch de desenvolvimento não substitui produção.

## Configuração e operação

- `.env.staging.local` e credenciais fictícias em `.firebase/staging-accounts.json` são ignoradas pelo Git. Não publicar esses arquivos. A configuração Web foi obtida do app exato e conferida pelo número do projeto.
- `build:staging` exige projeto/Auth domain/appId coerentes e emuladores=false. Runtime recusa staging sem identificação explícita e fora de `caravana77-staging.pages.dev` e seus deployments. Produção e emuladores continuam separados.
- `staging-admin.mjs` usa a sessão interativa oficial do CLI, exige conta explicitamente selecionada e rejeita emuladores/chaves permanentes. Reconfere projeto, banco gratuito e faturamento desativado; bloqueia requisições fora do projeto autorizado.
- `deploy-staging.mjs` publica apenas Firestore Rules/índices, com destino explícito, configuração delimitada e hashes vinculados aos testes. Nenhum Storage, Function, App Hosting, billing, DNS ou domínio pago.
- Bootstrap cria cinco identidades fortes em `@caravana77.invalid`, A/Essencial e B/Pro, diretórios/contadores, namespace e auditoria fictícios. Não reaproveita contas demo fracas do emulador. Replay conserva contadores, alterações e revogações existentes; não redefine senhas nem apaga dados.
- Auth adiciona somente o domínio de staging aos domínios existentes. Não habilita novo provedor.
- Build traz aviso de testes e noindex. Isso não é controle de acesso; permissões são decididas nas Rules.

## Evidência incremental

PASS:20 testes puros de limites de ambiente/build/inventário;48 testes direcionados de equipe/quota/membership/plataforma/namespace;56 testes de segurança após a correção. Há sobreposição entre suítes, não somar como casos únicos. Lint/typecheck/build staging PASS. A regressão F6 prévia é preservada, não reiniciada.

Rules iniciais publicadas no staging emitiram warning de map/null no evento de convite. Corrigido mantendo `event.before=null` para criação e mapa tipado internamente; compilação subsequente sem warning. Namespace coverage evoluiu para v2 antes da massa fictícia. Evidências `staging-*` distinguem cada rodada.

IN_PROGRESS: configuração implantada, homologação funcional real de staging, desktop/mobile, persistência, negativos de segurança, rollback sintético e relatório F7/F8. Não atribuir PASS antes dos resultados.

BLOCKED: Storage real que exija Blaze; nenhum bucket criado/homologado. O fluxo inline Firestore existente é documentado em STORAGE_PRIVACY.md; anexos permanecerão sem aceite remoto até validação específica gratuita e segura. Produção, backup/restauração reais e compatibilidade do cliente não são comprovados pelo staging.

## Sessões do computador compartilhado

Um diagnóstico inicial `firebase login:list --json` retornou credenciais além do esperado. Nenhum valor foi copiado para o repositório; não repetir esse comando nem versionar logs brutos de autenticação. A sessão anterior deve ser revogada na conta Google. O login correto foi refeito pelo fluxo oficial com confirmação humana e acesso ao projeto comprovado. Ao encerrar, orientar logout local e no navegador sem excluir contas ou redefinir credenciais do proprietário.
