# Prontidão comercial e continuidade objetiva

## Convergência vigente — staging público e candidata preparada

Fonte recuperada cb321f5; checkpoint remoto253067b. Auth público real200 no projeto correto, domínio staging autorizado, senha ENFORCE/min12. Build staging253067b e oito verificações UI offline PASS;10 testes direcionados/lint PASS. Nenhum deploy, escrita Firebase ou acesso de produção. SERVICE_DISABLED administrativo continua sem causa comprovada: falta identidade gerenciada e ErrorInfo do consumidor. Staging publicado permanece8c1340d. Matrizes mantidas: F7 preparação9/10, F8 publicação5/14, GOAL6/17; técnico85% não significa produção pronta.

Continuidade e evidências: [STAGING_CONVERGENCE_2026-10-21.md](STAGING_CONVERGENCE_2026-10-21.md). Pareceres distintos: [COMMERCIAL_GO_NO_GO_2026-10-21.md](COMMERCIAL_GO_NO_GO_2026-10-21.md). Novos clientes não dependem automaticamente da migração do Ítalo; ainda faltam homologação/controles operacionais próprios. Não repetir CI integral do aplicativo inalterado nem declarar configuração administrativa validada por Auth público200.

Checkpoint de código a7b5785, branch codex/caravana77-commercial-v1-20261016. Base recuperada d7cd9c6, posterior ao checkpoint citado ab4aff1. Produção caravana-af306/caravana-77 protegida; nenhum deploy, migração, operação financeira real, IAM ou serviço pago alterado. Staging autorizado: bdall-e3585/caravana77-staging.

## Mudanças efetivas e evidências

Execução anterior: downloads novos Firestore/Storage, recuperação conjunta Auth/Firestore/Storage, proteção de exportações temporárias e CI e4939db/39537954805 PASS (287 backend/Rules,8Auth,6Storage,20 guards Python,184 E2E, recuperação conjunta, lint/typechecks/build). Smoke48 E2E nas quatro larguras está incluído na cobertura184, não é48 casos novos. Produto/Rules/índices permaneceram iguais.

Esta execução: apenas uuid transitivo de desenvolvimento9.0.1→11.1.1 sob gaxios6.7.1; audit7→5 entradas (3 altas/2 moderadas), runtime0. Três testes comprovam CJS/v4, multipart completo e transporte Google Auth sem rede;23 guards Python comprovam diagnóstico sanitizado de serviço/consumidor/permissão. npm ci,lint,typechecks,build,8Auth,6Storage e recuperação conjunta locais PASS após a alteração. CI novo39540369156 concluído PASS para a7b5785:290 backend/Rules,8Auth,6Storage,23 guards Python,recuperação conjunta,184 E2E e lint/typechecks/build. Evidência final-ci.json; a aprovação anterior não foi atribuída ao override novo. Fonte/aplicação e Rules não mudaram. Evidências: F7_CLOSURE_2026-10-21.md e evidence/2026-10-21/f7-closure/.

## Estimativas e gates

**Implementação técnica estimada:85%.** Contagem de17/20 grupos técnicos existentes, com peso igual; não é medida de esforço restante, risco ou aceite remoto. A contagem inclui implementação testada localmente e ferramentas preparadas. Agrupamento usado para tornar explícita a estimativa solicitada:

| # | Grupo técnico existente | Estado / evidência |
|---|---|---|
| 1 | Namespace e isolamento multi-tenant | LOCAL_TESTED; F2/Rules |
| 2 | Auth/RBAC/memberships | LOCAL_TESTED; Auth/Rules |
| 3 | Equipe/convites/último owner | LOCAL_TESTED; TEAM_INVITATIONS.md |
| 4 | Reservas/quotas/concorrência/idempotência | LOCAL_TESTED; F3/F6 |
| 5 | Inscrições/check-in/operação | LOCAL_TESTED; F3 |
| 6 | Documentos/consentimento/comprovantes privados | LOCAL_TESTED; F3/STORAGE_PRIVACY.md |
| 7 | CSV/deduplicação/retorno | LOCAL_TESTED; CSV_IMPORT_ROLLBACK.md |
| 8 | Financeiro Geral/ledger/correções/auditoria | LOCAL_TESTED; F4/FINANCIAL_LEDGER.md |
| 9 | White-label/identidade/rotas | LOCAL_TESTED; F5 |
| 10 | Onboarding/planos/atribuição manual/entitlements | LOCAL_TESTED; F6 |
| 11 | Relatórios operacionais Pro | LOCAL_TESTED; COMMERCIAL_FEATURE_MATRIX.md |
| 12 | Roteiros compartilhados/modelos Premium | LOCAL_TESTED; COMMERCIAL_FEATURE_MATRIX.md |
| 13 | Landing/demo/comunicação comercial | LOCAL_TESTED; F6, contato neutro configurável |
| 14 | UX mobile/estados de erro/histórico em downgrade | LOCAL_TESTED; quatro larguras |
| 15 | CI/testes/emuladores com isolamento | IMPLEMENTED/LOCAL_TESTED; CI novo PASS |
| 16 | Diagnósticos privados mínimos e health público fixo | IMPLEMENTED/LOCAL_TESTED; FINAL_OBSERVABILITY.md |
| 17 | Ferramentas/documentação de backup/restore/retorno sintéticos | LOCAL_TESTED; CLOUD_RECOVERY_2026-10-21.md |
| 18 | Monitoramento proativo/alertas operacionais ativos | BLOCKED; responsável/canal/configuração ainda não comprovados |
| 19 | Proteção de abuso efetiva no backend público | BLOCKED; configuração/rollout seguro real pendente |
| 20 | Encerramento dos advisories de tooling | BLOCKED;5 entradas remanescentes, sem override major incompatível |

**GOAL final:35% dos gates (6/17).** F7 preparação isolada9/10 (90% desse escopo); F8 publicação5/14 (36%). F0–F6 conservam seus aceites locais. Estes percentuais têm denominadores distintos: não calcular média nem chamar85% de prontidão de produção. Backup real, restauração real, continuidade dos administradores, Storage/IAM/tokens/links e compatibilidade financeira não são comprovados por implementação local.

**Comercialização:** candidata funcional demonstrável; lançamento SaaS geral BLOCKED pelos gates operacionais e de homologação. Contato comercial não fornecido continua neutro/configurável, sem reutilizar contato do Ítalo. Mensalidades/limites/diferenciais aprovados preservados; cobrança bancária automática/trial/domínio próprio não anunciados.

**Migração do Ítalo:** NOT_READY_FOR_MIGRATION. Não executar migração real neste GOAL, mesmo após concluir testes sintéticos. Faltam inventário legítimo e preservação/backup/restore/compatibilidade/rollback reais comprovados em ambiente apropriado.

## Acesso e operações: limites práticos

| Operação | Situação nesta execução | Requisito |
|---|---|---|
| GET de manifesto/HTML/assets públicos do staging | Possível sem Firebase; manifesto reconfirmado; última verificação integral12 assets PASS | Destino fixo caravana77-staging, sem documentos privados |
| GET de metadados/configuração Firebase staging | BLOCKED acesso do Cloud | Identidade gerenciada, alvo bdall-e3585/número146882624278 conferidos e permissões de leitura |
| SDK/jornadas com escritas fictícias no staging | BLOCKED configuração | Autorização aplicável, permissões efetivas e credenciais fictícias gerenciadas; fixture isolada e nenhum usuário/dado real |
| Ler/configurar Auth após403 | BLOCKED diagnóstico real | Identificar serviço/consumidor antes de propor alterações;403 SERVICE_DISABLED não comprova falta de IAM nem serviço desativado no alvo |
| Produção/Ítalo | Intocável neste fluxo | Não implantar Rules/Auth, testar writes, migrar ou fabricar memberships |

Runtime49 running/connected, política unrestricted/enforced, sem bindings/identidade GCP. Não há teste Firebase real novo nem autenticação transferida do Cloud Shell do operador. Não pedir códigos/tokens/senhas/JSON de chave pelo chat, copiar credenciais do laboratório ou contornar IAM. Liberação de storage.googleapis.com resolveu downloads; não provisiona bucket, autentica Firebase ou comprova restauração real.

## Checklist mínimo de ações externas

1. **Disponibilizar leitura legítima do staging por conexão gerenciada segura.** Confirmar principal indicado, identidade/projeto/numero/billing antes de qualquer operação. Para o GET Auth é necessária firebaseauth.configs.get; demais leituras usam firebase.projects.get, resourcemanager.projects.get, datastore.databases.get, datastore.indexes.list, firebaserules.releases.get/rulesets.get. Não conceder Owner/Editor por conveniência. Configurar pelo mecanismo seguro da plataforma; não colocar credenciais no repositório/chat. Executar auditoria fixa e guardar somente relatório sanitizado.
2. **Diagnosticar403 no consumidor correto.** Nova ferramenta classifica STAGING_PROJECT/OTHER_PROJECT/UNRECOGNIZED sem divulgar outro ID. API habilitada, quota project ou permissão adicional não devem ser presumidos; não habilitar serviço/IAM/Blaze automaticamente. Se usar Cloud Shell, credenciais permanecem lá e somente o relatório volta ao Codex.
3. **Viabilizar homologação real da candidata em staging.** Credenciais fictícias e permissões específicas para jornadas Auth/Rules/planos/financeiro/convites; configuração equivalente necessária sem custos novos, com limites e rollback conferidos. Validar proteção de abuso/monitoramento e resolver ou avaliar tecnicamente os advisories remanescentes. Storage real/legado continua um gate próprio; não ativar Blaze para contorná-lo.
4. **Responsável técnico comprovar inventário e recuperação reais em área privada apropriada.** Firestore, Auth, objetos/metadados/tokens/IAM/links, histórico e relações financeiras; backup com controle de acesso, integridade/completude e restauração isolada; compatibilidade/retorno coordenado. Não enviar PII, comprovantes, senhas, chaves ou backups brutos ao chat/Git/staging. Sem essa prova, gates reais permanecem BLOCKED.

## Próxima sessão e ciclos

Próximo passo exato: fetch da branch, conferir HEAD/working tree, ler este parecer e a evidência final do CI. Conferir environment_status/contas CLI sem imprimir segredos. Se houver identidade gerenciada ready, selecionar o alias real pelo manifesto seguro e executar `python3 scripts/staging-readonly-audit.py --auth-source managed-adc` com dependências pinadas em venv. Confirmar identidade e alvo; examinar diagnóstico do403 antes de qualquer proposta de configuração. Sem identidade, manter BLOCKED e não repetir emuladores/184 E2E ou implementar funcionalidades adicionais para simular progresso.

Estimativa condicional: **2–4 ciclos técnicos depois de disponíveis os acessos e as provas externas**, para homologação/configuração segura de staging, revisão do inventário/restore/compatibilidade/retorno e aceite final/reteste das correções que forem necessárias. Não é garantia de prazo: schema real desconhecido, recursos gratuitos e advisories upstream podem exigir trabalho adicional. Enquanto essas dependências faltarem, mais ciclos autônomos de código não fecham os gates.
