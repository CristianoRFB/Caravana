# Decisões

## ADR-001 — Recuperar a fonte editável e preservar todos os artefatos

Base Git oficial fa4d138 + fonte avançada local rastreada por manifestos. Primeiro reproduzir produção sem alterações funcionais; depois portar o fix de ID para ambas as escritas da reserva. Não usar os ZIPs minificados como src nem publicar o dist de main.

## ADR-002 — Isolamento de desenvolvimento

Worktree gerida separada, branch codex/caravana77-commercial-v1-20261016. Backup da fonte e dist fora do checkout. Segredos continuam ignorados. Testes exclusivamente em emuladores/dados sintéticos. Produção, Auth, Rules remotas e dados reais sem mutações.

## ADR-003 — Storage legado

O arquivo storage.rules de main será preservado como evidência legada na recuperação, mesmo que a configuração avançada use comprovantes inline em Firestore. Não inferir migração ou ausência de objetos de Storage reais. Policy definitiva e Rules implantadas dependem de auditoria autorizada.

## ADR-004 — Testes repetíveis e sem recursos reais

npm test usa Firebase demo-caravana77-test, portas loopback separadas e suites sem paralelismo de arquivos. Isso impede colisão de clearFirestore e fallback para um projeto real. No Windows/JDK 25 observado, a CLI deixa Java ativo após SIGINT; o runner encerra somente processo novo, do projeto demo e do caminho de Rules da worktree, sem terminar emuladores preexistentes e sem alterar ExecutionPolicy.

## ADR-005 — Preservar comprovantes inline e normalizar a policy

O fluxo recuperado comprovadamente usa Firestore proofs/current, sem serviço Storage ativo no frontend. Preservar esse armazenamento; policy central src/lib/proof-policy.ts controla cliente/UI, testes validam os limites nas Rules. Limite binário 600*1024=614400, base64 819200. A antiga tolerância de 820000 no Firestore permitia alguns bytes extras via bypass e foi corrigida somente no candidato local. Storage legado conservado com limite equivalente, fora da configuração ativa. Nenhuma migração de arquivos/serviço/cobrança.

## ADR-006 — Desenvolvimento sintético por padrão e teste do build compilado

Antes de inicializar SDK, bloquear configuração Firebase real em modo DEV ou loopback, e restringir modo emulador ao projeto demo-caravana77-test e loopback. npm run dev seleciona e2e; Playwright compila e serve dist-e2e com a mesma configuração sintética. O build de produção continua disponível para inspeção, mas executá-lo em loopback é recusado. Não há bypass para testar com dados reais.

## ADR-007 — Revogação aditiva do link privado

Links legados continuam válidos enquanto portalAccessRevoked não for true. A organização pode revogar explicitamente a leitura pública e o envio de comprovante sem apagar inscrição, comprovante ou histórico. Reativação reutiliza o mesmo link e avisa sobre todos os portadores antigos. Um link compartilhado é um bearer token: não oferece identidade do passageiro nem recuperação segura automática; rotação de token é melhoria separada. O portal limpa dados em erro/revogação e ignora callbacks atrasados; referrer-policy no-referrer evita enviar o token em navegação externa. Apenas Rules locais foram alteradas.

## ADR-008 — Contas fixas e ciclo de verificação eficiente

Instrução complementar de 2026-10-16 incorporada sem reiniciar o GOAL: contas fixas exclusivamente no Auth Emulator, perfis/memberships persistidos, seed idempotente e comando npm run demo. Segredos demonstrativos públicos em TEST_ACCOUNTS.txt; nenhum segredo real versionado. Seed possui privilégios somente para preparar fixtures locais; aplicação autentica no SDK normal e usa Rules. Não adicionar Platform Owner às contas comuns. Guard antes de SDK/rede recusa endpoints/projeto reais; aplicação recusa identidades demo fora do emulador.

Após pequenas mudanças, executar suites afetadas; segurança obrigatória em auth/Rules/migração/financeiro, full gates nos checkpoints de fase. Reutilizar evidência válida e não repetir screenshots/inventários sem necessidade. Checkpoints funcionais podem receber push somente na branch autorizada, sem force/merge/main/deploy. Esta autorização substitui o antigo bloqueio de push, mantendo todas as barreiras de produção.
