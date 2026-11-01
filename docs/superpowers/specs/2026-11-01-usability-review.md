# Revisão da mudança UX/UI

Revisão independente, somente leitura, do diff sobre ddf1341 e dos componentes/testes novos. Não houve execução de produção nem alteração de arquivos pelo revisor.

## Resultado e correções

Veredito inicial: **With fixes**; nenhum Critical, dois Important.

1. O resumo de validação lia os campos antes de o `onChange` montar/desmontar os campos de responsável. Reproduzido na inscrição e na edição: dois links continuavam no resumo depois de mudar a data para adulto. Corrigido com coleta após o commit do evento e guarda de formulário conectado. Os testes cobrem menor → adulto → menor, sumiço/reaparecimento dos links e foco no controle atual.
2. A mensagem genérica substituía a explicação nativa de mínimo/máximo/incremento. Reproduzido com Vagas=1001 sem informar o teto1000. Corrigido com limites explícitos, incremento localizado e preservação de `validationMessage` para constraints não traduzidas.

Três reproduções FAIL antes da correção; depois, **36/36 E2E de usabilidade PASS**, nas quatro larguras. Não houve segunda revisão independente depois das correções; a validação do ajuste é pelos testes de reprodução e regressão.

O revisor também apontou cobertura incompleta de Tab/URL/resize como Minor. Como esses comportamentos estavam nos critérios de aceite, foram acrescentadas verificações: Tab não alcança o menu fechado, Escape/fundo não alteram a URL e ampliar para desktop fecha o drawer sem deixar o conteúdo inerte ou o scroll bloqueado. As verificações passaram; não foi necessária mudança adicional de comportamento.

## Limites da revisão

- Leitores de tela reais e entrevistas com clientes não foram executados; não declarar certificação WCAG ou estudo com usuários reais.
- A inspeção estática de basename/UNKNOWN/ACL não equivale a homologação hospedada. As suítes sintéticas operacional e privada e a regressão completa do CI devem ser registradas pelo SHA.
- Capturas e dados de teste são exclusivamente sintéticos. Nenhuma senha, UID ou payload real foi utilizado.
- A pesquisa usa W3C/WAI, NN/g e GOV.UK; fontes e decisões estão no design de31/10.
