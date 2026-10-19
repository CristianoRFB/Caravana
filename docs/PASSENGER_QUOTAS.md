# F6 — quotas de passageiros em reservas e CSV

Status: PASS incremental local; F6 permanece IN_PROGRESS. Nenhuma homologação de produção.

## Contrato

O teto efetivo é min(capacidade física, limite de passageiros do plano). reservedSeats continua sendo o contador operacional das inscrições não canceladas. As Rules exigem plano com crescimento ativo/prazo válido em todo incremento desse contador, tanto na reserva pública quanto na importação administrativa. Documentos e vínculos de inscrições/receipts/manifestos continuam exigidos. Não há quota apenas visual nem plano implícito quando tenantEntitlements está ausente.

A reserva lê a política na mesma transação antes de criar inscrição. Replay exato de uma inscrição já confirmada não cria nova vaga e continua permitido pelo seu link válido, mesmo após bloqueio comercial. A suspensão operacional/remoção do link mantém as próprias restrições anteriores.

CSV faz prévia pelo teto efetivo e confere política em cada etapa atômica. Se o plano mudar durante o lote, a etapa incompatível falha sem apagar etapas confirmadas; relatório mantém o resultado por linha. Replay/deduplicação sem novas linhas funcionam acima do limite após downgrade. Cancelamento e rollback controlado diminuem o contador sem exigir crescimento habilitado, mantendo o histórico e suas demais invariantes.

## Evidências

- f6-passenger-csv-first.log:75 PASS/6 arquivos/21,67s, incluindo reserva concorrente na última vaga comercial, SDK direto com controle positivo na60ª vaga/negação na61ª, crescimento expirado/sem política, CSV/replay/rollback e regressões operacionais/Rules/membership.
- f6-passenger-downgrade.log:1 PASS direcionado/4,91s após adicionar o caso100 passageiros→plano Essencial60. Nenhum histórico apagado; replay funciona, novo crescimento é negado e rollback mantém99 ocupações históricas. Os13 outros casos desse arquivo não foram repetidos nessa rodada.
- f6-passenger-e2e-first.log:10 PASS e2 FAIL por asserção de teste. O portal usa primeiro nome (Oi, Pessoa!), enquanto os dois casos novos procuravam o nome completo. Sem alteração do produto para contornar o teste.
- f6-passenger-e2e-focus.log:2 PASS/26,8s, somente os casos corrigidos em1440/320. Quota de A bloqueia crescimento, seu link privado continua válido e B consegue reservar independentemente. Os10 casos anteriores válidos cobrem CSV/reload/rollback/replay/staff e reservas.
- Lint e TypeScript PASS; E2E compila o build sintético atualizado. Navegadores bloqueiam tráfego não local e verificam zero erros JS/Firebase remoto.

Fixtures declaram o plano explicitamente em contexto Rules-disabled de preparação, sob guard demo-caravana77-test/127.0.0.1:18080. Premium é uma escolha expressa dos casos genéricos (incluindo escala400); testes comerciais substituem por Essencial. Não há fallback de aplicação/regra para Premium. Fixture E2E também prepara baseline conhecido de contadores; nenhum baseline de cliente real foi consultado/criado.

## Pendências F6

O front público ainda apresenta a capacidade física; o servidor já limita novas vagas pela quota. Próximo módulo deve tornar os bloqueios e limites claros na UI. Demo persistente precisa receber sua configuração comercial sintética explícita. Equipe/convites, onboarding completo/guard de namespace e landing continuam pendentes. O teste de escala400 será repetido no gate F6 por ter sua operação/política alterada. Rules/índices/clientes exigem release coordenado futuro; nenhum foi implantado.
