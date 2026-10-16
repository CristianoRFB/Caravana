# Capturas reais em ambiente sintético

Aplicação real executada localmente com Playwright Chromium 1.64.1, Auth/Firestore Emulator, projeto demo-caravana77-test. Apenas nomes/documentos/valores fictícios. Requisições externas bloqueadas; fontes de sistema aparecem como fallback das fontes remotas.

| Tela | Larguras | Evidência |
|---|---|---|
| Financeiro Geral, Tudo | 320, 375, 768, 1440 | screenshots/financeiro-geral-{mobile-320,mobile-375,tablet-768,desktop-1440}.png |
| Portal após envio de comprovante | 320, 375, 768, 1440 | screenshots/portal-comprovante-{mobile-320,mobile-375,tablet-768,desktop-1440}.png |

screenshots/manifest.json registra dimensões e SHA256. before-responsive/ preserva a captura anterior à correção de overflow do filtro. Não são imagens geradas nem capturas de passageiros reais. O teste também verifica limites horizontais e distância entre marca/e-mail no cabeçalho.

Comandos: npm run test:e2e; node scripts/collect-e2e-evidence.mjs. Browser instalado por node_modules/.bin/playwright install chromium. Configuração segue https://playwright.dev/docs/test-configuration e https://playwright.dev/docs/test-webserver.
