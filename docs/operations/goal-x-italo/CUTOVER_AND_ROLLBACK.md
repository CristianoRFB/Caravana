# Corte e retorno — nenhum apply de produção nesta rodada

O GOAL X concede autorização condicional do proprietário para um corte controlado após TODOS os gates. Não é necessário repetir aprovação genérica; ela não remove custódia, direitos de terceiros, privacidade, R$0 ou provas ausentes. No laboratório o corte está **BLOCKED** e as ferramentas novas não implementam endpoint de escrita de produção.

Preferência a avaliar no inventário privado: evolução aditiva in-place em caravana-af306, preservando Auth/UIDs/links e reduzindo transporte. Ainda não há prova suficiente para escolher essa estratégia ou atribuir plano/membership real. O preview existente só propõe memberships a partir de admin/owner explícito, com conflitos que impedem sobrescrita; não resolve bootstrap comercial/namespaces/usage/entitlements e não concede papel global.

## Pré-condições e STOP

Exigir inventário/cobertura e snapshot/delta comprovados, dois totais reais explicados, custódia e recipient validados, manifesto autenticado/Drive/download, recuperação real independente, Auth e links/objetos reais, equivalência de permissões, quotasR$0, CI candidato por SHA, monitor responsável/canal e versões de retorno. Se UNKNOWN/BLOCKED, não cortar. O [roteiro pessoal](OWNER_ACTIONS.md) reúne a intervenção inevitável.

Antes da janela: capturar fonte/build/deployment, Rules, índices, configuração Auth, metadados de objetos e dados/relações em backup cifrado privado. Preservar snapshot e writes posteriores; definir controle legítimo e reversível da janela sem criar pagamentos/reservas de teste. Avaliar direitos do cliente/titulares antes de usar dados. Não criar um backend/projeto novo para fechar número.

Aplicação futura, se indispensável: write-set mínimo revisado, expected version/hash no momento da transação, criação aditiva com ausência comprovada, confirmação após cada write, identificação idempotente e checkpoints privados de retomada. Proibido null→0, recriar Auth/UID, reatribuir organização/papel, apagar recibos/cancelamentos/ledger, relaxar Rules ou reabrir membership revogada. O source adapter atual aceita somente GET e POST listCollectionIds; não reutilizá-lo como aplicador oculto.

## Retorno coordenado

| Componente | Antes de novos writes | Após novos writes |
|---|---|---|
|Frontend|Deployment anterior identificado, smoke/hash e compatibilidade com Rules|Conter tráfego conforme plano, frontend compatível com o schema já avançado|
|Rules|Versão anterior capturada, validar acesso legado e negativaA×B|Não relaxar nem devolver versão que invalide invariantes novas; revisar forward-fix|
|Índices|Preservar existentes, retornar consultas compatíveis|Não excluir índices nem supor que são restaurados por rollback de frontend|
|Auth/config|Conservar contas/UIDs/claims; nunca resetar senha como retorno|Preservar logins e configuração efetiva; mudanças exigem prova/identidade própria|
|Dados/financeiro|Só remover adições comprovadamente próprias/intactas no ensaio apropriado|STOP, preservar eventos, reconciliar e compensar somente com origem/autorização; nunca restaurar snapshot sobre pagamentos recentes|
|Storage/links|Artefatos/bytes/metadados/URLs conhecidos e acesso validado|Preservar objetos/tokens atuais; não substituir contrato de URL por arquivo do emulador|

STOP em qualquer drift, total sem origem, arquivo ausente, falha de autorização, duplicata/conflito, ausência de continuidade Auth, quota/custo novo, mudança de identidade/tenant ou perda de confirmação. Outcome incerto não autoriza retry cego nem exclusão de evidência. RPO/RTO reais permanecem UNKNOWN até medir recuperação e janela de consistência real.

O ensaio administrativo de recuperação nova não exercita autorizaçãoA×B. Reutilizar os aceites anteriores somente no seu SHA; depois dos gates privados, validar em destino isolado apropriado o corpus legado fiel e negativas operacionais sem expor dados ao staging fictício. Só então decidir READY. MIGRATED exige corte/validação posterior, ou demonstração precisa de que evolução compatível não exigiu transporte de dados, seguida de verificação real.

Nesta rodada: sem release de frontend/Rules/índices, sem AppCheck/reCAPTCHA/API/billing/IAM, sem cutover e sem rollback real novo. Nenhum serviço em caravana-af306/caravana-77 foi administrado. Rotas e UI não mudaram; não há justificativa para repetir320/375/768/1440 ou184E2E inalterados.
