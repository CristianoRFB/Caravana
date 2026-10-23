#!/usr/bin/env bash
set -euo pipefail

# Instala SOMENTE no repositório CristianoRFB/Caravana.
# Não instala npm packages, não altera ~/, .codex ou qualquer outro projeto.
command -v git >/dev/null || { echo "ERRO: Git nao encontrado." >&2; exit 2; }
root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ERRO: abra o Bash dentro de um checkout Git da Caravana." >&2; exit 2; }
origin="$(git -C "$root" remote get-url origin 2>/dev/null || true)"
if [[ "$origin" != *"CristianoRFB/Caravana"* ]] || ! grep -Eq '"name"[[:space:]]*:[[:space:]]*"caravana-77"' "$root/package.json"; then
  echo "BLOQUEADO: repo/remote nao e CristianoRFB/Caravana. Nao instale globalmente nem em Cosmaker." >&2
  exit 3
fi
if [[ -L "$root/.agents" ]] || [[ -L "$root/.agents/skills" ]]; then
  echo "BLOQUEADO: .agents ou skills e symlink. Reveja manualmente." >&2; exit 4
fi
stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT

mkdir -p "$stage/caravana-goal-scope"
cat > "$stage/caravana-goal-scope/SKILL.md" <<'CARAVANA_SKILL_caravana_goal_scope'
---
name: caravana-goal-scope
description: Planejar e executar GOALs Caravana 77, recuperar checkpoint e economizar tempo/tokens sem inventar progresso; use ao retomar Codex Cloud/Desktop, revisar pendências ou reportar percentuais.
---

# Escopo, retomada e economia de execução — Caravana 77

## Fontes canônicas
Comece por \`docs/CURRENT.md\`, \`docs/MASTER_EXECUTION_2026-10-22.md\`, \`docs/MIGRATION_READINESS_FINAL.md\`, \`docs/F8_ACCEPTANCE.md\` e o último commit da branch autorizada. A documentação histórica pode estar defasada; compare SHA, data e evidência.

## Procedimento
1. Confirme \`git remote -v\`, branch, HEAD, working tree e commits posteriores; preserve WIP, nunca \`reset --hard\`/force-push.
2. Classifique cada item em \`IMPLEMENTED\`, \`LOCAL_TESTED\`, \`STAGING_VERIFIED\`, \`BLOCKED\`, \`PRODUCTION_VERIFIED\`. Não promova o escopo.
3. Defina somente o próximo lote que desbloqueia um gate; evite módulos novos, refatorações cosméticas e testes integrais sem mudança.
4. Registre comando/testes, hashes, ambiente, resultados e negativos; artefatos sem PII.
5. Use as contagens existentes F7/10, F8/14, GOAL/17 e grupos técnicos/20; não misture denominadores nem usar 97% subjetivo como gate.
6. Após alteração útil: commit/push de checkpoint na branch comercial, atualizar documentação e handoff conciso.

## Controle de contexto
Leia documentação adicional apenas sob demanda; resuma descobertas em checkpoint versionado em vez de repetir relatórios extensos. Não assuma que uma sessão no navegador autentica CLI/Cloud.

## Limites
Nenhuma operação em produção é autorizada por uma skill. A autorização efetiva vem da conversa/protocolo e das pré-condições de integridade; nunca simule evidência.
CARAVANA_SKILL_caravana_goal_scope

mkdir -p "$stage/caravana-tenant-rbac"
cat > "$stage/caravana-tenant-rbac/SKILL.md" <<'CARAVANA_SKILL_caravana_tenant_rbac'
---
name: caravana-tenant-rbac
description: Auditar ou alterar RBAC, Firebase Auth, memberships, Firestore Rules e isolamento multi-tenant da Caravana; use para permissões, convites, passageiros, administrador e segurança A×B.
---

# Segurança de tenants, Auth e Firestore Rules

## Contexto
Projeto Firebase de staging: \`bdall-e3585\`. Produção do Ítalo: \`caravana-af306\` — nunca confundir. Consulte \`firestore.rules\`, \`docs/CLIENT_PRESERVATION_ITALO_2026-10-16.md\` e testes existentes antes de editar.

## Método
1. Para cada operação, modele ator, UID, organizationId, membership, papel, status, contexto da caravana, recurso e operação (create/read/update/delete).
2. Tenant deve derivar de relação validada, não de slug, query, botão escondido ou payload arbitrário.
3. Impedir escalonamento: membro revogado/suspenso, tenant cruzado, último owner, self-update de role, replay e ID trocado.
4. Quando \`memberships/{uid}/organizations/{orgId}\` existe mas foi revogada, NÃO usar \`admins/{uid}\` como fallback de legado. Observe a janela legada explicitamente codificada.
5. Validar propriedade e campos imutáveis, limites, tipos e relações; testar permissões positivas e negativas para organização A/B e perfil sem acesso.
6. Alterou Rules? Execute testes de regras e segurança selecionados e só depois integração e CI necessários; registre hashes e versão publicada separadamente.

## Não fazer
Nunca usar conta real do Ítalo em testes, criar administrador amplo, enfraquecer Rules para PASS, compartilhar tokens ou mudar Auth/Rules de produção como debugging. Um teste em Emulator não homologa IAM/Auth real.
CARAVANA_SKILL_caravana_tenant_rbac

mkdir -p "$stage/caravana-finance-ledger"
cat > "$stage/caravana-finance-ledger/SKILL.md" <<'CARAVANA_SKILL_caravana_finance_ledger'
---
name: caravana-finance-ledger
description: Manter integridade financeira da Caravana 77: ledger, pagamentos declarados, estornos, CSV e auditoria; use antes de alterar valores, quotas, conciliação, replay, migração ou rollback.
---

# Integridade financeira e histórico

## Invariantes
- Valores em centavos inteiros, com arredondamento explícito, não floats monetários.
- Nenhum evento financeiro histórico deve ser apagado/alterado para simular rollback.
- Compensação é novo evento auditável; replays devem ser idempotentes e transacionais.
- Não movimentar dinheiro nem marcar pagamento real sem evidência da operação.

## Procedimento
1. Leia o domínio financeiro existente, \`docs/FINANCIAL_LEDGER.md\`, comandos npm relevantes e histórico de migração.
2. Registre invariantes \`before/after\`: IDs, UID, org/caravana, saldos, vagas, estado, timestamps, auditoria e contagem de eventos.
3. Use cenários sintéticos: pagamento, estorno/correção, conflito simultâneo, retry, downgrade, tenant A/B e restore.
4. Para mutações relacionadas a vagas/passageiros, prove atomicidade, não apenas UI.
5. Não reescreva histórico para compatibilizar schema; use abordagem aditiva, reconciliável e recuperável.
6. Rode \`npm run test:finance\` e o grupo de integração pertinente quando disponíveis; não some suites sobrepostas como testes únicos.

## Saída
Evidência sanitizada dos invariantes, cenários negativos, hashes/contagens comparáveis e impacto em rollback/migração. Produção não é laboratório.
CARAVANA_SKILL_caravana_finance_ledger

mkdir -p "$stage/caravana-plan-entitlements"
cat > "$stage/caravana-plan-entitlements/SKILL.md" <<'CARAVANA_SKILL_caravana_plan_entitlements'
---
name: caravana-plan-entitlements
description: Modificar preços, planos Essencial/Pro/Premium, limites, trial assistido, entitlements e páginas comerciais da Caravana 77 sem regressão ou promessas falsas.
---

# Planos e entitlements de verdade

## Fonte de verdade
\`src/lib/plan-catalog.ts\`, matriz comercial, Global Standard v01 e contratos já aprovados. Plano Essencial R$89, Pro R$149, Premium R$219 mensais; limites: caravanas 2/5/15, passageiros 60/200/500, equipe 2/5/15. Não mudar catálogo por suposição.

## Verificação
1. Preservar \`CORE_FEATURES\` em todos os planos; segurança, RBAC e privacidade não são diferenciais pagos.
2. Pro acrescenta relatórios operacionais; Premium acrescenta roteiros/modelos; cada anúncio precisa existir de fato no produto.
3. Direito de uso resulta do catálogo + override/atribuição do tenant + status da assinatura + disponibilidade real.
4. Aplicar feature gating tanto na UI quanto na operação protegida; violação via SDK/URL/payload deve ser negada.
5. Verificar concorrência de quotas, upgrade/downgrade, suspensão, trial assistido, \`past_due\`, overrides e histórico.
6. Usar \`npm run test:commercial\`, \`npm run test:quotas\` e E2E comerciais proporcionais quando pertinentes.

## Comercial
Não inventar assinatura anual ativa, cobrança automática, checkout, free trial público, domínio próprio ou métricas fictícias. Manter compatibilidade de acessos concedidos ao Ítalo.
CARAVANA_SKILL_caravana_plan_entitlements

mkdir -p "$stage/caravana-test-efficiency"
cat > "$stage/caravana-test-efficiency/SKILL.md" <<'CARAVANA_SKILL_caravana_test_efficiency'
---
name: caravana-test-efficiency
description: Economizar tokens, execução e CI na Caravana com seleção progressiva de Vitest, Firebase Emulator, Playwright e verificações de regressão; use após mudanças de código e antes de aceite.
---

# Testar com cobertura proporcional ao risco

## Matriz prática
- Rules/RBAC: \`npm run test:rules\`, \`npm run test:security\`.
- Financeiro: \`npm run test:finance\`.
- Reserva/vagas: \`npm run test:booking\`.
- Planos/quotas: \`npm run test:commercial\`, \`npm run test:quotas\`.
- Docs privados: \`npm run test:documents\`.
- Recuperação: \`npm run test:recovery\`.
- Visual/mobile: E2E específico em 320/375/768/1440.
- Fechamento: lint, typecheck, build e CI da revisão aplicável.

Confirme os scripts reais no \`package.json\` antes de executar: a lista é de alvos conhecidos, não promessa de todos os comandos.

## Ciclo eficiente
1. Capture defeito ou requisito em teste RED direcionado.
2. Corrija a menor superfície.
3. Rode teste GREEN afetado, depois regressão das dependências impactadas.
4. Execute suíte ampla somente ao fechar gate/release ou alterar contratos transversais.
5. Registre comando, duração, resultado, SHA e ambiente; distingua PASS, SKIP, FAIL e BLOCKED.
6. Não use CI de commit antigo para aprovar alteração nova; não repita suite de 184 E2E por documentação isolada.

## Segurança do harness
Só usar projetos demo e portas loopback, jamais configurações Firebase remotas em testes mutáveis. Se variáveis \`VITE_*\` do Windows contaminarem fixtures, isole ambiente do teste, não enfraqueça guard de produção.
CARAVANA_SKILL_caravana_test_efficiency

mkdir -p "$stage/caravana-staging-release"
cat > "$stage/caravana-staging-release/SKILL.md" <<'CARAVANA_SKILL_caravana_staging_release'
---
name: caravana-staging-release
description: Homologar e publicar candidata Caravana exclusivamente no Firebase bdall-e3585 e Cloudflare caravana77-staging; use para build, hashes, Rules, índices, Auth, rollout e rollback.
---

# Release coordenada só no staging

## Identidades
Staging: Firebase \`bdall-e3585\`, Pages \`caravana77-staging\`.
Produção: \`caravana-af306\` e \`caravana-77\` (fora de alcance por padrão).
Valor máximo adicional: R$0; não habilitar Blaze, novos serviços pagos ou permissões amplas.

## Checklist
1. Validar conta/principal, projeto exato, ambiente e permissões efetivas; navegador logado não implica CLI autenticado.
2. Ler \`docs/F8_ACCEPTANCE.md\`, \`docs/RELEASE_AND_ROLLBACK.md\`, último manifesto e deploy publicado; identificar o artefato anterior.
3. Conferir lint/typecheck/testes e \`npm run build:staging\` para a revisão atual.
4. Comparar manifesto, SHA256 bruto, 15 assets ou a contagem atual, MIME, CSP, redirects, noindex e configuração Firebase antes/depois.
5. Rules: exigir hash de bytes canônico (não apenas LF normalizado), Auth/política/índices READY; planejar retorno de cada camada.
6. Com autorização vigente e pré-condições satisfeitas, publicar APENAS o staging; verificar saúde pública e jornadas fictícias autorizadas.
7. Registrar release, URL, hash, rollback, testes 320/375/768/1440, falhas, compensação de fixtures e resultado real.

## Interrupção
Em 403/503 ou resposta incerta, **releia o estado** antes de repetir mutação; não faça POST/PATCH duplicado. Frontend rollback não restaura Firestore/Auth/Storage. Nunca chamar implantação de staging de prontidão para migração.
CARAVANA_SKILL_caravana_staging_release

mkdir -p "$stage/caravana-italo-backup-migration"
cat > "$stage/caravana-italo-backup-migration/SKILL.md" <<'CARAVANA_SKILL_caravana_italo_backup_migration'
---
name: caravana-italo-backup-migration
description: Preparar backup criptografado, inventário, restauração e migração segura do cliente Ítalo/Anime Fest na Caravana; use para legado real, UID, dados financeiros, Storage, cutover e rollback.
---

# Preservação e migração do Ítalo

## Zona protegida
Produção \`caravana-af306\` / \`caravana-77\` contém dados reais. Sem exportação para Git, chat, Cloud genérico, staging comercial ou PC compartilhado. Uma autorização textual para 'terminar tudo' não substitui comprovação de backup e plano de retorno.

## Pré-requisitos obrigatórios
1. Inventário sanitizado e legitimamente autorizado: collections, contagens, IDs/relações, Auth/UIDs, administradores, Rules/índices, PDFs/Storage, tokens/links e financeiro.
2. Destino privado, criptografado e sob custódia definida. A chave privada deve permanecer no dispositivo pessoal, nunca no laboratório/CI/Cloud/repositório.
3. Backup integral verificável com checksums; prova de restauração isolada abrangendo Auth/Firestore/arquivos e permissões, não só ZIP.
4. Ensaios sintéticos de schema realista, backfill aditivo e idempotente, corte sem corrida, compensação e rollback coordenado.
5. GO/NO-GO explícito por invariantes: ID/UID, passageiros, histórico, ledger, administradores, ACL e links. Verificar ausência de alterações reais não autorizadas.

## Execução
Separar \`READY_FOR_MIGRATION\` de \`MIGRATED\`. Só iniciar mutações/cutover após todos os gates reais e escopo de autorização específico e verificável; se restar lacuna, emitir \`NOT_READY\` e avançar tarefas independentes.

## Evidência
Guardar somente relatórios sem PII no GitHub. Informar hash, total, percentual de cobertura, falhas, versões de Rules/frontend e resultado de restore. Nunca prometer reversão por apagar eventos financeiros.
CARAVANA_SKILL_caravana_italo_backup_migration

mkdir -p "$stage/caravana-ops-security"
cat > "$stage/caravana-ops-security/SKILL.md" <<'CARAVANA_SKILL_caravana_ops_security'
---
name: caravana-ops-security
description: Tratar proteção contra abuso, App Check, observabilidade, alertas, IAM e vulnerabilidades da Caravana 77; use no fechamento F7 e operação de custo zero.
---

# Segurança operacional F7 com custo zero

## Princípios
Identifique a superfície ativa: React/Vite, Firebase Auth/Firestore, Cloudflare Pages/Workers, endpoints públicos e tooling local. Autenticação não equivale a antiabuso; App Check não substitui RBAC nem rate limits.

## Fluxo
1. Leia \`docs/F7_PREPARATION.md\`, \`docs/F7_CLOSURE_2026-10-21.md\` e evidência posterior.
2. Modele ameaça: enumeração, replay, sobrecarga, leitura cruzada, exposição de PII nos logs e operações financeiras.
3. Implante guardrails com budget R$0; limite cardinalidade/bytes de mensagens de health; capture falhas sem dados sensíveis.
4. Para monitoramento, diferencie alerta Pages realmente entregue, health GET e erro de backend: são evidências distintas.
5. App Check: preparo local opt-in não é registro de provedor, enforcement ou homologação real; não aceitar termos, criar chave nem ativar bloqueio sem avaliação e autorização.
6. Separe \`npm audit --omit=dev\`, auditoria integral de tooling e risco efetivamente alcançável. Patch compatível + teste; nunca \`npm audit fix --force\`.
7. Reavalie IAM por privilégio mínimo; não pedir Owner/Editor por conveniência.

## Aceite
Só marcar grupos F7 PASS com controle efetivamente operante, teste reproduzível e ambiente explícito. Dependência upstream ou serviço externo não comprovado fica BLOCKED com mitigação, não uma correção inventada.
CARAVANA_SKILL_caravana_ops_security

mkdir -p "$stage/caravana-mobile-ux"
cat > "$stage/caravana-mobile-ux/SKILL.md" <<'CARAVANA_SKILL_caravana_mobile_ux'
---
name: caravana-mobile-ux
description: Revisar usabilidade e responsividade mobile-first da Caravana 77 em landing SaaS, gestão de caravanas, financeiro, check-in e telas administrativas; use para UI/Playwright.
---

# UX mobile com provas, sem retrabalho

## Escopo
React/Vite e fluxos reais: landing SaaS, planos, onboarding, caravanas, passageiros, reservas, check-in, financeiro, relatórios Pro, roteiros Premium e Platform Owner.

## Processo
1. Reproduza a jornada em largura 320, 375, 768 e 1440px; inclua toque, teclado, foco, scroll e estados vazios/erro.
2. Priorize defeitos concretos: overflow, CTA inacessível, tabela que esconde ações, indicador ilegível, truncamento de UID, formulário sem feedback.
3. Preserve os componentes e o design já aprovados. Não redesenhe landing/admin sem solicitação ou defeito documentado.
4. Verifique contraste, acessibilidade de dialog, rótulos, loading, confirmação de ação destrutiva e mensagens sem PII.
5. Para alterações comerciais, compare com \`src/lib/plan-catalog.ts\` e não exponha features inexistentes.
6. Faça screenshots e E2E proporcionais ao componente alterado; valide navegação/ação real, não apenas pixel isolado.

## Critério
Separar aparência satisfatória, comportamento testado e funcionalidade autenticada no staging; uma captura não certifica backend ou produção.
CARAVANA_SKILL_caravana_mobile_ux

# Confere conflitos antes de copiar qualquer arquivo.
for source in "$stage"/*/SKILL.md; do
  skill="$(basename "$(dirname "$source")")"
  destination="$root/.agents/skills/$skill/SKILL.md"
  if [[ -L "$(dirname "$destination")" ]] || [[ -L "$destination" ]]; then
    echo "BLOQUEADO: symlink em skill $skill." >&2; exit 5
  fi
  if [[ -f "$destination" ]] && ! cmp -s "$source" "$destination"; then
    echo "BLOQUEADO: skill existente diferente: $destination" >&2
    echo "Preserve ou revise a versao atual antes de substituir." >&2
    exit 6
  fi
done
for source in "$stage"/*/SKILL.md; do
  skill="$(basename "$(dirname "$source")")"
  mkdir -p "$root/.agents/skills/$skill"
  cp "$source" "$root/.agents/skills/$skill/SKILL.md"
done
echo
echo "OK: skills Caravana instaladas em $root/.agents/skills"
find "$root/.agents/skills" -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort
echo
echo "Nada foi instalado globalmente, e nenhuma credencial, deploy ou operacao de rede foi executada por este instalador."
echo "Verifique git status. Para leva-las ao Codex Cloud, faca commit/push APENAS de .agents/skills na branch autorizada."
echo "O Codex costuma detectar mudancas; se nao aparecerem, reinicie a conversa/sessao."
