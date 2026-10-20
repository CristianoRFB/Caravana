# F6 — proteção de namespaces históricos

Status: PASS incremental local. Inventário e bootstrap REAIS: BLOCKED sem autorização específica. Onboarding comercial completo ainda IN_PROGRESS.

## Runtime candidato

O cadastro assistido lê namespaceBootstrap/state e tenantNamespaces/{slug} antes de criar qualquer documento. O marcador exige version namespace-v1, coverageVersion tenant-references-v2, inventoryComplete true e manifestHash SHA256. Cliente, incluindo Platform Owner, não cria/altera o marcador. Nenhum marcador de produção foi criado ou consultado.

Novo cadastro exige namespace desocupado, raiz inexistente e evento tenant_created, e cria a reivindicação ativa junto com organização/owner/disponibilidade/auditoria na transação. Claim não pode ser atualizado nem excluído pelo cliente. UID/IDs históricos não são normalizados pelo planner. Referência órfã também reserva o identificador: ausência de organizations/{id} não autoriza apropriação.

Branding não permite reivindicar um novo slug pertencente a outra raiz histórica ou namespace protegido. Mappings já existentes são imutáveis e permanecem preservados. Global continua sem autorização para inserir membership em organização existente ou ler seu financeiro/passageiros.

## Inventário administrativo futuro

namespace-protection.ts é planner offline: não consulta Firebase/Storage, não escreve e não comprova sozinho a completude de um export. NAMESPACE_SOURCES enumera todas as fontes atuais de referência de tenant, incluindo documentos operacionais, ledger, comprovantes/autorizações/Storage, aliases, projeções, contratos e auditorias. Referências cujo tenant não pode ser determinado impedem declarar inventário completo; não adivinhar vínculo nem renomear legado. A versão de cobertura precisa evoluir se o modelo de referência mudar.

Procedimento real futuro requer export/backups autorizados, inventário completo e ensaio sintético, revisão dos conflitos, criação administrativa aditiva de entradas reserved ausentes, verificação do manifesto, e só então marcador confiável. Não existe script de escrita real nem permissão de bootstrap via cliente. Enquanto isso, novos tenants do código candidato ficam bloqueados. Clientes já publicados continuam na versão anterior, sem deploy neste GOAL.

## Evidências

- f6-namespace-guard.log:59 PASS/4 arquivos/16,97s, incluindo bloqueio sem marcador, negação de bootstrap ao global e tentativa SDK de apropriar namespace com inscrição histórica órfã; contador monetário fictício permanece2500 e global não consegue ler o registro.
- f6-namespace-branding-regression.log:56 PASS/6 arquivos/17,03s, após ampliar cobertura versionada e proteger novas reivindicações de slug; inclui regressões de plataforma/branding/membership/booking.
- f6-namespace-claims.log:4 PASS/4,80s, planner e nova tentativa de branding contra raiz estrangeira e namespace órfão. Os5 outros testes do arquivo de branding não foram repetidos nessa rodada, pois já passaram na regressão anterior.

Fixtures têm guard de emulador/projeto exatos, inventário de dataset conhecido e preparação Rules-disabled. Não são backfill de cliente real, nem homologação de staging/produção.

2026-10-20: na reconciliação para staging, a cobertura passou de v1 para v2 e passou a incluir `tenantInvitations` e `invitationInboxes`. Inventários antigos não bastam para novo onboarding. Registros e IDs existentes permanecem intactos. O staging vazio `bdall-e3585` foi explicitamente autorizado; o bootstrap será exclusivamente de organizações fictícias, separado da produção `caravana-af306`. A autorização não abrange inventário, migração ou escrita no cliente real.

## Próximo módulo autorizado

Completar onboarding novo com plano escolhido, assinatura/entitlements, identidade pública e mapping, diretório do primeiro owner e usage0/1/1. Preservar uma transação atômica e testar limites de consultas das Rules. Auditoria inicial pode reunir os snapshots comerciais e de branding no platformAudit para evitar ultrapassar limites; os fluxos de alterações posteriores mantêm suas próprias auditorias. Proibir baseline automático em organização existente. Depois: UI/equipe/convites/demo/landing e gate F6.
