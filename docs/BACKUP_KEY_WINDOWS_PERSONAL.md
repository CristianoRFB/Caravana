# Chave do backup — executar somente no seu Windows pessoal

O proprietário confirmou em23/10/2026 que pode guardar a chave em seu dispositivo pessoal Windows. Este procedimento prepara essa custódia; não acessa o Firebase, não exporta dados reais e não autoriza cutover. **Não executar no computador da faculdade.**

A pasta privada do Drive já foi autorizada. O que falta nesta etapa é uma identidade de recuperação fora do repositório, do chat e do computador compartilhado, com recuperação testada. Só o destinatário público `age1…` será fornecido à operação.

## 1. Instalar no dispositivo pessoal

Abra o PowerShell no seu Windows pessoal e instale pelo identificador publicado pelo projeto oficial:

```powershell
winget install --id FiloSottile.age --exact
```

Conclua pessoalmente qualquer interação do instalador. Depois, abra um novo PowerShell e confira:

```powershell
age --version
age-keygen --version
```

O procedimento foi preparado para age1.3.2, versão usada no ensaio sintético. Se a versão instalada for diferente ou os comandos não existirem, informe apenas a versão/erro; não crie chaves por outro programa improvisado. [Instalação oficial](https://github.com/FiloSottile/age#installation).

## 2. Criar a identidade já cifrada

Os comandos abaixo escrevem apenas a identidade cifrada. A chave privada textual passa entre os dois programas em memória, sem arquivo bruto intermediário. A pasta usa o armazenamento local do seu perfil, fora do repositório.

```powershell
$recoveryDir = Join-Path $env:LOCALAPPDATA "Caravana77-Recovery"
New-Item -ItemType Directory -Path $recoveryDir -Force | Out-Null
$identityFile = Join-Path $recoveryDir "italo-recovery-identity.age"
if (Test-Path -LiteralPath $identityFile) {
    throw "A identidade já existe. Não sobrescreva nem gere outra por repetição."
}
age-keygen | age --passphrase --output $identityFile
if ($LASTEXITCODE -ne 0) { throw "Criação não confirmada; pare e confira o erro." }
```

O próprio `age` pedirá uma frase secreta e sua confirmação. Digite diretamente no programa, no seu computador. Use uma frase forte mantida em seu gerenciador pessoal; não a inclua no comando, chat, screenshot ou nome do arquivo. Não deixe a frase vazia para este procedimento. A linha `Public key: age1…`, se aparecer, é pública. A linha `AGE-SECRET-KEY…` é privada e nunca deve ser enviada.

Este fluxo de identidade protegida por frase é suportado pelo [age oficial](https://github.com/FiloSottile/age#passphrase-protected-key-files). A identidade não será gerada ou digitada por um agente na máquina compartilhada.

## 3. Recuperar somente o destinatário público

Ainda no dispositivo pessoal:

```powershell
$recipientLines = @(age --decrypt $identityFile | age-keygen -y)
if ($LASTEXITCODE -ne 0 -or $recipientLines.Count -ne 1) {
    throw "Recuperação da identidade não confirmada. Não prossiga."
}
$publicRecipient = $recipientLines[0].Trim()
if ($publicRecipient -notmatch '^age1[0-9a-z]{58}$') {
    throw "Era esperado um único destinatário público X25519 age1. Pare e confira."
}
$publicRecipient
```

O prompt da frase acontece no programa. O pipeline descriptografa a identidade em memória e exibe apenas seu destinatário público. Não execute `age --decrypt` sobre a identidade sem o segundo programa do pipeline, pois isso exibiria a chave privada. A opção `-y` é descrita no [manual oficial do age-keygen](https://github.com/FiloSottile/age/blob/v1.3.2/doc/age-keygen.1.html).

## 4. Testar sem dados reais

Crie e recupere um arquivo de teste, com nomes novos para evitar sobrescrita:

```powershell
$testId = [guid]::NewGuid().ToString("N")
$plainTest = Join-Path $recoveryDir "synthetic-$testId.txt"
$cipherTest = Join-Path $recoveryDir "synthetic-$testId.age"
$restoredTest = Join-Path $recoveryDir "synthetic-$testId-restored.txt"
Set-Content -LiteralPath $plainTest -Value "CARAVANA77_SYNTHETIC_RECOVERY_$testId" -Encoding ascii
age --recipient $publicRecipient --output $cipherTest $plainTest
if ($LASTEXITCODE -ne 0) { throw "Cifragem do teste falhou." }
age --decrypt --identity $identityFile --output $restoredTest $cipherTest
if ($LASTEXITCODE -ne 0) { throw "Restauração do teste falhou." }
$originalHash = (Get-FileHash -LiteralPath $plainTest -Algorithm SHA256).Hash
$restoredHash = (Get-FileHash -LiteralPath $restoredTest -Algorithm SHA256).Hash
if ($originalHash -ne $restoredHash) { throw "Integridade do teste falhou." }
"PASS: teste sintético recuperado com SHA256 idêntico."
```

Esse teste verifica o par de chaves e a frase; não é restauração dos dados reais do Ítalo.

## 5. Guardar uma segunda cópia recuperável

Copie **somente o arquivo cifrado** `italo-recovery-identity.age` para um segundo local privado sob sua custódia, por exemplo um pendrive pessoal guardado separadamente. Guarde a frase em local separado do arquivo. Não envie essa identidade ao chat/repositório/computador da faculdade e não a coloque junto ao backup no Drive usado pela operação.

Antes de considerar a segunda cópia válida, use-a no lugar de `$identityFile` em um novo teste sintético de descriptografia e confira novamente o SHA256. O original funcionando não comprova que a segunda cópia é recuperável. Se qualquer teste falhar, o backup real permanece bloqueado.

## O que informar ao Codex

Envie somente:

- a única linha pública que começa com `age1…`;
- se o teste sintético passou;
- se a segunda cópia cifrada foi recuperada com sucesso em teste.

Não anexe arquivos de identidade, frase secreta, chave privada, códigos ou prints do terminal. Com o destinatário público validado e a custódia confirmada, a próxima etapa será o backup candidato cifrado no ambiente privado, seguido de download de verificação e restauração isolada real. Nenhum desses gates está antecipadamente aprovado.

## Estado da execução

Guia preparado e conferido contra documentação oficial. **NOT_RUN no dispositivo do proprietário.** Nenhuma chave do proprietário foi criada pelo Codex. O ensaio sintético anterior usa chaves descartáveis e não serve como chave real. Os comandos devem ser executados pelo proprietário no dispositivo pessoal.
