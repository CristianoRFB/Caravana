# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-tools.spec.ts >> Pro saves a shared operational report, exports without passengers and preserves it after downgrade
- Location: e2e\functional-tools.spec.ts:14:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.tool-cards article').filter({ hasText: 'Fechamento sintético Pro' })
Expected substring: "R$ 145,00"
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.tool-cards article').filter({ hasText: 'Fechamento sintético Pro' }) with timeout 10000ms
  - waiting for locator('.tool-cards article').filter({ hasText: 'Fechamento sintético Pro' })

```

```yaml
- banner:
  - link "caravana77":
    - /url: /
    - img
    - text: caravana77
  - text: admin-a@example.test
  - button "Sair":
    - img
- complementary:
  - text: ESPAÇO DA ORGANIZAÇÃO
  - link "▦ Visão geral":
    - /url: /admin
  - link "◫ Caravanas":
    - /url: /admin/caravanas
  - link "Financeiro":
    - /url: /admin/financeiro
    - img
    - text: Financeiro
  - link "▤ Comprovantes":
    - /url: /admin/comprovantes
  - link "✓ Check-in":
    - /url: /admin/check-in
  - link "? Suporte":
    - /url: /admin/suporte
  - link "◈ Identidade pública":
    - /url: /admin/identidade
  - link "▤ Documentos e prazos":
    - /url: /admin/documentos
  - link "◇ Plano e limites":
    - /url: /admin/plano
  - link "♧ Equipe e convites":
    - /url: /admin/equipe
  - link "▥ Relatórios":
    - /url: /admin/relatorios
  - link "☷ Roteiros da equipe":
    - /url: /admin/roteiros
  - img
  - text: Dados protegidos por organização
- main:
  - heading "Central de relatórios" [level=1]
  - paragraph: Fechamentos por data da viagem, salvos para a equipe e exportáveis sem lista de passageiros.
  - paragraph: O Financeiro Geral, a importação CSV e os recursos essenciais continuam disponíveis em todos os planos.
  - alert: evaluation error at L265:24 for 'create' @ L265, evaluation error at L308:24 for 'create' @ L308, false for 'create' @ L308, Unable to evaluate the expression as the maximum of 1000 expressions to evaluate has been reached. for 'create' @ L265
  - group "Nova fotografia operacional":
    - text: Nova fotografia operacional Título
    - textbox "Título": Fechamento sintético Pro
    - text: Caravana
    - combobox "Caravana":
      - option "Todas no período" [selected]
      - option "Caravana Sintética ride-a"
      - option "Caravana Sintética ride-a2"
    - text: Data da viagem a partir de
    - textbox "Data da viagem a partir de": 2026-11-01
    - text: Data da viagem até
    - textbox "Data da viagem até": 2026-11-30
    - paragraph: Valores históricos conhecidos das viagens selecionadas, inclusive recebimentos de inscrições canceladas. São consultas feitas durante a captura; não é conciliação ou fechamento bancário.
    - button "Salvar relatório"
  - heading "Histórico da organização" [level=2]
  - paragraph: Até30 documentos mais recentes; alterações dos roteiros têm eventos imutáveis. Nenhum documento é apagado por mudança de plano.
  - paragraph: Nenhum relatório salvo nesta organização.
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
> 17 |   await page.getByRole("button",{name:"Salvar relatório",exact:true}).click();const report=page.locator(".tool-cards article").filter({hasText:"Fechamento sintético Pro"});await expect(report).toContainText("R$ 145,00");await expect(report).toContainText("R$ 30,00");
     |                                                                                                                                                                                                  ^ Error: expect(locator).toContainText(expected) failed
  18 |   const downloading=page.waitForEvent("download");await report.getByRole("button",{name:"Exportar relatório CSV"}).click();const download=await downloading,path=await download.path();const csv=await readFile(path!,"utf8");expect(csv).toContain("14500");expect(csv).not.toContain("Pessoa Sintética");expect(csv).not.toContain("11900000000");
  19 |   await page.reload();await expect(report).toBeVisible();await seedSyntheticFunctionalPlan("essencial");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();await expect(report).toBeVisible();
  20 |   await page.screenshot({path:info.outputPath("report-history-downgrade.png"),fullPage:true});
  21 |   await page.goto("/admin/financeiro");await expect(page.getByRole("heading",{name:"Financeiro",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Exportar resumo sem dados pessoais"})).toBeVisible();
  22 | });
  23 | test("Premium reuses templates, reverses tasks, archives and retains history with an accessible mobile menu",async({page},info)=>{
  24 |   await seedSyntheticFunctionalPlan("premium");await login(page);const menu=page.getByRole("button",{name:"Menu",exact:true});if(await menu.isVisible())await menu.click();await page.getByRole("link",{name:"Roteiros da equipe",exact:true}).click();
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