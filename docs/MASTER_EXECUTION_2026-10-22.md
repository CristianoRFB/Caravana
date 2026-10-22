# Execução do mandato de 22/10/2026

Estado: WIP. Mandato externo `CARAVANA_77_GOAL_MASTER_ENCERRAMENTO_TOTAL_2026-10-22.txt`, lido nesta execução. A instrução atual do proprietário autoriza staging sintético, publicações e preparação/inventário de produção; cutover somente após todos os requisitos reais. Essa autorização substitui limites históricos de somente leitura, sem substituir seus gates técnicos ou de privacidade. R$0, sem main/reset/force, sem backup bruto no computador compartilhado.

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
