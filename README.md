# Caravana 77

Plataforma para publicar caravanas, organizar inscrições, conferir comprovantes, acompanhar financeiro e fazer check-in. React, TypeScript, Vite e Firebase, com desenvolvimento isolado por emuladores.

Branch de continuidade: `codex/caravana77-commercial-v1-20261016`, repositório `CristianoRFB/Caravana`. Estado consolidado em [CURRENT.md](docs/CURRENT.md), [CODEX_PROGRESS.md](docs/CODEX_PROGRESS.md) e [F6_ACCEPTANCE.md](docs/F6_ACCEPTANCE.md). Os aceites F2–F5 são locais/sintéticos; F6 permanece IN_PROGRESS e equipe/convites do LAB04-PC23 dependem de sincronização.

## Executar a demonstração local

Requisitos: Node.js 24 com npm, Java 21 ou superior e portas locais livres. O primeiro uso precisa de rede para dependências e emuladores.

```sh
git clone --branch codex/caravana77-commercial-v1-20261016 https://github.com/CristianoRFB/Caravana.git
cd Caravana
npm run demo
```

O comando instala dependências ausentes pelo lockfile, inicia Auth/Firestore em loopback, prepara fixtures e abre Vite em `http://127.0.0.1:5173`. Não exige login Firebase/Cloudflare nem credenciais reais. Digite `q` e Enter para encerrar normalmente. Não execute suites que compartilham as portas enquanto a demo estiver aberta.

Contas fixas e instruções: [TEST_ACCOUNTS.txt](docs/TEST_ACCOUNTS.txt). Duas organizadoras com owners distintos, marcas azul/verde e planos Essencial/Pro demonstrativos. O seed preserva edições, não redefine senhas, não reativa memberships revogadas e não cria Platform Owner. Sem export/import, dados e UIDs são recriados ao reiniciar os emuladores.

- Landing comercial: `/saas`, separada do catálogo e dos links existentes.
- Marcas demo: `/o/demo-organizadora-a` e `/o/demo-organizadora-b`.
- Painel: `/admin/login`; financeiro `/admin/financeiro`; contrato/limites `/admin/plano`.
- Passageiro: `/conta/entrar`; portal privado `/minha-inscricao/{id}` ou rota com namespace.
- Onboarding assistido: `/platform`, exige identidade global específica que não pertence às contas demo comuns.

A landing usa preços/limites do catálogo aprovado. O canal comercial oficial é configuração pública opcional `VITE_COMMERCIAL_CONTACT_URL`, descrita em [COMMERCIAL_LANDING.md](docs/COMMERCIAL_LANDING.md); não reutilizar contatos de clientes. `npm run dev` também seleciona o modo e2e, mas não inicia nem semeia os emuladores.

## Verificação

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run test:demo
npm run test:storage
npx playwright install chromium
npm run test:e2e
```

Executar suites de emuladores em sequência. Elas usam somente `demo-caravana77-test`, hosts loopback exatos e dados sintéticos. Playwright compila `dist-e2e` e testa 320/375/768/1440. `npm run build` gera apenas um artefato local de produção; não o publica e não deve ser usado para testar contra dados reais. O runtime recusa Firebase real em desenvolvimento/loopback.

Testes direcionados e contratos estão nos documentos dos módulos. `npm run test:public-seats` e `npm run test:public-seats:e2e` verificam disponibilidade comercial e retry; `npm run test:landing:e2e` verifica a landing nas quatro larguras. O runner Storage preserva proxies externos e trata somente consultas GET ao Firestore sintético local no workaround documentado em [CLOUD_REGRESSION.md](docs/CLOUD_REGRESSION.md).

O workflow atual executa lint/typecheck/Rules/build em main/PR; pushes desta branch não disparam esse workflow. Execuções locais não equivalem a aprovação remota de CI. [F7_PREPARATION.md](docs/F7_PREPARATION.md) contém as pendências de infraestrutura/staging/release.

## Preservação e operação

O cliente Ítalo/Anime Fest, seus IDs, administradores, caravanas, passageiros, comprovantes, documentos e histórico financeiro devem ser preservados. Nenhuma escrita em Firebase real, migração, Rule implantada, deploy, merge, exclusão destrutiva ou operação financeira real está autorizada nesta continuidade. Procedimentos antigos de publicação/migração do README foram substituídos pelos gates em [RELEASE_AND_ROLLBACK.md](docs/RELEASE_AND_ROLLBACK.md); o histórico original permanece no Git. Backup de código não prova backup dos dados reais.

Pix e outros pagamentos acontecem fora da plataforma. O sistema registra lançamentos informados e conferência manual; não cobra, transfere dinheiro, reembolsa ou dispara mensagens automaticamente. Comprovantes atuais são privados no Firestore, até 600 KiB (rótulo legado 600 KB). Storage legado continua com Rules candidatas separadas, sem mutações do cliente. O link privado da inscrição é uma credencial: não o compartilhe.

Financeiro Geral mantém Tudo/caravana e histórico auditado. Correções e cancelamentos preservam os registros. Redução de plano não apaga história; bloqueia crescimento acima dos limites. CSV aceita até 400 linhas com identidade/replay e rollback auditados.

Para reconciliar o WIP local do LAB04-PC23 com os checkpoints Cloud, consulte [CLOUD_HANDOFF.md](docs/CLOUD_HANDOFF.md). Não sobrescreva o checkout anterior nem reimplemente convites em paralelo.
