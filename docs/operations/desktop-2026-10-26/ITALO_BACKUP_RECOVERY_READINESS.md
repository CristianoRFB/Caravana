# Recuperação do cliente — BLOCKED real no laboratório

Atualização GOAL X: o [exportador/inventário/Drive/restore operacional](../goal-x-italo/REAL_BACKUP_RESTORE.md) agora existe e passou com fontes simuladas e três emuladores. A lacuna de implementação abaixo é histórica; a execução/cobertura REAL permaneceBLOCKED. Usar o [único roteiro pessoal vigente](../goal-x-italo/OWNER_ACTIONS.md), sem gerar chave ou copiar dados reais para o laboratório.

| Gate | Estado desta rodada | Condição |
|---|---|---|
| Recipient público age | UNKNOWN | Não recebido/validado nesta sessão; formato sozinho não prova custódia |
| Custódia privada/segunda cópia | UNKNOWN | Somente proprietário em Windows pessoal confiável |
| Inventário real completo | BLOCKED | Histórico parcial: snapshot 24 docs/2 Auth/0 buckets observados; não reconferido, não prova anexos ausentes |
| Reconciliação financeira | BLOCKED | Dois totais históricos não verificáveis; ensaio preserva dois null fictícios, não calcula valor real |
| Exportador streaming real | BLOCKED | Ferramentas existentes de inventário/staging não são exportador completo protegido de produção |
| Cifrar/upload/download SHA reais | BLOCKED | Nenhuma leitura real, Drive ou exportação nesta máquina |
| Restore independente real | BLOCKED | Processo separado com corpus fictício passou; não é restore de banco/Auth reais |
| Auth/senhas/ACLs reais | BLOCKED | Metadados fictícios não transportam login/senhas; ensaio não avalia Rules |
| Storage/links/URLs/tokens reais | BLOCKED | Um objeto/link inventado no modelo; URLs externas e contratos legados desconhecidos |
| RPO / RTO reais | UNKNOWN | Tempo sintético está no JSON; não extrapolar para produção |
| Custos da operação futura | BLOCKED | Reconfirmar isolamento/privacidade/R$0 antes de leitura/exportação |

## Reproduzir o ensaio seguro do laboratório

PowerShell 7 Windows x64, na raiz do repositório. Se age ainda não estiver na pasta local, executar `pwsh -File scripts/install-lab-age.ps1` uma vez; o instalador recusa sobrescrever pasta existente e verifica o ZIP pinado antes de extrair. Não instala nada globalmente.

```powershell
npm run test:lab-recovery
npm run recovery:lab -- --dry-run
npm run recovery:lab -- --execute-synthetic
```

Sem argumentos o comando faz dry-run sem arquivos/chaves. A execução aceita exclusivamente o corpus embutido inventado e cria ciphertexts em diretório novo `.firebase/lab-recovery/synthetic-*`. Não aceita paths de entrada, projetos, endpoints, recipients ou identidade do proprietário. Recusa credenciais selecionadas pelo ambiente e targets diferentes de demo/loopback. Não chama Firebase, rede ou Drive. Um processo filho confere tamanho/SHA/cobertura antes de decriptar em RAM; cada restauração valida conteúdo exato e conflitos antes de criar itens no modelo. O hash SHA256 não substitui uma assinatura: manifesto real futuro precisa de autenticidade/ancoragem confiável e controles de custódia.

O resultado `lab-recovery-result.json` é exclusivamente LOCAL_SYNTHETIC. A cópia local chamada `download.age` exercita bytes/hash; não houve download de Drive. A compensação e retorno coordenado são modelos, sem alteração dos serviços reais. Recuperação real continua bloqueada.

## Roteiro humano único — somente no dispositivo pessoal

1. Transferir apenas fonte/commits sanitizados para o PC pessoal. Se o push do laboratório continuar sem acesso, usar o bundle local de código indicado no relatório final. Autenticar pelo fluxo oficial GitHub nesse dispositivo; não fornecer token/senha no chat nem persistir nova credencial no laboratório. Reconfirmar HEAD remoto, branch isolada, CI do SHA exato e R$0.
2. Seguir [BACKUP_KEY_WINDOWS_PERSONAL](../../BACKUP_KEY_WINDOWS_PERSONAL.md): proprietário cria identidade já cifrada fora do repo, guarda frase separada e segunda cópia privada, testa ambas com corpus sintético/SHA. Disponibilizar apenas recipient público e declarações de teste; nunca identidade/frase. Parar se a versão/CLI divergir do procedimento.
3. Em ambiente privado, confirmar identidade/alvo `caravana-af306`, autorização read-only e inventário completo: coleções/subcoleções, órfãos, Auth/config necessária, todos os anexos e URLs externas. Resolver os dois totais desconhecidos com origem verificável e IDs pseudonimizados; ausência de valor continua UNKNOWN, nunca zero presumido/lançamento compensatório real.
4. Reconfirmar a pasta Drive correta sob a identidade aprovada, privacidade, owner/permissões e capacidade. Não usar conector de outra pessoa. Preparar exportador read-only streaming fail-closed, sem arquivos brutos/logs, que cubra todo o inventário; revisar limites de RAM/temp/swap/cores e autenticação interativa. A ferramenta do laboratório não realiza essa etapa.
5. Definir primeiro o destino de restore privado independente, fora de produção e fora de `bdall-e3585`, com custo total R$0 e proteção comprovada. Se isso exigir novo projeto, contrato, cobrança ou permissão, interromper a etapa e obter decisão específica; não improvisar staging com dados reais.
6. Somente após esses gates: dry-run sem payload, exportação direta age ao recipient validado, manifesto sanitizado/autenticado e cobertura; upload apenas `.age` ao Drive privado, download e SHA/tamanho exatos. Proprietário decripta no destino aprovado sem expor chave/frase; conferir contagens, IDs, UIDs/ACLs, objetos/links, finanças e limites de continuidade Auth; provar interrupção/reentrada e medir RPO/RTO reais.
7. Registrar equivalência e lacunas sem PII. Ensaiar transformação aditiva e rollback coordenado compatível com dados posteriores; fechar F7/F8/17 gates com prova própria. Produzir nova decisão e pedir autorização específica para qualquer futura ação real. Não executar cutover, deploy de produção ou pagamento com este mandato.

App Check permanece opt-in desativado. Provider/reCAPTCHA, termos, APIs e enforcement exigem avaliação/decisão própria após prova de R$0; não são passo automático do backup. A resolução do monitor também permanece pendente, conforme relatório vizinho.
