# Atividade: inscrição e pagamento

```mermaid
flowchart TD
  A[Abrir caravana publicada] --> B[Informar dados e ponto de embarque]
  B --> C{Vaga disponível?}
  C -- Não --> D[Informar que esgotou]
  C -- Sim --> E[Transação: incrementar reserva e criar inscrição]
  E --> F[Mostrar link privado e instruções Pix]
  F --> G[Passageiro paga fora do sistema]
  G --> H[Enviar JPG, PNG ou PDF até 600 KB]
  H --> I[Aguardar análise da equipe]
  I --> J{Comprovante confere?}
  J -- Sim --> K[Equipe aprova e confirma inscrição]
  J -- Não --> L[Equipe recusa com motivo]
  L --> H
  K --> M[Passageiro consulta status confirmado]
```

## Controle financeiro por caravana

```mermaid
flowchart TD
  A[Abrir financeiro da caravana] --> B[Selecionar passageiro]
  B --> C[Registrar valor já recebido e forma]
  C --> D[Transação: criar histórico e atualizar total]
  D --> E[Recalcular pago, parcial ou pendente]
  A --> F[Registrar despesa e categoria]
  F --> G[Somar despesas e saldo registrado]
  H[Pix histórico informado sem valor] --> I[Exibir como não conciliado]
  I --> J[Manter fora dos totais monetários]
```
