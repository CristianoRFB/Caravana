# Diagnóstico e verificação gratuita — 2026-10-20

## Alertas Pages ativos —23/10/2026

Política de deploy limitada a `caravana77-staging` configurada e enabled, com destinatário definido explicitamente pelo proprietário. Falha/sucesso em preview/canônico do projeto de staging; POST de teste200 e recebimento do e-mail padrão confirmados. Não representa uptime periódico nem erros backend. [Provas, escopo e limites](F7_ALERTS_2026-10-23.md).

App Check de `bdall-e3585`: onboarding do console aberto, app não registrado, Firestore/Auth “Não aplicado”; nenhuma chave/provedor/enforcement salvo. Registro exige provedor/cotas/termos; não aceitar termos nem ativar cobrança ou bloquear tráfego por suposição. Nenhuma produção/backup real tocada. F7 9/10,F8 6/14,GOAL7/17 mantidos.

## Continuação independente da chave —23/10

[Relatório F7 atualizado](F7_SECURITY_CONTINUATION_2026-10-23.md): advisory braces retirado, audit tooling3moderadas/0altas sem patch de dependências; cadeia OpenTelemetry/PubSub permanece aberta. Health recebeu limites de streaming,4 testes próprios e GET real12assets PASS; CI passou a incluir os testes de transporte. Não equivale a alerta ativo ou controle de abuso backend. Guia74c1773 preservado; proprietário segue no computador compartilhado, chave/backup reais continuam pendentes, sem improvisar identidade. F7 9/10,F8 6/14,GOAL7/17 mantidos.

## Estado atual de operação — 2026-10-21

Health e diagnósticos mínimos implementados; manifesto público de staging8c1340d reconfirmado nesta execução, mesmos12 descritores do último health integral. Não houve nova jornada autenticada nem refetch dos bytes de todos os assets. Diagnóstico de API agora classifica serviço/consumidor/permissão sem dados arbitrários (23 guards). Alertas remotos proativos e proteção de abuso ainda BLOCKED: não há canal/provedor/rollout efetivo comprovado. CI de push é verificação pontual, não monitoramento de tráfego; não criar canal/contato fictício nem chamar frontend throttle de proteção de backend. Ações externas mínimas em COMMERCIAL_READINESS_2026-10-21.md.

PASS local: diagnóstico temporário em memória, no máximo 50 códigos padronizados/categorias/minutos, sem mensagem, payload, UID, organização, link, credencial ou envio automático. Limpa ao trocar contexto/sair; falhas tardias de writes anteriores são descartadas. Exportação JSON explícita e local. Error boundary orienta conferir histórico antes de repetir; não inventa rollback de operação confirmada.

8 testes puros/pendências/health PASS; 39 regressões de writes PASS; 8 E2E de landing/diagnóstico nas quatro larguras PASS, incluindo exportação sem conteúdo privado e limpeza após logout. Capturas sintéticas em evidence/2026-10-20/final-ui. Primeira tentativa de teste falhou por PATH sem vitest ao executar Node diretamente; repetida via npm e aprovada, log anterior preservado. Não há falha funcional encoberta.

`node scripts/staging-health.mjs [SHA40]` faz somente GET público do staging fixo, confere identidade, CSP/noindex/DENY e hashes/tamanho de todos os assets do manifesto. Recusa outro alvo e caminhos externos. PASS no runtime19c6564/11 assets. Não autentica, consulta Firestore ou confirma jornadas; não é serviço agendado nem alerta remoto. Executar antes/depois de publicação de staging e em diagnóstico manual. Monitoramento proativo exige responsável/canal real e política de operação ainda não definidos.

Auditoria obrigatória confirmada no servidor permanece nos módulos de operações/financeiro/equipe/planos/roteiros. Esses eventos não são substituídos pelo buffer local. Não anexar logs brutos ou comprovantes a chamados; exportação do diagnóstico é deliberadamente mínima.

BLOCKED release: proteção de abuso no tráfego público precisa de mecanismo verificável no ambiente definitivo (por exemplo App Check com provedor autorizado e rollout compatível), não apenas limitação visual. Não ativado na produção nem anunciado como entregue. Spark mantém o orçamento sem garantir disponibilidade sob abuso.
