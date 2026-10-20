# F7 — preparação segura, sem implantação

Estado: TODO infraestrutura/staging/release; este documento é preparação, não gate F7 PASS. F6 permanece IN_PROGRESS por equipe/convites não sincronizados. Nenhum serviço real foi configurado ou alterado.

## Candidato e verificação

O candidato deve ser identificado por SHA e tree SHA na branch codex/caravana77-commercial-v1-20261016. Builds de produção são somente artefatos locais de inspeção; não executá-los contra dados reais nem publicá-los. O runtime de desenvolvimento e Playwright usam projeto demo-caravana77-test, Auth/Firestore em loopback e Rules candidatas.

Sequência de regressão do candidato: npm ci; npm run lint; npm run typecheck; npm run build; npm test; npm run test:demo; npm run test:storage; npm run test:e2e. Executar suites de emuladores em sequência, sem npm run demo concorrente e sem reutilizar instâncias preexistentes. Node24/Java21 usados no Cloud. Gate de convites exige código e casos sincronizados além destas suites.

O CI existente executa lint/typecheck/Rules/build em main/PR; a branch de trabalho não dispara esse workflow por push. Não houve alteração dos gatilhos nem execução de Actions real nesta retomada. Auth, Storage e E2E precisam ser adicionados/conferidos em revisão futura de CI antes de alegar cobertura remota equivalente. Nunca disponibilizar credenciais de produção a jobs sintéticos. O runner Storage agora pré-carrega um tratamento estrito de GET local para o projeto demo quando Firebase CLI ignora NO_PROXY; CLOUD_REGRESSION.md documenta diagnóstico e13+6 testes, sem modificar Rules.

## Pré-condições de staging e release

1. Obter autorização específica para criar/configurar staging isolado e implantar candidatos; acesso ao Cloud não concede essa autorização.
2. Definir projeto separado, identidades sintéticas e política de retenção; não copiar PII/comprovantes do cliente.
3. Planejar versão coordenada de frontend, Rules e índices. Não aplicar baseline comercial, memberships ou namespaces do legado pelo cliente.
4. Conferir inventário/marker de namespace e schema por export administrativo autorizado. Não inferir inventário completo nem backup de dados a partir de Git/bundle/ZIP de código.
5. Documentar backup autorizado dos dados reais e ensaio de restore em destino isolado antes de qualquer migração/release que os afete.
6. Validar compatibilidade dos links, IDs, administradores, Pix, financeiro e documentos reais em procedimento autorizado e sem operações financeiras reais de teste.
7. Fazer revisão dos gates e aprovar janela/canário/rollback. Um rollback só do frontend não desfaz dados nem garante compatibilidade de Rules.

## Operação e evidência mínima futura

Métricas e logs devem distinguir falha de autenticação/autorização, quota/suspensão e disponibilidade, sem conteúdo de comprovante, CPF, tokens privados ou PII em logs. Alertas/canal/destinatários reais não foram configurados. Custos, billing, DNS/TLS, Auth administrativo e políticas/IAM devem ser conferidos no ambiente autorizado, não presumidos pela aplicação local.

A homologação F8 requer aceite do responsável sobre jornadas em staging e preservação do cliente, evidência dos gates, lista explícita de deferred/BLOCKED e aprovação específica para eventual publicação. Ver RELEASE_AND_ROLLBACK.md e F6_ACCEPTANCE.md. Não há autorização atual para deploy, migração, merge ou escrita em Firebase real.
