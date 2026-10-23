# Execução do mandato de 22/10/2026

## Alertas Pages ativos —23/10/2026

Política de deploy limitada a `caravana77-staging` configurada e enabled, com destinatário definido explicitamente pelo proprietário. Falha/sucesso em preview/canônico do projeto de staging; POST de teste200 e recebimento do e-mail padrão confirmados. Não representa uptime periódico nem erros backend. [Provas, escopo e limites](F7_ALERTS_2026-10-23.md).

App Check de `bdall-e3585`: onboarding do console aberto, app não registrado, Firestore/Auth “Não aplicado”; nenhuma chave/provedor/enforcement salvo. Registro exige provedor/cotas/termos; não aceitar termos nem ativar cobrança ou bloquear tráfego por suposição. Nenhuma produção/backup real tocada. F7 9/10,F8 6/14,GOAL7/17 mantidos.

## Continuação independente da chave —23/10

[Relatório F7 atualizado](F7_SECURITY_CONTINUATION_2026-10-23.md): advisory braces retirado, audit tooling3moderadas/0altas sem patch de dependências; cadeia OpenTelemetry/PubSub permanece aberta. Health recebeu limites de streaming,4 testes próprios e GET real12assets PASS; CI passou a incluir os testes de transporte. Não equivale a alerta ativo ou controle de abuso backend. Guia74c1773 preservado; proprietário segue no computador compartilhado, chave/backup reais continuam pendentes, sem improvisar identidade. F7 9/10,F8 6/14,GOAL7/17 mantidos.

### Reconciliação Desktop posterior —23/10/2026

O diagnóstico Cloud foi preservado, sem assumir a causa de diferenças entre ambientes. Novo `npm run build:staging` neste checkout Windows, HEAD de build `d14311328e36eff9d37791c164f5edc39196d916`, gerou os15/15 arquivos com caminhos, tamanhos e SHA256 idênticos ao manifesto publicado `bc5dd40`. `git diff bc5dd40 HEAD -- src public index.html vite.config.ts package.json package-lock.json firestore.rules firestore.indexes.json` vazio. Portanto o frontend efetivamente homologado no Desktop tem procedência local conferida; nenhuma republicação ou repetição de17SDK foi necessária. A razão específica da divergência do build Cloud permanece NOT_DETERMINED, sem apagar a evidência. MIME atual já PASS na própria evidência Cloud. Isso encerra a pendência de paridade do artefato publicado para esta candidata no checkout Windows, sem declarar builds de hosts diferentes reproduzíveis.

Provas: [desktop/artifact-parity.json](evidence/2026-10-23/desktop/artifact-parity.json) e [parity-build.log](evidence/2026-10-23/desktop/parity-build.log). F8 gate4 PASS no escopo da candidata publicada,6/14; GOAL gate4 PASS staging coordenado,7/17. Inventário consistente posterior de22/10 e Auth/GCS estão em [produção observada](evidence/2026-10-22/master/production-inventory-observed.json); o resumo estrutural anterior sem snapshot permanece histórico. Gate5 de inventário completo para migração continua BLOCKED, assim como backup/restore reais e demais requisitos.

## Estado vigente — checkpoint de23/10/2026

Este bloco substitui os pareceres históricos abaixo. Staging `bdall-e3585` / `caravana77-staging` homologado na fonte `bc5dd40`, deployment `6e1a652a-dc4e-412e-9177-909ab35f598f`:17 jornadas SDK,1 readonly,12 verificações de layout, Auth/Rules/11 índices e rollback real de frontend/Rules PASS. CI técnico `ee3f5b5` / [39845244031](https://github.com/CristianoRFB/Caravana/actions/runs/39845244031) integral PASS:299 backend/Rules,8Auth,6Storage,47Python e184E2E.

F0–F6 mantêm aceites locais/sintéticos; F7 preparação9/10; F8 passa a6/14 com o gate4; GOAL passa a7/17 com o gate4; técnico17/20 no método histórico. Inventário real limitado:24 documentos em snapshot consistente,2 usuários Auth e0 buckets GCS; sem escrita de produção e sem exportação bruta. Isso não fecha inventário completo de migração/backup/restore. Dois registros financeiros sem total armazenado verificável exigem reconciliação; oito conferem, nenhuma divergência detectada nesses oito.

Drive privado conferido e vazio; chave privada ainda não estabelecida fora do computador compartilhado. Backup real e restauração real BLOCKED; migração/compatibilidade/rollback coordenado e F7 operacional permanecem pendentes. **DEMO_READY; COMMERCIAL_READY_NEW_TENANTS: NO-GO operacional; READY_FOR_ITALO_MIGRATION: NOT_READY; ITALO_NOT_MIGRATED.** Produção não recebeu deploy nem alteração de dados/configuração. R$0, sem Blaze.

Relatório completo, commits, riscos e proposta única de backup: [ENCERRAMENTO_PARCIAL_2026-10-22.md](ENCERRAMENTO_PARCIAL_2026-10-22.md). Catálogo das32 rotas e galeria parcial: [README_TELAS.md](../README_TELAS.md). O proprietário já autorizou o GOAL e a pasta Drive; não falta autorização genérica. Próxima condição humana do backup: identidade privada criada e guardada no dispositivo pessoal, disponibilizando somente o destinatário público `age1…`.

### Histórico preservado — não representa o estado vigente

Estado: WIP. Mandato externo `CARAVANA_77_GOAL_MASTER_ENCERRAMENTO_TOTAL_2026-10-22.txt`, lido nesta execução. A instrução atual do proprietário autoriza staging sintético, publicações e preparação/inventário de produção; cutover somente após todos os requisitos reais. Essa autorização substitui limites históricos de somente leitura, sem substituir seus gates técnicos ou de privacidade. R$0, sem main/reset/force, sem backup bruto no computador compartilhado.

## Checkpoint operacional atualizado

Commit7b99a47 enviado. Rules publicadas exclusivamente no staging, retorno real à release anterior3ef0e36d… PASS e avanço à releasea1f3db69… confirmado. Auditoria estrita final2026-10-22T19:21:09Z PASS: hash bruto8acafe75…/126808bytes/1434LF,11índicesREADY e todas as políticas Auth. O503 Auth ocorreu na auditoria **depois** do segundo avanço; nova leitura confirmou a publicação, sem repetir a mutação. Ferramenta agora registra tentativas de escrita e exige conferência readonly após resultado incerto. Fonte das Rules, release anterior e checkpoint de retorno preservados no Cloud Shell privado; sem alteração efetiva de política ou documento de negócio nessa reconciliação.

17/17 jornadas SDK reais PASS sobre bdall-e3585 (Vitest5.0.1, SDK/Rules reais, sem bypass administrativo). Compensação adicional da rodada: pagamento fictício anulado com novo evento, reservas criadas canceladas e links revogados, nova organizadora suspensa; eventos/documentos históricos preservados. Baseline de A voltou a3vagas ocupadas/R$75 fictícios, B0/0;9operações financeiras anteriores intactas,13após adicionar operações e compensação. Arquivo fixture-baseline-after.json comprova totais restaurados e hashes anteriores idênticos. 1SDK readonly real também PASS.

Drive de navegador na identidade Google esperada:387,13GB disponíveis de400GB. Pasta vazia exclusiva criada pelo proprietário da sessão e painel confirmou “Só você tem acesso a este arquivo”. ID/URL e captura ficam fora do relatório público; nenhum arquivo real enviado. Conector Drive de outra identidade não utilizado para gravação. Ainda falta custódia segura da chave e ensaio de recuperação antes do backup real.

Audit atual runtime0/tooling8; patches compatíveis Vitest5.0.1→5.0.3 e ip-address10.7.2→10.7.4 reduziram tooling8→5 (3high/2moderate conhecidos), runtime inalterado. Fontes: advisories oficiais [Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8) e [ip-address](https://github.com/beaugunderson/ip-address/security/advisories/GHSA-rxp7-6hxx-x8q5). Sem downgrade major/force. Gate tooling permanece BLOCKED, com superfície CLI/emuladores privada e loopback.

Regressão local após patches:296PASS/2FAIL em298casos. Falhas estavam no teste que herdava VITE_* do .env.local da máquina; guard de produção corretamente recusava valores sintéticos conflitantes. Isolado ambiente apenas no teste e acrescentada negativa de conflito:9/9PASS direcionados. Não alegar rodada integral verde antes do CI novo. Guards Python37/37PASS, lint e tipos dos harnesses PASS. Novo preflight de produção só lê metadados com identidade exata, sem documentos/usuários/objetos e sem quota override;4negativas offline próprias PASS. Inventário real ainda não executado.

## Recuperação

Checkout original `C:/xampp/77/Caravana` na main10f30a0 com alterações locais extensas, preservado sem checkout/stash/reset. Reutilizado checkout limpo `C:/Users/Aluno/.codex/worktrees/caravana77-commercial-v1-20261016/Caravana`, branch autorizada, inicial ab4aff1; fetch e fast-forward até2ceea1b. Remoto exato CristianoRFB/Caravana.

## Configuração real observada

Cloud Shell gerenciado da conta esperada, projeto explícito bdall-e3585: auditoria fixa39c2b95/SHA6f7e8b48… executada2026-10-22T19:09:42Z. Identidade/projeto PASS, billing=false, Standard/freeTier. Auth administrativo: Email/Password ativo, anonymous=false, enumeração protegida, ENFORCE/min12, domínio staging autorizado. Índices11/11READY/hash63d6eb0d… exato. Nenhum documento de negócio lido por essa auditoria.

Rules: bruto41388c5f…/128242bytes/1434CRLF; normalizado8acafe75…/126808bytes/1434LF. Fonte Git canônica é LF e seu hash exato é8acafe75…. Guard permanece estrito: auditoria ainda BLOCKED, sem promover normalização a igualdade binária. `.gitattributes` fixa os bytes dos artefatos no Windows. Testes Python passaram a ler explicitamente UTF-8: o encoding padrão Windows também alterava o hash da fixture em memória.

Pages GET: staging caravana77-staging/canonical175b982d-91c1-4c73-8b8c-a46af5db1ade/runtime8c1340d; produção caravana-77/canonical4d069e0a-344a-415a-ae41-aa314df10ace. Preview0141fb45 não é o canonical de produção. Nenhuma publicação nesta etapa.

## Reconciliação restrita das Rules

Ferramenta `scripts/reconcile-staging-rules.py`: padrão GET; --apply aceita exclusivamente bytes41388c5f… e transforma somente CRLF→LF para o hash canônico fixo, após validar identidade/custo/Auth/11índices. Salva source pública/release anterior em checkpoint privado antes do POST; verifica ruleset criado e ponteiro atual antes do PATCH. Não aceita configuração de projeto/URL e não escreve dados/Auth/índices/IAM. --rollback confere alvo, hashes e ponteiro da rodada antes de restaurar a release imutável anterior. Não apaga rulesets. Após publicação, a auditoria estrita deve PASS. Se tráfego administrativo concorrente mudar a release, interromper; API não oferece compare-and-swap atômico entre GET/PATCH.

Compatibilidade: código das Rules idêntico após remover CRLF; frontend/contratos/dados/índices/Auth não mudam. Ensaio de retorno utiliza as duas versões semanticamente idênticas, sem aplicar deny-all. Segurança local56/56PASS, guards Python33/33PASS (26anteriores+7reconciliação). Build staging15arquivosPASS. Falhas iniciais do harness Windows estão preservadas; não eram falhas remotas nem autorização para relaxar hashes.

## Backup real e limites

Proprietário prefere Drive privado, criptografia antes do upload, nenhuma senha/chave no chat ou cópia bruta persistente no laboratório. Conector Drive disponível pertence a outra identidade que a identidade Google esperada para a operação; não é aceito automaticamente como custódia do proprietário. Nenhum dado real exportado. Confirmar conta/destino/capacidade/ACL e custódia da chave de recuperação em fluxo seguro antes de qualquer exportação. Ensaio criptográfico sintético não equivale a restore real de Auth/Firestore/objetos.

## Parecer provisório

F0–F6 aceites históricos locais preservados; F7preparação9/10, F8publicação5/14, GOAL6/17, técnico17/20 permanecem referências de escopo histórico, ainda sem gate integral promovido nesta execução. DEMO_READY local; COMMERCIAL_READY_NEW_TENANTS ainda NO-GO operacional; READY_FOR_ITALO_MIGRATION ainda NOT_READY; ITALO_NOT_MIGRATED. Trabalho segue; não é relatório de encerramento.

## Continuação Cloud23/10

CIee3f5b5 confirmado PASS e0460cb2 selftest crypto8/8 executado. Staging público declara agora bc5dd40; não8c1340d. Handoff posterior CLOUD_CONTINUITY_2026-10-23.md com fontes, escopos e provas; resultados históricos preservados.
