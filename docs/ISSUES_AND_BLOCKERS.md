# Issues e dependências

| ID | Estado | Evidência | Ação |
|---|---|---|---|
| ID-01 | PASS local; produção antiga permanece | Quatro falhas reproduzidas antes do fix; 34 testes verdes após correção e leituras canônicas | Publicação condicionada à autorização futura |
| LIVE-RULES | PASS | Rules implantadas capturadas em modo leitura; hash idêntico à fonte avançada | Comparar futuras alterações somente no emulador |
| PROD-AUTHORIZATION | BLOCKED | Usuário proibiu publicação, merge, migrations reais e operações financeiras | Preparar artefatos locais; executar só após nova autorização específica |
| MODEL-SETTINGS | BLOCKED | Não há ferramenta da sessão para alterar/confirmar modelo, esforço ou aceleração | Configuração no seletor do app; não alegar confirmação |
| PUSH-AUTHORIZATION | BLOCKED | GOAL condiciona push a permissão | Commits locais autorizados; nenhum push nesta execução |

BLOCKED de uma atividade não bloqueia trabalho independente e seguro. Gate F0 PASS para recuperação objetiva; F1 e seguintes ainda exigem seus próprios testes/gates.
