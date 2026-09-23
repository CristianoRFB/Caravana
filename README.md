# Caravana 77

Plataforma mobile-first para publicar caravanas, organizar inscrições, receber comprovantes Pix e fazer check-in. V1 construída com React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, Firebase Storage e Cloudflare Pages.

## Requisitos

- Node.js 20 ou superior e npm.
- Projeto Firebase com Authentication (e-mail/senha), Firestore e Storage habilitados.
- Para publicar: acesso ao projeto Cloudflare Pages ou conta Wrangler autenticada.

## Executar localmente

```sh
npm install
cp .env.example .env.local
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`.
Preencha `.env.local` com as variáveis Firebase. A configuração web do Firebase identifica o projeto; regras de Firestore e Storage são a segurança real. Nunca coloque chaves de serviço ou credenciais administrativas no navegador.

## Firebase e primeiro administrador

O projeto usado é `caravana-af306`. Antes da primeira publicação, habilite a API Cloud Firestore no Google Cloud e, no Firebase Console, habilite Authentication por e-mail/senha, crie o banco Firestore em modo de produção e habilite Storage. Publique `firestore.rules` e `storage.rules` pelo Firebase CLI (`npx firebase deploy --only firestore:rules,storage`) ou pelo console.

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

## Próximos passos para publicar (GitHub → produção)

O código está no branch `main`. O workflow em `.github/workflows/ci.yml` executa lint, TypeScript, testes das regras nos emuladores e build em cada push e pull request. Não é necessário adicionar secrets ao GitHub para essa validação.

1. No Google Cloud, abra o projeto `caravana-af306` e ative a API Cloud Firestore. Se o Console solicitar aceite de termos, MFA ou confirmação da conta, conclua isso diretamente na sua sessão.
2. No Firebase Console do mesmo projeto, habilite Authentication → E-mail/senha, crie o Firestore em modo de produção e crie o bucket do Storage. Publique as regras deste repositório antes de receber inscrições.
3. Crie a organização em `organizations/{organizationId}` e o usuário da equipe em Authentication. Depois crie `admins/{uid}` com `{ "organizationId": "ID_DA_ORGANIZACAO", "role": "admin" }`. Isso precisa ser feito por alguém que já tenha acesso confiável de administrador ao Firestore; não há conta administrativa padrão no código.
4. No Cloudflare Pages, conecte `CristianoRFB/Caravana`, branch `main`, preset Vite, comando `npm run build` e diretório `dist`. Não crie um segundo projeto Pages se já existir integração.
5. Em Settings → Environment variables do Pages, cadastre as seis variáveis `VITE_FIREBASE_*` de `.env.example` para Production (e Preview, se quiser testar previews). Use a configuração Web do Firebase; nunca publique service-account JSON ou credenciais privadas.
6. No Firebase Authentication → Settings → Authorized domains, inclua o domínio exato atribuído ao seu projeto Pages (por exemplo, `caravana-77.pages.dev`) ou o domínio personalizado. Faça o deploy do branch `main` e abra as rotas `/`, `/admin/login` e uma página pública de caravana para smoke test.
7. Quando o serviço de autenticação estiver liberado, valide cadastro, upload de comprovante e administração com dados de teste antes de anunciar o endereço público.

### Publicação manual alternativa

Configure o projeto Pages com framework Vite, `npm run build` e diretório `dist`. Defina as seis variáveis `VITE_FIREBASE_*` no ambiente de build. `public/_redirects` habilita o fallback SPA em rotas diretas e refresh. O Firebase Authentication também precisa autorizar o domínio exato atribuído pelo Cloudflare Pages.

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

## Limitações e segurança

O Pix é conferido manualmente; não há cobrança ou reembolso automatizado, nem disparo automático de WhatsApp. A organização e o primeiro administrador precisam ser provisionados manualmente no Firebase por uma pessoa autorizada. O link privado da inscrição funciona como credencial de acesso: não o compartilhe. Dados opcionais de CPF e nascimento devem ser coletados apenas quando necessários para a operação.
