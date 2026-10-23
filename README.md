# Caravana 77

**Checkpoint de23/10/2026:** staging homologado (`bc5dd40`), CI integral PASS (`ee3f5b5`). GOAL incompleto: F7 preparação9/10, F8 6/14, GOAL7/17; produção e migração do Ítalo ainda bloqueadas pelas provas reais. [Todas as telas —32 rotas, perfis e galeria](README_TELAS.md) · [O que foi feito, por que falta e próximos passos](docs/ENCERRAMENTO_PARCIAL_2026-10-22.md).


Plataforma para publicar caravanas, organizar inscrições, conferir comprovantes, acompanhar financeiro e fazer check-in. React, TypeScript, Vite e Firebase, com desenvolvimento isolado por emuladores.

Branch de continuidade: `codex/caravana77-commercial-v1-20261016`, repositório `CristianoRFB/Caravana`. Estado consolidado em [CURRENT.md](docs/CURRENT.md), [CODEX_PROGRESS.md](docs/CODEX_PROGRESS.md) e [F6_ACCEPTANCE.md](docs/F6_ACCEPTANCE.md). Os aceites F2–F5 são locais/sintéticos; F6 PASS local/sintético, incluindo equipe/convites; F7/F8 e produção permanecem BLOCKED por gates reais. O checkout local original foi localizado e preservado; não foi mesclado automaticamente ao worktree de continuidade.

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

O workflow atual executa audit runtime, lint, tipos, guards Python, backend/Rules, Auth, Storage, recuperação sintética conjunta, E2E e build em main/PR e pushes da branch de continuidade. Checkpoints documentais podem usar [skip ci]. Execuções locais não equivalem a aprovação remota de CI. [F7_PREPARATION.md](docs/F7_PREPARATION.md) contém as pendências de infraestrutura/staging/release.

## Preservação e operação

O cliente Ítalo/Anime Fest, seus IDs, administradores, caravanas, passageiros, comprovantes, documentos e histórico financeiro devem ser preservados. A instrução de2026-10-20 autoriza deploy compatível somente após todos os14 gates comprovados, sem confirmação rotineira adicional. O mandato de22/10 autoriza inventário/backup privados e condiciona o cutover a todos os gates reais; enquanto backup/restore, compatibilidade e rollback não forem comprovados, produção permanece BLOCKED. Operações financeiras reais e destruição não fazem parte da homologação. Procedimentos antigos de publicação/migração do README foram substituídos pelos gates em [RELEASE_AND_ROLLBACK.md](docs/RELEASE_AND_ROLLBACK.md); o histórico original permanece no Git. Backup de código não prova backup dos dados reais.

Pix e outros pagamentos acontecem fora da plataforma. O sistema registra lançamentos informados e conferência manual; não cobra, transfere dinheiro, reembolsa ou dispara mensagens automaticamente. Comprovantes atuais são privados no Firestore, até 600 KiB (rótulo legado 600 KB). Storage legado continua com Rules candidatas separadas, sem mutações do cliente. O link privado da inscrição é uma credencial: não o compartilhe.

Financeiro Geral mantém Tudo/caravana e histórico auditado. Correções e cancelamentos preservam os registros. Redução de plano não apaga história; bloqueia crescimento acima dos limites. CSV aceita até 400 linhas com identidade/replay e rollback auditados.

Para reconciliar o WIP local do LAB04-PC23 com os checkpoints Cloud, consulte [CLOUD_HANDOFF.md](docs/CLOUD_HANDOFF.md). Preserve o checkout anterior e compare manualmente eventual WIP com o contrato Cloud em [TEAM_INVITATIONS.md](docs/TEAM_INVITATIONS.md). A continuidade Cloud não depende mais da sincronização desse WIP.

Equipe: responsáveis gerenciam `/admin/equipe`; convidados encontram o próprio UID e aceitam em `/conta/convites`. Não há envio de e-mail ou concessão de acesso sem aceite; veja [TEAM_INVITATIONS.md](docs/TEAM_INVITATIONS.md). Prévia estática independente: [PUBLIC_PREVIEW.md](docs/PUBLIC_PREVIEW.md), publicada e smoke verificado sem Firebase; não representa staging do SaaS.

Prévia visual isolada: https://caravana77-commercial-preview.pages.dev/saas — sem painel/backend. Estado de homologação e percentuais: [F8_ACCEPTANCE.md](docs/F8_ACCEPTANCE.md).
