# F5 — plano incremental autorizado (ainda não implementado)

Pré-condição: preservar checkpoint F4 e concluir seu gate local. Nenhum plano abaixo representa recurso já entregue ou autorização de produção.

1. Configuração pública mínima por organização, separada de organizations privado. Nome, descrição, contatos e cores em formato estrito; logos raster/URL segura com fallback. Sem CSS arbitrário, HTML bruto, credenciais ou dados de passageiros.
2. Mapping de slug para organização criado por usuário autorizado e confirmado nas Rules; slug não é autoridade de acesso. Reservas continuam ligadas ao ID de caravana persistido, memberships continuam autoridade privada. Mudança de Host enviada pelo navegador nunca seleciona permissões.
3. Rotas /o/:tenantSlug e /o/:tenantSlug/caravana/:slug, inscrição e portal. Resolver scoped por organização+slug; slug repetido em duas organizações não escolhe o primeiro resultado. Alias legado inequívoco preservado; mapping explícito para links históricos quando houver colisão, sem alterar dados reais.
4. Contexto visual próprio nas telas públicas e no painel; desmontar listeners/rascunhos ao trocar organização. Configuração pública não inclui configurações privadas de apoio/financeiro. Leitura/atualização de marca sem rebuild.
5. Subdomínio/custom domain apenas contrato: prova de posse e binding verificados por infraestrutura confiável, lifecycle e retirada; sem DNS, TLS ou serviço pago real. Ainda BLOCKED para operação externa sem autorização.
6. Testes direcionados: configuração/mapping forjados, URLs e tokens CSS maliciosos, duplicidade de slug, atualização e fallback; A×B, reload e320/375/768/1440 no gate. Links já usados no corpus continuam funcionando.

F6 prossegue após esse gate: catálogo aprovado e limites concorrentes no servidor, atribuição manual auditada e downgrade sem apagar histórico. F7/F8 dependem de evidências e revisão, sem deploy ou merge implícitos.
