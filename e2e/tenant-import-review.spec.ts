import { test,expect } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc,updateDoc } from 'firebase/firestore';
import { seedSyntheticEnvironment,patchSyntheticMembership,testAccount } from './fixtures';
let dispose:(()=>Promise<void>)|undefined;
let failures:string[];
test.beforeEach(async({context,page})=>{
 failures=[];dispose=await seedSyntheticEnvironment();
 await patchSyntheticMembership('org-a','tenant_owner');await patchSyntheticMembership('org-b','tenant_owner');
 const env=await initializeTestEnvironment({projectId:'demo-caravana77-test'});
 try{await env.withSecurityRulesDisabled(async ctx=>{await updateDoc(doc(ctx.firestore(),'organizations/org-a'),{importPending:true});await updateDoc(doc(ctx.firestore(),'registrations/'+'a'.repeat(64)),{paymentTotalCents:null});});}finally{await env.cleanup();}
 page.on('pageerror',()=>failures.push('runtime_error'));
 await context.route('**/*',route=>{const hostname=new URL(route.request().url()).hostname;if(['firestore.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com'].includes(hostname))failures.push('remote_firebase');return ['localhost','127.0.0.1'].includes(hostname)?route.continue():route.abort();});
});
test.afterEach(async()=>{await dispose?.();expect(failures).toEqual([]);});
test('imported history remains readable, unknown money explicit, and selection/refresh preserve tenant isolation',async({page})=>{
 await page.goto('/admin/login');await page.getByLabel(/E-mail/).fill(testAccount.email);await page.getByLabel(/Senha/).fill(testAccount.password);await page.getByRole('button',{name:'Entrar no painel'}).click();await expect(page).toHaveURL(/\/admin$/);
 await page.goto('/admin/financeiro');await expect(page.getByText(/Histórico importado em modo somente leitura/)).toBeVisible();
 const row=page.locator('.finance-passenger-row').filter({has:page.getByText('Pessoa Sintética ride-a',{exact:true})});
 await expect(row).toContainText('Não conciliado');await expect(row.getByRole('button',{name:'Histórico',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Registrar',exact:true})).toHaveCount(0);
 const metric=page.locator('.finance-summary-card').filter({has:page.getByText('Recebido registrado',{exact:true})});await expect(metric).toContainText('Não conciliado');
 await page.reload();await expect(page.getByText(/Histórico importado em modo somente leitura/)).toBeVisible();
 await page.getByLabel('Organização ativa').selectOption('org-b');await expect(page).toHaveURL(/\/admin$/);await page.goto('/admin/financeiro');await expect(page.getByText(/Histórico importado em modo somente leitura/)).toHaveCount(0);await expect(page.locator('.finance-passenger-row')).toHaveCount(1);await expect(page.locator('.finance-passenger-row')).toContainText('Pessoa Sintética ride-b');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
