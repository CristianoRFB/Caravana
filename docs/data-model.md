# Modelo de dados

```mermaid
erDiagram
  ORGANIZATION ||--o{ ADMIN_USER : authorizes
  ORGANIZATION ||--o{ CARAVAN : owns
  CARAVAN ||--|{ BOARDING_POINT : offers
  CARAVAN ||--o{ REGISTRATION : receives
  CARAVAN ||--o{ EXPENSE : tracks
  REGISTRATION ||--o| PAYMENT_PROOF : uploads
  REGISTRATION ||--o{ PAYMENT_ENTRY : records
  REGISTRATION ||--o| CHECK_IN : records
  ORGANIZATION ||--o{ ANNOUNCEMENT : publishes
  CARAVAN ||--o{ FAQ : answers
  ORGANIZATION { string name }
  ADMIN_USER { string uid string organizationId }
  CARAVAN { string organizationId string slug int capacity int reservedSeats string status }
  BOARDING_POINT { string id string name string address string time }
  REGISTRATION { string id string organizationId string caravanId string registrationStatus string paymentStatus }
  PAYMENT_PROOF { string contentType string fileName string uploadedAt }
  PAYMENT_ENTRY { int amountCents string method string status string createdAt }
  EXPENSE { int amountCents string category string date string description }
  CHECK_IN { string checkedInBy datetime checkedInAt }
  ANNOUNCEMENT { string title string body }
  FAQ { string question string answer }
```

Implementação: `admins/{uid}` liga a conta a `organizationId`; `organizations/{organizationId}` guarda metadados; `caravans/{caravanId}` guarda a caravana e os pontos/FAQ/avisos como listas ordenadas; `registrations/{registrationId}` guarda a inscrição, o total de pagamentos numéricos (`paymentTotalCents`) e os campos de check-in; `registrations/{registrationId}/proofs/current` guarda o único comprovante ativo, privado para a equipe da organização e limitado a 600 KB; `registrations/{registrationId}/payments/{paymentId}` mantém cada lançamento numérico, inclusive itens corrigidos; `caravans/{caravanId}/expenses/{expenseId}` guarda despesas da viagem. As regras verificam a organização proprietária em todas as subcoleções financeiras.

Registros importados podem conter `documentRecords` com o rótulo e o valor exatamente como foram fornecidos, sem inferir CPF/RG. `amountCents` pode ficar ausente quando o valor da viagem não foi informado. Um `paymentStatus: "reported"` com `paymentReportedMethod: "pix"` e `paymentReportedUnreconciled: true` preserva uma declaração de pagamento sem criar um lançamento monetário nem um comprovante. Esses registros não entram como recebimento conciliado.
