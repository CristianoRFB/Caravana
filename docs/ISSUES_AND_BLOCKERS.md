# Bloqueadores atuais

## Situação vigente — 2026-10-20 após staging funcional

RESOLVED staging: acesso administrativo a bdall-e3585, Spark/billing=false, Auth fictício A×B, Rules/índices/namespace v2, frontend isolado, 11 SDK PASS e backup sintético de153 documentos restaurado no emulador. Retorno do frontend staging PASS; todas as fontes anteriores preservadas. Os bloqueios antigos de acesso/staging abaixo são históricos.

BLOCKED release: CI remoto sem credencial API GitHub (push GCM funciona); observabilidade/abuso; contato comercial oficial; inventário/IAM/Storage tokens/legado de produção; backup/restauração reais e rollback coordenado. Produção explicitamente sem autorização para alteração/deploy/Rules/índices/migração/merge. Não usar a antiga autorização condicional como permissão atual. F7 preparação staging8/10 (80%), inventário produção5/10 (50%); F8 evidência delimitada7/14 (50%), sem prontidão comercial.

Segurança operacional: revogar acesso de equipe não revoga link opaco ativo de passageiro; revogar portal explicitamente quando necessário. PDFs/listagens/financeiro permanecem sob ACL e download de comprovante revalida no servidor. Nenhum segredo deve entrar no Git. Orientar revogação da sessão CLI antiga exposta e logout no computador compartilhado.

## Registro histórico anterior

F6 PASS local/sintético, branch oficial e runtime9c0c45d. A autorização condicional de deploy já foi concedida; não falta confirmação rotineira. F7/F8 reais continuam BLOCKED por evidência/acesso, não por decisão já documentada.

| Item | Estado | Condição estritamente necessária |
|---|---|---|
| Firebase administrativo | BLOCKED | CLI sem contas autorizadas, gcloud ausente e runtime sem credenciais administrativas; necessário canal efetivo autorizado |
| Staging backend independente | BLOCKED | Destino Firebase separado e custos/limites conferidos; não copiar dados pessoais reais |
| Rules/Auth/índices/IAM atuais | BLOCKED | Captura atual e inventário legado em leitura; manifesto histórico não é diff atual. Storage exige memberships e tokens/IAM ainda não auditados |
| Backup e restauração real | BLOCKED | Export protegido, integridade/completude e restore em destino isolado comprovados; código não é backup de dados |
| Compatibilidade e rollback | BLOCKED | Staging coordenado, administradores/links/financeiro legados preservados e retorno por componente ensaiado; sem migração real neste fluxo |
| Prévia comercial visual | RESOLVED | Publicada e smoke verificado em projeto separado; não aprova backend/staging/produção |
| WIP LAB04-PC23 | Continuidade RESOLVED | Código local inacessível não recuperado/testado; implementação Cloud autorizada e concluída. Reconciliar manualmente caso reapareça |
| GOAL original externo | Não disponível | Matriz usa instruções atuais/contratos verificáveis; não alegar conferência do arquivo ausente |

Percentuais: F0–F6 100% nos aceites locais declarados; F7 identificação5/10 (50%); F8 gates4/14 (29%), todos com limites em F8_ACCEPTANCE.md. Não relaxar segurança, fabricar memberships/baselines ou usar produção como laboratório. Nenhum dado real foi alterado nesta execução. Os bloqueios independentes executáveis foram tratados; restantes exigem acesso/evidência externos.
