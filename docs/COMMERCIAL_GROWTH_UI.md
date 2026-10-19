# F6 — suspensão operacional e plano da organizadora

## Implementação local

- Rules `quotaGrowth` considera o status autoritativo da organização e os entitlements. Projeção pública ativa desatualizada não libera crescimento de organização suspensa.
- Criação/publicação/aumento de capacidade, integrantes e novas linhas CSV respeitam a suspensão. SDKs leem a raiz na transação; CSV também verifica antes da prévia e em cada etapa. Replay exato, reduções, cancelamento, arquivamento e rollback elegível mantêm o histórico.
- Aumento de capacidade requer evento de quota imutável mesmo abaixo do teto comercial. Diminuição segura e metadados existentes continuam permitidos conforme RBAC; o serviço transacional audita as alterações.
- `/admin/plano`: owner consulta contrato privado, mensalidade efetiva/promoção/prazo/setup, situação, contadores confirmados e limites. Avisos de bloqueio e limite atingido explicam preservação do histórico. Staff não consulta contrato; perda do papel remonta o escopo e remove os dados privados. Sem edição do contrato pelo tenant, gateway ou pagamento automático.

## Evidência 2026-10-19

PASS:45 testes direcionados em quatro arquivos, incluindo controle raw válido e mesma operação negada após suspensão da raiz com disponibilidade pública ainda ativa; reserva/plataforma, quotas concorrentes, CSV replay/rollback e último owner. `f6-growth-suspension-green.log`.

FAIL inicial corrigido: teste de retry CSV aumentava capacidade diretamente; passou a usar o serviço auditado com baseline explícito sintético. A nova restrição foi mantida. `f6-growth-suspension.log`.

PASS:lint/typecheck/build E2E;2 E2E finais1440/320 em `f6-tenant-plan-e2e-final.log`. Plano do owner mostra Essencial89, uso2/limite2, aviso e remoção do preço ao virar staff. Primeira rodada:5 PASS/1 FAIL; jornada mobile navegava antes da conclusão do login do owner. Corrigida sincronização pelo URL confirmado. Outra rodada falhou no harness por suíte nova sem Auth Emulator; runner agora infere Auth para todos os comandos Playwright. Não relaxar autorização para atender teste.

F6 IN_PROGRESS. Equipe/convites, percepção pública de vagas comerciais, demo/landing e gate integral continuam pendentes. Produção e homologação real BLOCKED, sem escrita real/deploy/Rules implantadas/migração/merge.
