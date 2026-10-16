# Storage legado — candidato local, sem publicação

## Fluxo real do aplicativo

O aplicativo recuperado envia comprovantes inline em `registrations/{id}/proofs/current` e lê o conteúdo pelo Firestore autenticado para gerar um Blob local. Esse fluxo permanece. Policy central: PDF/JPEG/PNG por assinatura e tamanho máximo614400 bytes. Não foi adicionado upload Storage nem geração de downloadURL ao aplicativo.

`storage.rules` é um artefato legado. `firebase.json` de produção continua sem configurar Storage. Somente `firebase.test.json` adiciona o emulador local19199 e essas Rules para validação. Não foi criado bucket real, serviço pago, vínculo IAM ou recurso de produção.

## Política candidata

- Mantém os caminhos históricos `proofs/{orgId}/{caravanId}/{registrationId}/{fileName}` e os arquivos intactos.
- Get exige membership ativa com UID/org/role válidos e inscrição vinculada à mesma organização e caravana. Owner/staff têm a mesma leitura de comprovantes da organização. Platform Owner não ganha acesso implícito.
- Não permite listar o bucket. Associação adulterada, acesso cruzado, passageiro sem membership, visitante ou membership revogada são negados.
- Não permite create/update/delete pelo cliente em Storage. Os envios continuam no caminho Firestore já utilizado, com policy de MIME real/tamanho testada. Não restringe a leitura histórica por tamanho novo, evitando inutilizar arquivos legados maiores.
- Não mantém fallback Storage por admins: ele permitiria revogação inconsistente ou mais consultas que o limite. A publicação futura exige primeiro migração aditiva aprovada dos administradores para memberships, com preservação de UID, caminhos e arquivos. O fluxo Firestore tem sua compatibilidade legada temporária própria.

São dois documentos Firestore por leitura: membership e inscrição. O limite de consultas cross-service é documentado em [Firebase Rules limits](https://firebase.google.com/docs/rules/rules-behavior). Não foi usado um resumo de permissões client-side como autoridade.

## Evidência sintética

`npm run test:storage` inicia apenas Firestore/Auth/Storage em loopback, projeto demo-caravana77-test, e usa login real no Auth Emulator. Preparação privilegiada restringe-se à fixture local. Testa download de bytes e metadados próprios, A×B, staff, listagem negada, caminho adulterado, mutações negadas, revogação com admin legado remanescente e HTTP sem token/token inventado (403). Seis casos PASS em f2-storage-final.log.

O runtime Java de Rules registrou NullPointerException ao encerrar stdin após finalizar a suite, assim como aviso Unsafe de JDK25. As operações/testes terminaram PASS/exit0; o problema de shutdown permanece registrado, não é falha ignorada de autorização. Emuladores não foram reutilizados para atingir produção.

## Limites e gate de produção

Download URL com token válido é uma capacidade compartilhável: não confundir com a requisição SDK autenticada ou URL sem token. A documentação distingue [download por URL e download direto pelo SDK](https://firebase.google.com/docs/storage/web/download-files). O aplicativo atual usa o comprovante Firestore e não emite tais URLs. O emulador instalado também trata token de download válido como autorização separada (firebase-tools/lib/emulator/storage/files.js).

Não foi inventariado o bucket real nem revogado token antigo. Estas Rules não provam que URLs antigas com token, IAM público ou objetos fora do caminho estejam privados. Inventário autorizado, revisão de tokens/IAM e plano de compatibilidade são pré-requisitos de qualquer publicação; se houver tokens compartilháveis, definir e simular sua revogação/proxy privado antes do corte real. Essa execução real continua BLOCKED.

Backups de código não substituem backup do banco/arquivos reais. Nunca publicar estas Rules isoladamente antes de validar o administrador legado e obter autorização específica. Os arquivos reais do Ítalo não foram lidos, movidos, apagados ou alterados neste bloco.
