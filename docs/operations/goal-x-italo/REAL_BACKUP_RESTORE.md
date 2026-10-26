# Exportação e recuperação privada — GOAL X

## Estado comprovado nesta rodada

IMPLEMENTATION_LOCAL: exportador REST read-only, inventário, archive streaming age, verificação de manifesto assinado, transferência Drive e recuperação offline implementados. Dez documentos fictícios, um usuário fictício, um PDF fictício e dois totais desconhecidos foram exercitados. Dezessete testes unitários/de transporte e um teste integrado age→processo independente→Firestore/Auth/Storage passaram. O mesmo caso age executado fora e dentro dos emuladores conta como **um** caso distinto, não dois. Os sete testes do LAB anterior não foram recontados.

PROD_READ_ONLY / BACKUP_REAL / DRIVE_REAL / RESTORE_REAL: **NOT_RUN/BLOCKED**. O dispositivo continua LAB03-PC15, usuário compartilhado, SHARED_UNTRUSTED. A tentativa de modo privado recusou `SHARED_DEVICE_REFUSED` antes de abrir o caminho de configuração fictício. Não foram lidos payloads, credenciais ou ciphertext de produção. Isso não fecha nenhum gate real.

## Componentes entregues

| Interface | Código | Comportamento e limites |
|---|---|---|
| INVENTORY_READ_ONLY | `scripts/recovery/google-source.mjs`, `inventory.mjs` | Projeto fixo caravana-af306, identidade oficial selecionada fora do laboratório; billing desvinculado/freeTier/Standard exigidos. Paginação com detecção de loops, readTime fixo em documentos/listCollectionIds, inclusive pais ausentes, UIDs/config/Rules/índices, buckets/versões/ACLs e IAM de bucket. URLs externas nunca são seguidas |
| PRIVATE_ENCRYPTED_EXPORT | `archive.mjs` | Documentos/tipos/bytes/config/usuários preservados no envelope; até64MiB de inventário/objeto e estimativa total96MiB. Cifra antes de gravar payload em disco. Revalida Auth/config/Storage e Firestore após leitura; nenhum fallback quando readTime/permissão/checksum falha |
| DRIVE_PRIVATE_VERIFY | `drive.mjs` | Identidade esperada, pasta exata, My Drive sem shared drive, um único owner e permissão owner-only, quota suficiente. Upload resumable de ciphertext assinado; tamanho/SHA remoto, download/hash e privacidade final. Resultado incerto não cria upload novo automaticamente; artefato local retido bloqueia reentrada sem revisão |
| INDEPENDENT_RESTORE | `archive.mjs`, `restore.mjs` | Verifica assinatura/checksum, age completo até EOF, transcript/footer/cobertura/snapshot antes de qualquer write. Destino fixo demo-caravana77-recovery em127.0.0.1. Criações condicionais e readback, reentrada, negativa de conflito, UIDs/claims e bytes em três emuladores |
| MIGRATION_DRY_RUN | `inventory.mjs` + planner existente | Reutiliza planMembershipMigration; preview aditivo versionado com hashes esperados, sem alteração de legado, dinheiro, IDs ou papéis existentes. Conflito/revogação/drift/preview adulterado bloqueiam. **Não existe apply de produção** |
| SAFETY | `safety.mjs`, `private-recovery.mjs` | Dry-run padrão sem ler configuração/credencial/rede. Recusa laboratório/Alunos, requer Windows privado declarado, volumes BitLocker FullyEncrypted/Protection On, paths fora do repositório e sessão oficial correta. Flags/env não podem liberar o laboratório |

O archive contém material Auth sensível, inclusive hashes/salts quando a API efetivamente os entregar, **somente dentro da cifragem**. Eles nunca entram em manifestos públicos ou logs. Não se conclui que a API entregou todos os parâmetros necessários para senhas: `authPasswordRecoveryVerified=false` permanece. A restauração preserva a representação original no banco de recuperação privado e cria UIDs/claims no Auth emulado **sem importar senhas/provedores/MFA**. Não prova login, e-mail, sessões federadas ou continuidade de senha real.

Os bytes de cada geração GCS são conferidos contra MD5/CRC32C do provider e SHA interno. No restore são servidos por nomes próprios derivados em bucket **demo**, com metadados originais preservados à parte. Não se reaproveitam tokens de download em endpoint real nem se promete equivalência de URLs/ACLs/IAM hospedados; o Storage Emulator não reproduz IAM/ACL reais. Fontes com customer-supplied encryption keys, transcoding/encoding não verificável ou objeto inacessível ficam BLOCKED, sem conceder IAM ou ignorar checksum.

## Autenticidade, consistência e falhas

SHA256 sozinho não autentica origem. O exportador produz `.age` **candidato** e manifesto canônico `.age.manifest.json`, sempre `backupComplete=false`, aguardando assinatura pessoal e recuperação real. A mesma snapshotId liga manifesto e envelope. Assinatura SSH em namespace `caravana77-backup` é verificada por signer público previamente fixado; a chave de assinatura privada não é lida pelo programa. Os testes exercitam assinatura Ed25519 e troca de chave; o comando SSH de operação pessoal segue o manual oficial, mas não foi executado com identidade do proprietário.

Manifesto/assinatura/signer público precisam de segunda cópia confiável para recuperação após perda do PC. O fluxo Drive envia somente `.age`; **não** considerar o upload isolado um backup completo se esses materiais de autenticação não estiverem recuperáveis. Não enviar identidade privada age ou chave privada de assinatura para a pasta do backup.

Firestore tem readTime único; Auth/config/GCS usam comparação antes/depois e gerações fixas. Isso **não fornece transação atômica entre serviços**. Controle legítimo da janela de escritas, quotas, relógio e reconciliação de delta continuam necessários para prova real. A flag de declaração da janela não congela produção. ReadTime fora da janela suportada, mudança de entidade/tenant, replay de snapshot, truncamento, paginação repetida, quota/HTTP403 e mismatch interrompem sem PASS. O pipeline não grava plaintext temporário; `.partial` retido é ciphertext e nunca promove backup. Criação final usa link exclusivo, sem substituir arquivo existente.

Um usuário com recipient público poderia produzir outro envelope age: por isso a assinatura/pin do signer é obrigatória antes de upload/restore. Nem prefixo age nem digest sozinho autorizam usar arquivo arbitrário; assinar apenas saída do exportador revisado. Não há bypass de assinatura por flag CLI.

## Procedimento pessoal, após custódia e isolamento

Usar Node24, gcloud oficial já autenticado na identidade aprovada, Java compatível com emuladores, age oficial e OpenSSH. Nenhuma instalação/login novo foi feito no laboratório. Configuração privada fora do repo, em volume criptografado; [modelo sanitizado](private-config.example.json) contém apenas placeholders. Nunca colocar token, senha, chave, service account JSON ou frase nesse JSON. O checker BitLocker roda somente em leitura; se indisponível/sem permissão, bloqueia e não ativa criptografia ou altera Windows.

```powershell
# Sempre seguro, não abre configuração nem faz chamadas:
npm run recovery:private -- --dry-run
# Os próximos comandos são SOMENTE para o Windows pessoal confiável:
npm run recovery:private -- --private-inventory --config D:\CaravanaPrivate\operation.json
npm run recovery:private -- --private-export --config D:\CaravanaPrivate\operation.json
```

Parar se inventário não cobrir anexos/links, papéis, Auth, órfãos ou dois totais desconhecidos. Totais ausentes continuam null/UNKNOWN; preço da passagem, PIX relatado e ledger vazio não viram pagamento confirmado. Campos int64 fora da precisão JS são preservados tipados e recusados como centavos verificáveis, sem arredondamento. O relatório expõe contagens, nunca IDs/valores pessoais.

O proprietário assina pessoalmente o manifesto com chave protegida já aprovada, fora da sessão do agente:

```powershell
ssh-keygen -Y sign -f D:\CustodiaPessoal\signing_key -n caravana77-backup D:\CaravanaPrivate\snapshot-UNIQUE.age.manifest.json
```

A frase é digitada no prompt do programa. O arquivo `allowedSignersFile` deve conter somente a identidade pública fixada, por exemplo `caravana77-owner namespaces="caravana77-backup" ssh-ed25519 PUBLIC_KEY_FROM_OWNER`. Conferir fingerprint por canal independente, conservar segunda cópia do manifesto/assinatura/signer; não fornecer chave privada ao agente.

```powershell
npm run recovery:private -- --private-drive --config D:\CaravanaPrivate\operation.json
# Iniciar SOMENTE emuladores privados e projeto demo, sem import de produção em staging:
node node_modules/firebase-tools/lib/bin/firebase.js emulators:start --config firebase.recovery.test.json --project demo-caravana77-recovery --only firestore,auth,storage
# Em outro terminal pessoal; age pede a frase diretamente ao proprietário:
npm run recovery:private -- --private-restore-dry-run --config D:\CaravanaPrivate\operation.json
npm run recovery:private -- --private-restore-apply --config D:\CaravanaPrivate\operation.json
```

A operação mutável acima escreve **apenas no destino demo local** e exige lock de escritor único. Uma queda dura deixa o lock para investigação; não apagar dados nem lock sem conferir processo/estado. Volumes de identidade, configuração e destino devem estar criptografados. Usar isolamento de rede compatível com o ambiente privado; o programa só escreve em loopback e não certifica sozinho firewall, swap, dumps, sincronização de perfil, posse física ou disco de outras aplicações. A declaração pessoal não basta para certificar todos esses controles: verificá-los antes da prova real.

Para medir a operação pessoal, registrar UTC inicial/final, readTime do envelope, contagens/hashes autenticados e cronômetro real (`Measure-Command` no terminal pessoal). Tempo de teste sintético não é RTO real; sem prova de janela/delta, RPO permanece UNKNOWN. Login/ACL/revogação, links hospedados, dois totais e contratos Auth precisam de verificações privadas separadas antes de fechar restauração ou READY.

Se gcloud/Drive tiverem escopo insuficiente, código retorna BLOCKED: não amplia IAM, ativa APIs, renova token ou aceita termos. Reconfirmar R$0 real, capacidade e comportamento no limite para as operações planejadas. Nenhum procedimento aqui permite criar billing/Blaze/projeto real ou restaurar em bdall-e3585.

## Fontes primárias verificadas em26/10

- [Firestore listCollectionIds/readTime](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/listCollectionIds) e [listDocuments/showMissing/readTime](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/listDocuments).
- [Auth accounts.batchGet](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/batchGet).
- [GCS objetos/generation/preconditions](https://docs.cloud.google.com/storage/docs/json_api/v1/objects/get).
- [Drive uploads resumable](https://developers.google.com/workspace/drive/api/guides/manage-uploads) e [files.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get).
- [OpenSSH sign/verify e allowed signers](https://man.openbsd.org/ssh-keygen.1).
