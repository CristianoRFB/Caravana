# Parecer separado — novos clientes, staging e legado

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
