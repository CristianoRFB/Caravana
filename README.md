# Caravana 77

Plataforma mobile-first para publicar caravanas, organizar inscrições, receber comprovantes Pix e fazer check-in. V1 construída com React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, Firebase Storage e Cloudflare Pages.

## Requisitos

- Node.js 20 ou superior e npm.
- Projeto Firebase com Authentication (e-mail/senha), Firestore e Storage habilitados.
- Para publicar: acesso ao projeto Cloudflare Pages ou conta Wrangler autenticada.

## Executar localmente

```sh
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com as variáveis Firebase. A configuração web do Firebase identifica o projeto; regras de Firestore e Storage são a segurança real. Nunca coloque chaves de serviço ou credenciais administrativas no navegador.

## Firebase e primeiro administrador

O projeto usado é `caravana-af306`. Habilite Email/Senha em Firebase Authentication, crie o banco Firestore em modo de produção e habilite Storage. Publique `firestore.rules` e `storage.rules` pelo console Firebase ou Firebase CLI.

Crie uma organização em `organizations/{organizationId}` no Console do Firebase. Crie a primeira conta de equipe em Authentication e, com acesso confiável ao Firestore, crie `admins/{uid}` com `{ "organizationId": "ID_DA_ORGANIZACAO", "role": "admin" }`. As regras impedem que visitantes se promovam a administradores. Depois, entre em `/admin/login` e cadastre a primeira caravana.

## Fluxos

- Público: `/caravana/{slug}`; inscrição em `/caravana/{slug}/inscricao`.
- Acesso privado do passageiro: `/minha-inscricao/{id}`. O identificador aleatório funciona como credencial; não compartilhe o link.
- Equipe: `/admin/login`, `/admin`, `/admin/caravanas`, `/admin/comprovantes`, `/admin/check-in/{caravanId}`.
- A reserva incrementa o contador e cria o registro em uma transação Firestore, verificada pelas regras.
- Comprovantes JPG, PNG e PDF até 8 MiB. Aprovação é manual; não há cobrança Pix automatizada.

## Qualidade

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` inicia os emuladores locais do Firestore e Storage e executa os testes de regras sem acessar dados de produção.

## Deploy Cloudflare Pages

Configure o projeto Pages com framework Vite, `npm run build` e diretório `dist`. Defina as seis variáveis `VITE_FIREBASE_*` no ambiente de build. `public/_redirects` habilita o fallback SPA em rotas diretas e refresh. O projeto Firebase também precisa autorizar o domínio `*.pages.dev` em Authentication.

Deploy direto alternativo após autenticar Wrangler:

```sh
npx wrangler pages project list
npx wrangler pages deploy dist --project-name caravana-77 --branch main
```

Não crie projeto duplicado se já houver Pages integrado ao repositório.

## Estrutura

- `src/App.tsx`: páginas públicas, inscrição, portal privado, painel e check-in.
- `src/lib/firebase.ts`: inicialização do SDK.
- `src/lib/data.ts`: transações, autenticação, consultas e upload.
- `firestore.rules`, `storage.rules`: controle de acesso.
- `docs/`: diagramas da implementação.
- `referencias/caravana77_referencias/`: imagens recebidas para direção visual.

## Limitações operacionais conhecidas

A V1 não tem pagamento automático, reenvio automatizado de WhatsApp, edição/arquivamento/duplicação de caravana, publicação de avisos/FAQ pelo painel ou cancelamento com liberação de vaga. O primeiro admin e a organização precisam ser provisionados por pessoa com acesso confiável ao Firebase. A página privada é um link portador secreto; proteja-o como um ingresso.
