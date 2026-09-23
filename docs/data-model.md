# Modelo de dados

```mermaid
erDiagram
  ORGANIZATION ||--o{ ADMIN_USER : authorizes
  ORGANIZATION ||--o{ CARAVAN : owns
  CARAVAN ||--|{ BOARDING_POINT : offers
  CARAVAN ||--o{ REGISTRATION : receives
  REGISTRATION ||--o| PAYMENT_PROOF : uploads
  REGISTRATION ||--o| CHECK_IN : records
  ORGANIZATION ||--o{ ANNOUNCEMENT : publishes
  CARAVAN ||--o{ FAQ : answers
  ORGANIZATION { string name }
  ADMIN_USER { string uid string organizationId }
  CARAVAN { string organizationId string slug int capacity int reservedSeats string status }
  BOARDING_POINT { string id string name string address string time }
  REGISTRATION { string id string organizationId string caravanId string registrationStatus string paymentStatus }
  PAYMENT_PROOF { string storagePath string uploadedAt }
  CHECK_IN { string checkedInBy datetime checkedInAt }
  ANNOUNCEMENT { string title string body }
  FAQ { string question string answer }
```

Implementação: `admins/{uid}` liga a conta a `organizationId`; `organizations/{organizationId}` guarda metadados; `caravans/{caravanId}` guarda a caravana e os pontos/FAQ/avisos como listas ordenadas; `registrations/{registrationId}` guarda a inscrição, estado financeiro e campos de check-in; os comprovantes ficam em Storage e a inscrição guarda `proofPath`. Esse modelo mantém o isolamento multi-organização nas regras e evita expor coleções pessoais a consultas públicas.
