# Regressão do candidato Cloud — 2026-10-19/20

Branch de trabalho preservada. Logs agrupados pela data de início da sessão em docs/evidence/2026-10-19/cloud/. Nenhuma escrita em serviços reais ou Rule implantada.

| Verificação | Estado atual | Evidência |
|---|---|---|
| Lint, TypeScript, build local | PASS | f6-candidate-lint/typecheck/build.log; landing em chunk próprio11,95KB +CSS9,72KB; demais rotas preservadas |
| Suite unit/SDK/Rules completa existente | PASS |216 casos/35 arquivos/65,54s; f6-candidate-unit.log; inclui400 linhas+replay |
| Roteamento local do runner Storage | PASS |13 casos puros; f6-proxy-routing-tests.log |
| Auth real emulado/demo | PASS |8 casos/12,10s; f6-candidate-auth.log |
| Storage privado/isolamento/revogação | PASS |6 casos/18,85s/exit0; f6-candidate-storage.log |
| E2E integral do candidato final | IN_PROGRESS | f6-candidate-e2e.log, quatro larguras |
| Landing antes de extração em chunk | PASS incremental |4 E2E/48,0s e inspeção visual1440/320; f6-landing-e2e.log |
| Convites do LAB04-PC23 | BLOCKED | Código/testes não sincronizados, sem evidência concluída disponível |

## Falhas encontradas e correções

Primeira suite completa:211 PASS/4 FAIL, todas em branding. A fixture F5 criava memberships/caravanas sem organizations/a e organizations/b. A proteção F6 anterior exige raiz válida ou onboarding autorizado para criar branding. A fixture foi corrigida sem alterar runtime/Rules; novo caso nega branding da organização órfã e confere ausência de criação de raiz/settings. Suite final216 PASS. Não houve redução de assertions de segurança.

Primeira suite Storage:3 PASS/3 FAIL nos casos positivos. Diagnóstico confirmou consultas Storage→Firestore locais canceladas antes de avaliar memberships: firebase-tools15.30 cria ProxyAgent mesmo quando NO_PROXY inclui loopback. `f6-storage-proxy-diagnostic.log` contém somente trecho sanitizado; não versionar dumps de ambiente/debug bruto.

`emulator-loopback-proxy.cjs`, pré-carregado apenas pelo runner Storage e apenas na CLI com projeto demo exato, mantém dispatcher original para todas as outras requisições. Somente GET HTTP em127.0.0.1:18080, sob /v1/projects/demo-caravana77-test/databases/(default)/documents/, usa Agent local. Não altera variáveis de proxy, ADC, credenciais, SDK da aplicação ou Rules. Casos negativos cobrem origem externa, projeto/porta/host/protocolo diferentes, credenciais em URL, path traversal e mutações. As seis integrações Storage passaram mantendo negações A×B/guest/passenger/mutações/revogação.

Falhas iniciais da demo por hook frio e invocação fora do PATH npm continuam registradas em F6_DEMO.md. Logs de FAIL são históricos; os resultados finais são os da tabela. As216 verificações e os13 casos novos do runner são execuções separadas; não alegar uma única execução de229.

F6 permanece IN_PROGRESS até sincronizar convites e executar o gate desse módulo, mesmo com a regressão dos arquivos disponíveis aprovada. F7/F8 reais continuam BLOCKED. Nenhum aceite sintético equivale à homologação de produção.
