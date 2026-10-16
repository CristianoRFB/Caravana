# Suporte temporário — implementação local F2

O responsável autoriza em `/admin/suporte` um UID de operador global ativo, informa motivo e escolhe 15, 30 ou 60 minutos. O operador abre a organizadora em `/platform` e inicia explicitamente a sessão. O único escopo é `caravan_configuration_read`: leitura da configuração das caravanas, inclusive rascunhos. Não concede leitura de inscrições, comprovantes, pagamentos ou despesas, nem qualquer edição de caravana.

## Autoridade e trilha

- `supportGrants/{organizationId}/operators/{operatorUid}`: consentimento do owner, motivo, escopo, validade, ator, timestamp do servidor e ID do consentimento. Staff e operador global não podem concedê-lo.
- `supportSessions/{operatorUid}`: início explícito, uma organizadora por operador. Abrir B substitui a sessão A. Cada sessão exige consentimento vigente e coincidente; renovação do consentimento exige novo início.
- `supportGrants/{organizationId}/audit/{operationId}`: concessão, início, encerramento e revogação com ator, horário de servidor, motivo, escopo, consentimento e expiração. Rules exigem escrita atômica com referências cruzadas; clientes não editam ou apagam eventos.
- Rules verificam a cada leitura o papel global ativo, consentimento, sessão, organização e os dois prazos. Nenhuma flag de rota ou UI concede autoridade. Limite máximo de uma hora aplicado no servidor.
- Revogação do consentimento, expiração de qualquer prazo, troca da sessão para B ou revogação do papel global bloqueiam novas leituras privadas. Fechar a sessão preserva consentimento e histórico; reabertura explícita ainda exige consentimento válido.

O observador da sessão/consentimento ignora snapshots locais pendentes ou vindos apenas do cache. A UI só inicia consultas privadas após confirmação do servidor, encerra o observador ao perder validade e remove os cartões. Um timer local também remove a configuração quando o prazo chega. A aplicação não habilita cache persistente de documentos. A revogação online não equivale a apagar cópias já vistas/salvas por uma pessoa; o servidor continua sendo a autoridade para novas leituras.

IDs de operações são preservados durante retries do SDK. Repetição do mesmo ID é idempotente; conflito de ação/ator/dados é rejeitado. Consentimento e sessão são adicionais, não alteram memberships, admins legados ou documentos operacionais. Não há elevação automática de contas demo.

## Verificação

`npm run test:support`: serviço real e Firestore Rules, incluindo abertura sem autorização, A×B, consulta sem filtro, escopo privado negado, Staff/owner B/global/stranger sem autoautorização, auditoria obrigatória/imutável, prazo excessivo, adulteração de UID/org/escopo/consentimento, renovação, expiração, encerramento/replay e revogação global.

`npm run test:support:e2e`: Auth Emulator real, duas sessões independentes de owner e operador, desktop1440/mobile320, consentimento → início → configuração somente leitura → encerramento → reabertura → revogação ao vivo. Staff sem controles. Zero pageerrors e tentativas de Firebase remoto, sem overflow horizontal.

Tudo executado exclusivamente nos emuladores de `demo-caravana77-test`. Nenhuma concessão real, regra implantada ou dado do cliente foi modificado. Este módulo não publica suporte em produção.
