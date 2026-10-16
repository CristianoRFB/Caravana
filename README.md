# Caravana 77

Plataforma mobile-first para publicar caravanas, organizar inscrições, receber comprovantes Pix e fazer check-in. V1 construída com React, TypeScript, Vite, Firebase Authentication, Cloud Firestore e Cloudflare Pages.

## Requisitos

- Node.js 20 ou superior e npm.
- Projeto Firebase com Authentication (e-mail/senha) e Firestore habilitados.
- Para publicar: acesso ao projeto Cloudflare Pages ou conta Wrangler autenticada.

## Executar localmente

```sh
npm install
cp .env.example .env.local
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.
Preencha `.env.local` com as variáveis Firebase. A configuração web do Firebase identifica o projeto; as regras do Firestore controlam o acesso. Nunca coloque chaves de serviço ou credenciais administrativas no navegador.

Sem essas variáveis, o site não mostra caravanas fictícias nem habilita inscrições ou acesso à equipe. Cadastre e publique ao menos uma caravana pelo painel para preencher o catálogo.

## Firebase e primeiro administrador

O projeto usado é `caravana-af306`. O Firestore padrão de produção fica em `southamerica-east1` (São Paulo), com `firestore.rules` publicadas. Authentication por e-mail/senha está ativo e `caravana-77.pages.dev` está autorizado.

O projeto usa o plano Spark do Firebase e não precisa de Cloud Storage nem de conta de faturamento para os comprovantes. A organização e o administrador desta instalação já estão provisionados. Para outra organização, uma pessoa confiável deve criar a conta de Authentication e o documento `admins/{uid}`; visitantes não podem se promover a administradores.

Ao atualizar uma instalação que já recebeu inscrições, pause temporariamente as novas reservas, publique o front-end atualizado e entre uma vez no painel com uma conta autorizada para remover os identificadores antigos. Em seguida, publique as novas regras do Firestore e reabra as reservas; o front-end e as regras usam o novo recibo interno em conjunto.

## Fluxos

- Público: `/caravana/{slug}`; inscrição em `/caravana/{slug}/inscricao`.
- Acesso privado do passageiro: `/minha-inscricao/{id}`. O identificador aleatório funciona como credencial; não compartilhe o link.
- Equipe: `/admin/login`, `/admin`, `/admin/caravanas`, `/admin/comprovantes`, `/admin/check-in/{caravanId}`.
- A reserva incrementa o contador e cria a inscrição privada e um recibo interno em uma transação Firestore, verificada pelas regras. O nonce público não é o identificador de acesso à inscrição.
- Pix é feito fora do sistema e conferido manualmente pela equipe. O app não cobra nem processa pagamentos.
- Comprovantes privados JPG, PNG ou PDF até 600 KB são guardados no Firestore, sem serviço de armazenamento adicional. Um novo envio substitui o comprovante anterior daquela inscrição.
- Em "Passageiros", a equipe pode importar uma lista anterior como CSV UTF-8 (até 400 pessoas por arquivo). A importação confere campos, documentos repetidos e vagas antes de salvar. O modo comum exige telefone ou e-mail e deixa as inscrições aguardando comprovante. O modo de lista histórica aceita dados de contato e valor ausentes; guarda rótulos e números de documentos como informados e mantém Pix declarado separado de valor recebido e comprovante conciliados. Sem contato, nenhum link privado pode ser enviado.
- Cada caravana tem a área `/admin/caravanas/{id}/financeiro`, com resumo, pagamentos integrais ou parciais por passageiro, histórico individual e registro/correção de despesas. Os valores são guardados em centavos e atualizados em transações Firestore. Corrigir um pagamento marca o lançamento anterior como anulado, preservando o histórico.

## Qualidade

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` inicia o emulador local do Firestore e executa os testes de regras sem acessar dados de produção.

## Implantação atual e operação

O código está no branch `main`. O workflow em `.github/workflows/ci.yml` executa lint, TypeScript, testes das regras nos emuladores e build em cada push e pull request. Não é necessário adicionar secrets ao GitHub para essa validação.

1. Crie o Firestore padrão em uma região próxima da sua equipe. A região do banco é fixa.
2. Habilite Authentication → E-mail/senha. Crie o documento da organização em `organizations/{organizationId}` e uma conta em Authentication; depois crie `admins/{uid}` com `{ "organizationId": "ID_DA_ORGANIZACAO", "role": "admin" }` por um meio confiável. Não há conta administrativa padrão no código.
3. Os comprovantes ficam em `registrations/{registrationId}/proofs/current`, sob regras do Firestore; cada arquivo pode ter até 600 KB. Não ative faturamento para esse fluxo.
4. A produção atual usa Cloudflare Pages Direct Upload no projeto `caravana-77` (`https://caravana-77.pages.dev`). Projetos Direct Upload não podem ser convertidos depois para Git integration; as publicações seguintes são manuais pelo Wrangler.
5. Preencha `.env.local` com as variáveis `VITE_FIREBASE_*` de `.env.example` e gere `dist` com `npm run build`. As variáveis Firebase Web são incluídas no bundle público; nunca coloque service-account JSON ou credenciais privadas nelas.
6. Publique a pasta `dist` com `npx wrangler pages deploy dist --project-name caravana-77 --branch main`. A origem do Firebase deve autorizar o domínio Pages exato (por exemplo, `caravana-77.pages.dev`).
7. Antes de anunciar o endereço, valide as rotas `/`, `/admin/login`, uma caravana publicada, inscrição e upload de comprovante com dados de teste.

### Publicação manual via Wrangler

O projeto `caravana-77` usa upload manual de `dist`; `public/_redirects` habilita o fallback SPA em rotas diretas e refresh. Gere o bundle com `.env.local` e use Wrangler para publicar.

Deploy direto alternativo após autenticar Wrangler:

```sh
npx wrangler pages project list
npx wrangler pages deploy dist --project-name caravana-77 --branch main
```

Não crie outro projeto Pages para essa publicação.

## Estrutura

- `src/App.tsx`: páginas públicas, inscrição, portal privado, painel e check-in.
- `src/lib/firebase.ts`: inicialização do SDK.
- `src/lib/data.ts`: transações, autenticação, consultas e upload.
- `firestore.rules`: controle de acesso aos dados e comprovantes privados.
- `docs/`: diagramas da implementação.
- `referencias/caravana77_referencias/`: imagens recebidas para direção visual.

## Limitações e segurança

O Pix é feito fora do sistema e conferido manualmente; não há cobrança ou reembolso automatizado, nem disparo automático de WhatsApp. Os comprovantes são acessíveis somente à equipe da organização e têm limite de 600 KB por arquivo. O link privado da inscrição funciona como credencial de acesso: não o compartilhe. Dados opcionais de CPF e nascimento devem ser coletados apenas quando necessários para a operação.

O financeiro registra fatos informados manualmente pela equipe; não inicia cobranças, transferências nem processamento de pagamento. Registros históricos de Pix sem valor ou comprovante permanecem identificados como não conciliados e não entram como dinheiro recebido ou saldo calculável.
