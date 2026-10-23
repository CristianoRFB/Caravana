# Parecer separado — novos clientes, staging e legado

## Estado vigente — checkpoint de23/10/2026

Este bloco substitui os pareceres históricos abaixo. Staging `bdall-e3585` / `caravana77-staging` homologado na fonte `bc5dd40`, deployment `6e1a652a-dc4e-412e-9177-909ab35f598f`:17 jornadas SDK,1 readonly,12 verificações de layout, Auth/Rules/11 índices e rollback real de frontend/Rules PASS. CI técnico `ee3f5b5` / [39845244031](https://github.com/CristianoRFB/Caravana/actions/runs/39845244031) integral PASS:299 backend/Rules,8Auth,6Storage,47Python e184E2E.

F0–F6 mantêm aceites locais/sintéticos; F7 preparação9/10; F8 passa a6/14 com o gate4; GOAL passa a7/17 com o gate4; técnico17/20 no método histórico. Inventário real limitado:24 documentos em snapshot consistente,2 usuários Auth e0 buckets GCS; sem escrita de produção e sem exportação bruta. Isso não fecha inventário completo de migração/backup/restore. Dois registros financeiros sem total armazenado verificável exigem reconciliação; oito conferem, nenhuma divergência detectada nesses oito.

Drive privado conferido e vazio; chave privada ainda não estabelecida fora do computador compartilhado. Backup real e restauração real BLOCKED; migração/compatibilidade/rollback coordenado e F7 operacional permanecem pendentes. **DEMO_READY; COMMERCIAL_READY_NEW_TENANTS: NO-GO operacional; READY_FOR_ITALO_MIGRATION: NOT_READY; ITALO_NOT_MIGRATED.** Produção não recebeu deploy nem alteração de dados/configuração. R$0, sem Blaze.

Relatório completo, commits, riscos e proposta única de backup: [ENCERRAMENTO_PARCIAL_2026-10-22.md](ENCERRAMENTO_PARCIAL_2026-10-22.md). Catálogo das32 rotas e galeria parcial: [README_TELAS.md](../README_TELAS.md). O proprietário já autorizou o GOAL e a pasta Drive; não falta autorização genérica. Próxima condição humana do backup: identidade privada criada e guardada no dispositivo pessoal, disponibilizando somente o destinatário público `age1…`.

### Histórico preservado — não representa o estado vigente

Fonte: [STAGING_CONVERGENCE_2026-10-21.md](STAGING_CONVERGENCE_2026-10-21.md), CI a7b5785/run39540369156 e evidências delimitadas por revisão. Não são novas fases nem uma autorização de produção.

| Cenário | Parecer atual | Comprovado | Condições estritamente pendentes |
|---|---|---|---|
| A — Receber novos clientes em organizações independentes | **NO-GO para venda com operação prometida; GO para demonstração/avaliação delimitada** | F6 local, três planos reais, Pro relatórios/Premium roteiros, quotas/RBAC/A×B e financeiro sintético; CI completo do aplicativo inalterado | Homologação coordenada atual em backend real; configuração/abuso/alertas e recuperação operacional; destino comercial independente autorizado com configuração e operação verificadas. Staging atual admite somente dados fictícios. Não prometer operação homologada nem aceitar dados pessoais de novos clientes neste staging |
| B — Staging homologado como candidata comercial | **NO-GO para homologação integral; candidata preparada** | Staging8c1340d publicado; Auth público real200, domínio/política de senha; build local253067b e oito checks UI offline; histórico de jornadas SDK de revisão própria | Configuração administrativa Auth e causa403, identidade/fixtures reais gerenciadas; jornadas autenticadas coordenadas na revisão/configuração atual; Rules/índices/Auth consistentes, PDF/comprovantes, controles operacionais e retorno verificados. Nenhum novo deploy nesta execução |
| C — Migrar versão unitária do Ítalo | **NO-GO / NOT_READY_FOR_MIGRATION** | Planner e recuperação sintéticos, somente; produção não tocada | Inventário privado real de IDs/UIDs/administradores/schema/URLs/objetos/IAM/tokens; backup recuperável e restauração isolada comprovados; compatibilidade legada de frontend/Rules/Auth/índices/financeiro e rollback coordenado real. Migração real continua proibida neste GOAL |

O inventário, o backup dos dados do Ítalo e a migração legada **não são pré-condições técnicas para criar um tenant novo em um destino independente**. O NO-GO de A tem seus próprios bloqueios de homologação e operação; não é uma consequência automática de C. Tampouco o PASS em emuladores torna A ou B homologados.

Para tenants novos, o fluxo atual privado de PDF/comprovantes usa Firestore inline conforme STORAGE_PRIVACY.md. Provisionar bucket Cloud Storage pago não é requisito a inventar para esse fluxo. É necessário validar o caminho efetivamente suportado em staging. Storage emulado não homologa IAM/tokens/links dos objetos legados do Ítalo; esse requisito permanece em C. Não habilitar Blaze para contornar o bloqueio.

Demonstração visual/publicação anterior não é SaaS comercial completo. Nenhum novo endereço comercial foi publicado; endereço de staging: https://caravana77-staging.pages.dev. Contato comercial segue neutro/configurável, sem contatos do cliente real. Atributos comerciais e preços aprovados não foram alterados.

Percentuais existentes preservados: técnico85% (17/20 grupos); GOAL35% (6/17 gates); F7 preparação isolada9/10, F8 publicação5/14. Esses denominadores incluem requisitos distintos e não devem ser usados para afirmar que novos clientes dependem da migração legada. Nenhum gate completo foi encerrado por uma leitura de metadados públicos.
