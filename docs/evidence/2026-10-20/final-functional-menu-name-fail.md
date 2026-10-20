# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-tools.spec.ts >> Premium reuses templates, reverses tasks, archives and retains history with an accessible mobile menu
- Location: e2e\functional-tools.spec.ts:23:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Roteiros da equipe', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - link "caravana77" [ref=e6] [cursor=pointer]:
      - /url: /
    - generic [ref=e13]:
      - generic [ref=e14]: admin-a@example.test
      - button "Sair" [ref=e15] [cursor=pointer]
  - complementary [ref=e19]:
    - generic [ref=e20]: ESPAÇO DA ORGANIZAÇÃO
    - link "▦ Visão geral" [ref=e21] [cursor=pointer]:
      - /url: /admin
      - generic [ref=e22]: ▦
      - text: Visão geral
    - link "◫ Caravanas" [ref=e23] [cursor=pointer]:
      - /url: /admin/caravanas
      - generic [ref=e24]: ◫
      - text: Caravanas
    - link "Financeiro" [ref=e25] [cursor=pointer]:
      - /url: /admin/financeiro
    - link "▤ Comprovantes" [ref=e31] [cursor=pointer]:
      - /url: /admin/comprovantes
      - generic [ref=e32]: ▤
      - text: Comprovantes
    - link "✓ Check-in" [ref=e33] [cursor=pointer]:
      - /url: /admin/check-in
      - generic [ref=e34]: ✓
      - text: Check-in
    - link "? Suporte" [ref=e35] [cursor=pointer]:
      - /url: /admin/suporte
      - generic [ref=e36]: "?"
      - text: Suporte
    - link "◈ Identidade pública" [ref=e37] [cursor=pointer]:
      - /url: /admin/identidade
      - generic [ref=e38]: ◈
      - text: Identidade pública
    - link "▤ Documentos e prazos" [ref=e39] [cursor=pointer]:
      - /url: /admin/documentos
      - generic [ref=e40]: ▤
      - text: Documentos e prazos
    - link "◇ Plano e limites" [ref=e41] [cursor=pointer]:
      - /url: /admin/plano
      - generic [ref=e42]: ◇
      - text: Plano e limites
    - link "♧ Equipe e convites" [ref=e43] [cursor=pointer]:
      - /url: /admin/equipe
      - generic [ref=e44]: ♧
      - text: Equipe e convites
    - link "▥ Relatórios" [ref=e45] [cursor=pointer]:
      - /url: /admin/relatorios
      - generic [ref=e46]: ▥
      - text: Relatórios
    - link "☷ Roteiros da equipe" [ref=e47] [cursor=pointer]:
      - /url: /admin/roteiros
      - generic [ref=e48]: ☷
      - text: Roteiros da equipe
    - generic [ref=e49]: Dados protegidos por organização
  - main [ref=e53]:
    - generic [ref=e54]:
      - generic [ref=e55]:
        - generic [ref=e56]: PAINEL DA ORGANIZAÇÃO
        - heading "Visão geral" [level=1] [ref=e57]
        - paragraph [ref=e58]: Um panorama claro para a próxima viagem.
      - link "＋ Nova caravana" [ref=e59] [cursor=pointer]:
        - /url: /admin/caravanas
        - generic [ref=e60]: ＋
        - text: Nova caravana
    - generic [ref=e61]:
      - text: Caravana
      - combobox "Caravana" [ref=e62]:
        - option "Caravana Sintética ride-a" [selected]
        - option "Caravana Sintética ride-a2"
    - generic [ref=e63]:
      - generic [ref=e64]:
        - generic [ref=e71]: Vagas totais
        - strong [ref=e72]: "25"
      - generic [ref=e73]:
        - generic [ref=e77]: Inscritos
        - strong [ref=e78]: "1"
      - generic [ref=e79]:
        - generic [ref=e84]: Confirmados
        - strong [ref=e85]: "1"
      - generic [ref=e86]:
        - generic [ref=e91]: Aguardando pagamento
        - strong [ref=e92]: "0"
      - generic [ref=e93]:
        - generic [ref=e99]: Aguardando análise
        - strong [ref=e100]: "0"
      - generic [ref=e101]:
        - generic [ref=e106]: Menores sem autorização aprovada
        - strong [ref=e107]: "0"
      - generic [ref=e108]:
        - generic [ref=e114]: Embarcados
        - strong [ref=e115]: "0"
      - generic [ref=e116]:
        - generic [ref=e120]: Vagas restantes
        - strong [ref=e121]: "24"
        - generic [ref=e122]: de 25 lugares
    - generic [ref=e123]:
      - generic [ref=e124]:
        - generic [ref=e125]:
          - heading "Inscrições recentes" [level=2] [ref=e126]
          - paragraph [ref=e127]: Caravana Sintética ride-a
        - link "Ver passageiros" [ref=e128] [cursor=pointer]:
          - /url: /admin/caravanas/ride-a/passageiros
      - table [ref=e132]:
        - rowgroup [ref=e133]:
          - row [ref=e134]:
            - columnheader "PASSAGEIRO" [ref=e135]
            - columnheader "EMBARQUE" [ref=e136]
            - columnheader "PAGAMENTO" [ref=e137]
            - columnheader "STATUS" [ref=e138]
        - rowgroup [ref=e139]:
          - row [ref=e140]:
            - cell "Pessoa Sintética ride-a 11900000000" [ref=e141]:
              - strong [ref=e142]: Pessoa Sintética ride-a
              - generic [ref=e143]: "11900000000"
            - cell "Terminal fictício" [ref=e144]
            - cell "R$ 85,00" [ref=e145]
            - cell "Aprovado" [ref=e146]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { readFile } from "node:fs/promises";
  3  | import { seedSyntheticEnvironment, seedSyntheticFunctionalPlan, testAccount } from "./fixtures";
  4  | let dispose: (()=>Promise<void>) | undefined;
  5  | const errors: string[]=[];
  6  | test.beforeEach(async({page,context})=>{
  7  |   errors.length=0;dispose=await seedSyntheticEnvironment();page.on("pageerror",error=>errors.push(error.message));
  8  |   await context.route("**/*",route=>["127.0.0.1","localhost"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  9  | });
  10 | test.afterEach(async()=>{await dispose?.();expect(errors).toEqual([]);});
  11 | async function login(page: import("@playwright/test").Page) {
  12 |   await page.goto("/admin/login");await page.getByLabel(/E-mail/).fill(testAccount.email);await page.getByLabel(/Senha/).fill(testAccount.password);await page.getByRole("button",{name:"Entrar no painel"}).click();await expect(page).toHaveURL(/\/admin$/);
  13 | }
  14 | test("Pro saves a shared operational report, exports without passengers and preserves it after downgrade",async({page},info)=>{
  15 |   await seedSyntheticFunctionalPlan("pro");await login(page);await page.goto("/admin/relatorios");
  16 |   await page.getByLabel("Título",{exact:true}).fill("Fechamento sintético Pro");await page.getByLabel("Data da viagem a partir de").fill("2026-11-01");await page.getByLabel("Data da viagem até").fill("2026-11-30");
  17 |   await page.getByRole("button",{name:"Salvar relatório",exact:true}).click();const report=page.locator(".tool-cards article").filter({hasText:"Fechamento sintético Pro"});await expect(report).toContainText("R$ 145,00");await expect(report).toContainText("R$ 30,00");
  18 |   const downloading=page.waitForEvent("download");await report.getByRole("button",{name:"Exportar relatório CSV"}).click();const download=await downloading,path=await download.path();const csv=await readFile(path!,"utf8");expect(csv).toContain("14500");expect(csv).not.toContain("Pessoa Sintética");expect(csv).not.toContain("11900000000");
  19 |   await page.reload();await expect(report).toBeVisible();await seedSyntheticFunctionalPlan("essencial");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();await expect(report).toBeVisible();
  20 |   await page.screenshot({path:info.outputPath("report-history-downgrade.png"),fullPage:true});
  21 |   await page.goto("/admin/financeiro");await expect(page.getByRole("heading",{name:"Financeiro",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Exportar resumo sem dados pessoais"})).toBeVisible();
  22 | });
  23 | test("Premium reuses templates, reverses tasks, archives and retains history with an accessible mobile menu",async({page},info)=>{
> 24 |   await seedSyntheticFunctionalPlan("premium");await login(page);const menu=page.getByRole("button",{name:"Menu",exact:true});if(await menu.isVisible())await menu.click();await page.getByRole("link",{name:"Roteiros da equipe",exact:true}).click();
     |                                                                                                                                                                                                                                                ^ Error: locator.click: Test timeout of 45000ms exceeded.
  25 |   await page.getByLabel("Título",{exact:true}).fill("Modelo de preparação");await page.getByLabel("Tipo",{exact:true}).selectOption("template");await page.getByRole("button",{name:"Criar roteiro ou modelo"}).click();
  26 |   const model=page.locator(".tool-cards article").filter({hasText:"Modelo reutilizável"});await expect(model).toBeVisible();await page.getByLabel("Caravana",{exact:true}).selectOption("ride-a");await model.getByRole("button",{name:"Usar na caravana selecionada"}).click();
  27 |   const trip=page.locator(".tool-cards article").filter({hasText:"Caravana Sintética ride-a"});await expect(trip).toBeVisible();const task=trip.getByLabel("Confirmar horários com a equipe",{exact:true});await task.check();await expect(trip).toContainText("1/2 concluídas");await page.reload();await expect(task).toBeChecked();await task.uncheck();await expect(trip).toContainText("0/2 concluídas");
  28 |   await trip.getByRole("button",{name:"Arquivar roteiro",exact:true}).click();await expect(trip).toHaveCount(0);await page.getByLabel("Mostrar roteiros arquivados").check();await expect(trip).toContainText("Arquivado");await trip.getByRole("button",{name:"Reabrir roteiro",exact:true}).click();await expect(trip).not.toContainText("Arquivado");
  29 |   const geometry=await page.evaluate(()=>({available:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(geometry.scroll).toBeLessThanOrEqual(geometry.available);
  30 |   await page.screenshot({path:info.outputPath("premium-worklists.png"),fullPage:true});await seedSyntheticFunctionalPlan("pro");await expect(trip.getByRole("button",{name:"Arquivar roteiro",exact:true})).toBeDisabled();await expect(trip).toBeVisible();
  31 | });
  32 | test("Essential cannot enable new tools by URL and suspended Pro cannot generate new snapshots",async({page})=>{
  33 |   await seedSyntheticFunctionalPlan("essencial");await login(page);await page.goto("/admin/relatorios");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();await page.goto("/admin/roteiros");await expect(page.getByRole("button",{name:"Criar roteiro ou modelo"})).toBeDisabled();
  34 |   await seedSyntheticFunctionalPlan("pro",false);await page.goto("/admin/relatorios");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();
  35 | });
  36 | 
```