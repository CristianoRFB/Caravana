# Parecer final de preparação para migração

## Continuidade vigente —23/10, Desktop recuperado

[CLOUD_CONTINUITY_2026-10-23.md](CLOUD_CONTINUITY_2026-10-23.md) consolida remoto0460cb2, CIee3f5b5/run39845244031 PASS (299Rules/backend+8Auth+6Storage+47guards+recuperação conjunta+184E2E) e resultados reais22/10. Rules/Auth/11índices/rollback e17SDK remotos já aprovados: não repetir SERVICE_DISABLED. Manifesto público agorabc5dd40,12assets/MIME/headers exatos, sem deploy do Cloud. Candidata local difere em10/15arquivos; paridade segue pendente. Nova negativa MIME do health,14direcionados emulados/47guards/lint/build e8checks crypto sintéticos PASS. Nenhum dado real/produção/Drive acessado nesta rodada; inventário legado parcial22/10 não comprova backup/restore. Métricas:17/20,F0–F6local100%,F7 9/10,F8 5/14,GOAL6/17; comercialNO-GO e migraçãoNOT_READY. Nenhum gate integral adicional fechado. Próximo passo autenticado: reconciliar build/artefatos e concluir operação; sem nova auditoria geral.

## Continuidade consolidada — código a7b5785, runtime49

Override isolado do UUID do CLI e diagnóstico sanitizado de consumidor Auth implementados/testados; audit de ferramentas7→5, runtime0. Compatibilidade HTTP3 testes, guards Python23,Auth8,Storage6 e recuperação conjunta locais PASS. CI39540369156 da própria revisão PASS:290 backend/Rules,8Auth,6Storage,23 guards Python,recuperação conjunta,184 E2E e lint/typechecks/build; preservar a evidência anterior apenas para seu código. Aplicação/Rules/índices e staging não alterados. Desenvolvimento técnico estimado85% (17/20 grupos existentes), GOAL final35% (6/17 gates), F7 preparação9/10 e F8 gates5/14; metodologia e limites no parecer abaixo.

Parecer e checklist mínimo: [COMMERCIAL_READINESS_2026-10-21.md](COMMERCIAL_READINESS_2026-10-21.md). Comercialização geral e migração do Ítalo BLOCKED. Runtime sem identidade GCP/conta CLI; preflight novo sem requisições reais. Sem novos trabalhos de produto a inventar: próxima ação é leitura legítima de configuração staging, diagnosticar serviço/consumidor e viabilizar homologação/provas privadas reais, sem chaves/códigos/PII no chat. Estimativa2–4 ciclos após acessos/provas externas disponíveis, condicionada a descobertas reais.

## Retomada validada com rede atualizada — 2026-10-21

Fontee4939db: downloads novos Firestore1.22/Storage1.1.3 PASS, hashes/tamanhos conferidos.282 backend/Rules+8Auth+6Storage,18 guards direcionados (5 novos) e48 E2E em320/375/768/1440 PASS; lint/typechecks/build/audit runtime0. Nova exportação/restauração conjunta LOCAL_TESTED:3 logins/UIDs,10 documentos e2 PDFs; A×B, passageiro, list/delete e revogação após restore PASS. CI39537954805 PASS:287 backend/Rules+8Auth+6Storage+20 guards Python+recuperação conjunta+184 E2E e lint/typechecks/build. Relatório e evidências em CLOUD_RECOVERY_2026-10-21.md e evidence/2026-10-21/cloud-recovery/.

Runtime42 atual sem identidade GCP: preflight BLOCKED com requests=[]. Auth remoto403/SERVICE_DISABLED ainda sem consumidor identificado. Proteção contra abuso/alertas e7 advisories de tooling conhecidos pendentes. F0–F6 mantêm100% dos aceites locais; F7 preparação isolada9/10, F8 gates5/14, GOAL FINAL6/17. Nenhuma produção alterada, Blaze, migração ou deploy. Ensaio emulado não fecha staging/backup/compatibilidade/restore/rollback reais.

## Relatório real recebido — 2026-10-21

Relatório do operador executado no Cloud Shell em2026-10-20T23:57:26Z, scriptdb99675/SHA363c307d…, validado em auth-recovery/operator-staging-readonly.json e operator-report-validation.json. Identidade/projeto corretos, billing=false, Standard/freeTier;11/11 índices READY/hash compatível. Rules hash bruto41388c5f… difere, LF-normalizado8acafe75… igual à candidata: diferença compatível com quebras de linha, sem alteração ou bypass do guard estrito.

Auditoria parcial BLOCKED em Auth403/PERMISSION_DENIED/SERVICE_DISABLED. O relatório não inclui consumidor/serviço do ErrorInfo; não comprova API desativada no projeto-alvo nem falta de firebaseauth.configs.get. Não habilitar APIs, conceder IAM ou repetir login automaticamente. Próximo bloqueio externo: GET da configuração Auth, com firebaseauth.configs.get e serviço disponível no consumidor correto; diagnosticar consumidor antes de propor configuração. Sessão gerenciada, alvo fixo bdall-e3585, sem códigos/chaves compartilhados. Autorização vigente somente leitura.

CI integral db99675 PASS (run39513331460):20 guards,282 backend/Rules,8Auth,6Storage,184 E2E; lint/typechecks/build PASS. Run39511925824 anterior terminou cancelled, não PASS. Código da aplicação/Rules não mudou. Nenhum deploy, custo, leitura de documentos de negócio ou modificação de projeto. F6 mantém PASS local; F7/F8/produção BLOCKED. Matrizes5/14 e6/17 preservadas. Cloud Shell não autentica o Codex; duas consultas atuais ao runtime retornaram configuration changed, sem readiness GCP comprovada.

**NOT_READY_FOR_MIGRATION — BLOCKED.** Retomada Cloud de `ab4aff115685f468d99050d248a047b070297cab`, em 2026-10-20, na branch `codex/caravana77-commercial-v1-20261016`. Este parecer não autoriza migração ou publicação de produção. A instrução vigente restringe alterações remotas ao staging `bdall-e3585` / `caravana77-staging`; produção `caravana-af306` / `caravana-77` permanece protegida.

## Evidências e alcance

- IMPLEMENTED / LOCAL_TESTED: F0–F6 e diferenciação funcional posterior. CI do próprio checkpoint recuperado PASS: [run 39476952320](https://github.com/CristianoRFB/Caravana/actions/runs/39476952320). Todas as etapas obrigatórias concluíram com sucesso; log do próprio job confirmou281 backend/Rules,8Auth,6Storage e184 E2E. A candidata Cloud51cf4f5 passou também no CI integral [39504978890](https://github.com/CristianoRFB/Caravana/actions/runs/39504978890):282 backend/Rules,8Auth,6Storage e184 E2E, sem retry configurado; lint/typechecks/build PASS. Resumo: cloud-transfer/final-ci.json. Resumo independente: `evidence/2026-10-20/cloud-transfer/recovered-ci.json`.
- STAGING_VERIFIED no escopo registrado: frontend `8c1340d`, seis jornadas SDK dos três planos, Rules, 11 índices, Auth e corpus fictício. Health público reconferido no Cloud: 12 assets exatos e cabeçalhos, sem autenticação nem consulta a documentos. Isso não revalida jornadas autenticadas.
- Auth de staging, evidência anterior do checkpoint: Email/Password, enumeração protegida, senha mínima 12, enforcement ENFORCE, anônimo desabilitado. Não confundir essa política com proteção de abuso validada.
- Backup/restauração de 153 documentos fictícios staging→emulador e retorno do frontend de staging têm evidências históricas próprias em STAGING_BDALL.md / RELEASE_AND_ROLLBACK.md. Não incluem recuperação de senha Auth ou arquivos reais.
- Cutover limitado: 17 documentos originais, seis adições, concorrência transacional no emulador, interrupção/retomada, replay, preservação de campos/IDs e rollback condicionado à ausência de tráfego. `final-synthetic-cutover.json` explicita que não representa o schema real nem um backfill comercial completo.
- PRODUCTION_DEPLOYED / PRODUCTION_VERIFIED: não realizados para esta candidata. Nenhuma mutação de produção nesta retomada. Não é possível certificar integridade dos dados reais sem inventário e restauração verificados.

## 17 gates do GOAL FINAL

PASS significa comprovação no escopo da coluna de evidência; BLOCKED impede READY mesmo quando há implementação parcial.

| # | Gate | Estado | Evidência / condição para fechar |
|---|---|---|---|
| 1 | Funcionalidades previstas | PASS local | F0–F6 e ferramentas comerciais; CI ab4aff1 |
| 2 | Planos diferenciados de verdade | PASS local/staging | Pro: relatórios operacionais salvos/compartilhados/CSV; Premium inclui Pro e roteiros/modelos de tarefas; COMMERCIAL_FEATURE_MATRIX.md |
| 3 | Entitlements e testes por plano | PASS local/staging | Resolver, projeção privada, SDK/Rules, seis jornadas remotas documentadas; histórico preservado em downgrade |
| 4 | Staging integral coordenado | BLOCKED | Firestore/Auth/frontend verificados anteriormente; Storage real não provisionado no Spark. Renovar homologação autenticada no Cloud com acesso seguro e demonstrar cobertura equivalente do legado sem Blaze |
| 5 | Inventário real legítimo | BLOCKED | Acesso anterior retornou 403. Sem schema/UIDs/objetos pessoais recuperados neste Cloud |
| 6 | Schema real e reconciliação | BLOCKED | Não presumir que fixtures representam coleções, órfãos e dependências reais |
| 7 | Auth e continuidade dos administradores | BLOCKED | Falta inventário real, recuperação isolada e prova do acesso legado; não inventar memberships |
| 8 | Comprovantes/Storage/links | BLOCKED | Falta inventário real de bytes, metadados, tokens, IAM e URLs; Storage emulado não basta |
| 9 | Backup real protegido e completo | BLOCKED | Sem backup real recuperável comprovado. Não exportar PII para Git, staging ou máquina compartilhada |
| 10 | Restauração real em destino isolado adequado | BLOCKED | Restore fictício de Firestore e roundtrip criptográfico não restauram Auth/arquivos reais |
| 11 | Migração simulada fiel | BLOCKED | Ensaio limitado PASS; falta estrutura real sanitizada, backfill completo, ACLs comerciais e equivalência operacional integral |
| 12 | Preservação financeira real | BLOCKED | Financeiro sintético/legado testado; totais e relações reais não inventariados |
| 13 | Isolamento multi-tenant | PASS sintético/staging | A×B, revogação, quotas/concorrência, papéis e escopo privado de ferramentas; não substitui reconciliação real |
| 14 | Rollback coordenado | BLOCKED | Frontend staging ensaiado; retorno conjunto de Rules, índices, Auth e dados reais não comprovado |
| 15 | Ausência de novos custos | PASS para ações executadas | Nenhum projeto/serviço pago/Blaze criado; staging historicamente billing=false/Standard freeTier; guard revalida antes de administrar |
| 16 | Segurança operacional | BLOCKED | Diagnóstico sanitizado/health/Auth implementados; abuso remoto/alertas operacionais não comprovados e advisories de tooling permanecem registrados |
| 17 | Procedimento e documentação finais | PASS documental | Este parecer, plano abaixo, runbook de staging e rollback. Não equivale a aprovação de execução |

**6/17 gates PASS (35% dos gates de preparação), 11 BLOCKED.** É uma proporção verificável de gates, não estimativa de linhas de código ou de segurança do cliente. F0–F6 mantêm seus aceites locais; F7/F8 não estão integralmente concluídas. A matriz original de14 gates continua em F8_ACCEPTANCE.md, com5PASS/9BLOCKED para a candidata. F7 tem9/10 critérios de preparação isolada (90% neste escopo), sem comprovar preparação integral de produção; F8 tem5/14 gates (36%). F0–F6 preservam os aceites locais anteriores, sem recalcular percentuais ou homologação real a partir de testes sintéticos.

## Oferta comercial preservada

| Plano | Mensalidade aprovada | Caravanas / passageiros / integrantes | Funções cumulativas |
|---|---|---|---|
| Essencial | R$89 | 2 / 60 / 2 | Todos os recursos CORE previamente concedidos, incluindo Financeiro Geral, documentos, CSV, equipe e identidade |
| Pro | R$149 | 5 / 200 / 5 | Essencial + relatórios operacionais privados salvos, compartilhados e exportáveis |
| Premium | R$219 | 15 / 500 / 15 | Pro + roteiros por caravana e modelos reutilizáveis, revisão concorrente e auditoria |

Implantação R$100 com dispensa assistida conforme política existente. Sem trial, anual, cobrança bancária automática ou contatos comerciais inventados. Segurança e histórico não são recursos vendidos como upgrade.

## Estratégia de destino

A recomendação **provisória** é evolução aditiva do Firebase existente, conservando IDs, Auth e links, se o inventário e os ensaios demonstrarem compatibilidade. Evita recriar identidades e referências, mas pode exigir bootstrap revisado de memberships, diretório, namespaces, uso e contratos; nenhum pode ser inferido a partir de dados incompletos.

Um novo destino definitivo exigiria prova adicional de transporte de Auth, comprovantes/URLs, relações financeiras, custos, retorno e operação simultânea. `bdall-e3585` é somente staging fictício e não é destino de dados pessoais. Não há evidência que justifique outro backend. A estratégia definitiva permanece BLOCKED até inventário real legítimo, sem conceder autorização de migração por este documento.

## Plano de corte futuro — não executar

1. Definir responsável, destino definitivo, janela, comunicação e critérios de interrupção; confirmar autorização específica. Registrar SHA/tree, hashes de frontend/Rules/índices/configuração Auth e estado publicado efetivo.
2. Obter inventário somente leitura em ambiente privado adequado; revisar IDs/ACLs/links, órfãos, finanças e diferenças do schema. Produzir somente resumo sanitizado no repositório.
3. Gerar backup protegido completo, manifesto e prova de integridade; restaurar em destino privado isolado autorizado que não seja bdall-e3585. Validar Firestore, Auth e objetos/metadados/links sem expor tokens.
4. Reproduzir estrutura sanitizada em ensaio: baseline explícito, não sobrescrever memberships/revogações, relações, diretório, quotas, contratos, namespaces, histórico financeiro, geração de convites, replay/concorrência, interrupção e retomada.
5. Ensaiar versão coordenada e retorno de frontend/Rules/índices/Auth. Definir congelamento de escritas e transferência de responsabilidade; medir duração/RPO/RTO, sem promessas não medidas. Não remover índices nem reverter documentos após novas operações por improviso.
6. Aplicação futura somente após todos os gates PASS, por plano revisado e autorizado. Validar login legado, links, leitura financeira e operação histórica sem transações financeiras de teste reais. Usar dados fictícios em staging.
7. Monitorar Auth/permissões, reservas, check-in e Financeiro Geral com canal e responsável comprovados. Em regressão interromper o avanço; retornar artefatos compatíveis. Após tráfego, preservar dados novos e reconciliar; rollback de frontend não desfaz dados.
8. Encerrar somente após comparar evidências, versão efetivamente publicada e aceites. Manter backups acessíveis apenas aos responsáveis pelo prazo aprovado.

## Bloqueadores externos

Acesso administrativo seguro ao staging ainda precisa ser verificado neste Cloud. Inventário e backup reais requerem acesso somente leitura legítimo e ambiente privado apropriado; não devem ser resolvidos copiando credenciais do computador inacessível. Pré-requisitos operacionais para o acesso e a sequência mínima constam no relatório de transferência Cloud. Não publicar em produção para descobrir compatibilidade.
