# F6 — quotas de caravanas/equipe (2026-10-19)

Status: PASS incremental local; F6 IN_PROGRESS. Não é gate comercial nem homologação real.

- Criação, publicação, pausa/arquivo e edição pelo serviço ligam caravana, tenantUsage e tenantQuotaOperations. O ID de criação é o ID da operação; replay não reabre caravana arquivada. Baseline comercial existente é obrigatório e não pode ser criado/resetado pelo cliente.
- Equipe: membership, diretório privado, contador e evento atômicos; último owner protegido; limite de integrantes sob concorrência. Platform Owner não pode inserir a si mesmo em organização existente.
- Rules verificam efeito real e contagem anterior/posterior, ator/tempo, imutabilidade da auditoria e acesso próprio. Alterações concorrentes disputam o mesmo tenantUsage. Downgrade não exclui histórico; redução de contadores/configuração existente continua possível quando crescimento comercial estiver bloqueado.
- data.ts delega criação/edição ao serviço. Tentativa do comando conservada em sessionStorage até sucesso, por usuário/organização/entidade/hash; não armazena formulário. Comandos com payload diferente são tentativas distintas. Perda de armazenamento/dispositivo não equivale a deduplicação de negócio universal.
- Reservas e CSV ainda NÃO usam a quota comercial de passageiros. Equipe ainda sem tela. Onboarding comercial/namespace guard e landing pendentes. Não publicar esta integração isoladamente.

## Evidências

f6-quotas-regression.log:26 PASS/4 arquivos/11,60s (quotas, tentativa, memberships e plataforma). Inclui disputa pela última caravana, último integrante e dois owners se revogando simultaneamente: permanece um owner. f6-quota-attempt.log:2 PASS puros. f6-namespace-planner.log:3 PASS puros (preparação ainda sem runtime). Produção não foi acessada nesta retomada.

## Falhas e diagnóstico

RED preservado do checkpoint anterior:4 FAIL, inclusive bypass real das Rules candidatas por arquivamento sem contador. Primeira implementação também negou leitura do ID de caravana inexistente necessário à transação; corrigida com get vazio para usuário autenticado, sem liberar documentos existentes.

A seguir, testes de equipe produziram timeouts. O log Java direto emulator-direct.stderr.log revelou IllegalStateException: ternary operator predicate is always boolean na avaliação fase1 das Rules, seguido de locks não liberados. Isolamentos reduziram o sintoma ao cálculo condicional envolvendo o estado posterior da membership. Reescrita por quotaDelta booleana, sem ternário nesse cálculo, fez o caso e a regressão passarem. A transação SDK original foi mantida. Ensaios de leitura sequencial, leitura externa/CAS, diretório e versão1.21 não resolveram e foram revertidos.

Diagnósticos temporários com subset de Rules e um ensaio permissivo local serviram apenas para isolar o motor. NÃO são evidência de segurança ou aceite; arquivos temporários foram removidos e não integram scripts de gate. Logs conservam a proveniência; somente a regressão final usa firestore.rules completo. Uma execução diagnóstica por npm exec node instalou Node apenas no cache npm; gates finais usam npm run e o runtime local habitual, sem mudança de dependências do projeto.

Referência investigada: https://github.com/firebase/firebase-tools/issues/10518 (relato semelhante, não prova da causa local). Comparação local com1.21 teve mesmo sintoma; binário oficial conferido contra SHA256 c3d3680a89d946a90a027365ea14c26c6472a162bcf37f099bbb1ebd66d25e8e em firebase-tools/v15.24.0/src/emulator/downloadableEmulatorInfo.json. Nenhuma versão do projeto foi rebaixada.

## Proteção de namespaces (preparação)

namespace-protection.ts é planner puro, sem SDK/I/O. Exige declaração explícita de cobertura de todas as fontes, reserva IDs históricos exatos, aliases e referências órfãs; conflitos/inventário incompleto produzem zero criações executáveis. Não confere sozinho a veracidade/completude de um export externo, não concede acesso e não executa bootstrap. Inventário, bootstrap e migração reais continuam BLOCKED sem autorização específica.

Atualização2026-10-19: reservas/CSV agora aplicam quotas, com evidências em PASSENGER_QUOTAS.md. A pendência de integração de passageiros descrita no início deste documento foi atendida no módulo incremental seguinte; UI/equipe/onboarding/landing/gate F6 continuam pendentes.
