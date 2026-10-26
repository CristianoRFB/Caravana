# Execução LAB03-PC15 — 26/10/2026

## Escopo e procedência

Mandato: `CARAVANA_77_GOAL_IX_LAB03_PC15_CODEX.txt`, lido do diretório externo de prompts. Prevalece a restrição do laboratório compartilhado: UNTRUSTED para dados pessoais e custódia. Este pacote encerra o trabalho seguro desta rodada; não encerra homologação comercial nem migração.

Diretório efetivo: `C:/xampp/77/Caravana`. Origin confirmado: `https://github.com/CristianoRFB/Caravana.git`. Um único worktree Git registrado. Branch encontrada já isolada: `codex/caravana77-desktop-finalizacao-20261026`, limpa, sem WIP. Base e comercial remoto após fetch/prune: `6453da4949dd98de7f933b4c7c4fa5f1b61438ec`; sem avanço remoto encontrado. Main não foi alterada. Não houve reset, clean, stash, rebase, force ou checkout de outra pasta.

CI da base reconferido por API pública: [40026123522](https://github.com/CristianoRFB/Caravana/actions/runs/40026123522), completed/success, SHA exato acima. O novo código está no commit `71eec58e3c5837ab9e850f6c80ce6d2957781ac4`; commits documentais posteriores são identificados por `git log`. O CI da base não aprova essas adições.

## Capacidades observadas

| Capacidade | Estado | Evidência e limite |
|---|---|---|
| Git 2.54.0.windows.1 | ACCESSIBLE | Fetch, status, branches, log e commit locais |
| PowerShell 7.6.5 | ACCESSIBLE | Shell efetivo; instalador local validado pelo parser |
| Node 24.11.1 / npm 11.7.0 | ACCESSIBLE | npm ci --ignore-scripts --no-audit --no-fund; sem mudança de lockfile |
| Java 25.0.1 | ACCESSIBLE | Apenas versão; sem nova suite integral de emuladores |
| Docker client 29.5.3 | BLOCKED | Pipe do daemon Linux ausente; nenhum serviço foi iniciado |
| Git Bash | NOT_REQUIRED | Git Windows disponível; `bash` no PATH é launcher Windows/WSL, não foi tratado como Git Bash |
| Go / gcloud | NOT_REQUIRED | Ausentes; não instalados |
| age 1.3.2 | ACCESSIBLE local | ZIP Windows x64 oficial, SHA256 GitHub conferido, sem instalação global/PATH |
| Firebase administrativo | NOT_REQUIRED nesta rodada | Nenhum login, projeto, documento ou usuário consultado; CLI local instalado como dependência, sem invocação autenticada |
| Cloudflare staging | READ_ONLY | Conector existente; GET de políticas/cron/histórico e SELECT agregado de logs da sonda |
| Billing atual Cloudflare | NEEDS_OWNER | Endpoint subscriptions recusou OAuth com 403; não solicitar escopo/token adicional. Free/$0 tem apenas a evidência histórica de 23/10 |
| Drive / chave pessoal / produção | BLOCKED | Proibição explícita neste dispositivo; conectores não usados para payload pessoal |
| Push Git | BLOCKED | 403: identidade do Git local sem permissão; nenhum login/token persistido pelo agente |

SHA256 do ZIP oficial: `f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7`. Origem: [release age v1.3.2](https://github.com/FiloSottile/age/releases/tag/v1.3.2). Conferência feita contra digest publicado pela API GitHub, sem alegar verificação Sigstore. Binários e ciphertexts fictícios ficam em `.firebase/`, ignorado por Git. Não há arquivos de identidade privada ou plaintext gerados por este ensaio. As chaves descartáveis de teste passaram somente em memória entre subprocessos; isso não garante eliminação física de memória/swap e nunca deve ser usado para dados reais neste laboratório.

## Trabalho executado

- Ensaio offline adicional com corpus fixo inventado: 6 documentos, 2 metadados Auth, 1 objeto fictício e 1 link. Cifragem age, manifesto/hash, cópia local do ciphertext, leitura/decifragem em processo separado, interrupção após 2 itens e retomada de 10 itens; replay cria zero.
- Negativas reais age para identidade errada e adulteração autenticada; testes de manifesto para truncamento, bytes extras e cobertura adulterada. Nenhum exportador de produção foi criado ou executado.
- Modelo offline de compensação append-only e retorno coordenado de quatro componentes; alterações posteriores exigem STOP e preservação. Não substitui o ledger da aplicação nem o rollback de infraestrutura.
- Sete testes Node PASS, lint PASS, sintaxe Node/PowerShell PASS. Logs e relatório em arquivos vizinhos; não foram repetidos 17 SDK/184 E2E/305 backend já comprovados sem mudança correspondente.
- Workflow proporcional `lab-recovery.yml` preparado para esta branch pública, runner padrão, sem credenciais, dependências extras, artefatos ou deploy. Não foi executado remotamente antes de publicação.
- Leitura de dois recursos públicos de staging: frontend/headers e release.json PASS, fonte `67ce0328d7bf1b7395e71627cdc85c88667c77ec`. Não equivale à checagem integral de assets nem a jornadas autenticadas.
- Monitor real: seletor e cron conferidos; janela 15:15–16:15 UTC de 26/10 com 4 sucessos/0 erros. Histórico sem END da política de sinal de vida: resolução automática não comprovada.

Nenhum payload pessoal, documento de produção, recibo real, objeto Storage, UID real ou credencial foi exportado/baixado/restaurado. Nenhum deploy, mudança de staging/produção, IAM, API, billing, App Check ou termo foi realizado. R$0 de novos recursos/serviços ativados. Não foi reconferida a totalidade do billing externo.

## UX e provas reaproveitadas

Nenhuma tela ou fluxo do produto mudou. Não foi aberta a sessão Firebase potencialmente autenticada do navegador do laboratório. Os 17 SDK/11 índices/rollback de frontend e Rules mantêm somente o escopo/SHA dos aceites anteriores, referenciados em CURRENT, STAGING_RELEASE e evidências de 22–23/10. Não há credencial fictícia de staging reconfirmada para nova sessão UI; não tentar contas de produção nem recuperar senhas.

Na próxima homologação autorizada com fixtures: confirmar domínio staging e projetos exatos; usar conta fictícia A e B em sessões separadas; verificar login, persistência após reload, leitura de plano/histórico, negativa A×B e revogação. Executar apenas lacuna ou superfície alterada, preservar ledger por compensação, encerrar sessões e registrar hashes/contagens sem capturar credenciais. Isso permanece NOT_RUN nesta rodada; não impede o aceite local das ferramentas novas.

O [roteiro único](ITALO_BACKUP_RECOVERY_READINESS.md) reúne as intervenções pessoais. [Gates](CUTOVER_GO_NO_GO.md) e [ledger](EVIDENCE_LEDGER.json) distinguem prova nova, herança e NOT_RUN.
