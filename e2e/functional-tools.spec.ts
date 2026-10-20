import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { seedSyntheticEnvironment, seedSyntheticFunctionalPlan, testAccount } from "./fixtures";
let dispose: (()=>Promise<void>) | undefined;
const errors: string[]=[];
test.beforeEach(async({page,context})=>{
  errors.length=0;dispose=await seedSyntheticEnvironment();page.on("pageerror",error=>errors.push(error.message));
  await context.route("**/*",route=>["127.0.0.1","localhost"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test.afterEach(async()=>{await dispose?.();expect(errors).toEqual([]);});
async function login(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");await page.getByLabel(/E-mail/).fill(testAccount.email);await page.getByLabel(/Senha/).fill(testAccount.password);await page.getByRole("button",{name:"Entrar no painel"}).click();await expect(page).toHaveURL(/\/admin$/);await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
}
test("Pro saves a shared operational report, exports without passengers and preserves it after downgrade",async({page},info)=>{
  await seedSyntheticFunctionalPlan("pro");await login(page);await page.goto("/admin/relatorios");
  await page.getByLabel("Título",{exact:true}).fill("Fechamento sintético Pro");await page.getByLabel("Data da viagem a partir de").fill("2026-11-01");await page.getByLabel("Data da viagem até").fill("2026-11-30");
  await page.getByRole("button",{name:"Salvar relatório",exact:true}).click();const report=page.locator(".tool-cards article").filter({hasText:"Fechamento sintético Pro"});await expect(report).toContainText("R$ 145,00");await expect(report).toContainText("R$ 30,00");
  const downloading=page.waitForEvent("download");await report.getByRole("button",{name:"Exportar relatório CSV"}).click();const download=await downloading,path=await download.path();const csv=await readFile(path!,"utf8");expect(csv).toContain("14500");expect(csv).not.toContain("Pessoa Sintética");expect(csv).not.toContain("11900000000");
  await page.reload();await expect(report).toBeVisible();await seedSyntheticFunctionalPlan("essencial");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();await expect(report).toBeVisible();
  await page.screenshot({path:info.outputPath("report-history-downgrade.png"),fullPage:true});
  await page.goto("/admin/financeiro");await expect(page.getByRole("heading",{name:"Financeiro",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Exportar resumo sem dados pessoais"})).toBeVisible();
});
test("Premium reuses templates, reverses tasks, archives and retains history with an accessible mobile menu",async({page},info)=>{
  await seedSyntheticFunctionalPlan("premium");await login(page);const menu=page.getByRole("button",{name:"Menu",exact:true});if(await menu.isVisible())await menu.click();await page.getByRole("link",{name:"Roteiros da equipe",exact:true}).click();
  await page.getByLabel("Título",{exact:true}).fill("Modelo de preparação");await page.getByRole("combobox",{name:"Tipo",exact:true}).selectOption("template");await page.getByRole("button",{name:"Criar roteiro ou modelo"}).click();
  const model=page.locator(".tool-cards article").filter({hasText:"Modelo reutilizável"});await expect(model).toBeVisible();await page.getByRole("combobox",{name:"Caravana",exact:true}).selectOption("ride-a");await model.getByRole("button",{name:"Usar na caravana selecionada"}).click();
  const trip=page.locator(".tool-cards article").filter({hasText:"Caravana Sintética ride-a"});await expect(trip).toBeVisible();const task=trip.getByLabel("Confirmar horários com a equipe",{exact:true});await task.click();await expect(trip).toContainText("1/2 concluídas");await page.reload();await expect(task).toBeChecked();await task.click();await expect(trip).toContainText("0/2 concluídas");
  await trip.getByRole("button",{name:"Arquivar roteiro",exact:true}).click();await expect(trip).toHaveCount(0);await page.getByLabel("Mostrar roteiros arquivados").check();await expect(trip).toContainText("Arquivado");await trip.getByRole("button",{name:"Reabrir roteiro",exact:true}).click();await expect(trip).not.toContainText("Arquivado");
  await page.getByText("Histórico de alterações",{exact:true}).click();await expect(page.getByText("Roteiro reaberto",{exact:true})).toBeVisible();
  const geometry=await page.evaluate(()=>({available:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(geometry.scroll).toBeLessThanOrEqual(geometry.available);
  await page.screenshot({path:info.outputPath("premium-worklists.png"),fullPage:true});await seedSyntheticFunctionalPlan("pro");await expect(trip.getByRole("button",{name:"Arquivar roteiro",exact:true})).toBeDisabled();await expect(trip).toBeVisible();
});
test("Essential cannot enable new tools by URL and suspended Pro cannot generate new snapshots",async({page})=>{
  await seedSyntheticFunctionalPlan("essencial");await login(page);await page.goto("/admin/relatorios");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();await page.goto("/admin/roteiros");await expect(page.getByRole("button",{name:"Criar roteiro ou modelo"})).toBeDisabled();
  await seedSyntheticFunctionalPlan("pro",false);await page.goto("/admin/relatorios");await expect(page.getByRole("button",{name:"Salvar relatório",exact:true})).toBeDisabled();
});
