# Decisão de 26/10 — NO-GO comercial; migração NOT_READY

**DEMO_READY; COMMERCIAL_READY_NEW_TENANTS = NO-GO; READY_FOR_ITALO_MIGRATION = NOT_READY; ITALO_NOT_MIGRATED.** O laboratório é UNTRUSTED. O aceite da rodada local não autoriza produção. Código e provas novas somente locais/sintéticas ou metadados de staging; nenhuma promoção de numerador.

| Dimensão | Resultado mantido | Limite |
|---|---|---|
| Desenvolvimento técnico | 17/20 grupos (85%) | Método histórico; não proporção de prontidão operacional |
| F7 preparação | 9/10 | Segurança/observabilidade integral aberta |
| F8 | 6/14 | PASS 1,3,4,9,12,14 no escopo abaixo |
| GOAL | 7/17 | PASS 1,2,3,4,13,15,17 no escopo abaixo |

## Os 17 gates GOAL

| # | Gate | Estado | Evidência/limite |
|---|---|---|---|
| 1 | Funcionalidades previstas | PASS herdado local | F0–F6; aplicação não alterada nesta rodada |
| 2 | Planos diferenciados | PASS herdado | Pro/Premium implementados; preços/quotas inalterados |
| 3 | Entitlements e testes por plano | PASS herdado | SDK/Rules e aceites por SHA anteriores |
| 4 | Staging coordenado | PASS herdado staging | 17 SDK, 11 índices, paridade/rollback de frontend e Rules já comprovados; não repetidos |
| 5 | Inventário real completo | BLOCKED (parcial histórico) | Snapshot 24 docs/2 Auth/0 buckets observados não demonstra cobertura total |
| 6 | Schema/reconciliação real | BLOCKED | Sem payload permitido no laboratório; dois totais reais desconhecidos |
| 7 | Continuidade Auth | BLOCKED | Metadados fictícios não provam senha/login/ACL reais |
| 8 | Comprovantes/Storage/links | BLOCKED | Cobertura real/URLs/IAM/tokens não comprovados |
| 9 | Backup protegido completo | BLOCKED | Nenhum backup real nesta máquina; sem custódia/recipient validados |
| 10 | Restore independente real | BLOCKED | Processo separado sintético PASS, sem dados/Auth reais |
| 11 | Migração simulada fiel | BLOCKED (parcial sintético) | Modelos e ensaios existentes não são corpus fiel do cliente real |
| 12 | Preservação financeira real | BLOCKED | Compensação fictícia não resolve os dois registros reais |
| 13 | Isolamento multi-tenant | PASS herdado sintético/staging | A×B/revogação/quotas nos aceites anteriores; modelo novo não revalida Rules |
| 14 | Rollback coordenado aplicável | BLOCKED (parcial) | Modelo offline retorna frontend/Rules/índices/Auth e preserva writes posteriores; nenhum retorno coordenado real comprovado |
| 15 | Ausência de novos custos | PASS ações executadas | Zero recursos/serviços ativados; billing externo atual não reconfirmado |
| 16 | Segurança operacional integral | BLOCKED | Sem END heartbeat comprovado; abuso/backend, advisories e controles reais continuam pendentes |
| 17 | Procedimento/evidências | PASS documental | Ledger, gates e roteiro único; não é autorização de execução real |

## Os 14 gates F8

| # | Gate | Estado |
|---|---|---|
| 1 | F6 concluída | PASS local herdado |
| 2 | F7 aplicável concluída | BLOCKED |
| 3 | Testes essenciais | PASS baseline pelo SHA 6453da4; adições com prova local, CI novo separado |
| 4 | Staging isolado | PASS herdado no escopo/SHA publicado |
| 5 | Backup real e restore | BLOCKED |
| 6 | Compatibilidade frontend/Rules/índices/Auth com legado | BLOCKED real |
| 7 | Fluxos legados reais preservados e homologados | BLOCKED comprovação |
| 8 | Ausência de migração destrutiva necessária | BLOCKED comprovação real |
| 9 | Ausência de operação financeira/modificação real | PASS escopo executado |
| 10 | Rollback coordenado aplicável | BLOCKED real |
| 11 | Configuração/credenciais efetivas de produção | BLOCKED nesta máquina |
| 12 | Nenhum novo custo não autorizado | PASS ações executadas |
| 13 | Segurança integral de release | BLOCKED |
| 14 | Evidências/SHA | PASS checkpoint local; publicação remota separada |

## Retorno coordenado e critérios STOP

Before/after sintéticos: quatro componentes `synthetic-before` → `synthetic-after`, mesmo ledger. Sem tráfego posterior, retorno conjunto ao before; com compensação/escrita posterior, `STOP_PRESERVE_FORWARD_DATA` conserva config/dados para decisão, sem apagar/repor snapshot. Testes e relatório verificam este modelo; não executam infraestrutura ou emulador.

Plano real futuro exige artefatos/hashes/deployments antes/depois e operador autorizado; frontend compatível com Rules e índices preservados, Auth/config/UIDs sem resets, links/tokens/Storage inventariados e ledger auditável. Retornar frontend não desfaz dados. Qualquer divergência de snapshot/totais, referência órfã, nova escrita, falha Auth/ACL, falta de anexo, destino errado, custo/termo novo ou identidade inadequada exige STOP e preservação. Não excluir índices, reatribuir memberships ou restaurar snapshot sobre pagamentos recentes.

Proibidos nesta rodada: deploy ou rollback em `caravana-77`/`caravana-af306`, export/restore real, IAM/billing/APIs/App Check, pagamento, cutover e restore de dados reais em `bdall-e3585`. Não há comando de produção liberado. O [roteiro pessoal único](ITALO_BACKUP_RECOVERY_READINESS.md) é a única sequência de intervenção humana; preparar nova decisão após provas, sem converter este documento em autorização.
