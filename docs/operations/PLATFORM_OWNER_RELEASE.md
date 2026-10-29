# Painel global — preparação de publicação em 29/10/2026

O proprietário solicitou explicitamente registrar uma conta como Platform Owner e integrar o trabalho à main. Essa instrução autoriza esta nova conta global e a integração; o corte do Ítalo e os dados existentes permanecem preservados.

O painel será servido em `/platform/login` e `/platform`, com um build próprio em `/platform-app/`. O pacote mantém os bytes do app operacional e dos arquivos históricos já publicados. A extensão `firestore.platform-operational.rules` acrescenta somente os contratos existentes de gestão de organizações, status, planos, namespace e suporte, todos condicionados a um Platform Owner ativo. Não acrescenta permissões sobre caravanas, inscrições, pagamentos, comprovantes ou os controles do corte.

O papel global é um documento `platformOwners/{uid}` provisionado por identidade administrativa oficial. Nenhum cliente pode criar ou editar esse papel. Não se atribui membership nos tenants nem se inventa assinatura. Onboarding continua exigindo o inventário confiável de namespaces; suporte continua exigindo o consentimento previsto no contrato existente.

`cloudshell-platform-owner.mjs` roda somente no Cloud Shell privado oficial. O e-mail vem de `platform-owner-request.json` privado, com `role=platform_owner`. Para criar a conta ausente, o programa solicita a senha via TTY sem eco; não aceita senha em código, argv, ambiente ou arquivo. O Firebase Authentication gerencia o armazenamento da credencial. A chave de recuperação existente protege a preservação anterior de Auth/configuração. O cadastro usa o SDK Admin oficial, preserva as contas existentes e não marca o e-mail como verificado.

Uma única operação com precondições `exists:false` cria o papel e a auditoria privada do bootstrap. Tentativas são registradas antes do envio. Erros incertos exigem leitura e reconciliação, sem repetir criação. A aplicação não recebe credenciais administrativas de servidor.

O executor operacional passou a reconhecer o manifesto estendido e as Rules compostas, para manter PREVIEW/freeze/retomada protegidos após a publicação global. A marca privada de 33 documentos e o ledger do Ítalo permanecem os mesmos; não há novo COPY ou alteração financeira.

Validações locais: 19 testes SDK/Rules, incluindo gestão global e os contratos operacionais do Ítalo; oito testes do executor transacional; lint/typecheck; recusa do provisionador no PC compartilhado antes de ler credenciais. A publicação requer CI do SHA exato, manifesto/bytes do pacote, readback do papel e login real no navegador privado do Cloud Shell. O resultado hospedado será registrado após a operação; esta preparação não é recibo de cadastro ou deploy.

Referência do SDK para cadastro: [Firebase Admin — gerenciar usuários](https://firebase.google.com/docs/auth/admin/manage-users).
