# GOAL XI — caminho A, evolução in-place aditiva

Destino escolhido: Firebase `caravana-af306` e Pages `caravana-77`, preservados. Não houve escrita nesses alvos. O ensaio usa **somente** `demo-caravana77-test`, Firestore127.0.0.1:18080/Auth127.0.0.1:19099. `bdall-e3585`/`caravana77-staging` continuam exclusivamente fictícios e não receberam mutações nesta rodada.

| Critério | A — in-place escolhido | B — instalação paralela/importação | C — instalação vazia |
|---|---|---|---|
|Integridade/finanças|Mantém documentos/IDs/ledger; cria apenas companions e campos ausentes revisados|Exige transporte e equivalência integral antes de trocar origem|Exige descarte formal específico e arquivo histórico restaurável; não comprovados|
|Auth/links|Conserva Auth/UIDs/senhas e aliases; SDK demonstrou continuidade em fixture|Exige tratar senhas/provedores, UIDs e redirecionamentos; risco adicional|Pode perder acesso/histórico sem autorização adequada|
|Tempo/risco|Menor mudança; legado por admins continua funcionando|Mais infraestrutura e contratos de compatibilidade|Não elimina preservação nem consentimento|
|R$0/contas|Reutiliza projetos atuais; quota real ainda deve ser conferida privadamente|Novo destino/quotas/termos Free não comprovados|Mesma dependência de quota e preservação|
|Reversibilidade|Adições identificadas, retorno antes de tráfego e STOP após writes ensaiados|Legado intacto serviria de seguro, mas faltam dados para importar|Sem histórico privado recuperável, não aceitável|

Evidência empírica da escolha: Rules atuais mantêm `legacyAccess` por `admins/{uid}`, e membership revogada nunca volta ao legado. O frontend resolve `legacyTripAliases`, depois o mesmo caravanId/slug. O onboarding de tenant novo não serve para uma organização já existente: exige raiz ausente e inicializa contadores emzero. Por isso a implementação nova reutiliza catálogo, planner de memberships/baseline e branding, mas usa inventário existente para compor os companions sem resetar a organização.

## O que foi executado

- `in-place-bootstrap.mjs`: gera usage, memberships, tenantTeam, assinatura comercial/entitlements/features, disponibilidade, branding/slug, namespaces e auditoria; nenhuma concessão global. Preserva condições existentes ou bloqueia divergência, sem substituir contrato ou contador.
- Backfill de `status` de caravana só quando o campo está ausente e a visibilidade anterior foi revisada com referência de evidência. Não transforma null financeiro emzero; não altera fare, pagamentos, recibos, passageiros, Auth ou aliases antigos.
- Transação inteira no emulador: checksums de origem, ausência/conflito dos destinos, concorrência, falha após commit e replay. Retorno real no demo remove apenas creates próprios e campos antes ausentes; compara hash before. Com writes posteriores, removezero e exige preservação/reconciliação.
- Sete casos novos nativos + quatro casos SDK novos. Regressões dirigidas:17 casos GOAL X e2 de baseline já existentes, contabilizados separadamente. Typecheck/lint/build E2E sintético PASS. Não repetidos184E2E ou17SDK hospedados.
- Login/senha fictícios mantiveram UID; prova de A×B em documentos privados, reservas/replay, check-in/reversão, pagamento fictício compensado, relatórioPro/downgrade e revogação. IDs de inscrição são capacidades do portal: um get conhecido do portal não foi falsamente tratado como documento privado. Provas/anexos e autorização de tenant são verificações separadas.

## Operação privada seguinte

Reutiliza-se o exportador do GOAL X. O CLI ganhou `--private-in-place-preview`, que coleta/revalida o snapshot e produz **somente contagens**; não grava write-set pessoal nem aplica produção. Exige o mesmo gate privado, identidade oficial e orçamento do exportador. `config.inPlaceReviews` contém, somente no arquivo privado, organização/actorUID existente, plano/condição revisada, branding preservado e eventuais revisões de visibilidade. Ausência/conflito/revogação/limite insuficiente bloqueiam. Não há escolha automática de plano, novo trial, senha ou dono.

```powershell
npm run test:in-place
npm run test:in-place:integration
npm run recovery:private -- --dry-run
# Exclusivamente na sessão pessoal privada, nunca neste laboratório:
npm run recovery:private -- --private-in-place-preview --config D:\CaravanaPrivate\operation.json
```

O executor mutável entregue só aceita o cliente SDK efetivamente conectado ao demo em loopback, inclusive normalização do wrapper Compat. **Não é aplicador de produção.** O plano real e seus efeitos exatos dependem de inventário/backup privados; um hash solto ou flag de revisão não autoriza implantação. O conjunto é limitado a200 documentos de origem/200writes, sem paginação parcial silenciosa. Consistência global exige janela controlada: a transação protege referências conhecidas, não impede criação externa de path novo desconhecido. Sem isso, STOP.

Não houve nova publicação do frontend nem mudança de Rules/índices/Auth/URLs hospedados. A única mudança em `src` foi explicitar `.ts` no import do planner de baseline para reutilizá-lo no Node; o build sintético passou. Rebuild não foi chamado de deploy. Se inventário real contradisser a compatibilidade de A, avaliar B mantendo o legado intacto; C permanece condicionado ao consentimento informado e arquivo restaurável, nunca a um banco vazio.
