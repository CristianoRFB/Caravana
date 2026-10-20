# Issues e dependências

**Retomada atual — 2026-10-20:** HEAD recuperado e remoto conferido `bc2c3d13a966fe032295a4f79cb185c9e9ae2219`, branch oficial preservada, checkout inicial limpo. O usuário autorizou concluir equipe/convites no Cloud sem aguardar o WIP inacessível do LAB04-PC23; o código local não foi recuperado. Também autorizou staging e deploy condicional aos 14 gates, sem nova confirmação rotineira. As restrições históricas abaixo de “não reimplementar”/“nenhum deploy autorizado” são substituídas por essa instrução; preservação absoluta do Ítalo, ausência de migração real e gates continuam obrigatórios. Equipe implementada;32 testes direcionados PASS, E2E em validação. Ver TEAM_INVITATIONS.md. F6 ainda IN_PROGRESS até regressão integral; produção BLOCKED por staging, backup/restore e compatibilidade real não comprovados.


| ID | Estado | Evidência | Ação |
|---|---|---|---|
| ID-01 | PASS local; produção antiga permanece | Quatro falhas reproduzidas antes do fix; 34 testes verdes após correção e leituras canônicas | Publicação condicionada à autorização futura |
| LIVE-RULES | PASS | Rules implantadas capturadas em modo leitura; hash idêntico à fonte avançada | Comparar futuras alterações somente no emulador |
| PROD-GATES | BLOCKED técnico/evidencial | Deploy condicional autorizado em2026-10-20; staging, backup/restore e compatibilidade real não comprovados | Cumprir os14 gates; não pedir confirmação rotineira nem migrar dados reais |
| MODEL-SETTINGS | BLOCKED | Não há ferramenta da sessão para alterar/confirmar modelo, esforço ou aceleração | Configuração no seletor do app; não alegar confirmação |
| PUSH-AUTHORIZATION | PASS para branch de trabalho | Instrução complementar de 2026-10-16 autoriza commit e push nos checkpoints | Somente codex/caravana77-commercial-v1-20261016, sem force/merge/main; workflow só main/PR e Cloudflare sem conexão Git na auditoria |
| PROD-DEMO-AUTH-POLICY | BLOCKED para alteração do serviço real | Código bloqueia identidades demo fora do emulador; nenhuma política do Auth real foi alterada | Não prometer impedir cadastro arbitrário direto na API do provedor sem configuração autorizada |
| DEMO-WINDOWS-INTERRUPT | FAIL observado; encerramento normal PASS | Ctrl+C no terminal Windows/JDK25 deixou Java do demo ativo; processo próprio conferido e encerrado | Usar q+Enter no Vite: exit0, runner limpa Java, zero listeners; documentado em TEST_ACCOUNTS.txt |


| CLOUD-TEAM-SYNC | RESOLVED para continuidade / WIP antigo inacessível | Nova instrução autoriza implementação Cloud a partir de bc2c3d1; checkpoint9dabaa1 | Eventual WIP do laboratório deve ser preservado e reconciliado manualmente; não aguardar sincronização |
| MASTER-ORIGINAL-CLOUD | BLOCKED para conferência integral do original | GOAL original é citado em SOURCE_RECONCILIATION.md como handoff/ externo; não existe arquivo original no checkout remoto recuperado | Usar instruções atuais e contratos versionados; não inventar decisões comerciais nem declarar GOAL integral homologado |

BLOCKED de uma atividade não bloqueia trabalho independente e seguro. Gate F0 PASS para recuperação objetiva; F1 e seguintes ainda exigem seus próprios testes/gates.
