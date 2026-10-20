# Parecer final de preparação para migração

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
