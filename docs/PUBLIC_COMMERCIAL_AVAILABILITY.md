# F6 — vagas públicas e teto comercial

PASS incremental local; F6 geral permanece IN_PROGRESS e equipe/convites BLOCKED por sincronização do LAB04-PC23.

Catálogo público, página da caravana, placeholder de vagas do FAQ e formulário consideram `max(0, min(capacity, passengersPerCaravan) - reservedSeats)`. Histórico acima do limite continua intacto e aparece sem vagas novas. O total físico não é anunciado como disponibilidade comercial.

O hook observa três documentos públicos: caravana, entitlements e projeção de disponibilidade da organização. Só apresenta número após confirmação de servidor dos três; ausência de plano, erro, cache sem confirmação, suspensão, expiração ou viagem indisponível bloqueiam o anúncio de novas vagas. A leitura não solicita contrato, valores promocionais, UID ou dados privados da organização. Expiração é reavaliada na interface a cada segundo e continua autoritativa em transação/Rules pelo tempo do servidor.

A contagem é informativa; outra reserva pode ocupar a vaga antes do envio. A UI explica que a confirmação ocorre ao concluir a reserva. Mudanças de quota, ocupação e suspensão atualizam a interface sem limpar o rascunho. O botão de tentativa anterior continua disponível para recuperar um commit já confirmado, inclusive com vagas esgotadas ou crescimento bloqueado; a operação existente conserva seus testes SDK/Rules. Links de consulta continuam disponíveis.

## Evidência executada

- PASS: `npm run test:public-seats`, 45 testes em três arquivos, incluindo cálculo/ausência de política/expiração exata/downgrade, integração de reservas e Rules (26,11s, exit0).
- PASS: `npm run test:public-seats:e2e`, 26 E2E em 1440/320: catálogo e ocupação ao vivo, suspensão/expiração sem apagar formulário, A×B, última vaga/retry, marcas/aliases e demo/financeiro preservados (2,0min, exit0).
- PASS: lint, typecheck e build compilado pelo Playwright. Inspeção visual direta de capturas reais de formulário em 1440/320; texto/botão sem corte ou overflow. Capturas geradas em test-results/ nesta execução.
- FAIL de invocação inicial: execução direta fora do npm não encontrou vitest no PATH, sem executar testes; log separado. Usar os scripts npm documentados.

Logs: docs/evidence/2026-10-19/cloud/f6-public-seats-*.log. Nenhuma Rules foi alterada neste módulo, nem houve escrita real, migração ou publicação.
