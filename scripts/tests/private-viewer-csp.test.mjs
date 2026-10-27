import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { chromium } from '@playwright/test';
import { privateViewerHeaders } from '../package-italo-private.mjs';

test('the scoped CSP permits an in-memory private proof frame without remote requests or script relaxation', async () => {
  const policy = privateViewerHeaders(Buffer.alloc(0), 'production').toString().split('\n').find(line => line.trimStart().startsWith('Content-Security-Policy:')).trim().slice('Content-Security-Policy: '.length);
  assert.match(policy, /frame-src 'self' blob:/);
  assert.match(policy, /script-src 'self';/);
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Security-Policy', policy);
    if (request.url === '/viewer.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end("document.querySelector('iframe').src=URL.createObjectURL(new Blob(['SYNTHETIC_PRIVATE_PROOF'],{type:'text/plain'}));");
    } else {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><iframe title="Private fixture"></iframe><script src="/viewer.js"></script>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(); const page = await browser.newPage(), failures = [];
    await page.route('**/*', route => {
      if (new URL(route.request().url()).hostname !== '127.0.0.1') { failures.push('REMOTE_REQUEST'); return route.abort(); }
      return route.continue();
    });
    page.on('console', message => { if (message.type() === 'error' && /security policy|refused to frame/i.test(message.text())) failures.push('CSP_ERROR'); });
    await page.goto(`http://127.0.0.1:${server.address().port}/tenant-italo/`);
    await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.body?.textContent?.includes('SYNTHETIC_PRIVATE_PROOF'), { timeout: 10000 });
    assert.deepEqual(failures, []);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});
