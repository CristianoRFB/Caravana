# Release e rollback

## Retomada validada com rede atualizada — 2026-10-21

Fontee4939db: downloads novos Firestore1.22/Storage1.1.3 PASS, hashes/tamanhos conferidos.282 backend/Rules+8Auth+6Storage,18 guards direcionados (5 novos) e48 E2E em320/375/768/1440 PASS; lint/typechecks/build/audit runtime0. Nova exportação/restauração conjunta LOCAL_TESTED:3 logins/UIDs,10 documentos e2 PDFs; A×B, passageiro, list/delete e revogação após restore PASS. CI39537954805 PASS:287 backend/Rules+8Auth+6Storage+20 guards Python+recuperação conjunta+184 E2E e lint/typechecks/build. Relatório e evidências em CLOUD_RECOVERY_2026-10-21.md e evidence/2026-10-21/cloud-recovery/.

Runtime42 atual sem identidade GCP: preflight BLOCKED com requests=[]. Auth remoto403/SERVICE_DISABLED ainda sem consumidor identificado. Proteção contra abuso/alertas e7 advisories de tooling conhecidos pendentes. F0–F6 mantêm100% dos aceites locais; F7 preparação isolada9/10, F8 gates5/14, GOAL FINAL6/17. Nenhuma produção alterada, Blaze, migração ou deploy. Ensaio emulado não fecha staging/backup/compatibilidade/restore/rollback reais.

## Restrição vigente e ensaio isolado — 2026-10-20

Somente staging `bdall-e3585` / Pages `caravana77-staging` está autorizado. Produção `caravana-af306` / `caravana-77`, Rules/índices/Auth reais, migração e merge continuam proibidos sem autorização específica. Esta regra substitui a autorização condicional histórica abaixo.

PASS: retorno do frontend isolado para deployment `e5e60818-cfdf-4203-91c9-5ad0a09d8edd` (e383b20) e avanço para `3304e9dd-bb51-4326-a007-d270b63812de` (8b0dad3), com release.json conferido por HTTP em cada etapa. 153 documentos de staging foram comparados por caminho/campos canônicos, sem alteração. O projeto de produção permaneceu no deployment4d069e0a. Evidência staging-frontend-rollback.json.

Procedimento reproduzível exclusivamente para staging: listar deployments do projeto autorizado, conferir UUID/SHA do anterior e do candidato, usar POST `/accounts/{account}/pages/projects/caravana77-staging/deployments/{uuid}/rollback`, conferir release.json, repetir para o candidato. Nunca derivar destino de nome parcial nem executar em caravana-77. A API denomina o ambiente primário como production mesmo dentro do projeto separado de staging.

Backup/restauração sintético PASS: 153 documentos de staging exportados somente por GET/list e restaurados no emulador com exists:false. O manifesto db97cc72… corresponde ao arquivo privado testado. Senhas Auth não foram exportadas/restauradas. Nenhum retorno coordenado de Rules/Auth/índices/dados reais foi comprovado; esse gate continua BLOCKED. Não aplicar Rules deny-all iniciais sobre o staging funcional como ensaio de compatibilidade.

## Histórico e requisitos para um futuro release autorizado

Publicação autorizada condicionalmente pelo usuário em2026-10-20, sem nova confirmação rotineira. **BLOCKED** enquanto houver gate obrigatório desconhecido/falho. Não há autorização para migração real do Ítalo, destruição, alteração financeira real ou custos novos. Este procedimento ainda não foi ensaiado em staging remoto.

Produção confirmada em leitura: Pages `caravana-77`, deployment `4d069e0a-344a-415a-ae41-aa314df10ace`, URL https://caravana-77.pages.dev. Preview anterior0141fb45 não é staging desta candidata. Metadados/hashes em docs/evidence/2026-10-20/. Não inferir versão por main ou pelo commit dirty do deployment.

## Antes de liberar

Registrar SHA/tree do candidato, hashes de build, Rules Firestore/Storage, índices e configuração Auth separadamente. Fechar F6 local, staging isolado coordenado e matriz de compatibilidade legada; conferir os14 gates em F8_ACCEPTANCE.md. Identificar operador/ambiente/credenciais efetivos, limites/custos e destino exato antes de qualquer comando de implantação. Não disponibilizar credenciais reais a testes sintéticos.

Backup real precisa ter escopo/instante, controle de acesso, manifestos e integridade/completude verificadas. Incluir Firestore, configurações/identidades Auth e objetos/metadados Storage relevantes conforme inventário autorizado; não guardar conteúdo pessoal no Git/logs. Provar restauração em destino independente e jornadas de leitura/autorização. Sem essa evidência, não implantar nem Rules consideradas “apenas segurança”.

Rules novas dependem de memberships/baselines/namespaces conferidos; Storage legado pode usar tokens/IAM fora das Rules. Ausência de comprovação mantém bloqueio. Não criar permissões/baselines presumidos para o cliente nem relaxar proteção. Uma candidata que necessite migração real está fora do escopo autorizado deste fluxo.

## Implantação controlada futura

1. Conservar artefatos/configurações atuais e release anterior por IDs/hashes. Ensaiar candidato e retorno em staging com Auth/Firestore/Storage/índices equivalentes e dados fictícios.
2. Registrar janela, critérios de interrupção e sequência coordenada compatível entre frontend e Rules. Preferir canário quando suportado, sem trocar a produção por um preview não homologado.
3. Implantar somente os componentes cujo conjunto completo esteja homologado. Não publicar frontend novo dependente de Rules/índices não implantados.
4. Smoke não destrutivo na versão efetivamente publicada: disponibilidade HTTP/assets, ausência de erros JS, login/acesso legado em procedimento autorizado, leitura de jornadas operacionais necessárias com logs sem PII. Não criar reservas, pagamentos ou despesas reais de teste.
5. Monitorar falhas de Auth/permissão, reservas, Financeiro Geral e acesso legado. Canal/alertas e métricas reais precisam existir e ser testados antes de alegar monitoramento ativo.

## Retorno e seus limites

| Componente | Procedimento exigido | Evidência atual |
|---|---|---|
| Frontend | Retornar ao deployment anterior identificado e comparar hashes/URLs; smoke não destrutivo | Deployment e assets identificados; rollback remoto não ensaiado |
| Firestore Rules | Publicar versão anterior capturada, coordenada com frontend; validar administradores e links | Captura histórica disponível; captura atual/ensaio ausentes |
| Storage Rules | Retornar Rules anteriores; conferir tokens/IAM/URLs existentes separadamente | Configuração atual/ensaio ausentes |
| Índices | Preservar índices existentes; retornar consultas/frontend compatíveis; não excluir índice de produção improvisadamente | Inventário real ausente |
| Auth | Conservar configuração/identidades; nenhum reset de usuários/senhas como rollback | Inventário/backup/ensaio ausentes |
| Dados | Nenhuma restauração sobre produção neste fluxo; interromper e preservar evidências se houver incidente | Backup/restore real não comprovado |

Rollback de frontend não desfaz Rules, Auth, índices ou dados. Não prometer RPO/RTO sem medições. Backups de código antigos em repository.bundle/source-and-dist.zip restauram fonte em diretório novo e não representam backup do banco. Ensaios sintéticos de F2 continuam válidos no seu escopo e não substituem restore real.
