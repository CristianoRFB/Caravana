# Retomada Cloud — 2026-10-21

Base recuperada852606e, branch codex/caravana77-commercial-v1-20261016 limpa e sincronizada. Runtime revisão42 running/connected, observations_current=true, rede unrestricted/enforced, sem secrets/identidades GCP. Node24.19.0, Java21.0.12.1, CLI15.34.0. Aplicação, Firestore/Storage Rules e índices preservados.

## Downloads e testes

PASS: cache novo, downloads oficiais storage.googleapis.com: Firestore1.22.0 (136707194 bytes), Storage Rules1.1.3 (52892936 bytes); tamanho/MD5 do CLI e SHA256 registrados em evidence/2026-10-21/cloud-recovery/fresh-downloads.json. Não confundir liberação desse host com provisionamento de bucket Firebase ou autenticação GCP.

PASS: lint, typecheck, typecheck de harnesses, build e audit runtime0. Regressão local282 backend/Rules,8Auth,6Storage;20 guards Python. Os282 incluem convites/quotas/concorrência, isolamento e ensaio limitado de interrupção/retomada/retorno. Cinco testes novos de guards/roteamento;18 casos direcionados PASS incluem13 já pertencentes à base, não somar18 aos282 como casos únicos adicionais. Smoke E2E recovery-smoke-e2e:48/48 PASS, zero skipped/flaky/unexpected, nas larguras320/375/768/1440. São casos já presentes na regressão184, não48 testes novos. Resumo em local-e2e-summary.json. CI prévio db99675/39513331460 PASS permanece no escopo documentado.

## Nova restauração conjunta — LOCAL_TESTED

Comando opt-in: `npm run test:recovery`. Sem argumentos de destino/import, sem credenciais remotas; recusa GOOGLE_APPLICATION_CREDENTIALS/FIREBASE_TOKEN. Só demo-caravana77-test, loopback18080/19099/19199/14400. Diretório novo privado0700 e umask077 sob .firebase/recovery-rehearsal (ignorado); exportações/contas/objetos brutos não entram em Git. O CLI também pode deixar firebase-export-* na raiz após erro: padrão agora ignorado; resíduo próprio da tentativa falha foi movido para a área privada, sem exclusão. Não reutiliza nem sobrescreve export anterior.

Primeiro processo prepara fixture existente e2 PDFs fictícios, exporta Auth+Firestore+Storage pelo CLI, encerra emuladores; segundo processo importa o snapshot em instâncias novas. Falha se metadados faltarem mesmo quando CLI termina com0. Verifica três logins/senhas/UIDs preservados,10 documentos selecionados por campos canônicos (incluindo comprovante Firestore, pagamento e despesa),2 objetos por bytes/MIME, A×B, passageiro, list/delete negados e revogação imediata em Firestore/Storage. Relatório coordenado PASS em coordinated-recovery.json.

FAIL inicial de infraestrutura local preservado: ProxyAgent do CLI enviava GET do hub e POST export Storage ao proxy externo. Exceções estritas agora limitam-se a rotas/métodos/portas locais fixos, projeto demo e opt-in de recovery. Outros projetos/origens/mutações continuam no dispatcher original; não há mudança de proxy externo/CA/TLS ou da configuração publicada. Os testes exercitam destinos reais recusados e não usam autenticação neles. Logs das duas tentativas e da rodada PASS preservados.

Limites: Rules carregadas da candidata no repositório, não restauradas pelo export. Compara10 documentos selecionados, não prova fidelidade de todo banco. Auth emulado não valida hashes/providers reais; Storage emulado não audita IAM/tokens reais. Não é staging real, backup/restauração do Ítalo nem rollback coordenado de produção. O export sintético privado histórico de153 documentos não está no Cloud: seu restore não foi repetido nem substituído por esta fixture.

## Bloqueios externos e estado real

Preflight ADC atual BLOCKED managed_gcp_connection_not_configured, requests=[]; runtime não tem identidade GCP. A sessão do operador no Cloud Shell não autentica o Codex. Relatório recebido anteriormente confirma11 índices READY e Rules iguais após LF; Auth real403/SERVICE_DISABLED continua sem consumidor identificado. Liberação de download não resolve esse gate. Nenhuma API/IAM/Auth/Rules/índice real alterado; nenhuma escrita, deploy ou migração em produção; sem Blaze/custos novos.

Próxima leitura real necessária: GET da configuração Auth de bdall-e3585, com identidade gerenciada, projeto/número conferidos, permissão mínima firebaseauth.configs.get e serviço disponível no consumidor correto. Não conceder Owner/Editor, criar chave ou habilitar API para contornar403. Somente leitura remota continua autorizada nesta retomada; não executar bootstrap/test:staging/deploy com escrita. Produção caravana-af306/caravana-77 permanece protegida.

F0–F6:100% dos aceites locais/sintéticos anteriormente definidos, sem homologação real implícita. F7 preparação isolada9/10 (90%); F8 matriz14 gates5/14 (36%); GOAL FINAL6/17 (35%). Sem aumento por repetir teste emulado. F7/F8 BLOCKED por staging integral da candidata, Auth remoto/Storage e inventário/compatibilidade/backup/restauração/retorno reais, observabilidade/abuso e7 advisories de tooling conhecidos. Parecer NOT_READY_FOR_MIGRATION preservado.

## CI da recuperação

Fontee4939db enviada com árvore idêntica ao checkpoint local. Run39537954805 concluído PASS:287 backend/Rules,8Auth,6Storage,20 guards Python,184 E2E, nova recuperação conjunta e lint/typechecks/build. Nenhuma etapa obrigatória falhou ou foi omitida. Evidência final-ci.json e release-status.json. Os48 E2E locais já têm evidência válida, sem retries ou casos omitidos.

Health público atual:8c1340d ainda publicado,12 assets/hashes e headers PASS, sem Auth/documentos/produção. Não foi publicado frontend novo. CLI login:list continua sem contas autorizadas; nenhum tool Firebase conectado está disponível nesta execução. Evidência public-staging-health.json e firebase-login-status.log.
