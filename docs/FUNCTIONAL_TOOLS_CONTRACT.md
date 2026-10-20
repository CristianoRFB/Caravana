# Diferenciação funcional aditiva — contrato

Implementação iniciada após13fe987 e publicada somente em staging8c1340d. Seis jornadas SDK reais de staging e CI integral ab4aff1 PASS; health público reconferido na transferência Cloud. Os parágrafos de evidência incremental abaixo preservam o histórico anterior à publicação. Preços/limites e os7 grupos CORE anteriores preservados em todos os planos. A condição de preço temporária não concede automaticamente funcionalidades de outro plano.

## Capacidades e segurança

`organizations/{orgId}/commercialFeatures/current` é projeção privada canônica da assinatura, escrita somente pela plataforma, junto da atribuição/onboarding e auditoria existentes. Não contém preços promocionais. A operação nova verifica no servidor assinatura atual, estado/prazo, organização ativa, ACL e vínculo da projeção ao último evento comercial. Projeção antiga ou ausente falha fechada para novas ferramentas, sem impedir recursos CORE. Reatribuir o plano auditadamente atualiza a projeção; nenhum baseline legado é inventado.

| Ação | Essencial | Pro | Premium | ACL e histórico |
|---|---|---|---|---|
| Recursos existentes, incluindo CSV/Financeiro/exportação atual | Preservados | Preservados | Preservados | RBAC anterior, inclusive em downgrade |
| Novo relatório operacional salvo/exportável | Não | Sim | Sim | Equipe própria; snapshot imutável |
| Novo roteiro de tarefas por caravana | Não | Não | Sim | Owner/staff próprios; revisão e evento atômicos |
| Criar/alterar modelo reutilizável | Não | Não | Sim | Owner próprio; staff pode ler/aplicar em viagem própria |
| Ler relatórios/roteiros/eventos antigos | Sim, se existentes | Sim | Sim | Somente equipe autorizada; revogação retira acesso |
| Platform Owner sem membership | Sem acesso privado | Sem acesso privado | Sem acesso privado | Só metadados comerciais, sem self-grant |

Suspensão/expiração/organização suspensa bloqueiam novas capturas e alterações destas ferramentas. Não removem histórico, relatórios, tarefas, passageiros, financeiro, documentos ou controles obrigatórios. Roteiros são organização opcional de trabalho; não substituem controles de embarque/autorizações. Não há automação, notificação externa ou cobrança.

## Relatórios Pro

Fotografia por **data da viagem**, com título/período/caravana, contagens, embarcados, autorizações pendentes e valores históricos conhecidos calculados pelo mesmo helper do Financeiro Geral. Recebimentos históricos de inscrições canceladas continuam no total; despesas anuladas não entram. Não é fluxo bancário do período, conciliação ou certificado contábil. Fontes são consultadas durante a captura, não se alega snapshot transacional de todo o inventário. Limites técnicos explícitos: inventário500 viagens; captura até50 viagens e até1000 inscrições/despesas por viagem. Nunca salvar resultado parcial silenciosamente.

Snapshot privado não contém nomes/CPF/telefone/links/documentos de passageiros; texto do título é fornecido pela própria equipe. CSV não exporta a lista de passageiros; neutraliza células com fórmulas. Exportação revalida ACL por leitura fresca do servidor. Repetição da tentativa recupera o relatório original; não recalcula/salva outra fotografia com o mesmo ID.

## Roteiros Premium

Até20 tarefas de120 caracteres, modelos reutilizáveis e cópia para caravana, conclusão/reabertura e arquivamento reversível. Revisão otimista rejeita editor obsoleto; cópia de modelo reinicia todas as marcações. Documento/evento são atômicos e nenhuma exclusão é permitida. Actor/timestamps e before/after vinculados ao caminho e tentativa.

Persistência usa texto de linhas validadas e máscara binária de mesmo comprimento lógico (`tasksText`/`doneMask`), com codec para itens na UI. Regex/split são operações suportadas nas Rules. Isso mantém todas as20 tarefas e evita exceder1000 expressões na validação de20 mapas. Casos máximos e legado foram adicionados aos testes. Logs RED iniciais preservados; nenhuma redução de acesso/validação foi adotada para obter PASS.

Auditoria exige mutação real no alvo protegido, estado anterior exato, estado posterior idêntico ao alvo e ator/tempo do servidor. O alvo exige evento novo e ID/tipo exatos; a feature/ACL é verificada na regra do alvo. Não é possível adicionar evento isolado ou mutar documento sem evento. Evita-se avaliar duas vezes a mesma ACL legada e comparar duas vezes o mesmo snapshot profundo.

## Evidências incrementais

36 testes direcionados PASS em final-functional-tools-seventh.log: SDK direto/negativas, concorrência, replay, downgrade, revogação, expiração, payload adulterado e20 tarefas/legado.16 E2E PASS em rodada única nas quatro larguras, final-functional-tools-e2e-third.log e casos/hashes em final-functional-tools-cases.json. Primeiras rodadas expuseram orçamento de Rules e foram corrigidas sem retirar capacidade. Duas rodadas E2E iniciais foram interrompidas após falhas reproduzidas; uma rodada focada terminou5PASS/1FAIL por corrida no teste do menu. O helper passou a aguardar Visão geral antes de decidir se abre o menu; links novos têm nome acessível e menu fecha após navegar. Registros RED preservados. Não alegar que as rodadas abortadas passaram. Ainda sem publicação desta alteração, aguardando regressão da candidata.

O estado/prazo comercial de novas ferramentas é decidido diretamente pela assinatura privada e projeção vinculada ao último evento; não se avalia uma segunda vez a cópia pública desses mesmos valores. Quotas de caravanas/equipe/passageiros continuam verificadas pelo contrato anterior. CI remoto anterior13fe987 PASS, execução39466150457; nova candidata deve ter seu próprio gate.
