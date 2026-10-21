# Convergência final — evidências desta execução

Branch `codex/caravana77-commercial-v1-20261016`. Recuperado `cb321f5`, posterior a `d7cd9c6`; novo checkpoint remoto `253067b` (ferramenta pública Auth e oito testes novos). Relatório complementa, sem apagar, F7_CLOSURE e COMMERCIAL_READINESS da mesma data. Produção permanece proibida.

## Avanço executado

- `scripts/staging-public-auth.mjs`: somente GET, destinos fixos, sem ADC/credenciais de usuário, redirects bloqueados, timeouts/tamanhos limitados, verificação de SHA/bytes do entry publicado e identidade exata do projeto. Relatórios não incluem chave Web, emails, tokens ou respostas brutas. Configuração Web pública recuperada do próprio bundle somente para build local; arquivo ignorado, modo0600, criação exclusiva sem sobrescrever configuração existente.
- **Firebase público real PASS**: GET SDK `/v1/projects` HTTP200, número146882624278; domínio `caravana77-staging.pages.dev` autorizado. GET `/v2/passwordPolicy` HTTP200, ENFORCE/min12. Nenhuma criação de usuário, login, escrita, enumeração de contas ou acesso a documentos. Evidência public-auth-report.json.
- **Candidata253067b compilada**, TypeScript/Vite6.4.4, alvo exato bdall-e3585, 15 arquivos inventariados. Não publicada. Configuração pública não concede permissão administrativa nem credenciais de fixture.
- `scripts/check-staging-candidate-ui.mjs`: ensaio offline reproduzível da candidata, hostname virtual de staging e todos os requests atendidos localmente ou abortados, service workers bloqueados. Oito checks PASS: landing e login em320/375/768/1440, sem overflow, erros de runtime ou tentativa inesperada de backend; planos/diferenciais e contato neutro conferidos. Não valida CSP do servidor, backend, PDF ou login real.
- Manifestos comparados: staging ainda8c1340d; 13/15 arquivos coincidem, incluindo12 assets e headers. HTML e redirects diferem; HTML público reconferido, sem igualdade LF comprovada. Não declarar identidade integral nem atualizar source do deploy por semelhança dos assets.

## SERVICE_DISABLED: conclusão delimitada

O Auth público atual está acessível e responde pelo projeto correto; falha geral de rede/indisponibilidade pública não foi reproduzida. Isso **não diagnostica retrospectivamente o403 administrativo**. O relatório anterior não registra serviço/consumidor do ErrorInfo. APIs públicas com chave Web e GET administrativo com OAuth não são caminhos de autorização equivalentes.

Runtime54 atual sem identidade GCP, secrets ou variáveis gerenciadas. Sem identidade segura não é possível distinguir definitivamente serviço desativado no consumidor OAuth, quota project incorreto ou outra configuração administrativa. Não habilitar APIs nem ampliar IAM por suposição; nenhuma incompatibilidade do CLI é comprovada por esse403. HTTP200 público não comprova provider habilitado, proteção de enumeração, configuração administrativa, login ou sessão autenticada.

**Operação externa mínima:** leitura `GET https://identitytoolkit.googleapis.com/admin/v2/projects/bdall-e3585/config`, via `scripts/staging-readonly-audit.py --auth-source managed-adc`. Exige identidade gerenciada/ADC temporária legítima e `firebaseauth.configs.get`; leituras auxiliares exigem somente permissões enumeradas em FIREBASE_READONLY_ANDROID.md. Configurar conexão segura do ambiente ou executar no Cloud Shell com credenciais mantidas lá; devolver apenas relatório sanitizado. Nunca enviar chaves/códigos pelo chat. Confirmar principal, projeto/número e billing antes das operações; ferramenta fixa bdall e recusa produção/redirecionamentos. Não conceder Owner/Editor, usar credenciais de produção ou alterar quota project/APIs automaticamente. Se continuar403, usar ErrorInfo serviço/consumer sanitizados antes de propor qualquer correção.

## Validação e escopo

10 testes direcionados PASS (oito novos de Auth público mais dois health), lint PASS, build:staging/typecheck PASS, oito verificações UI offline PASS. Logs e relatórios em [evidence/2026-10-21/convergence](evidence/2026-10-21/convergence/).

Aplicativo, Rules, índices e dependências não mudaram desde a7b5785. CI39540369156 permanece válido **para esses arquivos inalterados**:290 backend/Rules,8Auth,6Storage,23 guards Python, recuperação conjunta e184 E2E. Não foi repetido; commits desta ferramenta/documentação usam skip ci intencionalmente. A ferramenta nova foi validada pelos testes direcionados, não pelo CI antigo. A ferramenta visual foi executada sobre a candidata, com relatório próprio. Aviso conhecido de chunk >500kB no build, sem falha.

Nenhum gate integral encerrado: F7 preparação9/10; F8 publicação5/14; GOAL6/17. Desenvolvimento estimado85%=17/20 grupos implementados/testados, GOAL35%=6/17 gates; não são percentuais de produção pronta. F0–F6 preservam aceites locais. Advisories5 de tooling, abuso real e alertas efetivos continuam pendentes; auditoria runtime0 anteriormente comprovada, lock inalterado.

## Próxima execução mínima

1. Recuperar HEAD e ler este documento e COMMERCIAL_GO_NO_GO, sem repetir regressão do código inalterado.
2. Se identidade gerenciada de staging estiver disponível, verificar principal/alvo e executar auditoria somente leitura; capturar causa serviço/consumidor do403 ou config200 sanitizada. Sem identidade, esse item permanece BLOCKED.
3. Somente depois da configuração/IAM/fixtures legítimas e permissões específicas, homologar jornadas reais de três planos, A×B, equipe, reservas, check-in, financeiro fictício, PDF/provas e revogação. Usar ferramentas staging existentes; não adivinhar senhas, grants ou memberships. Não publicar nova candidata enquanto condições coordenadas faltarem.
4. Com responsável/canal operacional e controles Spark comprovados, encerrar abuso/alertas e avaliar advisories upstream sem override incompatível. Separadamente, provas privadas de legado/backup/restore/retorno pertencem à migração do Ítalo.

Não há defeito funcional conhecido dos testes anteriores a corrigir nem módulo comercial essencial identificado para reimplementação. Trabalho restante depende de acesso/configuração/provas reais; novos ciclos de código não substituem esses insumos. Estimativa2–4 ciclos após disponibilização dos insumos, sem garantia diante de achados reais.
