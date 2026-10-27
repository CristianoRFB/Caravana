# Operação privada GOAL XIII — sem repetir COPY

## Escopo disponível

Código da ativação privada: snapshot/copy-plan cifrados originais são a fonte, sem exportá-los para o Cloud/CI/chat ou notebook. A operação cria **até4companions faltantes**, só exists:false: publicTenantSettings/italo, tenantSlugs/italo, organizationAvailability/italo e ledger organizations/italo/tenantActivations/private-v1. Não cria/atualiza nenhum dos29 documentos da cópia nem24originais; não altera Auth/membership/assinatura/entitlements/financeiro/caravana. O tenant e os links novos ficam em leitura histórica; nenhuma caravana é publicada. Não há flag COPY neste executável.

PREVIEW exige o planHash real5d3c40d9… e revalida cópia, dados/versões e owners existentes; difere de um plano que presumisse destino vazio. Contrato/plano nunca é inventado. Divergência/revogação interrompe; não forçar, apagar, recriar ou substituir snapshot para obter PASS. Original com novas operações legítimas exige revisão privada da evidência, não outra COPY automática.

Permissões já existentes necessárias, sem criar papel: identidade oficial da conta usada na cópia; leitura de projeto/custo/banco e usuários Auth para conferir UIDs/disabled; leituras Firestore dos documentos conhecidos e transação com criação somente dos4companions. Ausência de IAM/serviço/custo comprovado interrompe, sem habilitação automática. Sem browser token, senha, OTP, chave de service account ou nova conta. O script fixa caravana-af306/número742921744156 e exige Spark/Standard/freeTier/sem billing. Não usa bdall como destino de dados reais.

## Procedimento único em Cloud Shell privado do proprietário

Usar a mesma sessão privada oficial que preserva o diretório `~/caravana-italo-tenant-…/private` da operação26/10, com snapshot.enc, copy-plan.enc e snapshot.key. Não copiar esses arquivos para este repositório nem a máquina compartilhada. O diretório e arquivos devem pertencer ao usuário e ter permissões0700/0600, sem symlinks. Não pedir/envia-los pelo chat. A chave e o ciphertext no mesmo home **não são segunda custódia**.

1. Em checkout público limpo da branch GOAL XIII, conferir origin, HEAD e Node>=24. Código candidato fixado em `d7d4ded7bbbe07500a87481ef19add7bdb0edb12`; consultar o resultado integral exato no ledger antes de operar. Fixar a revisão de código cujo CI integral consta no ledger desta entrega. Não utilizar main, branch velha ou código editado depois da prova sem revalidar. No checkout público, são suficientes Node24 e os arquivos fonte; os módulos de ativação não carregam Firebase SDK nem age para essa operação REST. Manter proxy/CA da sessão, sem flags de debug.
Checkout novo, sem substituir arquivos existentes:

```bash
CARAVANA_CODE="$HOME/caravana-goal-xiii-d7d4ded"
test ! -e "$CARAVANA_CODE" && git clone --single-branch --branch codex/caravana77-goal-xiii-activate-italo-cloud-20261026 https://github.com/CristianoRFB/Caravana.git "$CARAVANA_CODE" && cd "$CARAVANA_CODE" && git checkout --detach d7d4ded7bbbe07500a87481ef19add7bdb0edb12
```

Se o clone falhar ou a pasta já existir, parar e revisar o checkout; não continuar por cima. Antes do comando remoto, exigir `test "$(git rev-parse HEAD)" = d7d4ded7bbbe07500a87481ef19add7bdb0edb12` e `test -z "$(git status --porcelain)"`. Os bytes do commit fixado são a fonte, não o HEAD futuro da branch. Node24 é pré-condição; não instalar runtimes/credenciais por links recebidos fora do procedimento oficial.

2. Selecionar o diretório privado original localmente:

```bash
read -r -p 'Diretório privado ORIGINAL da cópia: ' CARAVANA_PRIVATE
node --version
git remote get-url origin
git rev-parse HEAD
```

3. Preparar **uma vez** `activation-review.json` nesse diretório, modo0600. O conteúdo abaixo é um modelo público sem contato ou plano: revisar em privado a marca aprovada/preservada. Usar apenas campos realmente autorizados, sem inventar telefone, email, logo, contrato ou preço. Não sobrescrever revisão/plano anterior. Se estes defaults não representam a marca aprovada, editar o arquivo privado antes do primeiro PREVIEW; a revisão fica cifrada e vinculada ao plano.

```json
{
  "copyPlanHash": "5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10",
  "privateHistoryOnly": true,
  "branding": {
    "organizationId": "italo", "slug": "italo", "publicName": "Ítalo",
    "description": "", "primaryColor": "#6d4aff", "logo": "",
    "website": "", "contactEmail": "", "whatsapp": "", "operationalMessage": ""
  }
}
```

4. Executar PREVIEW. A pasta precisa já existir; não escolher outra pasta ou recriar arquivos caso um guard falhe:

```bash
umask 077
node scripts/recovery/cloudshell-tenant-activation.mjs --preview "$CARAVANA_PRIVATE"
```

Saída esperada PRIVATE_ACTIVATION_PREVIEW,24originais/29copiados/0a4companions faltantes,0Auth/negócio/contrato writes. Plano cifrado activation-plan.enc gravado com wx; novo PREVIEW com mesma revisão revalida/reutiliza sem sobrescrever. Guard estrito revalida o estado; não contornar se expirou/mudou/foi revogado.

5. Com preview consistente e preservação confirmada, a autorização do GOAL XIII cobre estas criações aditivas precisas. Executar APPLY, depois VERIFY, conservando somente o relatório sanitizado como evidência pública:

```bash
node scripts/recovery/cloudshell-tenant-activation.mjs --apply "$CARAVANA_PRIVATE"
node scripts/recovery/cloudshell-tenant-activation.mjs --verify "$CARAVANA_PRIVATE"
```

**Não executar --apply-copy-to-italo.** Se houver timeout, ack perdido ou ACTIVATION_VERIFY_REQUIRED_DO_NOT_RETRY_COMMIT, primeiro executar somente --verify. Commit não é repetido automaticamente. Readback completo reconhece replay sem novas criações. Estado parcial/conflitante exige STOP, sem repair/overwrite/delete. Não chamar COMPANIONS_VERIFIED de autenticação real ou de public cutover: o relatório mantém accessAuthenticated=false/publicCutover=false.

## Gates antes de Rules/frontend hospedados

A existência dos companions não atualiza as Rules publicadas nem o aplicativo unitário. GET público do release staging em27/10 confirmou fonte67ce0328d7bf1b7395e71627cdc85c88667c77ec, diferente desta candidata; não presumir que8c1340d ainda é a versão atual. Não houve reensaio remoto nesta sessão. O bundle público de produção foi conferido somente por HTTP/bytes nesta sessão: index-BXYRgZFm.js/SHA90677dd6…; nenhuma consulta Firebase do cliente ou login foi executado. Isso não prova compatibilidade de código/Rules por si só.

Antes de publicar:

- Ler/guardar a release Rules/índices/Auth e deployment Pages atuais por identidade oficial, preservando versões/hashes e caminho de retorno dos componentes afetados. Não exigir backup de todo provedor para4criações aditivas, mas não publicar Rules/roteamento com custódia/retorno dos componentes afetados desconhecidos.
- Comparar realmente o contrato de reserva/recibo/nonce/quotas do cliente unitário e das Rules hospedadas com a candidata. Há fonte legado sem companheiros comerciais na cópia; não presumir entitlements/contrato para a origem nem bloquear o fluxo gravável original ao publicar a candidata. O cliente atual não foi autenticado nem exercitado aqui. Se houver incompatibilidade, preparar adaptação e repetir testes direcionados, não relaxar Rules ou atribuir um plano inventado.
- Delta de índices desta branch:zero. Não apagar/recriar11índices por rotina. As Rules têm delta funcional (history fence, null financeiro, ledger privado e guard de compatibilidade); **não usar reconcile-staging-rules.py**, que é exclusivamente a reconciliação CRLF histórica e agora recusa esta candidata.
- Preparar/provar staging com exclusivamente fixtures, versão/Rule hashes consistentes, UI nas quatro larguras, Auth/ACL/revogação/links/financeiro.17SDK históricos continuam prova do seu SHA, não aprovação automática destas Rules novas. Nesta sessão há9SDK novos em demo, não em bdall/prod.
- Só então publicar versão ordenada/compatível, com rollback real aplicável e smoke do login existente/tenant selecionado, leitura de1caravana/10inscrições/provas/histórico/totais desconhecidos. Não criar pagamento real ou reserva real de teste. Registrar UID preservado em prova privada; só contagens/booleans/SHA/versões em público.

## Retorno preservando dados

Não há delete/rollback de dados na ferramenta. Antes de tráfego, uma retirada de companions não é um objetivo: manter a cópia/ledger e restaurar somente a release compatible previamente preservada. O rollbackDecision retorna deleteBusinessDocuments=false sempre. Se fonte/cópia ou companion mudou, retorna STOP_FORWARD_DATA_RECONCILIATION_REQUIRED. Nenhuma tentativa de limpar a coleção ou desfazer operações do usuário.

Depois de acesso/uso, um frontend antigo não pode ser restaurado sem verificar se suporta os documentos/configuração novos. Rollback de frontend não desfaz Rules/Auth/índices/dados. Manter originais e novos eventos, interromper o rollout e reconciliar forward-data. Regras de bloqueio da cópia valem só onde importPending=true; o release anterior só pode voltar se preservar o acesso legado e nenhum novo tenant dependente ficar exposto.

## Corte público — ainda não implementado/liberado como execução

A ativação privada não é public cutover. A origem permanece o único fluxo público gravável; a cópia não aceita novos bearer links, pagamentos/check-in/documentos ou reservas. Antes de retirar importPending ou publicar destino, é necessária janela controlada e reconciliação de writes posteriores à cópia, vínculos/URLs e roteamento de um único escritor por reserva, com decisão comercial baseada em contrato real. Não basta publicar duas caravanas equivalentes ou zerar contadores. Essa etapa fica bloqueada sem evidência real; não há comando genérico de corte nesta entrega.

Segunda custódia/recuperação independente e conteúdo/metadata de anexos fora de Firestore continuam não comprovados. Comparar fields de29docs não prova cópia de objetos Storage; metadados/URLs/ACL e integridade dos arquivos exigem validação própria no ambiente autorizado. Nenhum objeto/UID/senha real foi copiado para Cloud/CI/Git nesta sessão.
