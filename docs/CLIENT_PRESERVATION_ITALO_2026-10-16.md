# Preservação do cliente real — Ítalo / Anime Fest

Atualização2026-10-20: deploy compatível está autorizado condicionalmente aos14 gates, sem nova confirmação rotineira. As proibições históricas abaixo de deploy por falta de autorização foram substituídas; migração real do Ítalo, destruição e operações financeiras reais continuam proibidas. Nesta retomada houve somente GET de metadados Cloudflare e assets públicos; nenhum documento, identidade Auth, Rule, índice ou objeto real modificado. Integridade/completude de backup e restauração real ainda não comprovadas; a preservação do cliente não pode ser homologada com os testes sintéticos. Ver F7_PREPARATION.md/F8_ACCEPTANCE.md.

Reforço explícito do proprietário recebido em 2026-10-16. Esta confirmação é pré-requisito da FASE 2.

| Ponto | Confirmação e evidência | Estado |
|---|---|---|
| 1. Firebase real sem mutações | Nenhum comando desta execução escreveu documentos, Auth, Rules implantadas, Storage ou migrations no projeto caravana-af306. Auditoria Firebase usou apenas GET de releases/rulesets via credenciais existentes. Não foram consultados documentos de passageiros ou valores bancários. | PASS para comandos executados |
| 2. Testes isolados | Baseline npm test usou Firestore Emulator com projeto caravana-rules-test. O runner atual usa demo-caravana77-test em loopback 18080/19099; integrações exigem FIRESTORE_EMULATOR_HOST local. Seeder E2E recusa hosts diferentes dos locais e só reseta/cria fixtures no projeto demo. Browser bloqueia requisições externas e exige zero tentativas de Firebase remoto. Scripts de auditoria pública/Rules fazem leitura remota; não são testes ou scripts de migração. | PASS, logs unit/Rules/E2E |
| 3. Fonte/Financeiro/versão publicada | source-and-dist.zip + repository.bundle + manifestos SHA256; captura HTTP Production/Previews e ambos os ZIPs preservados; 54 arquivos restaurados sem divergência; build dos seis assets exatamente igual à produção no checkpoint 69abd6f. Financeiro avançado está em TypeScript editável versionado. | PASS, manifestos verificáveis |
| 4. Migrações futuras | Sempre começar com fixtures sintéticas, dry-run sem writes, operações aditivas/idempotentes, manifesto before/after e ensaio de rollback/restore em emulador. Scripts de desenvolvimento devem recusar alvo real e credenciais remotas para execução mutável. Nenhuma simulação autoriza aplicação real. | Regra obrigatória; execução real BLOCKED |
| 5. Organização e histórico reais | OrganizationId, Auth/IDs, inscrições, passageiros, pagamentos, comprovantes, caravanas e históricos do cliente não serão apagados, resetados, substituídos, renomeados ou migrados nesta execução. Compatibilidade deve ser provada em cópia sintética antes de propor qualquer corte. Operação real depende de backup/restore aprovado e autorização específica. | Preservados nesta execução; barreira de produção ativa |

## Evidências e limites

- Backup externo: C:/xampp/77/Caravana-audit-20261016/local-preserved/.
- source-and-dist.zip SHA256: 6c93d9af95b0f31e26847656605a96da5e0b98cf66fcc25cfeffb48f50159e82.
- repository.bundle SHA256: 2471fbe4de6f3b68c2437ec33ae29973e149108b8a9610b5e7e8b1d2420b9364.
- Git da recuperação: 69abd6f; fix de ID: c304938; policy/import: 4ab9458.
- docs/evidence/2026-10-16/f0-build-parity.json, f0-restored-files.json, live-rules-manifest.json e logs f1-*.
- Production preservada na auditoria: 4d069e0a, JS SHA256 90677dd6e290cb4ba3ef54d6abfcdfc72aaf3b56ae85a0472012b195fee19f16. Trigger ad_hoc e commit_dirty=true; GitHub não reproduzia os recursos avançados.
- Há também uma árvore Git automática a14b11a7ee50f83f596c4aba5c1e4cfff331390f preservada no bundle; comparação src/tests com recuperação não apresentou diferenças.

Backups de código/assets não são backup do banco real. Nenhum export de passageiros/PII foi feito. Backup/restore real, schema documental real, migrações, aplicação de Rules, deploy, merge, reset, exclusão e substituição reais continuam BLOCKED sem autorização específica. Toda validação local deve ser apresentada como sintética, nunca como homologação dos dados financeiros reais do cliente.

Antes de iniciar F2: conferir este documento, CURRENT.md, SOURCE_RECONCILIATION.md, status Git e logs. Continuar tarefas locais independentes mesmo quando uma etapa real estiver BLOCKED.

## Barreiras adicionais após a confirmação

- `npm run dev` seleciona `.env.e2e`, projeto exato `demo-caravana77-test` e loopback por padrão. A configuração real ignorada foi mantida apenas para reproduzir o build preservado.
- `assertFirebaseEnvironment` executa antes de `initializeApp`: recusa Firebase real em localhost/loopback ou qualquer modo DEV; recusa build de emulador em hostname remoto ou com outro projectId.
- E2E passou a compilar um `dist-e2e` separado, com configuração sintética. Não utiliza `dist` preservado nem produção. Browser bloqueia todos os hosts externos e verifica ausência de chamadas Firebase remoto.
- A validação anterior à nova revogação somou 51 testes locais e 12 E2E compilados PASS (`f1-environment-unit.log`, `f1-compiled-e2e.log`). Testes adicionais têm evidências próprias; nenhuma execução muda Rules implantadas.
- Scripts de migração futuros devem usar o mesmo projeto demo exato e portas locais; não oferecer uma flag de bypass para produção. Operações reais permanecem BLOCKED.
