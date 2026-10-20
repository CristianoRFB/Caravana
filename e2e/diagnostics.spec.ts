import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { seedSyntheticEnvironment, testAccount } from "./fixtures";
let dispose: (()=>Promise<void>) | undefined;
test.beforeEach(async({context})=>{
  dispose=await seedSyntheticEnvironment();
  await context.route("**/*",route=>["127.0.0.1","localhost"].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test.afterEach(async()=>{await dispose?.();});
test("local diagnostics exports only safe codes and clears on logout",async({page},info)=>{
  const unexpected:string[]=[];page.on("pageerror",error=>unexpected.push(error.message));
  await page.goto("/admin/login");await page.getByLabel(/E-mail/).fill(testAccount.email);await page.getByLabel(/Senha/).fill(testAccount.password);await page.getByRole("button",{name:"Entrar no painel"}).click();
  await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
  await page.goto("/admin/diagnostico");await expect(page.getByRole("heading",{name:"Diagnóstico local"})).toBeVisible();
  // A synthetic DOM event exercises the real handler without triggering a real
  // failed transaction or sending any payload outside the emulator-only browser.
  await page.evaluate(()=>{const event=new Event("unhandledrejection");Object.defineProperty(event,"reason",{value:{code:"firestore/permission-denied",message:"SYNTHETIC_PRIVATE_NAME CPF_SYNTHETIC TOKEN_SYNTHETIC"}});window.dispatchEvent(event);});
  await expect(page.getByRole("status")).toContainText("1 falhas");
  const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Exportar diagnóstico local"}).click();const downloaded=await downloading;const report=await readFile((await downloaded.path())!,"utf8");
  expect(JSON.parse(report).events).toHaveLength(1);expect(report).toContain("permission-denied");for(const value of ["SYNTHETIC_PRIVATE_NAME","CPF_SYNTHETIC","TOKEN_SYNTHETIC",testAccount.email])expect(report).not.toContain(value);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({path:info.outputPath("diagnostics-safe.png"),fullPage:true});await page.getByRole("button",{name:"Limpar registros desta aba"}).click();await expect(page.getByRole("status")).toContainText("0 falhas");
  await page.evaluate(()=>{const event=new Event("unhandledrejection");Object.defineProperty(event,"reason",{value:{code:"unavailable"}});window.dispatchEvent(event);});
  await expect(page.getByRole("status")).toContainText("1 falhas");await page.getByRole("button",{name:"Sair",exact:true}).click();await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel(/E-mail/).fill(testAccount.email);await page.getByLabel(/Senha/).fill(testAccount.password);await page.getByRole("button",{name:"Entrar no painel"}).click();await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();await page.goto("/admin/diagnostico");await expect(page.getByRole("status")).toContainText("0 falhas");expect(unexpected).toEqual([]);
});
