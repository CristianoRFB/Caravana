# Evidência de testes

Baseline recuperada, 2026-10-16:

| Comando | Resultado | Evidência |
|---|---|---|
| npm ci --no-audit --no-fund | PASS, 904 pacotes | lockfile preservado; Node 24.18.0, npm 11.7.0 |
| npm run lint | PASS, exit 0 | execução antes do checkpoint F0 |
| npm run typecheck | PASS, exit 0 | execução antes do checkpoint F0 |
| npm test | PASS, quatro arquivos / 26 testes | Firebase Firestore Emulator, fixture caravana-rules-test, nenhum acesso a dados de produção |
| npm run build | PASS, exit 0 | evidence/2026-10-16/f0-build.log |
| Comparação SHA256 dos seis assets | PASS, todos idênticos à Production | evidence/2026-10-16/f0-build-parity.json |
| git bundle verify | PASS, histórico completo | backup externo local-preserved/repository.bundle |

A CI oficial de fa4d138 é histórica e cobre fonte anterior. Não confundir build/HTTP 200 ou paridade de bundle com teste de persistência/isolamento do sistema inteiro.

Logs da recuperação: docs/evidence/2026-10-16/. Artefatos externos e manifestos: C:/xampp/77/Caravana-audit-20261016/.

## F1-ID — função real de reserva e regressões

Novo tests/data.integration.test.ts importa src/lib/data.ts com binding Firebase exclusivamente do Rules Test Environment, protegido por FIRESTORE_EMULATOR_HOST loopback. Não importa credenciais do app. Vitest serializa arquivos para impedir colisão entre clearFirestore das suítes.

- RED: f1-before-id-fix-isolated.log, 30 PASS/4 FAIL. Reproduz undefined caravanId, id persistido incorreto, leitura com id legado e reserva da última vaga falhando por esse bug.
- Infraestrutura: f1-before-id-fix.log e f1-after-id-fix.log registram portas ocupadas; f1-after-id-fix-isolated.log registra 34 testes verdes mas runner FAIL por execução de .ps1 restrita. Nenhuma política de segurança do host foi alterada; o runner passou a listar processos via comando PowerShell e encerrar em Node somente Java criado por este teste, nesse workspace e projeto demo.
- GREEN: f1-id-final-tests.log, cinco arquivos, 34 PASS, comando npm test exit 0 e cleanup confirmado. Inclui funções reais para concorrência, cancelamento duplo, revisão/check-in sem inventar valor, parcial/total/overpayment/void repetido e comprovante privado válido/inválido.
- Lint PASS: f1-id-final-lint.log. Typecheck PASS: f1-typecheck.log. Build PASS: f1-id-build.log. Fonte Finance.tsx, lib/finance.ts e importador preservados neste fix.

Fixture demo-caravana77-test, config firebase.test.json, Firestore 127.0.0.1:18080. Uso de projeto demo segue https://firebase.google.com/docs/emulator-suite/connect_firestore. F1 completo continua IN_PROGRESS; estes testes não cobrem ainda todos os gates ou dados legados reais.

## F1-policy/CSV — 43 testes PASS

npm test: seis arquivos / 43 testes, exit0, f1-policy-import-tests.log. Novos casos exercitam serviço real para menor/responsável, dados persistidos inválidos sem ocupar vaga, importação repetida do mesmo batchId (sem duplicar reserva), importação acima de vagas atômica, PNG/JPEG por assinatura e PDF no limite exato de 614400 bytes. O payload de 614401 bytes é negado pelas Rules mesmo bypassando cliente. Cliente e Firestore agora usam o mesmo limite base64 (819200); Storage legado tem limite estático equivalente, sem ativar/deployar Storage.

Lint/typecheck/build PASS, logs f1-policy-lint.log, f1-policy-typecheck.log e f1-policy-build.log. Validação de formato é por assinatura, não parsing completo de PDF/imagem. Nenhum objeto/documento real foi migrado. Dedupe cross-batch, token revogável, estados mais rigorosos e auditoria continuam pendentes.

## F1-E2E — baseline visual e operacional sintético

Playwright 1.64.1 + Chromium1248, Auth19099/Firestore18080, demo-caravana77-test. Vite --mode e2e carrega .env.e2e sintético (sem credenciais reais). Requisições externas do navegador são bloqueadas; asserts exigem zero pageerrors e zero tentativas de Firebase remoto. Fonte: e2e/baseline.spec.ts e fixtures.ts.

- Primeiro ensaio FAIL de infraestrutura: Chromium da versão exigida ausente (f1-e2e-first.log), corrigido instalando somente o runtime de testes.
- Baseline seis testes PASS: f1-e2e-local.log; capturas revelaram overflow móvel do seletor.
- Quatro viewports: primeira rodada 10 PASS/2 FAIL por espera incorreta do menu após login (f1-e2e-responsive.log); correção no harness aguardando sidebar anexada. Não foi ocultada falha de produto com retry/skip.
- Rodadas finais: f1-e2e-responsive-final.log 12 PASS; após ajuste do cabeçalho, f1-e2e-mobile-header-final.log 12 PASS, 35s, exit0. Testes verificam filtro Tudo/ride-a/ride-a2, somatórios, reload, dados de outra organização ausentes e rota não autorizada bloqueada, reserva real sem id, portal, Pix sintético, PDF, revisão e check-in sem inventar recebimento.
- Unidade/Rules/integration após integração E2E: f1-e2e-regression-unit.log 43 PASS; lint/typecheck/build PASS, f1-e2e-final-*.log.
- Oito screenshots finais e quatro anteriores ao ajuste, em versions/v1-recovery-2026-10-16/screenshots, com SHA256/dimensões no manifesto. Dataset inteiramente sintético e fontes externas bloqueadas.

F1 ainda IN_PROGRESS: ciclo de revogação, recusa/reenvio e Pix incompleto. F2 não iniciada; confirmação de preservação real registrada separadamente. Testes locais não homologam a base real do Ítalo.

## F1-preservação — aplicativo compilado e ciclo do portal

- Guard antes do SDK recusa projeto real no loopback/DEV; emulador exige o projeto demo exato e loopback. Oito testes puros adicionais. npm run dev escolhe e2e; Playwright usa build:e2e/preview:e2e, sem servir dist real.
- f1-environment-unit.log: 51 PASS. f1-compiled-e2e.log: 12 PASS sobre build compilado.
- Revogação local aditiva: visitante perde get/upload; admin mantém registro e valores, estranho não pode reativar. Rules locais apenas. Portal limpa dados após revogação e ignora respostas atrasadas; link legado continua válido por padrão.
- f1-portal-unit.log: 52 PASS. f1-portal-e2e.log registra primeiras falhas: heading esperado não correspondia ao cumprimento existente e navegação antes da confirmação do write gerou corrida na recusa. Esperas agora confirmam aviso após commit, não só snapshot otimista. f1-portal-e2e-final.log:16 PASS/4 FAIL por texto esperado no teste de Pix; corrigido para a mensagem real sem alterar produto.
- f1-portal-e2e-green.log: **20 PASS**, 54,9s, sem retry/skip. Todos os casos em 320/375/768/1440: financeiro Tudo/caravana e reload, rota B negada, reserva→PDF→recusa→reenvio→aprovação→check-in→cancelamento, visitante em contexto separado→revogação imediata→reload negado→reativação, Pix ausente/não Pix/chave e recebedor vazios/prazo/cópia sintética. Zero erros JS e zero tentativas Firebase remoto.
- f1-preservation-lint.log/typecheck.log PASS; f1-portal-build.log PASS, compilação final sintética também executa tsc. Oito screenshots recolhidos com novo manifesto SHA256 e JSON E2E. Produção continua antiga; não houve deploy, Rules implantadas ou dados reais alterados.
- client-preservation-verified.json atualizado:54 arquivos originais,0 divergências,ZIP e bundle intactos. Backup de código não é backup de banco.

F2 pode prosseguir localmente com simulações aditivas; autorização real permanece BLOCKED. Não alegar gate Storage/backup real ou prontidão comercial com estes resultados.

## F2-migração — dry-run antes de alterações de autorização

Planner TypeScript puro + fixture fixa SYNTHETIC_ONLY. f2-migration-dry-run.log: offline, sem SDK, duas propostas create de membership. f2-migration-rehearsal.log: emulador demo local vazio, duas criações transacionais, oito documentos originais preservados, replay zero creates, restore PASS e hash igual ao backup sintético. Manifestos f2-membership-before/plan/after.synthetic.json e relatórios dry-run/rehearsal.json. Nenhum export/restore real foi realizado.

f2-migration-final-tests.log: nove arquivos,64 testes PASS. Inclui ausência de mutação no planner, replay, conflito com revogado/staff/UID estrangeiro, admin órfão/papel não mapeado/path duplicado, precondição alterada e CLI rejeitando endpoint remoto/porta errada/flag de produção antes de inicializar SDK ou mudar evidências. f2-migration-lint.log e f2-migration-build.log PASS. RBAC de runtime, troca de tenant e Platform Owner continuam pendentes.

## F2-core e contas fixas — verificação proporcional

- Antes do módulo demo: f2-context-unit.log 75 PASS (inclui Rules A×B e resolver vivo), f2-context-e2e.log 28 PASS em320/375/768/1440. Troca A→B remove filtros/rascunhos e dados anteriores, revogação impede fallback legado, staff consulta sem botões de registrar dinheiro. Não é gate F2 completo; writes pendentes/Storage/Platform Owner permanecem.
- Após adicionar contas fixas, executar somente regressões afetadas: f2-demo-security.log 47 PASS (Rules legadas e memberships, serviço real de import/ledger com owner sem admins, resolver e guard de identidades). Sem nova execução integral desnecessária.
- f2-demo-auth-final.log 4 PASS: signInWithEmailAndPassword verdadeiro no Auth Emulator; seed repetido sem duplicar contas nem sobrescrever edição, perfis próprios, membership owner sem admin legado, A×B financeiro, passageiro sem admin/global/lista privada e sem autoelevação. Preparação privilegiada é restrita ao seed de fixtures; aplicação e SDK autenticado usam Rules normalmente.
- f2-demo-e2e.log 4 PASS, desktop1440/mobile320: admin fixo e passageiro fixo, login real, financeiro próprio, perfil e abertura de inscrição; passageiro negado no admin. Browser exige zero erros JS e zero tentativas Firebase remoto. Sem regenerar screenshots aprovados.
- f2-demo-final-lint.log/typecheck.log e f2-demo-build.log PASS. f2-demo-startup.json: npm run demo criou19 documentos sintéticos, HTTP200, parada normal q+Enter com CLIexit0 e zero listeners residuais.
- Primeiro Ctrl+C Windows/JDK25 deixou o Java do emulador próprio ativo; identificado por PID/linha de comando/worktree/projeto e encerrado. O encerramento normal por q+Enter passa pelo cleanup existente e foi validado. Não alterada política do sistema, não encerrado processo de terceiro.
- Código bloqueia contas demo em login/cadastro/sessão/reserva fora do alvo local. Rules candidatas conferem audience demo para autoridade dessas identidades. Não foi alterada política do Auth real e não se promete bloquear cadastro arbitrário feito fora do aplicativo diretamente no provedor.

Próximo ciclo: testes Storage A×B e controle de writes pendentes. Reexecutar segurança afetada após alterações; suite completa no gate F2. Não reiniciar F0 nem repetir inventário/hash/screenshot sem mudança que invalide a evidência.

## F2-Storage e mutações pendentes

f2-storage-first.log:5 PASS; após incluir guarda de identidades demo e caso staff, f2-storage-final.log:6 PASS/exit0. Auth SDK verdadeiro + Storage SDK getBytes/getMetadata contra emuladores locais. Own A/B funcionam no caminho original; cross-tenant, guest/passenger, list, vínculo de inscrição adulterado, write/delete e revogação são negados. URLs sem token e token inventado403. Não testa token válido de produção: ver STORAGE_PRIVACY.md. Nenhum Storage habilitado em firebase.json real. Runtime Java emite NPE no shutdown após suite; registrado como limitação do runtime, sem mudança de política do sistema.

f2-pending-operations.log FAIL de comando: chamada direta de node não herdava node_modules/.bin do npm. Não houve teste de produto nessa tentativa. Adicionados scripts npm específicos; f2-pending-operations-final.log30 PASS. Cobrem contador concorrente/erros e serviço real de reserva/import/financeiro/proof no Firestore Emulator, exigindo contador zerado após cada operação. Os wrappers preservam SDK/retries/transações e aguardam o ack.

f2-pending-e2e.log4 PASS/23,9s: desktop1440/mobile320, troca/revogação e Write POST deliberadamente retido por Playwright. Seletor permanece disabled com aviso até servidor confirmar; despesa de2 é registrada apenas em A (total12), e B mantém30. Requests externos bloqueados, zero pageerrors/Firebase remoto. Sem retry/skip ou screenshots novos. Build e2e executa tsc; f2-pending-typecheck.log e f2-storage-pending-final-lint.log PASS.

Próximo módulo: Platform Owner/onboarding/auditoria. Full regression apenas no gate F2 ou antes se o risco justificar; manter testes específicos obrigatórios em auth/Rules/financeiro.

## F2-Platform — mínimo auditado, sem privilégios privados implícitos

f2-platform-first.log48 PASS; após reforçar a precondição de membership nova/UID/org/timestamp e adicionar bypass com membership órfã adulterada, f2-platform-final-tests.log48 PASS. São serviço real + testes de Rules originais e de memberships/booking/financeiro relacionados, não uma repetição completa. Casos: onboarding/replay/conflito, criação parcial negada, audit obrigatório e imutável, status com histórico legado preservado, reserva suspensa/reativada, projeção stale incapaz de burlar Rules, tenant owner/conta não vinculada negados mesmo com claim forjada, revogação global e impossibilidade de atribuir plano/PII em metadata.

f2-platform-e2e.log4 PASS/22,5s desktop1440/mobile320: Auth Emulator real de identidade global adicional somente nesta suite, cadastro com UID de conta existente, audit e suspensão, revogação limpando painel, membership persistida consultável no login real do owner, negação ao tenant owner e financeiro indisponível ao global. Sem errors JS/Firebase remoto. Lint/typecheck PASS em f2-platform-final-*.log; compilação E2E também executa tsc e Vite.

Nenhuma conta demo fixa recebeu Platform Owner. Nenhuma conta Auth real foi criada/consultada/resetada. Onboarding por UID requer conferência prévia no processo assistido; não alegar verificação automática pelo provedor. Suporte privado com consentimento/escopo/expiração ainda TODO, e gate F2 não declarado completo. Próxima regressão completa apenas na revisão de aceite F2 após esse módulo.

## F2-suporte e aceite sintético

SUPPORT_ACCESS.md e F2_ACCEPTANCE.md descrevem os10 requisitos e limites. f2-support-tests.log9 PASS inicial; casos adicionais de sessão adulterada/audit entre tenants/expiração incluídos na suite final (10 de suporte). f2-support-e2e.log4 PASS desktop1440/mobile320 com duas sessões Auth reais emuladas: concessão → início explícito → consulta somente leitura → encerramento → reabertura → revogação ao vivo; staff negado e B sem consentimento negado.

Primeiro gate f2-acceptance-unit.log100 PASS/1 FAIL: teste estático F1 esperava limite de upload Storage removido no hardening anterior. Atualizado proof-policy.test para limite Firestore/base64 e negação de mutações Storage; não reaberta permissão. f2-acceptance-unit-final.log101 PASS/15 arquivos. f2-acceptance-auth.log4 PASS; f2-acceptance-storage.log6 PASS/exit0 com warning/NPE de shutdown Java conhecido. f2-acceptance-e2e.log56 PASS/1,8min nas quatro larguras, sem skip/retry/pageerror/Firebase remoto. Lint/typecheck PASS; E2E compilou tsc/Vite. Capturas somente no diretório temporário ignorado; manifesto visual aprovado não substituído.

Nenhuma escrita em Firebase real, migração, publicação de Rules, deploy, merge ou operação financeira real. Aceite F2 PASS somente no corpus sintético; tokens/IAM/backup/restore/cutover reais BLOCKED. Próximo trabalho seguro F3: reservas idempotentes com tentativa persistida, estados/capacidade, check-in auditado e CSV entre lotes.

## F3-reserva — primeiro módulo incremental

RESERVATION_RETRIES.md registra contrato e limites. f3-reservation-tests.log54 PASS/2 FAIL iniciais: corrida de mesma operação reproduzida e expectativa anterior de ausência pública atualizada para ID opaco. Após recovery com getDocFromServer, f3-reservation-tests-second.log55 PASS/1 FAIL no teste de contagem sem filtro tenant; corrigida a query da fixture. f3-reservation-tests-final.log56 PASS: SDK/Rules reais, concorrência, última vaga, recibo transitório substituído, replay cancelado sem reabrir, revogação, conflitos, nonce/hash imutáveis e exclusão negada; quatro testes puros de armazenamento/hash.

f3-reservation-e2e.log4 FAIL por retorno void da API de inspeção privilegiada da fixture. Captura do resultado corrigida; f3-reservation-e2e-final.log4 PASS/25s em desktop1440/mobile320, Auth/Firestore locais. Simulação mantém tentativa após commit real por interrupção da limpeza local; refresh, replay da última vaga e conflito mantêm exatamente2 inscrições/2 vagas (1 preexistente +1 nova). Validação CPF preserva formulário e permite correção. Não se afirma teste real de perda de ACK de rede. Zero pageerrors/Firebase remoto. Lint/typecheck e build e2e PASS. Sem nova regressão completa F2; próximo gate integral é F3.

Nenhuma escrita no caravana-af306, Rules implantadas, deploy, importação real, merge ou pagamento. Próximo módulo F3: invariantes de estados no servidor e check-in idempotente/reversível com auditoria; CSV cross-batch/rollback e documentos/retention continuam TODO.

## F3-operações e check-in auditado

REGISTRATION_STATES.md registra os estados, transições e limites. f3-operations-first.log54 PASS/2 FAIL por expectativas anteriores de escrita direta sem audit; novas negações obrigatórias. f3-operations-tests.log50 PASS/2 FAIL por ordem lexicográfica esperada incorreta no teste; corrigida. f3-operations-final.log52 PASS. Primeiro E2E (2 PASS/2 FAIL) encontrou limite de1000 expressões no cancelamento com admin legado: helpers RBAC reduzidos sem remover validações/fallback revogado. f3-operations-rbac-final.log52 PASS e f3-operations-e2e-final.log4 PASS/26,3s (jornada reserva/PDF/revisão/check-in/cancelamento e staff sem dinheiro).

Histórico visual e staff offline adicionados; f3-operations-audit-e2e.log6 PASS/2 FAIL revelou seleção de tenant perdida no hard reload. Preferência da aba por UID agora é validada contra memberships; não é autoridade. f3-operations-context-final.log55 PASS em6 arquivos (operações, serviços, Rules, memberships, resolver, preferência). f3-operations-audit-e2e-final.log4 PASS/22,7s desktop/mobile320: reversão, histórico imutável visível após reload, A→B sem dados antigos, B mantém seleção em reload, staff offline sem write fictício e retry online com único evento. Lint/typecheck/build e2e PASS; zero pageerrors/Firebase remoto. Índice novo só no arquivo local, não implantado.

F3 completo continua IN_PROGRESS: incremento de import ainda requer manifesto/validação, CSV cross-batch/rollback e documentos/retenção. Nenhuma escrita real/migração/Rules implantadas/deploy/merge/financeiro bancário. Contagens e histórico financeiro sintético preservados.

## F3-CSV incremental — dedupe, manifestos e rollback

CSV_IMPORT_ROLLBACK.md registra schema, limitações legadas e todas as rodadas. f3-csv-accepted-tests.log69 PASS em6 arquivos após simplificar claims para conjunto booleano e derivar identidades nas Rules. Inclui serviço verdadeiro, admin legado/membership, histórico Pix sem valor/contato, replay/dedupe entre lotes, concorrência por identidade/capacidade, SDK forjado, rollback com cadastro alterado bloqueado, retry com IDs duráveis e contador imutável fora das operações. Rodadas de estresse intermediárias encontraram limite1000 com seis identidades; corrigido sem retirar validações. Suites filtradas mostram8 casos não selecionados por filtro, incluídos nos69 finais.

f3-csv-accepted-e2e.log4 PASS/26,3s em desktop1440/mobile320: import/relatório, histórico após reload, rollback sem apagar, mesmo documento cancelado não toma nova vaga em A e é independente em B, staff sem controles, zero pageerrors/Firebase remoto. Typecheck/lint/build E2E PASS. Apresentação de erros técnicos passou a orientar a conferência de lista/permissão/rede; dados do relatório continuam por linha.

Teste400+replay preparado em import-scale.integration.test.ts para execução única no gate F3; não foi contabilizado como PASS. Documentos/retenção e aceite operacional completo F3 permanecem TODO. Nenhuma alteração em Firebase real, Rules/índices implantados, deploy, merge, migração ou transação bancária.

F3-documentos/gate: PASS no corpus local/sintético, homologação remota BLOCKED. DOCUMENTS_RETENTION.md e F3_ACCEPTANCE.md registram PDF privado/consentimento, revisão manual, retenção individual auditada, idade na data da viagem e snapshot válido do embarque.142 testes unit/Rules/integration (incluindo escala400+replay),4 Auth,6 Storage e88 E2E nas quatro larguras PASS;lint/typecheck/build E2E PASS. Primeira rodada E2E87 PASS/1 FAIL encontrou overflow768 corrigido com toolbar flexível; final88 PASS. Nenhuma escrita real, migração, deploy, Rules/índices implantados, merge ou operação financeira real. F2 continua somente local. Próxima tarefa executável F4: preservar Financeiro Geral e tornar lançamentos/correções idempotentes e auditados; depois F5–F8.

F4 PASS no corpus local/sintético; remoto/produção BLOCKED. Financeiro Geral original preservado com Tudo/caravana, ledger vinculado a eventos imutáveis, replay/ID persistido, anulações/correções de despesa sem sobrescrever original, ajuste de tarifa prevista com motivo, diagnóstico somente leitura e exportação sem PII. FINANCIAL_LEDGER.md/F4_ACCEPTANCE.md registram schema/limites. Gate157 unit/Rules/integration e100 E2E nas quatro larguras PASS; após correção delimitada de precisão monetária,12 casos financeiros puros+3 iniciais F5 e14 E2E financeiros PASS;lint/typecheck/build PASS. Não foram repetidos Auth/Storage inalterados. Próxima tarefa F5 branding/mapping/rotas; validador puro inicial tem3 testes PASS e ainda não é recurso integrado. F6–F8 TODO. Nenhuma escrita em Firebase real, deploy, Rules/índices implantados, migração, merge ou operação financeira real. F2 continua apenas aceite local.

F5-core IN_PROGRESS: configuração pública mínima/identidade/contatos, upload PNG/JPG e fallback, favicon/título quando possível, mapping imutável de slug, catálogo/viagem/reserva/portal por /o/:tenantSlug, escopo visual no painel e edição pelo owner. Legado sem alias exige busca inequívoca; alias histórico conserva IDs e é somente leitura do cliente. Planner puro de aliases simula criação/replay/conflitos sem write.50 testes direcionados e6 E2E desktop/mobile320 PASS;lint/typecheck/build E2E PASS. Rodada inicial registrou seletor errado e término abrupto do Java; segunda4 PASS/2 FAIL eram expectativa de texto; correções documentadas em TENANT_ROUTES_AND_DOMAINS.md. Gate integral F5 ainda pendente. Nenhuma configuração/dado real, DNS/domínio/TLS, deploy, Rules/índices implantados, migração ou merge. Próxima tarefa: gate completo F5 em quatro larguras, captura/inspeção visual dos artefatos reais e matriz de aceite; depois F6 planos/limites/onboarding.

F5 PASS no corpus local/sintético; subdomínios/domínios e aliases reais BLOCKED/deferred conforme contrato. F5_ACCEPTANCE.md registra169 unit/Rules/integration +112 E2E PASS, últimas correções6 puros F5/12 E2E e4 E2E de data/contraste/benefícios, lint/typecheck/build PASS.8 screenshots reais em versions/v1-recovery-2026-10-16/screens/f5 com dimensões/hashes em SCREENS_F5.md; inspeção direta tablet/desktop/mobile320. F6 iniciado como preparação: catálogo canônico e planner aditivo5 casos puros PASS, sem inventar Premium nem dinheiro; commercial-data.ts tipado mas não ligado ao app, sem teste SDK/Rules ainda. Próxima tarefa exata: F6 atribuição manual auditada + resumo público de limites sem preços/UIDs, depois contadores transacionais de caravanas/equipe e limites de passageiros/reservas/imports. Atualizar fixtures sintéticas explicitamente; nenhum baseline real pode ser criado/resetado pelo cliente. F6_IMPLEMENTATION_PLAN.md registra sequência e restrições. Contato da futura landing solicitado por pergunta assíncrona, ainda pendente; não reutilizar contato AnimeSFest. F7/F8 seguem TODO. Nenhuma escrita em Firebase real, operação financeira real, migração, deploy, Rules/índices implantados ou merge.
