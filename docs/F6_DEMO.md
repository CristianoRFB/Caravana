# F6 — demo comercial isolada

Retomada Cloud em 2026-10-19 sobre 65f8facd4a8bf93c351666567668bbaa8b9ccaf9, branch codex/caravana77-commercial-v1-20261016. Nenhum commit posterior disponível no remoto nessa conferência. Equipe/convites do LAB04-PC23 continuam BLOCKED por sincronização; não foram reimplementados.

`npm run demo` prepara explicitamente duas organizadoras no Auth/Firestore Emulator exatos. A usa Essencial e azul; B usa Pro e verde. Cada uma mantém owner/UID próprio, membership e diretório correspondentes, uma caravana publicada, histórico financeiro fictício e usage inicial 1/1/1. Contratos têm status demo, sem cobrança, com valores derivados de PlanCatalog. As rotas públicas de marca são /o/demo-organizadora-a e /o/demo-organizadora-b. Contas e instruções em TEST_ACCOUNTS.txt.

O seed inclui contratos privados, entitlements públicos sem valores/UIDs, disponibilidade, namespaces e slugs. Não cria Platform Owner, marcador global de inventário completo, evento de aprovação fictício ou convite. A preparação privilegiada é exclusiva das fixtures; os fluxos da aplicação usam Auth real do emulador e Rules candidatas sem bypass.

Todas as leituras precedem as escritas da transação de seed. Documentos existentes são preservados, incluindo contadores, marcas e contratos alterados. Conflito de identidade, papel ou status de membership aborta o seed Firestore inteiro. O cadastro/login Auth é uma etapa anterior e não é atômico com Firestore; divergências de senha não são corrigidas nem resetadas. Sem export/import, o emulador reiniciado recria fixtures e UIDs.

## Validação

- PASS: 8 casos Auth/Rules, login, A×B privado, ausência de global, contador direto negado, reseed preserva contrato/suspensão/usage/marca, membership revogada não reativada. `cloud/f6-demo-auth.log`.
- FAIL de infraestrutura inicial: hook de preparação excedeu 20s com emulador recém-baixado; 8 casos não executados. Uma tentativa direta seguinte não encontrou vitest por PATH fora de npm. Logs preservados; execução com PATH local e hookTimeout 60000 concluiu os 8 casos sem skip/retry (16,29s total).
- PASS: lint e typecheck; logs em docs/evidence/2026-10-19/cloud/.
- PASS: 10 E2E compilados em 1440/320, incluindo financeiro existente, passageiro sem admin, marcas A×B, reserva/reload, contratos e usage dos dois owners, sem overflow nem tentativa de Firebase remoto. `cloud/f6-demo-e2e.log`, 47,1s, exit0. Build E2E concluído pela suite.

Não equivale a gate F6: equipe/convites, vagas comerciais públicas, landing e regressão integral continuam pendentes. Não houve escrita em Firebase real, deploy, migração, Rules implantadas ou operação financeira real.
