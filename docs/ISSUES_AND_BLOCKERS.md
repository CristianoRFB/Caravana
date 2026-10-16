# Issues e dependências

| ID | Estado | Evidência | Ação |
|---|---|---|---|
| ID-01 | PASS local; produção antiga permanece | Quatro falhas reproduzidas antes do fix; 34 testes verdes após correção e leituras canônicas | Publicação condicionada à autorização futura |
| LIVE-RULES | PASS | Rules implantadas capturadas em modo leitura; hash idêntico à fonte avançada | Comparar futuras alterações somente no emulador |
| PROD-AUTHORIZATION | BLOCKED | Usuário proibiu publicação, merge, migrations reais e operações financeiras | Preparar artefatos locais; executar só após nova autorização específica |
| MODEL-SETTINGS | BLOCKED | Não há ferramenta da sessão para alterar/confirmar modelo, esforço ou aceleração | Configuração no seletor do app; não alegar confirmação |
| PUSH-AUTHORIZATION | PASS para branch de trabalho | Instrução complementar de 2026-10-16 autoriza commit e push nos checkpoints | Somente codex/caravana77-commercial-v1-20261016, sem force/merge/main; workflow só main/PR e Cloudflare sem conexão Git na auditoria |
| PROD-DEMO-AUTH-POLICY | BLOCKED para alteração do serviço real | Código bloqueia identidades demo fora do emulador; nenhuma política do Auth real foi alterada | Não prometer impedir cadastro arbitrário direto na API do provedor sem configuração autorizada |
| DEMO-WINDOWS-INTERRUPT | FAIL observado; encerramento normal PASS | Ctrl+C no terminal Windows/JDK25 deixou Java do demo ativo; processo próprio conferido e encerrado | Usar q+Enter no Vite: exit0, runner limpa Java, zero listeners; documentado em TEST_ACCOUNTS.txt |

BLOCKED de uma atividade não bloqueia trabalho independente e seguro. Gate F0 PASS para recuperação objetiva; F1 e seguintes ainda exigem seus próprios testes/gates.
