# Aceite incremental — staging Caravana 77

## Ambiente e preservação

Branch: `codex/caravana77-commercial-v1-20261016`, repositório CristianoRFB/Caravana. Checkpoint final de implementação19c6564 enviado; deployment9244cf5a-f7c8-41cb-a3b8-da4f5d5e5d85 em https://caravana77-staging.pages.dev. Os11 assets são idênticos ao checkpoint funcional8b0dad3; último upload alterou somente o manifesto de release. Firebase exclusivo bdall-e3585, Standard/freeTier/southamerica-east1, Spark e faturamento desativado. Configuração, contas e backups brutos ignorados pelo Git. Rules/hash d3ff2108…;11 índices READY; Auth E-mail/Senha/domínio específico verificados.

Não houve escrita em caravana-af306, deploy no Pages caravana-77, alteração de DNS/domínio, migração real, merge/main, reset/exclusão de dados reais ou operação financeira bancária. Produção conferida em leitura no deployment4d069e0a-344a-415a-ae41-aa314df10ace. Não se alega integridade/backup dos documentos reais com base nessa conferência. WIP anterior permanece no bundle/stash documentados, sem reaplicação sobre equipe mais nova.

## Evidências efetivamente executadas

| Verificação | Resultado/escopo |
|---|---|
| Firebase real isolado | 11 jornadas SDK funcionais PASS; Auth, reservas/replay, onboarding, quotas concorrentes, PDF/menor, CSV/rollback, financeiro manual fictício/check-in, convite/revogação, suspensão e A×B/global |
| Atualização Node | 1 teste SDK real adicional somente leitura PASS; UIDs/plano/listagens próprias e negativas cruzadas; zero writes de documentos |
| Gate local antes da atualização de ferramentas | 253 testes em38 arquivos PASS;168 E2E PASS em rodada única, quatro larguras, sem retry |
| Documentos e layout direcionados | 68 testes de documentos PASS;2 E2E de scrollbar PASS; sobrepõem a regressão, não somar como únicos |
| Atualização de segurança | Cadeia runtime audit4→0; ferramentas18→7. Firebase11.10 mantido; gRPC filho1.13.6; Firebase CLI15.34/Wrangler4.151.3 iniciam corretamente |
| Tipos/lint/build | PASS; harnesses SDK e restore em projetos TS separados. CI preparado também verifica tipos e audit runtime; não executa testes remotos automaticamente |
| Paridade após dependências | Os11 assets do navegador são byte a byte idênticos aos publicados e aprovados; staging-security-asset-parity.json |
| Gate após atualização de ferramentas |253 backend+8 Auth+6 Storage+16 E2E direcionados PASS; não somar sobreposições à rodada168. Smoke desktop1440/mobile320 cobre financeiro/equipe/gutter |
| Inspeção do navegador | Financeiro Tudo/caravana em A, B sem dados A, plano Pro próprio, catálogo/viagem B, aviso de pagamento externo; login e consultas sob CSP funcionam |
| Móvel real |320 px com scrollbar: client/body/scroll305, sem overflow; capturas320/1440 versionadas |
| Backup/restauração |153 documentos fictícios/5 metadados Auth, hash db97cc72…; restore no emulador compara todos os campos, relações, contadores, totais e ACL. Não restaura senhas Auth |
| Retorno de frontend |e383b20↔8b0dad3 PASS;153 documentos canônicos iguais antes/depois. Não testa retorno de Rules/Auth/índices/dados reais |
| Bootstrap replay | Cria0 documentos; preserva alterações, histórico e membro revogado |

Não somar rodadas sobrepostas nem usar Storage emulado como homologação de Storage real. PDFs remotos usam o fluxo privado existente do Firestore, até600 KiB. O site não recebe nem processa pagamentos. Registros financeiros usados nos testes são explicitamente fictícios.

O engine Storage emulado emitiu avisos Java Unsafe e uma NPE no encerramento, depois dos6 testes PASS e script exit0. Runner concluiu limpeza e não restaram listeners nas portas18080/19099/19199. O log bruto foi preservado; não se alega execução sem warnings. Nenhum Storage remoto foi criado.

## Segurança e gates restantes

As negativas verificam ACL atual dos documentos privados. Link opaco ativo de passageiro continua independente de vínculo de equipe; revogar integrante não revoga automaticamente um link conhecido. Download de comprovante consulta servidor; revogação de portal é explícita. Não foram relaxadas Rules para corrigir expectativas equivocadas de testes.

Sete advisories de ferramentas permanecem (3 altos/4 moderados), com limitações e mitigação em DEPENDENCY_SECURITY_2026-10-20.md. Auditoria runtime zero não equivale a auditoria completa limpa. CI remoto depende de credencial Actions, ainda ausente; git push por GCM não comprova esse acesso. Observabilidade/alertas e proteção de abuso público ainda não homologados.

F6 PASS local/sintético. F7 IN_PROGRESS:8/10 critérios de preparação de staging comprovados (80%), inventário protegido de produção5/10 (50%). F8 IN_PROGRESS:7/14 gates com evidência no escopo declarado (50%); sete gates de release BLOCKED. Permanecem pendentes contato comercial oficial, inventário/compatibilidade legada/IAM, backup real e retorno coordenado, além das questões de CI/segurança/observabilidade. Nenhum percentual representa prontidão comercial. Produção continua proibida sem autorização específica.

Credenciais de teste apenas no arquivo local ignorado `.firebase/staging-accounts.json`; não reutilizar admin123 nem contas reais. Orientação de logout/revogação da sessão antiga exposta e encerramento no computador compartilhado em STAGING_BDALL.md. Não se alega que o responsável já tenha encerrado essas sessões.
