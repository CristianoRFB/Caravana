# Operação do Ítalo após o corte — 29/10/2026

O tenant `italo` está em `target_active`, geração 5. O destino é o único escritor. A caravana existente permanece em operação, conforme decisão do proprietário; a data passada não a encerra. Não foi atribuída assinatura, plano ou trial.

Produto publicado: `e3a465f15a1bd98946f01c037734432848cd9094`. CI [40929890152](https://github.com/CristianoRFB/Caravana/actions/runs/40929890152) e [40929890169](https://github.com/CristianoRFB/Caravana/actions/runs/40929890169), ambos SUCCESS. [Resultado sanitizado](HOSTED_OPERATIONAL_RESULT_2026-10-29.json).

## Publicação e âmbito

- Firebase: `caravana-af306`, número `742921744156`, Standard/freeTier, billing=false.
- Rules: `firestore.italo-operational.rules`, SHA256 `8ceb58325c16b02e2aedc5c1a11e13f7da92ebcf738e70bc5acfb5bff96c2454`, ruleset `336fbe8b-5580-41e4-843f-2d7215f6f3b2`.
- Pages: deployment `ebce9d69-198f-46e5-9892-afdcb8d3af0b`, `https://caravana-77.pages.dev`, dirty=false, sem Functions ou novo domínio.
- Manifesto combinado SHA256 `d1e7ef91fa1cd34e0193d15e66b30325c438c45c477bd2c1515df8914a6dd94e`. Seus campos `publicCutover=false` e `readyForDeploy=false` descrevem a construção anterior à ativação; o estado operacional atual vem dos dois controles Firestore e de seus recibos, não de reescrever o manifesto estático.
- Cinco índices READY; este corte não criou nem removeu índices. As Rules SaaS globais em `firestore.rules` permaneceram intactas.
- Acesso: [/tenant-italo/admin/login](https://caravana-77.pages.dev/tenant-italo/admin/login), com as contas existentes. O proprietário confirmou anteriormente entrada, dados e comprovante. O smoke atual verificou a tela de login; não é uma nova autenticação observada com senha.

A ativação inicial fez 26 writes: dois controles, três ajustes de metadados, vinte aliases e uma auditoria. Não alterou inscrições, pagamentos, comprovantes, Auth ou os 24 originais. Removeu somente os ponteiros transitórios da última reserva na cópia da caravana. Os totais pagos desconhecidos continuam UNKNOWN; o preço da passagem não comprova recebimento.

Os dois slugs e os IDs antigos/novos convergem para o destino. O catálogo filtra o evento de origem e mostra uma única entrada canônica. Os seis assets legados e o app privado anterior continuam no pacote para os contratos preservados. O grant se limita à capacidade física do evento existente e não libera criação de eventos, crescimento de equipe ou plano comercial.

## Ensaios realmente executados

O pacote operacional passou em 40 arquivos públicos e cinco rotas HTTP, com hashes/MIME/cache/CSP, antes e depois do retorno e após o corte. O navegador real, inteiramente no Cloud Shell privado, confirmou evento antigo → destino, inscrição antiga → destino, link novo, alias antigo dentro do app operacional, catálogo único e login. Nenhuma tentativa de write, screenshot, trace ou payload pessoal foi exportada.

O retorno Pages usou o deployment `ca4166eb-c84f-437f-acc0-22f48b576908`: raiz legada e histórico privado originais, com destinos HTML de versão própria para evitar o problema de cache já observado. Vinte arquivos e três rotas passaram após rollback por API; o avanço ao pacote operacional passou novamente.

Rules voltaram ao ruleset privado `392e61a3-ec9c-4b08-9f47-7250c5e7e14f` / SHA256 `77307820aa8878c3d5349b7c15d3ef4b232e9199d56ff59f657bc29bb3fc7c8f` e avançaram ao ruleset operacional. Ponteiros e bytes foram lidos no provedor. Uma sondagem auxiliar usou um nome de coleção sem contrato; a restauração foi reconciliada somente por leitura de `publicTenantCutovers/italo`, sem repetir PATCH.

O controle transacional percorreu `source_active` geração 1 → `frozen` 2 → `source_active` 3 → `frozen` 4 → `target_active` 5. Cada etapa teve PREVIEW, um APPLY e readback. O ensaio real de retorno à origem aconteceu antes da ativação do destino. A recusa de retorno após nova operação de negócio, a perda de ACK e a preservação de dados posteriores têm provas demo dirigidas; não foram simulados pagamentos reais em produção.

## Resposta a incidente depois do corte

Preserve as Rules operacionais e os dados do destino. A contingência privada `ca4166eb` e as Rules privadas `392e61a3` pertencem ao ensaio anterior ao uso do destino; não constituem retorno seguro após operações novas.

Use o checkout operacional limpo no Cloud Shell oficial, ainda no SHA de produto publicado. Os documentos e a chave continuam apenas no diretório privado existente, com diretório 0700 e arquivos 0600. Não transporte esses arquivos ao PC, Git, CI ou chat.

```bash
cd ~/caravana-goal-xiii-d7d4ded-pc27
privateDirectories=( "$HOME"/caravana-italo-tenant-*/private )
[ "${#privateDirectories[@]}" -eq 1 ] || exit 1
node scripts/recovery/cloudshell-operational-cutover.mjs --preview freeze "${privateDirectories[0]}"
# Substitua HASH_DO_PREVIEW pelo hash de 64 caracteres retornado.
node scripts/recovery/cloudshell-operational-cutover.mjs --apply HASH_DO_PREVIEW "${privateDirectories[0]}"
node scripts/recovery/cloudshell-operational-cutover.mjs --verify HASH_DO_PREVIEW "${privateDirectories[0]}"
```

O freeze deixa ambos os escritores bloqueados e preserva a consulta histórica. Para retomar o destino após reparar o problema, use PREVIEW `activate` e o novo hash; a retomada a partir de `frozenFrom=target_active` faz somente três gravações de controles e auditoria, preservando os dados de negócio posteriores.

O executor exige frontend, Rules e CI verificáveis. Se uma falha HTTP impedir essa checagem, restaure primeiro o mesmo pacote operacional compatível `e3a465f` no Pages, mantendo os controles e as Rules operacionais. Corrija a infraestrutura e refaça a prévia. Isso não restaura Firestore nem reabre a origem.

`return-source` após ativação exige que todos os 33 documentos da marca privada e o inventário coincidam com a baseline anterior ao tráfego. Qualquer nova reserva, pagamento, despesa, edição ou revogação impede esse retorno e exige congelamento e reparo para a frente. Não remova essa proteção. A mera volta de HTML/Rules antigos perderia continuidade dos dados novos.

Em commit incerto, execute `--verify` com o mesmo hash: nunca repita `--apply`. O arquivo privado de tentativa bloqueia uma segunda tentativa de commit. Após uso legítimo do destino, uma verificação estrita da baseline pode apontar divergência; investigue o ledger e a auditoria em privado, sem sobrescrever dados para fazer a comparação passar.

## Preservação, prova e custo

A configuração anterior foi cifrada e lida de volta em 29/10: SHA256 do ciphertext `0f14ea97c35ee52da92c3e51b8de9b6f754bfc6d2b02bc402a22a69680e9e6c5`. A marca pós-ativação inclui os 29 documentos copiados e os quatro companions privados. Os 24 originais permanecem integrais; versões imutáveis de Rules/Pages foram preservadas. Isso comprova preservação de componentes e retorno anterior ao tráfego, não segunda custódia ou restauração independente de backup completo.

O custo incremental da operação foi R$0: Firebase billing=false/freeTier e Pages estático, sem novos serviços, plano, Blaze, R2 ou Functions. A fatura agregada da conta Cloudflare permanece UNKNOWN porque o escopo de Billing retornou 403; não houve ampliação de permissões ou compromisso financeiro.

As negativas A×B/revogação e as jornadas autenticadas dirigidas foram exercitadas em demo sobre os bytes publicados. Produção tem a confirmação anterior do proprietário, integridade das duas identidades/memberships, smoke público real e negativa anônima do comprovante; não foi fabricada sessão autenticada B ou novo login com senha.
